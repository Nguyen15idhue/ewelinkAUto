const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser'); 
const config = require('./config');

const cgbas = require('./src/providers/cgbas-provider');
const ewelink = require('./src/providers/ewelink-provider');
const db = require('./src/services/db-service');
const logic = require('./src/services/station-logic');
const queue = require('./src/services/queue-service');

const app = express();

// --- CONFIG ---
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Pool kết nối dành riêng cho Web Server
const webPool = mysql.createPool({
    host: config.MYSQL.HOST,
    user: config.MYSQL.USER,
    password: config.MYSQL.PASSWORD,
    database: config.MYSQL.DATABASE,
    port: config.MYSQL.PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- ROUTES ---

// 1. DASHBOARD
app.get('/', async (req, res) => {
    try {
        const sqlMain = `
            SELECT 
                s.station_id, s.station_name, s.identification_name, 
                s.connect_status, s.ewelink_id, s.automation_status,
                e.online AS hw_online, e.rssi, e.ch1_status, e.ch2_status, e.voltage,
                q.status AS queue_status, q.command_type AS queue_cmd
            FROM stations s
            LEFT JOIN ewelink_devices e ON s.ewelink_id = e.device_id
            LEFT JOIN (
                SELECT device_id, status, command_type 
                FROM command_queue 
                WHERE status IN ('PENDING', 'PROCESSING', 'RETRY', 'VERIFYING')
            ) q ON s.ewelink_id = q.device_id
            ORDER BY s.station_name ASC
        `;
        const [stations] = await webPool.query(sqlMain);
        const [ewelinkList] = await webPool.query(`SELECT device_id, name, online FROM ewelink_devices ORDER BY name ASC`);
        const [countEwelink] = await webPool.query(`SELECT COUNT(*) as c FROM ewelink_devices WHERE online = 1`);
        const [countQueue] = await webPool.query(`SELECT COUNT(*) as c FROM command_queue WHERE status IN ('PENDING','PROCESSING','RETRY','VERIFYING')`);
        
        const stats = {
            total: stations.length,
            cgbas_online: stations.filter(r => r.connect_status == 1).length,
            ewelink_online: countEwelink[0].c,
            pending: countQueue[0].c
        };

        const targetState = logic.getTargetState();

        res.render('dashboard', { 
            stations, 
            ewelinkList,
            stats,
            targetState: targetState || 'IDLE (Nghỉ)' 
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Lỗi Server: " + e.message);
    }
});

// 2. API: CẬP NHẬT MAPPING
app.post('/api/update-mapping', async (req, res) => {
    const { station_id, ewelink_id } = req.body;
    try {
        const deviceId = ewelink_id === "" ? null : ewelink_id;
        await webPool.query(
            `UPDATE stations SET ewelink_id = ? WHERE station_id = ?`, 
            [deviceId, station_id]
        );
        res.json({ success: true, message: "Đã cập nhật thành công" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 3. API: BẬT/TẮT AUTOMATION
app.get('/toggle-auto/:id', async (req, res) => {
    try {
        await webPool.query(
            `UPDATE stations SET automation_status = 1 - automation_status WHERE station_id = ?`,
            [req.params.id]
        );
        res.redirect('/');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// 4. API: TRIGGER THỦ CÔNG
app.get('/trigger/:deviceId/:name/:cmd', async (req, res) => {
    const { deviceId, name, cmd } = req.params;
    await queue.addToQueue(name, deviceId, cmd, 'MANUAL');
    res.redirect('/');
});


// --- MAIN LOOP ---
function log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function mainLoop() {
    log("=== Chu kỳ quét ===");
    
    try {
        // A. ĐỒNG BỘ CGBAS
        const stations = await cgbas.getStationList();
        if (stations.length) {
            const ids = stations.map(s => s.id);
            const statusMap = await cgbas.getStationStatus(ids);
            const mergedStations = logic.mergeData(stations, statusMap);
            await db.saveStations(mergedStations);
        }

        // B. ĐỒNG BỘ EWELINK
        const devices = await ewelink.getDeviceList();
        if (devices && devices.length > 0) {
            await db.saveEwelinkDevices(devices);
        }

        // C. RA QUYẾT ĐỊNH
        const target = logic.getTargetState(); // 'ON', 'OFF', hoặc NULL (Idle)

        // --- XỬ LÝ CHẾ ĐỘ NGHỈ (IDLE) ---
        if (!target) {
            log(`Mục tiêu thời gian: IDLE (Ngoài khung giờ - Không can thiệp)`);
            return; // Dừng vòng lặp tại đây, không làm gì thêm
        }

        log(`Mục tiêu thời gian: ${target}`);

        // Lấy dữ liệu tổng hợp
        const sql = `
            SELECT s.*, e.online AS hw_online, e.ch1_status 
            FROM stations s
            LEFT JOIN ewelink_devices e ON s.ewelink_id = e.device_id
            WHERE s.ewelink_id IS NOT NULL 
        `;
        const [dbStations] = await webPool.query(sql);

        for (const st of dbStations) {
            if (st.automation_status == 0) continue; 

            // --- KỊCH BẢN TẮT (OFF) ---
            if (target === 'OFF') {
                // 1. Tắt chuẩn: CGBAS Online + CH1 ON
                if (st.connect_status == 1 && st.ch1_status === 'on') {
                    log(`⚡ [AUTO] TẮT ${st.station_name} (CGBAS On + CH1 On) -> Queue`);
                    await queue.addToQueue(st.station_name, st.ewelink_id, 'OFF', 'AUTO');
                }
                // 2. Cắt nguồn dư: CGBAS Offline + CH1 ON
                else if (st.connect_status != 1 && st.ch1_status === 'on') {
                    log(`⚡ [AUTO] CẮT NGUỒN DƯ ${st.station_name} (CGBAS Off + CH1 On) -> Queue`);
                    // Logic sequenceOff đã thông minh tự xử lý việc này (bỏ qua nút nguồn)
                    await queue.addToQueue(st.station_name, st.ewelink_id, 'OFF', 'AUTO');
                }
            } 
            
            // --- KỊCH BẢN BẬT (ON) ---
            else if (target === 'ON') {
                // Điều kiện: CGBAS Offline (Bất kể CH1 đang On hay Off)
                if (st.connect_status != 1) {
                    // Check xem trong queue đã có lệnh chưa để tránh spam log
                    // (Logic queue service đã lo việc lọc trùng, ở đây chỉ để log cho đẹp)
                    let msg = "";
                    if (st.ch1_status === 'off') msg = "BẬT (Cold Start)";
                    else msg = "KÍCH NGUỒN (Wake Up)";
                    
                    log(`⚡ [AUTO] ${msg} ${st.station_name} -> Queue`);
                    await queue.addToQueue(st.station_name, st.ewelink_id, 'ON', 'AUTO');
                }
            }
        }
    } catch (e) {
        log(`❌ Lỗi Loop: ${e.message}`);
    }
}

// --- KHỞI ĐỘNG ---
app.listen(3000, () => {
    console.log("------------------------------------------------");
    console.log("✅ HỆ THỐNG ĐÃ KHỞI ĐỘNG");
    console.log("👉 Web Dashboard: http://localhost:3000");
    console.log("------------------------------------------------");
    
    mainLoop();
    setInterval(mainLoop, config.SYSTEM.CHECK_INTERVAL_MS);
});
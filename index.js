const express = require('express');
const config = require('./config');
const cgbas = require('./src/providers/cgbas-provider');
const db = require('./src/services/db-service'); // Import DB Service
const logic = require('./src/services/station-logic');

const app = express();
let runtimeLog = [];

function log(msg) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
    runtimeLog.unshift(`[${time}] ${msg}`);
    if (runtimeLog.length > 50) runtimeLog.pop();
}

async function mainLoop() {
    log("=== Bắt đầu chu kỳ quét ===");
    
    try {
        // 1. Lấy danh sách trạm (Dữ liệu tĩnh)
        const stations = await cgbas.getStationList();
        if (!stations.length) { 
            log("Không lấy được danh sách trạm CGBAS"); 
            return; 
        }
        
        // 2. Lấy trạng thái trạm (Dữ liệu động)
        const ids = stations.map(s => s.id);
        const statusMap = await cgbas.getStationStatus(ids);
        
        // 3. GỘP DỮ LIỆU & LƯU VÀO MYSQL
        // Biến mergedStations chứa đầy đủ thông tin: Tên, Vị trí + Trạng thái Connect
        const mergedStations = logic.mergeData(stations, statusMap);
        
        // Gọi service lưu vào DB (Chạy async không cần chờ)
        db.saveStations(mergedStations);

        // 4. XỬ LÝ ĐIỀU KHIỂN (Logic cũ)
        const target = logic.getTargetState();
        log(`Mục tiêu thời gian: ${target}`);

        for (const st of mergedStations) {
            const deviceId = config.STATIONS[st.stationName];
            if (!deviceId) continue; 

            // statusMap trả về: 1 là Online
            const isOnline = (st.currentStatus === 1);
            
            if (target === 'OFF' && isOnline) {
                log(`Phát hiện ${st.stationName} ONLINE giờ nghỉ -> TẮT`);
                logic.sequenceOff(st.stationName, deviceId);
            } 
            else if (target === 'ON' && !isOnline) {
                log(`Phát hiện ${st.stationName} OFFLINE giờ làm -> BẬT`);
                logic.sequenceOn(st.stationName, deviceId);
            }
        }
    } catch (e) {
        log(`Lỗi Loop: ${e.message}`);
    }
}

// ... Phần Web Server giữ nguyên ...
app.get('/', (req, res) => { /*...*/ });

app.listen(3000, () => {
    console.log("Hệ thống đang chạy tại http://localhost:3000");
    mainLoop();
    setInterval(mainLoop, config.SYSTEM.CHECK_INTERVAL_MS);
});
// File: src/automation.js
const config = require('../config');
const webPool = require('./database');
const cgbas = require('./providers/cgbas-provider');
const ewelink = require('./providers/ewelink-provider');
const db = require('./services/db-service');
const logic = require('./services/station-logic');
const queue = require('./services/queue-service');

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
            return; 
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
                if (st.connect_status == 1 && st.ch1_status === 'on') {
                    log(`⚡ [AUTO] TẮT ${st.station_name} (CGBAS On + CH1 On) -> Queue`);
                    await queue.addToQueue(st.station_name, st.ewelink_id, 'OFF', 'AUTO');
                }
                else if (st.connect_status != 1 && st.ch1_status === 'on') {
                    log(`⚡ [AUTO] CẮT NGUỒN DƯ ${st.station_name} (CGBAS Off + CH1 On) -> Queue`);
                    await queue.addToQueue(st.station_name, st.ewelink_id, 'OFF', 'AUTO');
                }
            } 
            
            // --- KỊCH BẢN BẬT (ON) ---
            else if (target === 'ON') {
                if (st.connect_status != 1) {
                    let msg = (st.ch1_status === 'off') ? "BẬT (Cold Start)" : "KÍCH NGUỒN (Wake Up)";
                    log(`⚡ [AUTO] ${msg} ${st.station_name} -> Queue`);
                    await queue.addToQueue(st.station_name, st.ewelink_id, 'ON', 'AUTO');
                }
            }
        }
    } catch (e) {
        log(`❌ Lỗi Loop: ${e.message}`);
    }
}

function start() {
    // Start separate loops for CGBAS and EWELINK so heavy syncs can have different cadence
    // Immediate start
    (async () => {
        // initial CGBAS sync
        try {
            const stations = await cgbas.getStationList();
            if (stations.length) {
                const ids = stations.map(s => s.id);
                const statusMap = await cgbas.getStationStatus(ids);
                const mergedStations = logic.mergeData(stations, statusMap);
                await db.saveStations(mergedStations);
            }
        } catch (e) { log('Init CGBAS sync error: ' + e.message); }

        // initial eWeLink sync
        try {
            const devices = await ewelink.getDeviceList();
            if (devices && devices.length > 0) {
                await db.saveEwelinkDevices(devices);
            }
        } catch (e) { log('Init eWeLink sync error: ' + e.message); }
    })();

    // Schedule CGBAS sync loop
    setInterval(async () => {
        log('--- CGBAS sync cycle ---');
        try {
            const stations = await cgbas.getStationList();
            if (stations.length) {
                const ids = stations.map(s => s.id);
                const statusMap = await cgbas.getStationStatus(ids);
                const mergedStations = logic.mergeData(stations, statusMap);
                await db.saveStations(mergedStations);
            }
        } catch (e) { log(`❌ CGBAS sync error: ${e.message}`); }

        // After updating CGBAS state, decide automation actions
        try {
            const target = logic.getTargetState();
            if (!target) { log('Mục tiêu thời gian: IDLE (Không can thiệp)'); return; }

            const sql = `
                SELECT s.*, e.online AS hw_online, e.ch1_status 
                FROM stations s
                LEFT JOIN ewelink_devices e ON s.ewelink_id = e.device_id
                WHERE s.ewelink_id IS NOT NULL 
            `;
            const [dbStations] = await webPool.query(sql);

            for (const st of dbStations) {
                if (st.automation_status == 0) continue;
                if (target === 'OFF') {
                    if (st.connect_status == 1 && st.ch1_status === 'on') {
                        log(`⚡ [AUTO] TẮT ${st.station_name} (CGBAS On + CH1 On) -> Queue`);
                        await queue.addToQueue(st.station_name, st.ewelink_id, 'OFF', 'AUTO');
                    } else if (st.connect_status != 1 && st.ch1_status === 'on') {
                        log(`⚡ [AUTO] CẮT NGUỒN DƯ ${st.station_name} (CGBAS Off + CH1 On) -> Queue`);
                        await queue.addToQueue(st.station_name, st.ewelink_id, 'OFF', 'AUTO');
                    }
                } else if (target === 'ON') {
                    if (st.connect_status != 1) {
                        let msg = (st.ch1_status === 'off') ? "BẬT (Cold Start)" : "KÍCH NGUỒN (Wake Up)";
                        log(`⚡ [AUTO] ${msg} ${st.station_name} -> Queue`);
                        await queue.addToQueue(st.station_name, st.ewelink_id, 'ON', 'AUTO');
                    }
                }
            }
        } catch (e) { log('Auto decision error: ' + e.message); }
    }, config.SYSTEM.CGBAS_INTERVAL_MS);

    // Schedule eWeLink sync loop (kept separate so heavier CGBAS sync doesn't block it)
    setInterval(async () => {
        log('--- eWeLink sync cycle ---');
        try {
            const devices = await ewelink.getDeviceList();
            if (devices && devices.length > 0) {
                await db.saveEwelinkDevices(devices);
            }
        } catch (e) { log('❌ eWeLink sync error: ' + e.message); }
    }, config.SYSTEM.EWELINK_INTERVAL_MS);
}

module.exports = { start };
const mysql = require('mysql2/promise');
const config = require('../../config');

// SỬA LỖI: Mapping chữ Hoa -> chữ thường
const pool = mysql.createPool({
    host: config.MYSQL.HOST,
    user: config.MYSQL.USER,
    password: config.MYSQL.PASSWORD,
    database: config.MYSQL.DATABASE,
    port: config.MYSQL.PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

class DbService {
    async saveStations(stationsList) {
        if (!stationsList || stationsList.length === 0) return;

        const connection = await pool.getConnection();
        try {
            // SỬA LỖI QUAN TRỌNG TẠI ĐÂY:
            // Trong phần ON DUPLICATE KEY UPDATE, tôi đã bỏ dòng cập nhật ewelink_id.
            // Điều này đảm bảo khi sync CGBAS, nó chỉ cập nhật trạng thái Online/Offline
            // chứ không xóa mất thiết bị bạn đã gán thủ công trên Web.
            
            const sql = `
                INSERT INTO stations 
                (station_id, station_name, identification_name, lat, lng, receiver_type, connect_status, ewelink_id, last_updated)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                station_name = VALUES(station_name),
                identification_name = VALUES(identification_name),
                lat = VALUES(lat),
                lng = VALUES(lng),
                receiver_type = VALUES(receiver_type),
                connect_status = VALUES(connect_status),
                -- ewelink_id = VALUES(ewelink_id),  <-- DÒNG NÀY ĐÃ BỊ COMMENT ĐỂ KHÔNG BỊ GHI ĐÈ
                last_updated = NOW()
            `;

            // Chuyển đổi dữ liệu JSON thành mảng 2 chiều cho MySQL
            const values = stationsList.map(s => [
                s.id,
                s.stationName,
                s.identificationName,
                s.lat,
                s.lng,
                s.receiverType,
                s.currentStatus, 
                null, // Mặc định insert là null, việc gán ID sẽ làm trên Web
                new Date()
            ]);

            await connection.query(sql, [values]);
            // console.log(`[Database] Đã lưu/cập nhật ${values.length} trạm vào MySQL.`);

        } catch (error) {
            console.error("[Database Error] Lỗi khi lưu dữ liệu Stations:", error.message);
        } finally {
            connection.release();
        }
    }

    /**
     * Lưu danh sách thiết bị eWeLink vào DB
     */
    async saveEwelinkDevices(deviceList) {
        if (!deviceList || deviceList.length === 0) return;

        const connection = await pool.getConnection();
        try {
            const sql = `
                INSERT INTO ewelink_devices 
                (device_id, name, online, model, brand, firmware, rssi, mac, uiid, 
                 ch1_status, ch2_status, ch1_power, ch2_power, voltage, ch1_current, ch2_current, last_updated)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                online = VALUES(online),
                rssi = VALUES(rssi),
                ch1_status = VALUES(ch1_status),
                ch2_status = VALUES(ch2_status),
                ch1_power = VALUES(ch1_power),
                ch2_power = VALUES(ch2_power),
                voltage = VALUES(voltage),
                ch1_current = VALUES(ch1_current),
                ch2_current = VALUES(ch2_current),
                last_updated = NOW()
            `;

            const values = deviceList.map(d => {
                const item = d.itemData;
                const params = item.params || {};

                // 1. Xử lý trạng thái kênh
                let ch1 = 'unknown';
                let ch2 = 'unknown';

                if (params.switches && Array.isArray(params.switches)) {
                    ch1 = params.switches[0] ? params.switches[0].switch : 'off';
                    ch2 = params.switches[1] ? params.switches[1].switch : 'off';
                } else if (params.switch) {
                    ch1 = params.switch;
                    ch2 = 'N/A';
                }

                // 2. Xử lý điện năng
                const getVal = (k1, k2) => parseFloat(params[k1] || params[k2] || 0);

                return [
                    item.deviceid,              
                    item.name,                  
                    item.online ? 1 : 0,        
                    item.productModel || '',    
                    item.brandName || '',       
                    item.fwVersion || '',       
                    parseInt(params.rssi || 0), 
                    item.extra?.extra?.mac || '', 
                    item.uiid,                  
                    
                    ch1,                        
                    ch2,                        
                    
                    getVal('power_00', 'actPow_00'), 
                    getVal('power_01', 'actPow_01'), 
                    
                    getVal('voltage', 'voltage_00'), 
                    
                    getVal('current_00', 'current_00'), 
                    getVal('current_01', 'current_01'), 
                    
                    new Date() 
                ];
            });

            await connection.query(sql, [values]);
            // console.log(`[Database] Đã cập nhật thông tin ${values.length} thiết bị eWeLink.`);

        } catch (error) {
            console.error("[Database Error] Lưu eWeLink thất bại:", error.message);
        } finally {
            connection.release();
        }
    }
 /**
     * Ghi lịch sử hoạt động
     */
    async addLog(stationName, deviceId, action, source, result, message) {
        try {
            const sql = `
                INSERT INTO station_logs (station_name, device_id, action, source, result, message)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await pool.query(sql, [stationName, deviceId, action, source, result, message]);
            // console.log(`[Log DB] Đã lưu lịch sử: ${stationName} - ${result}`);
        } catch (e) {
            console.error("[Database Error] Không thể ghi log:", e.message);
        }
    }
} // Kết thúc Class

module.exports = new DbService();
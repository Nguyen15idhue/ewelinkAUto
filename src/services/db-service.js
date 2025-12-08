const mysql = require('mysql2/promise');
const config = require('../../config');

// Tạo Connection Pool (Tốt hơn tạo connection đơn lẻ)
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
            // Chuẩn bị câu lệnh Upsert (Insert hoặc Update nếu trùng ID)
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
                ewelink_id = VALUES(ewelink_id),
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
                s.currentStatus, // Trạng thái lấy từ dynamic-info
                config.STATIONS[s.stationName] || null, // Mapping ID ewelink
                new Date()
            ]);

            await connection.query(sql, [values]);
            console.log(`[Database] Đã lưu/cập nhật ${values.length} trạm vào MySQL.`);

        } catch (error) {
            console.error("[Database Error] Lỗi khi lưu dữ liệu:", error.message);
        } finally {
            connection.release(); // Trả kết nối về pool
        }
    }
}

module.exports = new DbService();
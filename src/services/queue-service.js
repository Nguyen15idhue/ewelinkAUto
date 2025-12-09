const mysql = require('mysql2/promise');
const config = require('../../config');

// Tạo pool kết nối DB
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

class QueueService {
    
    /**
     * Thêm lệnh vào hàng chờ
     */
    async addToQueue(stationName, deviceId, commandType, source = 'AUTO') {
        // 1. Kiểm tra xem có lệnh nào đang treo cho thiết bị này không
        const [rows] = await pool.query(
            `SELECT * FROM command_queue 
             WHERE device_id = ? AND status IN ('PENDING', 'PROCESSING', 'RETRY', 'VERIFYING')
             LIMIT 1`, 
            [deviceId]
        );

        if (rows.length > 0) {
            const existing = rows[0];
            // Nếu lệnh trùng khớp -> Bỏ qua
            if (existing.command_type === commandType) {
                console.log(`[Queue] Lệnh ${commandType} cho ${stationName} đã tồn tại (ID: ${existing.id}).`);
                return;
            } else {
                // Nếu lệnh ngược lại -> Hủy lệnh cũ
                await pool.query(`UPDATE command_queue SET status = 'CANCELLED' WHERE id = ?`, [existing.id]);
                console.log(`[Queue] Hủy lệnh cũ (ID: ${existing.id}) để thay lệnh mới.`);
            }
        }

        // 2. Thêm lệnh mới (CÓ THÊM trigger_source)
        await pool.query(
            `INSERT INTO command_queue (device_id, station_name, command_type, trigger_source) VALUES (?, ?, ?, ?)`,
            [deviceId, stationName, commandType, source]
        );
        console.log(`[Queue] 📥 Đã thêm lệnh ${commandType} (${source}) cho ${stationName}.`);
    }

    /**
     * Lấy danh sách lệnh cần xử lý (PENDING hoặc RETRY)
     */
    async getPendingTasks(limit = 5) {
        const sql = `
            SELECT * FROM command_queue 
            WHERE status = 'PENDING' 
               OR (status = 'RETRY' AND retry_count < 10 AND updated_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
            ORDER BY created_at ASC
            LIMIT ?
        `;
        const [rows] = await pool.query(sql, [limit]);
        return rows;
    }

    /**
     * [MỚI] Lấy các lệnh đang chờ Xác Thực (VERIFYING) đã đến hạn check
     */
    async getTasksToVerify(limit = 5) {
        const sql = `
            SELECT * FROM command_queue 
            WHERE status = 'VERIFYING' 
              AND verified_at <= NOW() 
            LIMIT ?
        `;
        const [rows] = await pool.query(sql, [limit]);
        return rows;
    }

    /**
     * Cập nhật trạng thái cơ bản
     */
    async updateStatus(id, status, errorMsg = null) {
        let sql = `UPDATE command_queue SET status = ?`;
        const params = [status];

        if (errorMsg) {
            sql += `, error_log = ?`;
            params.push(errorMsg);
        }
        
        if (status === 'RETRY') {
            sql += `, retry_count = retry_count + 1`;
        }

        sql += ` WHERE id = ?`;
        params.push(id);

        await pool.query(sql, params);
    }

    /**
     * [MỚI] Chuyển sang trạng thái VERIFYING và hẹn giờ
     * delayMinutes: Số phút chờ trước khi check lại (mặc định 2)
     */
    async markAsVerifying(id, delayMinutes = 2) {
        const sql = `
            UPDATE command_queue 
            SET status = 'VERIFYING', 
                verified_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
                error_log = 'Đang chờ xác thực kết quả...'
            WHERE id = ?
        `;
        await pool.query(sql, [delayMinutes, id]);
        console.log(`[Queue] Task ${id} chuyển sang VERIFYING. Check lại sau ${delayMinutes} phút.`);
    }
}

module.exports = new QueueService();
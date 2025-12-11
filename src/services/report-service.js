// File: src/services/report-service.js
const webPool = require('../database');

const ReportService = {
    async getStationsList() {
        const [rows] = await webPool.query("SELECT station_id, station_name FROM stations ORDER BY station_name ASC");
        return rows;
    },

    async getSummaryStats(startDate, endDate, stationId) {
        const start = startDate + ' 00:00:00';
        const end = endDate + ' 23:59:59';
        
        let sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN action = 'ON' THEN 1 ELSE 0 END) as count_on,
                SUM(CASE WHEN action = 'OFF' THEN 1 ELSE 0 END) as count_off,
                
                -- SỬA LẠI ĐIỀU KIỆN Ở ĐÂY: DÙNG 'SUCCESS' THAY VÌ 'COMPLETED'
                SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END) as count_success,
                SUM(CASE WHEN result = 'FAILED' THEN 1 ELSE 0 END) as count_failed,
                
                SUM(CASE WHEN source = 'AUTO' THEN 1 ELSE 0 END) as count_auto,
                SUM(CASE WHEN source != 'AUTO' THEN 1 ELSE 0 END) as count_manual
            FROM station_logs
            WHERE created_at BETWEEN ? AND ?
        `;
        
        const params = [start, end];

        if (stationId) {
            sql += " AND station_name = (SELECT station_name FROM stations WHERE station_id = ?)";
            params.push(stationId);
        }

        const [rows] = await webPool.query(sql, params);
        
        // Fix: Nếu không có dữ liệu, trả về object với các giá trị 0
        if (!rows[0]) {
            return { total: 0, count_on: 0, count_off: 0, count_success: 0, count_failed: 0, count_auto: 0, count_manual: 0 };
        }
        
        return rows[0];
    },

    async getChartData(startDate, endDate, stationId) {
        const start = startDate + ' 00:00:00';
        const end = endDate + ' 23:59:59';

        let sql = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                SUM(CASE WHEN action = 'ON' THEN 1 ELSE 0 END) as on_count,
                SUM(CASE WHEN action = 'OFF' THEN 1 ELSE 0 END) as off_count
            FROM station_logs
            WHERE created_at BETWEEN ? AND ?
        `;

        const params = [start, end];
        if (stationId) {
            sql += " AND station_name = (SELECT station_name FROM stations WHERE station_id = ?)";
            params.push(stationId);
        }
        sql += " GROUP BY date ORDER BY date ASC";

        const [rows] = await webPool.query(sql, params);
        return rows;
    },

    async getDetailLogs(startDate, endDate, stationId, limit = 100) {
        const start = startDate + ' 00:00:00';
        const end = endDate + ' 23:59:59';

        let sql = `
            SELECT 
                id, station_name, action, result, message, source, created_at,
                (SELECT identification_name FROM stations WHERE stations.station_name = station_logs.station_name LIMIT 1) as identification_name
            FROM station_logs
            WHERE created_at BETWEEN ? AND ?
        `;

        const params = [start, end];
        if (stationId) {
            sql += " AND station_name = (SELECT station_name FROM stations WHERE station_id = ?)";
            params.push(stationId);
        }
        sql += " ORDER BY created_at DESC LIMIT ?";
        params.push(limit);

        const [rows] = await webPool.query(sql, params);
        return rows;
    }
};

module.exports = ReportService;
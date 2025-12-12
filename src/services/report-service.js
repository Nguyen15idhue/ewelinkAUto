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

    async getDetailLogs(startDate, endDate, stationId, page = 1, perPage = 500) {
        const start = startDate + ' 00:00:00';
        const end = endDate + ' 23:59:59';

        // Count total rows for pagination
        let countSql = `SELECT COUNT(*) as total FROM station_logs WHERE created_at BETWEEN ? AND ?`;
        const countParams = [start, end];
        if (stationId) {
            countSql += " AND station_name = (SELECT station_name FROM stations WHERE station_id = ?)";
            countParams.push(stationId);
        }
        const [countRows] = await webPool.query(countSql, countParams);
        const total = countRows && countRows[0] ? countRows[0].total : 0;

        // If perPage is 'all' or non-positive, return all rows
        if (!perPage || perPage === 'all' || Number(perPage) <= 0) {
            let sqlAll = `
                SELECT id, station_name, action, result, message, source, created_at,
                    (SELECT identification_name FROM stations WHERE stations.station_name = station_logs.station_name LIMIT 1) as identification_name
                FROM station_logs
                WHERE created_at BETWEEN ? AND ?
                ORDER BY created_at DESC
            `;
            const paramsAll = [start, end];
            if (stationId) {
                sqlAll = sqlAll.replace('WHERE created_at BETWEEN ? AND ?', 'WHERE created_at BETWEEN ? AND ? AND station_name = (SELECT station_name FROM stations WHERE station_id = ?)');
                paramsAll.push(stationId);
            }
            const [allRows] = await webPool.query(sqlAll, paramsAll);
            return { rows: allRows, total };
        }

        const limit = Number(perPage) || 500;
        const offset = (Math.max(1, Number(page)) - 1) * limit;

        let sql = `
            SELECT id, station_name, action, result, message, source, created_at,
                (SELECT identification_name FROM stations WHERE stations.station_name = station_logs.station_name LIMIT 1) as identification_name
            FROM station_logs
            WHERE created_at BETWEEN ? AND ?
        `;
        const params = [start, end];
        if (stationId) {
            sql += " AND station_name = (SELECT station_name FROM stations WHERE station_id = ?)";
            params.push(stationId);
        }
        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const [rows] = await webPool.query(sql, params);
        return { rows, total };
    },

    async getToggleRanking(startDate, endDate, limit = 10, order = 'DESC') {
        const start = startDate + ' 00:00:00';
        const end = endDate + ' 23:59:59';

        const sql = `
            SELECT s.station_id, s.station_name, COALESCE(t.cnt,0) as toggles,
                s.identification_name
            FROM stations s
            LEFT JOIN (
                SELECT station_name, COUNT(*) as cnt
                FROM station_logs
                WHERE created_at BETWEEN ? AND ?
                GROUP BY station_name
            ) t ON t.station_name = s.station_name
            ORDER BY toggles ${order}
            LIMIT ?
        `;
        const [rows] = await webPool.query(sql, [start, end, Number(limit)]);
        return rows;
    }

    ,
    async getRecentLogs(limit = 100) {
        const l = Number(limit) || 100;
        const sql = `
            SELECT id, station_name, action, result, message, source, created_at,
                (SELECT identification_name FROM stations WHERE stations.station_name = station_logs.station_name LIMIT 1) as identification_name
            FROM station_logs
            ORDER BY created_at DESC
            LIMIT ?
        `;
        const [rows] = await webPool.query(sql, [l]);
        return rows;
    }
};

module.exports = ReportService;
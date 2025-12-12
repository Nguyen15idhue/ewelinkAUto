// File: src/routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const webPool = require('./database');
const { requireAuth } = require('./middleware');
const logic = require('./services/station-logic');
const queue = require('./services/queue-service');
const reportService = require('./services/report-service');
const { getLastLines, streamLogs } = require('./services/realtime-log-service');
// --- AUTH ROUTER ---
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await webPool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = { id: user.id, username: user.username, role: user.role };
                return res.redirect('/');
            }
        }
        res.render('login', { error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Lỗi hệ thống' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- MAIN ROUTES (Protected) ---

// 1. DASHBOARD
router.get('/', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search || '';
        const offset = (page - 1) * pageSize;

        let whereClause = '';
        let searchParams = [];
        if (search) {
            whereClause = `WHERE (s.station_name LIKE ? OR s.identification_name LIKE ?)`;
            searchParams = [`%${search}%`, `%${search}%`];
        }

        const countQuery = `SELECT COUNT(*) as total FROM stations s ${whereClause}`;
        const [countResult] = await webPool.query(countQuery, searchParams);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / pageSize);

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
            ${whereClause}
            ORDER BY s.station_name ASC
            LIMIT ? OFFSET ?
        `;

        const [stations] = await webPool.query(sqlMain, [...searchParams, pageSize, offset]);
        const [ewelinkList] = await webPool.query(`SELECT device_id, name, online FROM ewelink_devices ORDER BY name ASC`);
        const [countEwelink] = await webPool.query(`SELECT COUNT(*) as c FROM ewelink_devices WHERE online = 1`);
        const [countQueue] = await webPool.query(`SELECT COUNT(*) as c FROM command_queue WHERE status IN ('PENDING','PROCESSING','RETRY','VERIFYING')`);
        const [totalCountResult] = await webPool.query(`SELECT COUNT(*) as total FROM stations`);
        const [cgbasOnlineResult] = await webPool.query(`SELECT COUNT(*) as c FROM stations WHERE connect_status = 1`);

        const stats = {
            total: totalCountResult[0].total,
            cgbas_online: cgbasOnlineResult[0].c,
            ewelink_online: countEwelink[0].c,
            pending: countQueue[0].c
        };

        const targetState = logic.getTargetState();

        res.render('dashboard', { 
            stations, ewelinkList, stats,
            targetState: targetState || 'IDLE (Nghỉ)',
            user: req.session.user,
            currentPage: page, pageSize, totalPages, totalRecords, search
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("Lỗi Server: " + e.message);
    }
});

// 2. API: CẬP NHẬT MAPPING
router.post('/api/update-mapping', requireAuth, async (req, res) => {
    const { station_id, ewelink_id } = req.body;
    try {
        const deviceId = ewelink_id === "" ? null : ewelink_id;
        await webPool.query(`UPDATE stations SET ewelink_id = ? WHERE station_id = ?`, [deviceId, station_id]);
        res.json({ success: true, message: "Đã cập nhật thành công" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 3. API: BẬT/TẮT AUTOMATION
router.get('/toggle-auto/:id', requireAuth, async (req, res) => {
    try {
        await webPool.query(`UPDATE stations SET automation_status = 1 - automation_status WHERE station_id = ?`, [req.params.id]);
        res.redirect('/');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// 4. API: TRIGGER THỦ CÔNG
router.get('/trigger/:deviceId/:name/:cmd', requireAuth, async (req, res) => {
    const { deviceId, name, cmd } = req.params;
    await queue.addToQueue(name, deviceId, cmd, 'MANUAL');
    res.redirect('/');
});

// 5. API: TOGGLE GLOBAL AUTO
router.get('/toggle-global-auto', requireAuth, async (req, res) => {
    try {
        await webPool.query(`UPDATE stations SET automation_status = 1 - automation_status`);
        // If the client expects JSON (AJAX), return JSON. Otherwise redirect.
        const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
        if (wantsJson) return res.json({ success: true, message: 'Đã đổi chế độ Auto toàn cục.' });
        res.redirect('/');
    } catch (e) {
        const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
        if (wantsJson) return res.status(500).json({ success: false, message: e.message });
        res.status(500).send(e.message);
    }
});

// 6. API: TRIGGER ALL STATIONS
router.get('/trigger-all', requireAuth, async (req, res) => {
    try {
        const [stations] = await webPool.query(`SELECT station_name, ewelink_id FROM stations WHERE ewelink_id IS NOT NULL AND ewelink_id != ''`);
        const target = logic.getTargetState();
        if (target) {
            for (const station of stations) {
                await queue.addToQueue(station.station_name, station.ewelink_id, target, 'MANUAL_BULK');
            }
        }
        res.redirect('/');
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// 7. HISTORY MANAGEMENT PAGE (ĐÃ SỬA LỖI QUEUE NOT DEFINED)
router.get('/history', requireAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const perPage = Math.min(100, Math.max(5, parseInt(req.query.perPage) || 10));
        const offset = (page - 1) * perPage;

        const [countRows] = await webPool.query('SELECT COUNT(*) as total FROM station_logs');
        const total = countRows && countRows[0] ? parseInt(countRows[0].total, 10) : 0;
        const totalPages = Math.ceil(total / perPage) || 1;

        const historyQuery = `
            SELECT 
                h.id, h.station_name, h.device_id, h.action as command, h.result as status, h.created_at, h.created_at as completed_at,
                h.message as message, h.source, 0 as verify_attempts,
                s.identification_name
            FROM station_logs h
            LEFT JOIN stations s ON h.station_name = s.station_name
            ORDER BY h.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [history] = await webPool.query(historyQuery, [perPage, offset]);

        // --- KHẮC PHỤC LỖI Ở ĐÂY: LẤY DỮ LIỆU QUEUE ---
        const queueQuery = `
            SELECT 
                q.id, q.station_name, q.device_id, q.command_type as command, q.status, q.created_at, q.updated_at,
                q.retry_count, q.trigger_source as source,
                s.identification_name
            FROM command_queue q
            LEFT JOIN stations s ON q.station_name = s.station_name
            ORDER BY q.created_at ASC
        `;
        const [queueItems] = await webPool.query(queueQuery);

        res.render('history', {
            history: history,
            queue: queueItems, // Truyền biến queue để view không bị lỗi
            user: req.session.user,
            page: page, perPage, total, totalPages
        });
    } catch (e) {
        console.error('History page error:', e);
        res.status(500).send('Lỗi tải trang lịch sử: ' + e.message);
    }
});

// QUEUE PAGE
router.get('/queue', requireAuth, async (req, res) => {
    try {
        const queueQuery = `
            SELECT 
                q.id, q.station_name, q.device_id, q.command_type as command, q.status, q.created_at, q.updated_at,
                q.error_log as error_log, q.retry_count, q.trigger_source as source,
                s.identification_name
            FROM command_queue q
            LEFT JOIN stations s ON q.station_name = s.station_name
            ORDER BY q.created_at DESC LIMIT 500
        `;
        const [queueItems] = await webPool.query(queueQuery);
        res.render('queue', { queue: queueItems, user: req.session.user });
    } catch (e) {
        console.error('Queue page error:', e);
        res.status(500).send('Lỗi tải trang hàng đợi: ' + e.message);
    }
});

// ACTIONS: DELETE / CLEAR
router.post('/history/delete/:id', requireAuth, async (req, res) => {
    try {
        await webPool.query('DELETE FROM station_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa lịch sử' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/queue/delete/:id', requireAuth, async (req, res) => {
    try {
        await webPool.query('DELETE FROM command_queue WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa khỏi hàng đợi' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/history/clear', requireAuth, async (req, res) => {
    try {
        await webPool.query('DELETE FROM station_logs');
        res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/queue/clear-completed', requireAuth, async (req, res) => {
    try {
        await webPool.query("DELETE FROM command_queue WHERE status IN ('COMPLETED', 'FAILED')");
        res.json({ success: true, message: 'Đã xóa các lệnh đã hoàn thành' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});
// 8. REPORT PAGE
router.get('/report', requireAuth, async (req, res) => {
    try {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 6);
        const formatDate = (d) => d.toISOString().split('T')[0];

        const startDate = req.query.start || formatDate(lastWeek);
        const endDate = req.query.end || formatDate(today);
        const stationId = req.query.station_id || '';

        const page = Math.max(1, parseInt(req.query.page) || 1);
        let perPage = req.query.perPage || '500';
        if (perPage !== 'all') perPage = Number(perPage) || 500;

        const [stations, summary, chartData] = await Promise.all([
            reportService.getStationsList(),
            reportService.getSummaryStats(startDate, endDate, stationId),
            reportService.getChartData(startDate, endDate, stationId)
        ]);

        const detail = await reportService.getDetailLogs(startDate, endDate, stationId, page, perPage);
        const logs = detail.rows;
        const totalLogs = detail.total;
        const totalPages = perPage === 'all' ? 1 : Math.max(1, Math.ceil(totalLogs / Number(perPage)));

        // Toggle ranking (top and bottom)
        const topToggled = await reportService.getToggleRanking(startDate, endDate, 10, 'DESC');
        const leastToggled = await reportService.getToggleRanking(startDate, endDate, 10, 'ASC');

        res.render('report', {
            user: req.session.user,
            filter: { startDate, endDate, stationId, page, perPage },
            stations, summary, chartData, logs,
            pagination: { page, perPage, totalLogs, totalPages },
            topToggled, leastToggled
        });

    } catch (e) {
        console.error('Report error:', e);
        res.status(500).send('Lỗi tạo báo cáo: ' + e.message);
    }
});
// ==========================================

// ACTIONS
router.post('/history/delete/:id', requireAuth, async (req, res) => {
    try {
        await webPool.query('DELETE FROM station_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa lịch sử' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/queue/delete/:id', requireAuth, async (req, res) => {
    try {
        await webPool.query('DELETE FROM command_queue WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Đã xóa khỏi hàng đợi' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/history/clear', requireAuth, async (req, res) => {
    try {
        await webPool.query('DELETE FROM station_logs');
        res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

router.post('/queue/clear-completed', requireAuth, async (req, res) => {
    try {
        await webPool.query("DELETE FROM command_queue WHERE status IN ('COMPLETED', 'FAILED')");
        res.json({ success: true, message: 'Đã xóa các lệnh đã hoàn thành' });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

// 8. API: TẮT AUTO TOÀN CỤC
router.get('/disable-global-auto', requireAuth, async (req, res) => {
    try {
        await webPool.query(`UPDATE stations SET automation_status = 0`);
        res.json({ success: true, message: "Đã tắt chế độ tự động toàn cục." });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 9. API: HỦY TẤT CẢ HÀNG ĐỢI
router.get('/cancel-all-queue', requireAuth, async (req, res) => {
    try {
        await webPool.query(`UPDATE command_queue SET status = 'CANCELLED' WHERE status IN ('PENDING', 'PROCESSING', 'RETRY', 'VERIFYING')`);
        res.json({ success: true, message: "Đã hủy tất cả các hàng đợi." });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
router.get('/api/realtime-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    streamLogs(res);
});
router.get('/realtime', requireAuth, (req, res) => {
    res.render('realtime');
});
router.get('/api/realtime-snapshot', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const lines = getLastLines(limit);
    res.json({ success: true, lines });
});
module.exports = router;






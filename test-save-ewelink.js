const ewelink = require('./src/providers/ewelink-provider');
const db = require('./src/services/db-service');
const mysql = require('mysql2/promise');
const config = require('./config');

async function runTest() {
    console.log("=== TEST: LẤY VÀ LƯU TOÀN BỘ THIẾT BỊ EWELINK ===");

    try {
        // 1. Lấy danh sách từ API
        console.log("\n1. Đang gọi API lấy danh sách thiết bị...");
        const devices = await ewelink.getDeviceList();
        
        if (!devices || devices.length === 0) {
            console.log("❌ Không lấy được danh sách thiết bị. Kiểm tra lại API.");
            process.exit(1);
        }
        console.log(`-> API trả về: ${devices.length} thiết bị.`);

        // 2. Lưu vào Database
        console.log("\n2. Đang lưu vào MySQL bảng 'ewelink_devices'...");
        await db.saveEwelinkDevices(devices);
        
        // 3. Kiểm tra lại dữ liệu trong DB
        console.log("\n3. Truy vấn TOÀN BỘ từ MySQL...");
        const connection = await mysql.createConnection({
            host: config.MYSQL.HOST,
            user: config.MYSQL.USER,
            password: config.MYSQL.PASSWORD,
            database: config.MYSQL.DATABASE
        });

        // Query lấy hết, sắp xếp: Online lên trước, sau đó xếp theo Tên A-Z
        const [rows] = await connection.execute(
            `SELECT device_id, name, online, rssi, ch1_status, ch2_status, voltage 
             FROM ewelink_devices 
             ORDER BY online DESC, name ASC`
        );

        console.log(`-> Tìm thấy trong DB: ${rows.length} dòng.`);
        console.table(rows);
        
        if (rows.length === devices.length) {
            console.log(`\n✅ DỮ LIỆU KHỚP HOÀN TOÀN (${rows.length}/${devices.length})`);
        } else {
            console.log(`\n⚠️ CẢNH BÁO: Số lượng không khớp (API: ${devices.length}, DB: ${rows.length})`);
        }
        
        await connection.end();
        process.exit(0);

    } catch (e) {
        console.error("\n❌ LỖI:", e);
        process.exit(1);
    }
}

runTest();
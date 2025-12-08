const config = require('./config');
const cgbas = require('./src/providers/cgbas-provider');
const db = require('./src/services/db-service');
const logic = require('./src/services/station-logic');
const mysql = require('mysql2/promise'); // Dùng để query kiểm tra lại

async function runTest() {
    console.log("=== BẮT ĐẦU TEST TOÀN DIỆN (API -> DB) ===");

    try {
        // 1. Test gọi API Danh sách
        console.log("\n1. Đang lấy danh sách trạm (GET)...");
        const stations = await cgbas.getStationList();
        console.log(`-> Đã lấy được ${stations.length} trạm.`);

        // 2. Test gọi API Trạng thái
        console.log("\n2. Đang lấy trạng thái động (POST)...");
        const ids = stations.map(s => s.id);
        const statusMap = await cgbas.getStationStatus(ids);
        console.log(`-> Đã lấy được trạng thái của ${Object.keys(statusMap).length} trạm.`);

        // 3. Test Logic Gộp dữ liệu
        console.log("\n3. Đang gộp dữ liệu...");
        const mergedData = logic.mergeData(stations, statusMap);
        console.log(`-> Mẫu dữ liệu trạm đầu tiên:`);
        console.log(`   ID: ${mergedData[0].id}`);
        console.log(`   Tên: ${mergedData[0].stationName}`);
        console.log(`   Status: ${mergedData[0].currentStatus} (1=Online)`);

        // 4. Test Lưu vào MySQL
        console.log("\n4. Đang lưu vào MySQL...");
        await db.saveStations(mergedData);
        console.log("-> Hàm saveStations đã chạy xong.");

        // 5. [QUAN TRỌNG] Kiểm tra lại dữ liệu trong MySQL xem có thật không
        console.log("\n5. Đang Query ngược lại từ Database để kiểm chứng...");
        
        // Tạo kết nối riêng để check
        const connection = await mysql.createConnection({
            host: config.MYSQL.HOST,
            user: config.MYSQL.USER,
            password: config.MYSQL.PASSWORD,
            database: config.MYSQL.DATABASE
        });

        const [rows] = await connection.execute(
            'SELECT station_id, station_name, connect_status, last_updated FROM stations ORDER BY last_updated DESC LIMIT 5'
        );

        console.log("-> Kết quả SELECT từ DB (5 dòng mới nhất):");
        console.table(rows); // In bảng đẹp

        await connection.end();
        console.log("\n✅ TEST THÀNH CÔNG! Dữ liệu đã nằm trong MySQL.");
        process.exit(0);

    } catch (e) {
        console.error("\n❌ LỖI TEST:", e);
        process.exit(1);
    }
}

runTest();
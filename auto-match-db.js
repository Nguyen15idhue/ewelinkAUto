const mysql = require('mysql2/promise');
const config = require('./config'); // Sửa đường dẫn nếu file này nằm trong thư mục con
const cgbas = require('./src/providers/cgbas-provider');
const ewelink = require('./src/providers/ewelink-provider');
const db = require('./src/services/db-service'); // Để đảm bảo device ewelink được lưu trước

async function run() {
    console.log("=== AUTO MATCHING DB ===");
    const pool = mysql.createPool(config.MYSQL);

    try {
        // 1. Lấy dữ liệu mới nhất
        console.log("1. Đang lấy dữ liệu từ API...");
        const [cgbasList, ewelinkList] = await Promise.all([
            cgbas.getStationList(),
            ewelink.getDeviceList()
        ]);

        // 2. Lưu danh sách eWeLink vào DB trước để đảm bảo khóa ngoại
        console.log("2. Cập nhật eWeLink devices vào DB...");
        await db.saveEwelinkDevices(ewelinkList);

        // 3. Thực hiện ghép cặp
        console.log("3. Đang ghép cặp và update bảng Stations...");
        let count = 0;

        for (const station of cgbasList) {
            const stName = station.stationName.toUpperCase();
            
            // Tìm thiết bị eWeLink có tên chứa tên trạm
            const device = ewelinkList.find(d => 
                d.itemData.name.toUpperCase().includes(stName)
            );

            if (device) {
                // Update vào DB
                await pool.query(
                    `UPDATE stations SET ewelink_id = ? WHERE station_id = ?`,
                    [device.itemData.deviceid, station.id]
                );
                console.log(`   ✅ MATCH: [${station.stationName}] -> [${device.itemData.name}]`);
                count++;
            }
        }

        console.log(`\n🎉 Hoàn tất! Đã ghép cặp tự động ${count} trạm.`);

    } catch (e) {
        console.error("Lỗi:", e);
    } finally {
        await pool.end();
    }
}

run();
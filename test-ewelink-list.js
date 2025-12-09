const ewelink = require('./src/providers/ewelink-provider');
const config = require('./config');

async function runTest() {
    console.log("=== KIỂM TRA LẤY DANH SÁCH THIẾT BỊ EWELINK ===");
    console.log(`Tài khoản: ${config.EWELINK.EMAIL}`);
    console.log("-----------------------------------------------");

    try {
        // Gọi hàm lấy danh sách
        const devices = await ewelink.getDeviceList();

        if (devices && devices.length > 0) {
            console.log(`✅ LẤY THÀNH CÔNG! Tổng số thiết bị: ${devices.length}`);
            
            // Lọc ra các thông tin quan trọng để hiển thị cho gọn
            const simpleList = devices.map(d => {
                const data = d.itemData; // Dữ liệu chi tiết nằm trong itemData
                return {
                    "Tên thiết bị": data.name,
                    "Device ID": data.deviceid,
                    "Online": data.online ? "YES" : "NO",
                    "Model": data.productModel || "N/A"
                };
            });

            // In ra dạng bảng cho dễ nhìn
            console.table(simpleList);

        } else {
            console.log("⚠️ Danh sách trống hoặc không lấy được dữ liệu.");
            console.log("Lưu ý: Hãy chắc chắn tài khoản eWeLink này đã add thiết bị.");
        }

    } catch (e) {
        console.error("❌ LỖI TEST:", e);
    }
}

runTest();
const readline = require('readline');
const ewelink = require('./src/providers/ewelink-provider');
const config = require('./config');

// Tạo giao diện nhập liệu
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- CÁC HÀM LOGIC TEST ---

// 1. Hàm nhấn giữ (Simulation PC Power Button)
async function testPressAndHold(deviceId, channel, durationSec) {
    console.log(`\n--- TEST: NHẤN GIỮ KÊNH ${channel} TRONG ${durationSec} GIÂY ---`);
    
    console.log(`1. [${new Date().toLocaleTimeString()}] Đang BẬT kênh ${channel}...`);
    const onResult = await ewelink.toggleDevice(deviceId, channel, 'on');
    if (!onResult) { console.log("❌ Lỗi: Không bật được."); return; }
    
    console.log(`   -> Đã bật. Đang giữ ${durationSec}s...`);
    
    // Đếm ngược cho sinh động
    for (let i = durationSec; i > 0; i--) {
        process.stdout.write(`${i}... `);
        await delay(1000);
    }
    console.log("0");

    console.log(`2. [${new Date().toLocaleTimeString()}] Đang TẮT kênh ${channel}...`);
    const offResult = await ewelink.toggleDevice(deviceId, channel, 'off');
    
    if (offResult) console.log("✅ THÀNH CÔNG: Đã nhả nút.");
    else console.log("❌ Lỗi: Không tắt được (Nguy hiểm: Có thể bị dính phím).");
}

// 2. Hàm test Retry (Robust)
// Hàm này giả lập việc thử lại nhiều lần nếu mạng chập chờn
async function testRobustRetry(deviceId, channel, state) {
    console.log(`\n--- TEST: CƠ CHẾ ROBUST (THỬ LẠI KHI MẤT MẠNG) ---`);
    console.log(`Lệnh: Kênh ${channel} -> ${state.toUpperCase()}`);
    console.log(`(Mẹo: Trong lúc code chạy, bạn có thể thử ngắt mạng 1-2s để xem nó có retry không)`);

    let maxRetries = 5;
    let attempt = 1;

    while (attempt <= maxRetries) {
        console.log(`\n👉 Lần thử thứ ${attempt}/${maxRetries}...`);
        
        // Gọi lệnh thật
        const success = await ewelink.toggleDevice(deviceId, channel, state);
        
        if (success) {
            console.log(`✅ THÀNH CÔNG ở lần thử thứ ${attempt}.`);
            return;
        } else {
            console.log(`⚠️ THẤT BẠI. Đang chờ 3s thử lại...`);
            await delay(3000);
            attempt++;
        }
    }
    console.log("❌ ĐÃ THẤT BẠI HOÀN TOÀN SAU 5 LẦN THỬ.");
}

// --- MAIN MENU ---

async function main() {
    console.clear();
    console.log("===========================================");
    console.log("   TOOL TEST ĐIỀU KHIỂN THỦ CÔNG EWELINK");
    console.log("===========================================");

    // 1. Nhập Device ID
    // Có thể nhập tay hoặc Enter để lấy ID mặc định (nếu bạn lười copy)
    // Bạn có thể sửa ID mặc định dưới đây cho nhanh:
    const DEFAULT_ID = ""; 
    
    let deviceId = await ask(`Nhập Device ID (Enter để dùng '${DEFAULT_ID}'): `);
    if (!deviceId) deviceId = DEFAULT_ID;

    if (!deviceId) {
        console.log("❌ Chưa nhập Device ID.");
        process.exit(0);
    }

    // 2. Lấy trạng thái hiện tại
    console.log(`\nĐang kết nối và lấy trạng thái thiết bị: ${deviceId}...`);
    const status = await ewelink.getDeviceState(deviceId);
    if (status) {
        console.log("-> Trạng thái hiện tại:", JSON.stringify(status.switches || status));
    } else {
        console.log("⚠️ Cảnh báo: Không lấy được trạng thái (có thể Offline hoặc sai ID), nhưng vẫn cho phép gửi lệnh.");
    }

    // 3. Vòng lặp Menu
    while (true) {
        console.log("\n-------------------------------------------");
        console.log(`THIẾT BỊ: ${deviceId}`);
        console.log("1. BẬT Kênh 1 (Cấp nguồn)");
        console.log("2. TẮT Kênh 1 (Ngắt nguồn)");
        console.log("3. BẬT Kênh 2");
        console.log("4. TẮT Kênh 2");
        console.log("5. [TEST] Nhấn giữ Kênh 2 (5 giây) - Giả lập nút nguồn PC");
        console.log("6. [TEST] Robust Retry Kênh 1 ON (Test mạng lag)");
        console.log("7. Nhập ID khác");
        console.log("0. Thoát");
        console.log("-------------------------------------------");

        const choice = await ask("Chọn chức năng (0-7): ");

        switch (choice) {
            case '1':
                await ewelink.toggleDevice(deviceId, 1, 'on') 
                    ? console.log("✅ Đã gửi lệnh BẬT CH1") : console.log("❌ Thất bại");
                break;
            case '2':
                await ewelink.toggleDevice(deviceId, 1, 'off') 
                    ? console.log("✅ Đã gửi lệnh TẮT CH1") : console.log("❌ Thất bại");
                break;
            case '3':
                await ewelink.toggleDevice(deviceId, 2, 'on') 
                    ? console.log("✅ Đã gửi lệnh BẬT CH2") : console.log("❌ Thất bại");
                break;
            case '4':
                await ewelink.toggleDevice(deviceId, 2, 'off') 
                    ? console.log("✅ Đã gửi lệnh TẮT CH2") : console.log("❌ Thất bại");
                break;
            case '5':
                // Test nhấn giữ 5s
                await testPressAndHold(deviceId, 2, 5);
                break;
            case '6':
                // Test retry
                await testRobustRetry(deviceId, 1, 'on');
                break;
            case '7':
                deviceId = await ask("Nhập Device ID mới: ");
                break;
            case '0':
                console.log("Tạm biệt!");
                process.exit(0);
                break;
            default:
                console.log("Lựa chọn không hợp lệ.");
        }
    }
}

main();
const readline = require('readline');
const ewelink = require('./src/providers/ewelink-provider');

// Cấu hình độ kiên trì của hệ thống
const MAX_RETRIES = 5;      // Số lần thử lại tối đa
const WAIT_FOR_UPDATE = 3000; // Thời gian chờ (ms) sau khi gửi lệnh để check lại

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * HÀM QUAN TRỌNG NHẤT: Gửi lệnh và Xác minh thực tế
 * Nếu thiết bị báo Online nhưng không thực hiện -> Hàm này sẽ bắt được lỗi và thử lại
 */
async function reliableSwitch(deviceId, channel, targetState) {
    let attempt = 1;
    
    console.log(`\n🔹 [BẮT ĐẦU] Kênh ${channel} -> ${targetState.toUpperCase()}`);

    while (attempt <= MAX_RETRIES) {
        process.stdout.write(`   Attempt ${attempt}/${MAX_RETRIES}: Gửi lệnh... `);
        
        // 1. Gửi lệnh điều khiển
        const sent = await ewelink.toggleDevice(deviceId, channel, targetState);
        
        if (!sent) {
            console.log("❌ Lỗi mạng (Send Failed).");
            // Không break, để nó chạy xuống phần wait và retry
        } else {
            console.log("📡 Đã gửi. Đang chờ xác minh...");
        }

        // 2. Chờ thiết bị cập nhật trạng thái lên Cloud
        await delay(WAIT_FOR_UPDATE);

        // 3. KIỂM TRA LẠI TRẠNG THÁI (VERIFY)
        // Đây là bước quan trọng để biết thiết bị có thực sự nhận lệnh hay không
        const status = await ewelink.getDeviceState(deviceId);
        
        if (!status) {
            console.log("   ⚠️ Không lấy được trạng thái (Device Offline?). Thử lại...");
        } else {
            // Lấy trạng thái của kênh hiện tại
            // eWeLink trả về switches array. Outlet 0 là CH1, Outlet 1 là CH2
            const currentSwitch = status.switches[channel - 1].switch; // 'on' hoặc 'off'
            
            if (currentSwitch === targetState) {
                console.log(`   ✅ [XÁC MINH OK] Thiết bị báo Kênh ${channel} đã ${targetState.toUpperCase()}.`);
                return true; // Thành công tuyệt đối
            } else {
                console.log(`   ❌ [SAI TRẠNG THÁI] Muốn ${targetState} nhưng thiết bị vẫn ${currentSwitch}. (Có thể thiết bị treo/lag).`);
            }
        }

        attempt++;
        if (attempt <= MAX_RETRIES) {
            console.log(`   Thinking: Thử gửi lại lệnh sau 2s...`);
            await delay(2000);
        }
    }

    console.log(`⛔ [THẤT BẠI] Đã thử ${MAX_RETRIES} lần nhưng thiết bị không phản hồi đúng.`);
    return false;
}

/**
 * Quy trình BẬT TRẠM an toàn (Sequence ON)
 */
async function robustSequenceOn(deviceId) {
    console.log("\n=========================================");
    console.log("   TEST QUY TRÌNH BẬT TRẠM (ROBUST)");
    console.log("=========================================");

    // B1: Cấp nguồn (CH1 ON)
    console.log("\n➡️ BƯỚC 1: Cấp nguồn (Bật Kênh 1)");
    if (!await reliableSwitch(deviceId, 1, 'on')) {
        console.log("🚨 HỦY QUY TRÌNH: Không bật được nguồn tổng.");
        return;
    }

    // B2: Chờ 10s (Giả lập chờ mainboard có điện)
    console.log("\n⏳ Chờ 10 giây để mainboard ổn định...");
    for(let i=10; i>0; i--) { process.stdout.write(`${i} `); await delay(1000); }
    console.log("");

    // B3: Nhấn nút nguồn (CH2 ON)
    console.log("\n➡️ BƯỚC 2: Nhấn nút nguồn (Bật Kênh 2)");
    if (!await reliableSwitch(deviceId, 2, 'on')) {
        console.log("🚨 HỦY QUY TRÌNH: Không kích được nút nguồn.");
        // Tùy chọn: Có thể tắt CH1 để reset lại từ đầu
        return;
    }

    // B4: Giữ 5s
    console.log("\n⏳ Giữ nút nguồn 5 giây...");
    await delay(5000);

    // B5: Nhả nút nguồn (CH2 OFF)
    console.log("\n➡️ BƯỚC 3: Nhả nút nguồn (Tắt Kênh 2)");
    // Lưu ý: Bước này cực quan trọng. Nếu không tắt được CH2, máy tính sẽ bị tắt cưỡng bức.
    // Nên ta có thể tăng số lần retry ở riêng bước này hoặc cảnh báo mạnh.
    if (!await reliableSwitch(deviceId, 2, 'off')) {
        console.log("🔥 NGUY HIỂM: Không nhả được nút nguồn! Thiết bị đang bị dính phím!");
    } else {
        console.log("\n✅✅✅ QUY TRÌNH BẬT TRẠM HOÀN TẤT THÀNH CÔNG!");
    }
}

/**
 * Quy trình TẮT TRẠM an toàn (Sequence OFF)
 */
async function robustSequenceOff(deviceId) {
    console.log("\n=========================================");
    console.log("   TEST QUY TRÌNH TẮT TRẠM (ROBUST)");
    console.log("=========================================");

    // B1: Nhấn giữ nút nguồn (CH2 ON)
    console.log("\n➡️ BƯỚC 1: Nhấn giữ nút nguồn (Bật Kênh 2)");
    if (!await reliableSwitch(deviceId, 2, 'on')) return;

    // B2: Giữ 5s để Force Shutdown Win
    console.log("\n⏳ Giữ nút nguồn 5 giây để tắt Win...");
    await delay(5000);

    // B3: Nhả nút nguồn
    console.log("\n➡️ BƯỚC 2: Nhả nút nguồn (Tắt Kênh 2)");
    if (!await reliableSwitch(deviceId, 2, 'off')) console.log("⚠️ Cảnh báo: Không tắt được CH2.");

    // B4: Chờ 10s tắt hẳn
    console.log("\n⏳ Chờ 10 giây cho hệ thống tắt hẳn...");
    for(let i=10; i>0; i--) { process.stdout.write(`${i} `); await delay(1000); }
    console.log("");

    // B5: Ngắt nguồn tổng (CH1 OFF)
    console.log("\n➡️ BƯỚC 3: Cắt nguồn tổng (Tắt Kênh 1)");
    if (!await reliableSwitch(deviceId, 1, 'off')) {
        console.log("⚠️ Cảnh báo: Không cắt được nguồn tổng.");
    } else {
        console.log("\n✅✅✅ QUY TRÌNH TẮT TRẠM HOÀN TẤT THÀNH CÔNG!");
    }
}

async function main() {
    console.clear();
    const deviceId = await ask("Nhập Device ID cần test: ");
    if (!deviceId) process.exit(0);

    while(true) {
        console.log(`\n--- DEVICE: ${deviceId} ---`);
        console.log("1. Test BẬT TRẠM (Full Process: CH1->Wait->CH2)");
        console.log("2. Test TẮT TRẠM (Full Process: CH2->Wait->CH1)");
        console.log("3. Test Lẻ: Bật/Tắt Kênh 1 (Reliable)");
        console.log("4. Test Lẻ: Bật/Tắt Kênh 2 (Reliable)");
        console.log("0. Thoát");
        
        const c = await ask("Chọn: ");
        if (c === '0') process.exit(0);
        if (c === '1') await robustSequenceOn(deviceId);
        if (c === '2') await robustSequenceOff(deviceId);
        if (c === '3') {
            const s = await ask("Muốn on hay off? ");
            await reliableSwitch(deviceId, 1, s);
        }
        if (c === '4') {
            const s = await ask("Muốn on hay off? ");
            await reliableSwitch(deviceId, 2, s);
        }
    }
}

main();
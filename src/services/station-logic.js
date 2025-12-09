const config = require('../../config');
const ewelink = require('../providers/ewelink-provider');
const cgbas = require('../providers/cgbas-provider'); // Import thêm để check trạng thái CGBAS

// Hàm delay (ms)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * HÀM CỐT LÕI: Gửi lệnh và Kiểm tra chéo (Strict Verification)
 * Trả về TRUE nếu thành công, FALSE nếu thất bại
 */
async function strictSwitch(deviceId, channel, targetState) {
    let retries = 3; 
    console.log(`      [Strict] Thực hiện: CH${channel} -> ${targetState.toUpperCase()}`);

    while (retries > 0) {
        // 1. Gửi lệnh
        const sent = await ewelink.toggleDevice(deviceId, channel, targetState);
        
        // 2. Chờ thiết bị phản hồi
        await delay(3000); 

        // 3. Verify ngay lập tức
        const realState = await ewelink.getDeviceChannelState(deviceId, channel);
        
        if (realState === targetState) {
            console.log(`      -> ✅ VERIFIED: CH${channel} đã ${realState}.`);
            return true; 
        }
        
        console.log(`      -> ⚠️ Lệnh chưa ăn (Thực tế: ${realState}). Thử lại... (${retries-1})`);
        retries--;
        if (retries > 0) await delay(2000);
    }
    
    console.error(`      -> ❌ THẤT BẠI: CH${channel} không thể chuyển sang ${targetState}.`);
    return false;
}

// --- Helper Functions ---
function getTargetState() {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    
    // Helper đổi giờ string sang phút
    const toMins = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    };

    const onStart = toMins(config.TIME.ON_START);
    const onEnd = toMins(config.TIME.ON_END);
    const offStart = toMins(config.TIME.OFF_START);
    const offEnd = toMins(config.TIME.OFF_END);

    // 1. Kiểm tra khung giờ BẬT (05:00 -> 23:00)
    if (cur >= onStart && cur < onEnd) {
        return 'ON';
    }

    // 2. Kiểm tra khung giờ TẮT (23:30 -> 04:30 hôm sau)
    // Xử lý logic qua đêm (VD: bắt đầu 23:30, kết thúc 04:30 nhỏ hơn)
    if (offStart > offEnd) {
        // Qua đêm: Lớn hơn 23:30 HOẶC Nhỏ hơn 04:30
        if (cur >= offStart || cur < offEnd) return 'OFF';
    } else {
        // Trong ngày (ít gặp cho giờ tắt): VD 12:00 -> 13:00
        if (cur >= offStart && cur < offEnd) return 'OFF';
    }

    // 3. Các khoảng còn lại (23:00-23:30 và 04:30-05:00)
    return null; // IDLE - Không làm gì cả
}

function mergeData(staticList, dynamicMap) {
    return staticList.map(station => ({
        ...station,
        currentStatus: dynamicMap[station.id] !== undefined ? dynamicMap[station.id] : 0
    }));
}

// ============================================================
// QUY TRÌNH ĐIỀU KHIỂN THÔNG MINH (SMART SEQUENTIAL)
// ============================================================

/**
 * QUY TRÌNH BẬT (SEQUENCE ON)
 * Yêu cầu tiên quyết: CH1 phải ON thành công thì mới được làm tiếp.
 */
async function sequenceOn(name, deviceId) {
    console.log(`\n[${name}] ▶ BẮT ĐẦU QUY TRÌNH BẬT...`);

    // BƯỚC 1: CẤP NGUỒN TỔNG (CH1 -> ON)
    // Chốt chặn 1: Bật nguồn phải thành công
    if (!await strictSwitch(deviceId, 1, 'on')) {
        throw new Error("DỪNG: Không bật được Kênh 1 (Nguồn tổng).");
    }

    console.log(`[${name}] ...Nguồn đã có. Chờ 10s cho Mainboard...`);
    await delay(10000);

    // BƯỚC 2: KÍCH NÚT NGUỒN (CH2)
    // Nhấn xuống
    if (!await strictSwitch(deviceId, 2, 'on')) throw new Error("Lỗi: Không nhấn được nút nguồn (CH2).");
    
    await delay(5000); // Giữ 5s
    
    // Nhả ra
    if (!await strictSwitch(deviceId, 2, 'off')) throw new Error("Lỗi: Không nhả được nút nguồn (CH2).");

    console.log(`[${name}] ✅ QUY TRÌNH BẬT HOÀN TẤT.`);
    return true;
}

/**
 * QUY TRÌNH TẮT (SEQUENCE OFF)
 * Thông minh: Check CGBAS để biết có cần Soft Shutdown không.
 * Kết thúc: Bắt buộc CH1 phải OFF.
 */
async function sequenceOff(name, deviceId) {
    console.log(`\n[${name}] ▶ BẮT ĐẦU QUY TRÌNH TẮT...`);

    // 1. Phân tích tình huống: Có cần nhấn nút tắt máy không?
    let needSoftShutdown = true;
    try {
        // Check trạng thái CGBAS hiện tại
        const stations = await cgbas.getStationList();
        const st = stations.find(s => s.stationName === name);
        if (st) {
            const statusMap = await cgbas.getStationStatus([st.id]);
            if (statusMap[st.id] !== 1) { // 1 là Online -> Khác 1 là Offline
                needSoftShutdown = false;
                console.log(`      -> Phát hiện CGBAS đã Offline. BỎ QUA bước nhấn nút nguồn.`);
            }
        }
    } catch (e) {
        console.warn("      -> Không check được CGBAS, chạy quy trình đầy đủ cho an toàn.");
    }

    // 2. Thực hiện Soft Shutdown (Chỉ khi máy đang chạy)
    if (needSoftShutdown) {
        // Nhấn nút
        if (!await strictSwitch(deviceId, 2, 'on')) throw new Error("Lỗi: Không kích được nút tắt nguồn.");
        await delay(5000);
        // Nhả nút
        if (!await strictSwitch(deviceId, 2, 'off')) throw new Error("NGUY HIỂM: Kẹt nút nguồn.");
        
        console.log(`[${name}] ...Chờ 10s tắt Win...`);
        await delay(10000);
    }

    // 3. NGẮT NGUỒN TỔNG (CH1 -> OFF)
    // Đây là bước quan trọng nhất
    if (!await strictSwitch(deviceId, 1, 'off')) {
        throw new Error("THẤT BẠI: Không tắt được Kênh 1. Trạm vẫn có điện!");
    }

    console.log(`[${name}] ✅ QUY TRÌNH TẮT HOÀN TẤT.`);
    return true;
}

module.exports = { getTargetState, mergeData, sequenceOff, sequenceOn };
const config = require('../../config');
const ewelink = require('../providers/ewelink-provider');

// Hàm delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Hàm Bọc Retry: Chống rớt mạng
async function robustSwitch(deviceId, channel, state) {
    let retries = config.SYSTEM.RETRY_COUNT;
    while (retries > 0) {
        console.log(`   -> Gửi lệnh: ${deviceId} CH${channel} [${state}] (Còn ${retries} lần thử)`);
        const success = await ewelink.toggleDevice(deviceId, channel, state);
        if (success) return true;
        
        retries--;
        await delay(config.SYSTEM.RETRY_DELAY_MS);
    }
    console.error(`   -> THẤT BẠI sau cùng: ${deviceId} CH${channel}`);
    return false;
}

// Logic xác định BẬT hay TẮT dựa vào giờ
function getTargetState() {
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    
    const [offH, offM] = config.TIME.OFF_START.split(':').map(Number);
    const [onH, onM] = config.TIME.ON_START.split(':').map(Number);
    
    const offTime = offH * 60 + offM;
    const onTime = onH * 60 + onM;

    // Logic 23:30 -> 05:00 là OFF
    if (curMin >= offTime || curMin < onTime) return 'OFF';
    return 'ON';
}

// Quy trình TẮT
async function sequenceOff(name, deviceId) {
    console.log(`\n[${name}] Bắt đầu quy trình TẮT...`);
    // B1: Giữ nguồn (CH2 ON)
    if (!await robustSwitch(deviceId, 2, 'on')) return;
    await delay(5000); // 5s
    // B2: Nhả nguồn (CH2 OFF)
    if (!await robustSwitch(deviceId, 2, 'off')) return;
    
    console.log(`[${name}] Đang chờ 10s tắt Win...`);
    await delay(10000); // 10s
    
    // B3: Ngắt điện (CH1 OFF)
    await robustSwitch(deviceId, 1, 'off');
    console.log(`[${name}] Hoàn tất TẮT.\n`);
}

// Quy trình BẬT
async function sequenceOn(name, deviceId) {
    console.log(`\n[${name}] Bắt đầu quy trình BẬT...`);
    // B1: Cấp điện (CH1 ON)
    if (!await robustSwitch(deviceId, 1, 'on')) return;
    
    console.log(`[${name}] Chờ 10s mainboard có điện...`);
    await delay(10000); // 10s
    
    // B2: Nhấn nguồn (CH2 ON)
    if (!await robustSwitch(deviceId, 2, 'on')) return;
    await delay(5000); // 5s
    // B3: Nhả nguồn (CH2 OFF)
    await robustSwitch(deviceId, 2, 'off');
    console.log(`[${name}] Hoàn tất BẬT.\n`);
}
function mergeData(staticList, dynamicMap) {
    return staticList.map(station => {
        // Lấy trạng thái từ Map, mặc định là 0 (Unknown) nếu không tìm thấy
        const status = dynamicMap[station.id] !== undefined ? dynamicMap[station.id] : 0;
        
        return {
            ...station, // Copy toàn bộ dữ liệu tĩnh (tên, lat, lng...)
            currentStatus: status // Thêm trường trạng thái mới nhất
        };
    });
}

module.exports = { getTargetState, sequenceOff, sequenceOn, mergeData };
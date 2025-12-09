const queue = require('./src/services/queue-service');
const logic = require('./src/services/station-logic');
const ewelink = require('./src/providers/ewelink-provider');
const cgbas = require('./src/providers/cgbas-provider'); // Cần để verify CGBAS
const db = require('./src/services/db-service');

// CẤU HÌNH HIỆU SUẤT
const CONCURRENCY_LIMIT = 5; 
const SCAN_INTERVAL = 5000; 

// =========================================================
// 1. NHIỆM VỤ THỰC THI (EXECUTE TASK)
// =========================================================
async function executeTask(task) {
    console.log(`⚡ [Start] Task ${task.id}: ${task.command_type} trạm ${task.station_name}`);
    await queue.updateStatus(task.id, 'PROCESSING');

    try {
        // A. Check Online (Quan trọng: Check tại thời điểm thực thi)
        const isOnline = await ewelink.isDeviceOnline(task.device_id);
        if (!isOnline) {
            // Nếu Offline -> Ném lỗi để xuống Catch -> Chuyển thành RETRY
            throw new Error("Thiết bị đang Offline. Đợi thử lại sau...");
        }

        // B. Thực thi Sequence (Strict)
        if (task.command_type === 'ON') {
            await logic.sequenceOn(task.station_name, task.device_id);
        } else {
            await logic.sequenceOff(task.station_name, task.device_id);
        }

        // C. Thành công bước đầu -> Chuyển sang chờ xác thực (2 phút)
        await queue.markAsVerifying(task.id, 2); 
        console.log(`⏳ [Wait Verify] Task ${task.id} đã chạy xong. Chờ 2p để xác thực...`);
        
    } catch (error) {
        console.error(`❌ [Fail] Task ${task.id}: ${error.message}`);
        
        // Nếu đã hết số lần Retry -> FAILED
        if (task.retry_count >= 10) {
            await queue.updateStatus(task.id, 'FAILED', error.message);

            // --- GHI LOG THẤT BẠI ---
            const db = require('./src/services/db-service');
            await db.addLog(
                task.station_name, 
                task.device_id, 
                task.command_type, 
                task.trigger_source || 'AUTO', 
                'FAILED', 
                error.message
            );
        } else {
            await queue.updateStatus(task.id, 'RETRY', error.message);
        }
    }
}

// =========================================================
// 2. NHIỆM VỤ XÁC THỰC (VERIFY TASK)
// =========================================================
async function verifyTask(task) {
    console.log(`🔍 [Verifying] Task ${task.id}: Kiểm tra kết quả ${task.command_type} trạm ${task.station_name}...`);
    
    try {
        // Lấy trạng thái CGBAS hiện tại
        // Lưu ý: Cần lấy ID trạm từ tên hoặc lưu station_id vào queue thì tốt hơn.
        // Ở đây ta chấp nhận query lại list để tìm ID (hơi chậm chút nhưng an toàn)
        const stations = await cgbas.getStationList();
        const station = stations.find(s => s.stationName === task.station_name);
        
        if (!station) {
            throw new Error("Không tìm thấy trạm trong CGBAS để verify");
        }

        // Lấy status dynamic
        const statusMap = await cgbas.getStationStatus([station.id]);
        const isCgbasOnline = (statusMap[station.id] === 1);

        // Lấy trạng thái eWeLink Kênh 1
        const ch1State = await ewelink.getDeviceChannelState(task.device_id, 1);

        // --- LOGIC KIỂM TRA KẾT QUẢ ---
        let success = false;
        let msg = "";

        if (task.command_type === 'OFF') {
            // Mục tiêu: CGBAS Offline VÀ CH1 OFF
            if (!isCgbasOnline && ch1State === 'off') {
                success = true;
                msg = "Xác thực TẮT thành công (CGBAS Off + CH1 Off)";
            } else {
                msg = `Thất bại: CGBAS=${isCgbasOnline?'On':'Off'}, CH1=${ch1State}`;
            }
        } 
        else if (task.command_type === 'ON') {
            // Mục tiêu: CGBAS Online VÀ CH1 ON
            if (isCgbasOnline && ch1State === 'on') {
                success = true;
                msg = "Xác thực BẬT thành công (CGBAS On + CH1 On)";
            } else {
                // Lưu ý: CGBAS có thể lên chậm, nhưng CH1 bắt buộc phải ON
                if (ch1State === 'on') {
                    success = true; 
                    msg = "Chấp nhận BẬT thành công (CH1 đã On, CGBAS đang lên)";
                } else {
                    msg = `Thất bại: CH1 vẫn đang ${ch1State}`;
                }
            }
        }

       if (success) {
            await queue.updateStatus(task.id, 'COMPLETED', msg);
            console.log(`✅ [Verified] Task ${task.id}: ${msg}`);

            // --- GHI LOG VÀO HISTORY ---
            const db = require('./src/services/db-service'); // Import ở đầu file nếu chưa có
            await db.addLog(
                task.station_name, 
                task.device_id, 
                task.command_type, 
                task.trigger_source || 'AUTO', // Lấy nguồn từ queue
                'SUCCESS', 
                msg
            );
        } else {
            // Nếu verify sai -> Chuyển về RETRY để chạy lại quy trình từ đầu!
            console.warn(`⚠️ [Verify Fail] Task ${task.id}: ${msg} -> Retry lại sequence.`);
            await queue.updateStatus(task.id, 'RETRY', msg);
        }

    } catch (e) {
        console.error(`❌ [Verify Error] ${e.message}`);
        // Lỗi lúc verify thì cho check lại sau
        // await queue.markAsVerifying(task.id, 1); 
    }
}

// =========================================================
// MAIN LOOPS
// =========================================================

async function runWorker() {
    try {
        // 1. Xử lý lệnh PENDING/RETRY
        const tasks = await queue.getPendingTasks(CONCURRENCY_LIMIT);
        if (tasks.length > 0) {
            const promises = tasks.map(task => executeTask(task));
            await Promise.all(promises);
        }

        // 2. Xử lý lệnh cần VERIFY (Đã đến giờ check)
        const verifyTasks = await queue.getTasksToVerify(5);
        if (verifyTasks.length > 0) {
            const promises = verifyTasks.map(t => verifyTask(t));
            await Promise.all(promises);
        }

    } catch (e) {
        console.error("Lỗi Worker:", e);
    }
}

// Chạy vòng lặp
console.log("🚀 Queue Worker (Strict Mode) đã khởi động...");
async function start() {
    while (true) {
        await runWorker();
        await new Promise(r => setTimeout(r, SCAN_INTERVAL));
    }
}
start();
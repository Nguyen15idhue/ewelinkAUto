const config = require('./config');
const cgbas = require('./src/providers/cgbas-provider');

async function runTest() {
    console.log("=========================================");
    console.log("   KIỂM TRA KẾT NỐI API CGBAS PRO");
    console.log("=========================================");
    console.log(`Host: ${config.CGBAS.HOST}`);
    console.log(`AK: ...${config.CGBAS.AK.slice(-4)}`); // Ẩn bớt key
    console.log("-----------------------------------------");

    // --- TEST 1: Lấy danh sách trạm ---
    console.log("\n1. [TEST GET] /stations - Lấy danh sách trạm...");
    const startTime = Date.now();
    
    try {
        const stations = await cgbas.getStationList();
        const duration = Date.now() - startTime;

        if (stations && stations.length > 0) {
            console.log(`✅ THÀNH CÔNG (${duration}ms)`);
            console.log(`-> Tổng số trạm tìm thấy: ${stations.length}`);
            
            // In ra thông tin trạm đầu tiên để đối chiếu
            const firstStation = stations[0];
            console.log("-> Dữ liệu mẫu trạm đầu tiên:");
            console.log(`   - ID: ${firstStation.id}`);
            console.log(`   - Tên: ${firstStation.stationName}`);
            console.log(`   - IP/Location: ${firstStation.identificationName}`);

            // --- TEST 2: Lấy trạng thái Online/Offline ---
            console.log("\n2. [TEST POST] /dynamic-info - Lấy trạng thái trạm...");
            
            // Lấy 3 ID đầu tiên để test (hoặc ít hơn nếu ko đủ)
            const testIds = stations.slice(0, 3).map(s => s.id);
            console.log(`-> Gửi payload kiểm tra các ID: ${JSON.stringify(testIds)}`);
            
            const statusStart = Date.now();
            const statusMap = await cgbas.getStationStatus(testIds);
            const statusDuration = Date.now() - statusStart;

            // Kiểm tra kết quả trả về
            if (Object.keys(statusMap).length > 0) {
                console.log(`✅ THÀNH CÔNG (${statusDuration}ms)`);
                console.log("-> Kết quả trạng thái:");
                testIds.forEach(id => {
                    const stName = stations.find(s => s.id == id).stationName;
                    const status = statusMap[id];
                    // Theo tài liệu: 1 là Online
                    const statusText = (status === 1) ? "ONLINE (Bình thường)" : `OFFLINE/LỖI (Mã: ${status})`;
                    console.log(`   - Trạm ${stName} (ID: ${id}): ${statusText}`);
                });
            } else {
                console.log("⚠️ CẢNH BÁO: API trả về thành công nhưng không có dữ liệu status.");
                console.log("Response Raw:", statusMap);
            }

        } else {
            console.log("❌ THẤT BẠI: API trả về danh sách rỗng hoặc null.");
            console.log("Hãy kiểm tra lại AK/SK hoặc quyền truy cập của tài khoản.");
        }

    } catch (e) {
        console.log("❌ LỖI NGHIÊM TRỌNG (EXCEPTION):");
        console.log(e);
    }
}

runTest();
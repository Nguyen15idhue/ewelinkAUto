const axios = require('axios');
const fs = require('fs');
const config = require('./config');

const TOKEN_FILE = 'ewelink-tokens.json';

if (!fs.existsSync(TOKEN_FILE)) {
    console.error("❌ Không tìm thấy file ewelink-tokens.json");
    process.exit(1);
}

const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const AT = tokenData.at;

// DANH SÁCH MỞ RỘNG CÁC HOST CỦA EWELINK
const HOSTS = [
    // Server chuẩn cho Open API v2 (Có chữ 'apia')
    "https://as-apia.coolkit.cc",  // Châu Á
    "https://us-apia.coolkit.cc",  // Châu Mỹ
    "https://eu-apia.coolkit.cc",  // Châu Âu
    "https://cn-apia.coolkit.cn",  // Trung Quốc
    
    // Server thay thế (ewelink.cc)
    "https://as-api.ewelink.cc",
    "https://us-api.ewelink.cc",
    "https://eu-api.ewelink.cc",

    // Server Legacy (Thử không port và có port)
    "https://api.coolkit.cc:8080", // Server gốc
    "https://as-api.coolkit.cc",
    "https://us-api.coolkit.cc",
];

async function checkHost(url) {
    try {
        // Gọi API nhẹ nhất: Lấy thông tin gia đình (Family) thay vì Device
        // Endpoint: /v2/family
        const res = await axios.get(`${url}/v2/family`, {
            headers: {
                'Authorization': `Bearer ${AT}`,
                'X-CK-Appid': config.EWELINK.APP_ID
            },
            timeout: 5000 
        });

        if (res.status === 200 && res.data.error === 0) {
            return { success: true, url: url, data: res.data };
        }
        return { success: false, url: url, code: res.data.error, msg: res.data.msg };
    } catch (e) {
        return { success: false, url: url, error: e.response ? e.response.status : "Error" };
    }
}

async function run() {
    console.log("=== BẮT ĐẦU SIÊU QUÉT SEVER (ADVANCED SCAN) ===");
    console.log(`AppID: ${config.EWELINK.APP_ID}`);
    console.log("Đang thử kết nối từng Server...\n");

    let found = null;

    // Chạy song song cho nhanh
    const promises = HOSTS.map(url => checkHost(url).then(result => {
        if (result.success) {
            console.log(`✅ [THÀNH CÔNG] ${result.url}`);
            found = result.url;
        } else {
            // Chỉ in lỗi nếu cần debug kỹ, tạm thời in gọn
            // console.log(`❌ [FAIL] ${result.url} -> ${result.code || result.error}`);
            process.stdout.write("."); // Hiệu ứng loading
        }
    }));

    await Promise.all(promises);

    console.log("\n\n-------------------------------------");
    if (found) {
        console.log(`🎉 SERVER CHUẨN CỦA BẠN LÀ: ${found}`);
        console.log(`👉 Hãy copy dòng này vào 'src/providers/ewelink-provider.js':`);
        console.log(`   this.baseUrl = "${found}";`);
    } else {
        console.log("❌ Vẫn không tìm thấy. Có thể Token đã hỏng hoặc AppID chưa được cấp quyền.");
        console.log("Gợi ý: Hãy thử tạo lại Token mới (chạy lại get-token.js) vì Token cũ có thể đã bị 'blacklist' do lỗi 503 nhiều lần.");
    }
}

run();
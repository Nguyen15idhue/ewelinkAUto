const axios = require('axios');
const fs = require('fs');
const config = require('./config');

// Đọc Token từ file json
const TOKEN_FILE = 'ewelink-tokens.json';
if (!fs.existsSync(TOKEN_FILE)) {
    console.error("❌ Không tìm thấy file ewelink-tokens.json");
    process.exit(1);
}
const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const AT = tokenData.at;

// Danh sách các vùng có thể có
const REGIONS = ['as', 'us', 'eu', 'cn']; 

async function scanRegions() {
    console.log("=== BẮT ĐẦU QUÉT TÌM SERVER ĐÚNG ===");
    console.log(`AppID: ${config.EWELINK.APP_ID}`);
    console.log(`Token: ${AT.substring(0, 10)}...`);
    console.log("-------------------------------------");

    let foundUrl = null;

    for (const region of REGIONS) {
        // Thử cả có port :8080 và không có port (HTTPS chuẩn)
        const urlsToTest = [
            `https://${region}-api.coolkit.cc:8080`,
            `https://${region}-api.coolkit.cc`
        ];

        for (const url of urlsToTest) {
            process.stdout.write(`Testing: ${url} ... `);
            
            try {
                // Gọi thử API lấy danh sách thiết bị
                const res = await axios.get(`${url}/v2/device/thing`, {
                    headers: {
                        'Authorization': `Bearer ${AT}`,
                        'X-CK-Appid': config.EWELINK.APP_ID
                    },
                    params: { num: 1 },
                    timeout: 5000 // Chờ tối đa 5s
                });

                if (res.status === 200 && res.data.error === 0) {
                    console.log("✅ OK!");
                    foundUrl = url;
                    break;
                } else {
                    console.log(`FAIL (Err: ${res.data.error})`);
                }
            } catch (e) {
                const status = e.response ? e.response.status : 'Network Error';
                console.log(`FAIL (HTTP ${status})`);
            }
        }
        if (foundUrl) break;
    }

    console.log("-------------------------------------");
    if (foundUrl) {
        console.log(`🎉 TÌM THẤY SERVER CHUẨN: ${foundUrl}`);
        console.log("👉 Hãy copy URL này vào file src/providers/ewelink-provider.js");
    } else {
        console.log("❌ Không tìm thấy server nào hoạt động. Kiểm tra lại AppID hoặc Token.");
    }
}

scanRegions();
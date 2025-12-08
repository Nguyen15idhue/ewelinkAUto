const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config');
const sigUtils = require('../utils/signature');

class EwelinkProvider {
    constructor() {
        this.accessToken = null;
        this.apiKey = null;
        this.apiUrl = `https://${config.EWELINK.REGION}-api.coolkit.cc:8080`;
    }

    // 1. Đăng nhập lấy Token
    async login() {
        console.log("[eWeLink] Đang đăng nhập...");
        const payload = {
            email: config.EWELINK.EMAIL,
            password: config.EWELINK.PASSWORD,
            countryCode: "+84",
            version: "6"
        };
        
        // Ký chữ ký đăng nhập
        const sign = sigUtils.signEwelink(JSON.stringify(payload), config.EWELINK.APP_SECRET);

        try {
            const res = await axios.post(`${this.apiUrl}/api/user/login`, payload, {
                headers: {
                    'Authorization': `Sign ${sign}`,
                    'X-CK-Appid': config.EWELINK.APP_ID
                }
            });
            
            if (res.data.error === 0) {
                this.accessToken = res.data.data.at;
                this.apiKey = res.data.data.user.apikey;
                console.log("[eWeLink] Đăng nhập thành công!");
                return true;
            } else {
                console.error("[eWeLink] Lỗi đăng nhập:", res.data);
                return false;
            }
        } catch (e) {
            console.error("[eWeLink] Lỗi kết nối Login:", e.message);
            return false;
        }
    }

    // 2. Điều khiển thiết bị (Raw HTTP Request)
    async toggleDevice(deviceId, channel, state) {
        if (!this.accessToken) {
            const loggedIn = await this.login();
            if (!loggedIn) return false;
        }

        // Cấu trúc payload cho công tắc nhiều kênh (Multi-switch)
        // Lưu ý: Cấu trúc này có thể khác nhau tùy firmware, đây là cấu trúc phổ biến cho Sonoff 4CH/2CH
        const switches = [
            { outlet: 0, switch: "off" }, // Placeholder
            { outlet: 1, switch: "off" },
            { outlet: 2, switch: "off" },
            { outlet: 3, switch: "off" }
        ];
        // Chỉ update kênh cần thiết, eWeLink API v2 yêu cầu gửi object "switches"
        // Nhưng để đơn giản, ta dùng endpoint /thing/status
        
        // Payload đơn giản hóa cho API v2
        const params = {
            switches: [
                { switch: state, outlet: channel - 1 } 
            ]
        };

        try {
            const res = await axios.post(`${this.apiUrl}/v2/device/thing/status`, {
                type: 1,
                id: deviceId,
                params: params
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-CK-Appid': config.EWELINK.APP_ID
                }
            });
            
            if (res.data.error === 0) return true;
            console.error(`[eWeLink] Lỗi điều khiển ${deviceId}:`, res.data);
            
            // Nếu Token hết hạn (error 401), login lại và thử 1 lần nữa
            if (res.data.error === 401) {
                await this.login();
                return this.toggleDevice(deviceId, channel, state);
            }
            return false;
        } catch (e) {
            console.error(`[eWeLink] Lỗi mạng khi điều khiển ${deviceId}:`, e.message);
            return false;
        }
    }
}

module.exports = new EwelinkProvider();
const axios = require('axios');
const config = require('../../config');
const sigUtils = require('../utils/signature');

class CgbasProvider {
    /**
     * Hàm gọi API chuẩn
     * @param {string} method GET/POST
     * @param {string} path Đường dẫn (KHÔNG bao gồm ?page=...) ví dụ: /openapi/stream/stations
     * @param {object} params Query params (ví dụ: { page: 1 })
     * @param {object} data Body data (cho POST)
     */
    async callApi(method, path, params = {}, data = null) {
        const timestamp = Date.now().toString();
        const nonce = sigUtils.nonce();
        
        // Header bắt buộc
        const headers = {
            'Content-Type': 'application/json',
            'X-Access-Key': config.CGBAS.AK,
            'X-Nonce': nonce,
            'X-Sign-Method': 'HmacSHA256',
            'X-Timestamp': timestamp
        };

        // QUAN TRỌNG: Chỉ dùng 'path' để ký, không kèm query params
        const sign = sigUtils.signCgbas(method, path, headers, config.CGBAS.SK);
        headers['Sign'] = sign;

        // Debug: In ra để kiểm tra nếu vẫn lỗi
        // console.log("--- DEBUG SIGN ---");
        // console.log("Path to sign:", path);
        // console.log("Sign result:", sign);

        try {
            const requestConfig = {
                method,
                url: `${config.CGBAS.HOST}${path}`, // URL gốc
                headers,
                params: params, // Axios sẽ tự gắn ?page=1&size=9999 vào đây
                data
            };

            const response = await axios(requestConfig);
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`[CGBAS Error] ${path}: API trả về lỗi ${error.response.status}`);
                console.error("Chi tiết lỗi:", error.response.data);
            } else {
                console.error(`[CGBAS Error] ${path}:`, error.message);
            }
            return null;
        }
    }

    async getStationList() {
        // Tách path và params riêng biệt
        const path = '/openapi/stream/stations';
        const params = { page: 1, size: 9999 };
        
        const res = await this.callApi('GET', path, params);
        return (res && res.code === 'SUCCESS') ? res.data.records : [];
    }

    async getStationStatus(ids) {
        const path = '/openapi/stream/stations/dynamic-info';
        
        // --- SỬA LỖI TẠI ĐÂY ---
        // Server không nhận mảng trần [1,2], phải bọc vào object
        // Tôi thử key phổ biến nhất là "stationIds"
        const payload = { 
            ids: ids 
        };
        
        // Nếu vẫn lỗi, bạn có thể thử đổi "stationIds" thành "ids" 
        // const payload = { ids: ids };

        const res = await this.callApi('POST', path, {}, payload);
        const map = {};
        if (res && res.code === 'SUCCESS') {
            res.data.forEach(s => map[s.stationId] = s.connectStatus);
        }
        return map;
    }
}

module.exports = new CgbasProvider();
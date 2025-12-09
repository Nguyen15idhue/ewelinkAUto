const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const sigUtils = require('../utils/signature');

const TOKEN_PATH = path.join(__dirname, '../../ewelink-tokens.json');

class EwelinkProvider {
    constructor() {
        this.baseUrl = `https://as-apia.coolkit.cc`; // Mặc định
        this.tokens = this.loadTokens();
    }

    loadTokens() {
        if (fs.existsSync(TOKEN_PATH)) {
            return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        }
        return null;
    }

    saveTokens(data) {
        const newData = {
            at: data.accessToken || data.at,
            rt: data.refreshToken || data.rt,
            expiresAt: Date.now() + (29 * 24 * 60 * 60 * 1000) // Reset hạn 30 ngày
        };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(newData, null, 2));
        this.tokens = newData;
    }

    /**
     * Tự động lấy Access Token hợp lệ
     */
    async getAccessToken() {
        if (!this.tokens) {
            console.error("[eWeLink] Chưa có file token. Vui lòng chạy setup OAuth trước.");
            return null;
        }
        return this.tokens.at;
    }

    /**
     * Refresh Token
     */
    async refreshToken() {
        console.log("[eWeLink] Token hết hạn, đang Refresh...");
        if (!this.tokens || !this.tokens.rt) return false;

        const payload = { rt: this.tokens.rt, grantType: "refresh_token" };
        const signature = sigUtils.signEwelink(payload, config.EWELINK.APP_SECRET);

        try {
            const res = await axios.post(`${this.baseUrl}/v2/user/refresh`, payload, {
                headers: {
                    'Authorization': `Sign ${signature}`,
                    'X-CK-Appid': config.EWELINK.APP_ID,
                    'Content-Type': 'application/json'
                }
            });

            if (res.data.error === 0) {
                this.saveTokens(res.data.data);
                console.log("[eWeLink] Refresh thành công!");
                return true;
            }
            return false;
        } catch (e) {
            console.error("[eWeLink] Lỗi mạng khi Refresh:", e.message);
            return false;
        }
    }

    /**
     * Lấy danh sách thiết bị
     */
    async getDeviceList() {
        let at = await this.getAccessToken();
        if (!at) return [];

        try {
            const res = await axios.get(`${this.baseUrl}/v2/device/thing`, {
                headers: { 'Authorization': `Bearer ${at}`, 'X-CK-Appid': config.EWELINK.APP_ID },
                params: { num: 100 }
            });

            if (res.data.error === 0 && res.data.data) {
                return res.data.data.thingList || [];
            }
            if (res.data.error === 401) {
                if (await this.refreshToken()) return this.getDeviceList();
            }
            return [];
        } catch (e) {
            console.error("[eWeLink] Lỗi Get List:", e.message);
            return [];
        }
    }

    /**
     * Lấy trạng thái hiện tại của thiết bị
     */
    async getDeviceState(deviceId) {
        let at = await this.getAccessToken();
        if (!at) return null;

        try {
            const res = await axios.get(`${this.baseUrl}/v2/device/thing/status`, {
                headers: { 'Authorization': `Bearer ${at}`, 'X-CK-Appid': config.EWELINK.APP_ID },
                params: { type: 1, id: deviceId }
            });

            if (res.data.error === 0 && res.data.data && res.data.data.params) {
                return res.data.data.params;
            }
            if (res.data.error === 401) {
                if (await this.refreshToken()) return this.getDeviceState(deviceId);
            }
            // console.error(`[eWeLink] Không lấy được trạng thái ${deviceId}: Error ${res.data.error}`);
            return null;
        } catch (e) {
            console.error(`[eWeLink] Lỗi mạng Get Status ${deviceId}:`, e.message);
            return null;
        }
    }

    // =========================================================================
    // ĐÂY LÀ HÀM BẠN ĐANG THIẾU - TÔI ĐÃ BỔ SUNG VÀO ĐÂY
    // =========================================================================
    async getDeviceChannelState(deviceId, channel) {
        const state = await this.getDeviceState(deviceId);
        if (!state || !state.switches) return null;
        
        // Outlet 0 = CH1, Outlet 1 = CH2
        const outlet = state.switches.find(s => s.outlet === channel - 1);
        return outlet ? outlet.switch : null;
    }
    // =========================================================================

    /**
     * Bật/Tắt thiết bị
     */
    async toggleDevice(deviceId, channel, state) {
        let at = await this.getAccessToken();
        if (!at) return false;

        const payload = {
            type: 1, id: deviceId,
            params: { switches: [{ outlet: channel - 1, switch: state }] }
        };

        try {
            const res = await axios.post(`${this.baseUrl}/v2/device/thing/status`, payload, {
                headers: { 'Authorization': `Bearer ${at}`, 'X-CK-Appid': config.EWELINK.APP_ID, 'Content-Type': 'application/json' }
            });

            if (res.data.error === 0) return true;
            if (res.data.error === 401) {
                if (await this.refreshToken()) return this.toggleDevice(deviceId, channel, state);
            }
            
            console.error(`[eWeLink] Lỗi điều khiển ${deviceId}:`, res.data);
            return false;
        } catch (e) {
            console.error(`[eWeLink] Lỗi mạng điều khiển ${deviceId}:`, e.message);
            return false;
        }
    }

    async isDeviceOnline(deviceId) {
        try {
            const list = await this.getDeviceList();
            const device = list.find(d => d.itemData.deviceid === deviceId);
            return (device && device.itemData.online === true);
        } catch (e) {
            console.error("[eWeLink] Lỗi check online:", e.message);
            return false;
        }
    }
}

module.exports = new EwelinkProvider();
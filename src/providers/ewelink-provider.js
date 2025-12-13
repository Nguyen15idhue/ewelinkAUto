const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const sigUtils = require('../utils/signature');
const webPool = require('../database');

const TOKEN_PATH = path.join(__dirname, '../../ewelink-tokens.json');

class EwelinkProvider {
    constructor() {
        this.baseUrl = `https://as-apia.coolkit.cc`; // Mặc định
        this.tokens = this.loadTokens();
        this._deviceListPromise = null;
        this._deviceListPromiseTs = 0;
        // Rate limiter state
        this._apiCallTimestamps = []; // timestamps of recent API calls (ms)
        this._lastApiCallTs = 0;
        this._minIntervalMs = 500; // minimum interval between calls
        this._maxCallsPerWindow = 300; // max calls per window
        this._windowMs = 5 * 60 * 1000; // 5 minutes window
    }

    // Ensure we don't exceed per-IP frequency limits: min interval and max-per-window
    async _beforeApiCall() {
        const now = Date.now();

        // enforce minimum interval between calls
        const sinceLast = now - this._lastApiCallTs;
        if (sinceLast < this._minIntervalMs) {
            await new Promise(r => setTimeout(r, this._minIntervalMs - sinceLast));
        }

        // cleanup old timestamps
        const cutoff = Date.now() - this._windowMs;
        this._apiCallTimestamps = this._apiCallTimestamps.filter(ts => ts > cutoff);

        // if we've hit the window limit, wait until earliest timestamp expires
        if (this._apiCallTimestamps.length >= this._maxCallsPerWindow) {
            const earliest = this._apiCallTimestamps[0];
            const wait = (earliest + this._windowMs) - Date.now() + 50; // small buffer
            if (wait > 0) await new Promise(r => setTimeout(r, wait));
        }

        // record this call
        const t = Date.now();
        this._lastApiCallTs = t;
        this._apiCallTimestamps.push(t);
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

        // Deduplicate concurrent list fetches within short window (5s)
        const now = Date.now();
        if (this._deviceListPromise && (now - this._deviceListPromiseTs) < 5000) {
            return this._deviceListPromise;
        }

        this._deviceListPromiseTs = now;
        this._deviceListPromise = (async () => {
            try {
                await this._beforeApiCall();
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
            } finally {
                // clear promise after a short delay to allow reuse window
                setTimeout(() => { this._deviceListPromise = null; }, 5000);
            }
        })();

        return this._deviceListPromise;
    }

    /**
     * Lấy trạng thái hiện tại của thiết bị
     */
    async getDeviceState(deviceId) {
        let at = await this.getAccessToken();
        if (!at) return null;

        try {
                await this._beforeApiCall();
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
            await this._beforeApiCall();
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
            const TTL = config.SYSTEM.EWELINK_CACHE_TTL_MS || 60000;
            // 1) Thử lấy trạng thái từ DB cache `ewelink_devices` trước
            try {
                const [rows] = await webPool.query('SELECT online, last_updated FROM ewelink_devices WHERE device_id = ?', [deviceId]);
                if (rows && rows[0]) {
                    const last = rows[0].last_updated ? new Date(rows[0].last_updated).getTime() : 0;
                    const age = Date.now() - last;
                    if (age <= TTL) {
                        return rows[0].online === 1 || rows[0].online === true;
                    }
                    // stale: fallthrough to refresh via API
                }
            } catch (dbErr) {
                console.warn('[eWeLink] Lỗi đọc DB khi check online, sẽ gọi API:', dbErr.message);
            }

            // 2) Fallback: gọi API trực tiếp nếu không có trong DB hoặc cache stale
            const list = await this.getDeviceList();
            if (list && list.length > 0) {
                // Try to update DB cache asynchronously (best-effort)
                try {
                    const dbService = require('../services/db-service');
                    // dbService.saveEwelinkDevices expects the raw thingList
                    dbService.saveEwelinkDevices(list).catch(()=>{});
                } catch (e) {
                    // ignore
                }
            }

            const device = list.find(d => d.itemData && d.itemData.deviceid === deviceId);
            return (device && device.itemData.online === true);
        } catch (e) {
            console.error("[eWeLink] Lỗi check online (DB/API):", e.message);
            return false;
        }
    }
}

module.exports = new EwelinkProvider();
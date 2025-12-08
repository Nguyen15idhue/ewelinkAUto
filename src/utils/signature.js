const crypto = require('crypto');

module.exports = {
    // Chữ ký cho CGBAS (HMAC-SHA256)
    signCgbas: (method, uri, headers, secretKey) => {
        const xHeaders = {};
        Object.keys(headers).forEach(key => {
            if (key.toLowerCase().startsWith('x-')) {
                xHeaders[key.toLowerCase()] = headers[key];
            }
        });
        const sortedKeys = Object.keys(xHeaders).sort();
        let headerStr = sortedKeys.map(k => `${k}=${xHeaders[k]}`).join('&');
        const stringToSign = `${method.toUpperCase()} ${uri} ${headerStr}`;
        return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
    },

    // Chữ ký cho eWeLink (HMAC-SHA256 Base64)
    signEwelink: (dataStr, secret) => {
        return crypto.createHmac('sha256', secret).update(dataStr).digest('base64');
    },

    nonce: () => Math.random().toString(36).substring(7)
};
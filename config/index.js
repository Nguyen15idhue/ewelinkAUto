module.exports = {
    // Cấu hình CGBAS (ưu tiên biến môi trường nếu có)
    CGBAS: {
        HOST: process.env.CGBAS_HOST || "http://rtk.taikhoandodac.vn:8090",
        AK: process.env.CGBAS_AK || "Gbo8bcg0K6aKYIec",
        SK: process.env.CGBAS_SK || "vxl6OCFDhhd3hm9W"
    },

    // Cấu hình eWeLink (Login trực tiếp)
    EWELINK: {
        EMAIL: process.env.EWELINK_EMAIL || "nguyendozxc15@gmail.com",
        PASSWORD: process.env.EWELINK_PASSWORD || "thietbigeotx77c",
        REGION: process.env.EWELINK_REGION || "as",
        APP_ID: process.env.EWELINK_APP_ID || "0tK1GmwzjeIuCxlrKganspQe7Zyu67zd",
        APP_SECRET: process.env.EWELINK_APP_SECRET || "Ih3ttfadbrNKFCRuASuUGvRwfIBSnlSz"
    },

    MYSQL: {
        HOST: process.env.MYSQL_HOST || 'localhost',
        USER: process.env.MYSQL_USER || 'root',
        PASSWORD: process.env.MYSQL_PASSWORD || '',
        DATABASE: process.env.MYSQL_DATABASE || 'cgbas_monitor',
        PORT: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
    },

    // Cấu hình Thời gian
    TIME: {
        ON_START: "05:00",
        ON_END:   "23:00",  // Sau giờ này là nghỉ, không ép Bật nữa
        
        OFF_START: "23:06",
        OFF_END:   "04:30"  // Sau giờ này là nghỉ, không ép Tắt nữa
    },


    // Cấu hình Hệ thống
    SYSTEM: {
        CHECK_INTERVAL_MS: 60000, // Quét 1 phút/lần
        RETRY_COUNT: process.env.RETRY_COUNT ? parseInt(process.env.RETRY_COUNT, 10) : 5, // Số lần thử lại nếu rớt mạng
        RETRY_DELAY_MS: process.env.RETRY_DELAY_MS ? parseInt(process.env.RETRY_DELAY_MS, 10) : 5000, // Chờ 5s giữa các lần thử (ms)
        RETRY_INTERVAL_MIN: process.env.RETRY_INTERVAL_MIN ? parseInt(process.env.RETRY_INTERVAL_MIN, 10) : 5 // Khoảng thời gian (phút) giữa các lần retry ở mức task
    }
};
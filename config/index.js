module.exports = {
    // Cấu hình CGBAS
    CGBAS: {
        HOST: "http://rtk.taikhoandodac.vn:8090",
        AK: "Gbo8bcg0K6aKYIec", // Thay bằng AK thật
        SK: "vxl6OCFDhhd3hm9W"  // Thay bằng SK thật
    },

    // Cấu hình eWeLink (Login trực tiếp)
    EWELINK: {
        EMAIL: "nguyendozxc15@gmail.com",
        PASSWORD: "thietbigeotex77c",
        REGION: "as", // as: Asia, us: America, eu: Europe
        // App ID/Secret mặc định của App eWeLink (có thể thay đổi tùy phiên bản)
        APP_ID: "0tK1GmwzjeIuCxlrKganspQe7Zyu67zd", 
        APP_SECRET: "Ih3ttfadbrNKFCRuASuUGvRwfIBSnlSz"
    },

    MYSQL: {
        HOST: 'localhost',
        USER: 'root',
        PASSWORD: '', // Điền pass mysql của bạn
        DATABASE: 'cgbas_monitor',
        PORT: 3306
    },

    // Cấu hình Thời gian
    TIME: {
        ON_START: "05:00",
        ON_END:   "23:00",  // Sau giờ này là nghỉ, không ép Bật nữa
        
        OFF_START: "23:20",
        OFF_END:   "04:30"  // Sau giờ này là nghỉ, không ép Tắt nữa
    },


    // Cấu hình Hệ thống
    SYSTEM: {
        CHECK_INTERVAL_MS: 60000, // Quét 1 phút/lần
        RETRY_COUNT: 5,           // Số lần thử lại nếu rớt mạng
        RETRY_DELAY_MS: 5000      // Chờ 5s giữa các lần thử
    }
};
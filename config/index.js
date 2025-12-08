module.exports = {
    // Cấu hình CGBAS
    CGBAS: {
        HOST: "http://rtk.taikhoandodac.vn:8090",
        AK: "Gbo8bcg0K6aKYIec", // Thay bằng AK thật
        SK: "vxl6OCFDhhd3hm9W"  // Thay bằng SK thật
    },

    // Cấu hình eWeLink (Login trực tiếp)
    EWELINK: {
        EMAIL: "email@gmail.com",
        PASSWORD: "password",
        REGION: "as", // as: Asia, us: America, eu: Europe
        // App ID/Secret mặc định của App eWeLink (có thể thay đổi tùy phiên bản)
        APP_ID: "4s1FXKC9FaGfoqXhmXSJneb3qcm1gOak", 
        APP_SECRET: "oKvCM06gAoYTBCCb2qc75K9646u20S6j"
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
        OFF_START: "23:30", // Bắt đầu tắt
        ON_START: "05:00"   // Bắt đầu bật
    },

    // Mapping: Tên trạm CGBAS -> Device ID eWeLink
    STATIONS: {
        "AGG1": "100155xxxx", 
        "BGG1": "100155yyyy"
    },

    // Cấu hình Hệ thống
    SYSTEM: {
        CHECK_INTERVAL_MS: 60000, // Quét 1 phút/lần
        RETRY_COUNT: 5,           // Số lần thử lại nếu rớt mạng
        RETRY_DELAY_MS: 5000      // Chờ 5s giữa các lần thử
    }
};
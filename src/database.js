// File: src/database.js
const mysql = require('mysql2/promise');
const config = require('../config'); // Trỏ ra file config ở thư mục gốc

const webPool = mysql.createPool({
    host: config.MYSQL.HOST,
    user: config.MYSQL.USER,
    password: config.MYSQL.PASSWORD,
    database: config.MYSQL.DATABASE,
    port: config.MYSQL.PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = webPool;
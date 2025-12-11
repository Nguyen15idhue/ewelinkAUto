// File: index.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser'); 
const session = require('express-session');

// Import Modules đã tách
const automation = require('./src/automation');
const appRoutes = require('./src/routes');
const worker = require('./src/worker');         // Logic xử lý hàng đợi (MỚI)

const app = express();

// --- CONFIG EXPRESS ---
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session config
app.use(session({
    secret: 'geotek-secret-key-2025', 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// --- LOAD ROUTES ---
app.use('/', appRoutes);

// --- KHỞI ĐỘNG ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log("------------------------------------------------");
    console.log("✅ HỆ THỐNG ĐÃ KHỞI ĐỘNG");
    console.log(`👉 Web Dashboard: http://localhost:${PORT}`);
    console.log("------------------------------------------------");
    
    // 1. Chạy Worker xử lý hàng đợi (Nó dùng setInterval nên không chặn luồng)
    worker.start();
    
    // Bắt đầu vòng lặp tự động hóa
    automation.start();
});
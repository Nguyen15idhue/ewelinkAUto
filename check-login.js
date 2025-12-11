const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('./config');

async function checkLogin() {
    const connection = await mysql.createConnection({
        host: config.MYSQL.HOST,
        user: config.MYSQL.USER,
        password: config.MYSQL.PASSWORD,
        database: config.MYSQL.DATABASE,
        port: config.MYSQL.PORT
    });

    try {
        // Check if users table exists and has data
        const [rows] = await connection.execute('SELECT * FROM users');
        console.log('Users in database:', rows);

        // Test password hash
        if (rows.length > 0) {
            const user = rows[0];
            const isValid = await bcrypt.compare('Geotek@2025', user.password);
            console.log('Password valid:', isValid);
            console.log('Username:', user.username);
            console.log('Role:', user.role);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkLogin();
const mysql = require('mysql2/promise');
const config = require('./config');

async function updatePassword() {
    const connection = await mysql.createConnection({
        host: config.MYSQL.HOST,
        user: config.MYSQL.USER,
        password: config.MYSQL.PASSWORD,
        database: config.MYSQL.DATABASE,
        port: config.MYSQL.PORT
    });

    try {
        const newHash = '$2b$10$grvKvvZ2i54DrCdxnhS0peSd7znPvMVHqmqX03tf0tH4sjIUXRGrO';
        await connection.execute(
            'UPDATE users SET password = ? WHERE username = ?',
            [newHash, 'admin']
        );
        console.log('Password updated');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

updatePassword();
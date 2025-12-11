const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const config = require('./config');

    const connection = await mysql.createConnection({
        host: config.MYSQL.HOST,
        user: config.MYSQL.USER,
        password: config.MYSQL.PASSWORD,
        database: config.MYSQL.DATABASE,
        port: config.MYSQL.PORT
    });

    try {
        console.log('Running migration...');

        // Đọc file SQL
        const sqlFile = path.join(__dirname, 'migrations', 'create_users.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Tách các câu lệnh SQL, bỏ qua comments
        const statements = sql.split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        // Thực thi từng câu lệnh
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
                console.log('Executed:', statement.substring(0, 50) + '...');
            }
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

runMigration();
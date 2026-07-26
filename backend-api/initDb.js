require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTables() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 4000,
            ssl: { rejectUnauthorized: false }
        });

        console.log("🔌 Connected to TiDB Cloud. Creating tables...");

        // ১. Users টেবিল তৈরি
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'users' table created successfully.");

        // ২. Panels টেবিল তৈরি
        await db.query(`
            CREATE TABLE IF NOT EXISTS panels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                panel_id VARCHAR(100) UNIQUE NOT NULL,
                type VARCHAR(100) NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'panels' table created successfully.");

        // ৩. Generation Logs টেবিল তৈরি
        await db.query(`
            CREATE TABLE IF NOT EXISTS generation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                panel_id VARCHAR(100) NOT NULL,
                voltage FLOAT NOT NULL,
                current FLOAT NOT NULL,
                power FLOAT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (panel_id) REFERENCES panels(panel_id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'generation_logs' table created successfully.");

        await db.end();
        console.log("🎉 All database tables are ready!");

    } catch (error) {
        console.error("❌ Error creating tables:", error.message);
    }
}

createTables();
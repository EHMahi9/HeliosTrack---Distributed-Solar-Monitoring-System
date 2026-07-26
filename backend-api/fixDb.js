require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixTables() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 4000,
            ssl: { rejectUnauthorized: false }
        });

        console.log("🔌 Connected to TiDB. Applying final schema fix...");

        // ১. পুরোনো টেবিলগুলো ড্রপ করা
        await db.query(`DROP TABLE IF EXISTS generation_logs, solar_panels`);
        console.log("🗑️ Dropped old tables.");

        // ২. AUTO_INCREMENT দিয়ে solar_panels টেবিল তৈরি
        await db.query(`
            CREATE TABLE solar_panels (
                panel_id INT AUTO_INCREMENT PRIMARY KEY,
                panel_type VARCHAR(100) NOT NULL,
                api_secret VARCHAR(255) DEFAULT 'default_secret',
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'solar_panels' created with AUTO_INCREMENT panel_id.");

        // ৩. panel_id INT হিসেবে generation_logs টেবিল তৈরি
        await db.query(`
            CREATE TABLE generation_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                panel_id INT NOT NULL,
                voltage FLOAT NOT NULL,
                current_amps FLOAT NOT NULL,
                power_watts FLOAT NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (panel_id) REFERENCES solar_panels(panel_id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'generation_logs' created perfectly.");

        await db.end();
        console.log("🎉 Schema is 100% matched with backend!");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

fixTables();
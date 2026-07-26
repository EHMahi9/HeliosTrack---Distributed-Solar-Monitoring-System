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

        console.log("🔌 Connected to TiDB. Fixing tables...");

        // ১. পুরোনো ভুল টেবিলগুলো ডিলিট করা
        await db.query(`DROP TABLE IF EXISTS generation_logs, panels`);
        console.log("🗑️ Dropped old incorrect tables.");

        // ২. সঠিক নামে solar_panels টেবিল তৈরি
        await db.query(`
            CREATE TABLE solar_panels (
                panel_id VARCHAR(100) PRIMARY KEY,
                panel_type VARCHAR(100) NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'solar_panels' table created correctly.");

        // ৩. সঠিক কলামের নাম দিয়ে generation_logs তৈরি
        await db.query(`
            CREATE TABLE generation_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                panel_id VARCHAR(100) NOT NULL,
                voltage FLOAT NOT NULL,
                current_amps FLOAT NOT NULL,
                power_watts FLOAT NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (panel_id) REFERENCES solar_panels(panel_id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'generation_logs' table created correctly.");

        await db.end();
        console.log("🎉 Database schema fixed!");

    } catch (error) {
        console.error("❌ Error fixing tables:", error.message);
    }
}

fixTables();
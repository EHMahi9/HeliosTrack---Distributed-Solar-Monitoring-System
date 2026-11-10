require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    let db;
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 4000,
            ssl: { rejectUnauthorized: false }
        });

        console.log("🔌 Connected to database. Running multi-tenant migrations...");

        // 1. Update users table with full_name and is_demo
        const [userCols] = await db.query(`SHOW COLUMNS FROM users`);
        const userColNames = userCols.map(c => c.Field);

        if (!userColNames.includes('full_name')) {
            console.log("Adding 'full_name' column to users...");
            await db.query(`ALTER TABLE users ADD COLUMN full_name VARCHAR(120) DEFAULT 'Solar Operator'`);
        }

        if (!userColNames.includes('is_demo')) {
            console.log("Adding 'is_demo' column to users...");
            await db.query(`ALTER TABLE users ADD COLUMN is_demo BOOLEAN DEFAULT FALSE`);
        }

        // Ensure user id 1 has a full_name
        await db.query(`UPDATE users SET full_name = 'Solar Administrator' WHERE id = 1 AND (full_name IS NULL OR full_name = '')`);

        // 2. Update solar_panels table with user_id, panel_name
        const [panelCols] = await db.query(`SHOW COLUMNS FROM solar_panels`);
        const panelColNames = panelCols.map(c => c.Field);

        if (!panelColNames.includes('user_id')) {
            console.log("Adding 'user_id' column to solar_panels...");
            await db.query(`ALTER TABLE solar_panels ADD COLUMN user_id INT DEFAULT 1`);
            // Link existing panels to admin (user id 1)
            await db.query(`UPDATE solar_panels SET user_id = 1 WHERE user_id IS NULL OR user_id = 0`);
            try {
                await db.query(`ALTER TABLE solar_panels ADD CONSTRAINT fk_solar_panels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
            } catch (fkErr) {
                console.warn("Foreign key notice (may already exist):", fkErr.message);
            }
        }

        if (!panelColNames.includes('panel_name')) {
            console.log("Adding 'panel_name' column to solar_panels...");
            await db.query(`ALTER TABLE solar_panels ADD COLUMN panel_name VARCHAR(100) DEFAULT 'Solar Unit'`);
            await db.query(`UPDATE solar_panels SET panel_name = CONCAT('Panel ', panel_id) WHERE panel_name IS NULL OR panel_name = ''`);
        }

        // 3. Ensure demo user exists for Instant Showcase / Guest access
        const [demoUsers] = await db.query(`SELECT id FROM users WHERE email = 'demo@heliostrack.com'`);
        let demoUserId;
        if (demoUsers.length === 0) {
            console.log("Creating default Showcase Demo user...");
            const bcrypt = require('bcrypt');
            const demoPassHash = await bcrypt.hash('HeliosDemo2026!', 10);
            const [insertResult] = await db.query(
                `INSERT INTO users (email, password, role, full_name, is_demo) VALUES ('demo@heliostrack.com', ?, 'demo', 'Demo Operator', TRUE)`,
                [demoPassHash]
            );
            demoUserId = insertResult.insertId;

            // Provision starter panels for demo user
            await db.query(
                `INSERT INTO solar_panels (user_id, panel_name, panel_type, api_secret) VALUES 
                (?, 'Rooftop Array 1', 'Monocrystalline 400W', 'helios_demo_key_mono'),
                (?, 'Carport Array 2', 'Polycrystalline 350W', 'helios_demo_key_poly')`,
                [demoUserId, demoUserId]
            );
            console.log("✅ Seeded demo user and demo panels.");
        } else {
            demoUserId = demoUsers[0].id;
            console.log("Demo user already exists with ID:", demoUserId);
        }

        // 4. Create user_settings table if not exists for tariffs and customization
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                cost_per_kwh FLOAT DEFAULT 0.15,
                co2_per_kwh FLOAT DEFAULT 0.40,
                currency_symbol VARCHAR(10) DEFAULT '$',
                simulation_enabled BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'user_settings' table verified.");

        console.log("🎉 Database migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration error:", err);
        process.exit(1);
    } finally {
        if (db) await db.end();
    }
}

migrate();

const bcrypt = require('bcrypt');
const db = require('./config/db');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function setupAdmin() {
    //FIXED: Credentials loaded dynamically from environment variables
    const email = process.env.ADMIN_EMAIL;
    const plainPassword = process.env.ADMIN_PASSWORD;

    if (!email || !plainPassword) {
        console.error("🚨 FATAL ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in your .env file.");
        process.exit(1);
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        const sql = `INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')`;
        await db.execute(sql, [email, hashedPassword]);

        //FIXED: Removed console.log that leaked the hashed password
        console.log("✅ Admin user created successfully.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Failed to setup admin:", error);
        process.exit(1);
    }
}

setupAdmin();
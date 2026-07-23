const bcrypt = require('bcrypt');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function createAdminUser() {
    try {
        // The custom admin credentials you provided
        const email = "vaibongo20@gmail.com";
        const plainPassword = "mahi123@";

        console.log("Generating secure hash for the password...");
        
        // Hashing the custom password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Save the custom user to the database
        const sql = `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`;
        await db.execute(sql, [email, hashedPassword, 'admin']);

        console.log('\x1b[32m%s\x1b[0m', "Success! Custom admin user created securely.");
        console.log(`Email: ${email}`);
        console.log(`Hashed Password saved in DB: ${hashedPassword}`); 
        
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error('\x1b[31m%s\x1b[0m', "Error: This admin email already exists in the database.");
        } else {
            console.error("Database error:", error.message);
        }
        process.exit(1);
    }
}

createAdminUser();
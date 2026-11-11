const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { fork } = require('child_process');

dotenv.config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("🚨 FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1);
}

const db = require('./config/db');

// Telegram Alert Cooldown — prevents spam (5 min cooldown per panel)
const lastAlertTimes = {};
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

const app = express();
const server = http.createServer(app);

// ---------------------------------------------------------
// CORS CONFIGURATION
// ---------------------------------------------------------
const PRODUCTION_ORIGIN = 'https://helios-track-distributed-solar-moni.vercel.app';
const localhostOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5500'
];

const extraOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

const allowedOrigins = [PRODUCTION_ORIGIN, ...localhostOrigins, ...extraOrigins];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (origin === 'null') {
            if (process.env.ALLOW_NULL_ORIGIN === 'true') {
                return callback(null, true);
            }
            return callback(null, false);
        }

        // Allow exact matches or Vercel preview URLs
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    credentials: true
};

const io = new Server(server, {
    cors: corsOptions
});

// ---------------------------------------------------------
// SOCKET.IO AUTHENTICATION MIDDLEWARE
// ---------------------------------------------------------
io.use((socket, next) => {
    const token = socket.handshake.auth?.token ||
                  (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.startsWith('Bearer ')
                      ? socket.handshake.headers.authorization.split(' ')[1]
                      : null);

    if (!token) {
        return next(new Error("Unauthorized"));
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
            return next(new Error("Unauthorized"));
        }
        socket.user = decoded;
        next();
    });
});

// ---------------------------------------------------------
// SOCKET.IO CONNECTION & USER-ROOM ROUTING
// ---------------------------------------------------------
io.on('connection', (socket) => {
    const userId = socket.user?.userId;
    if (userId) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        if (socket.user.role === 'admin') {
            socket.join('admin_room');
        }
        console.log(`🔌 Socket ${socket.id} joined ${roomName} (role: ${socket.user.role || 'user'})`);
    }

    if (socket.user && socket.user.exp) {
        const remainingMs = (socket.user.exp * 1000) - Date.now();
        if (remainingMs <= 0) {
            return socket.disconnect(true);
        }

        const expiryTimer = setTimeout(() => {
            socket.emit('session_expired', { message: "Token expired. Session terminated." });
            socket.disconnect(true);
        }, remainingMs);

        socket.on('disconnect', () => {
            clearTimeout(expiryTimer);
        });
    }
});

const PORT = process.env.PORT || 3001;

app.use(cors(corsOptions));
app.use(express.json());

// ---------------------------------------------------------
// JWT AUTHENTICATION ROUTE MIDDLEWARE
// ---------------------------------------------------------
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, message: "No token provided!" });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, message: "Unauthorized!" });
        req.user = decoded;
        next();
    });
};

// ---------------------------------------------------------
// TELEGRAM ALERT HELPER FUNCTION
// ---------------------------------------------------------
async function sendTelegramAlert(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log("Telegram credentials missing in .env, skipping alert.");
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (error) {
        console.error("Failed to send Telegram alert:", error);
    }
}

// ---------------------------------------------------------
// ANTI-BRUTE FORCE RATE LIMITER MIDDLEWARE
// ---------------------------------------------------------
const loginAttempts = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of loginAttempts.entries()) {
        if (now > record.resetTime) {
            loginAttempts.delete(ip);
        }
    }
}, 5 * 60 * 1000).unref();

const loginRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 10;
    const currentTime = Date.now();

    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { count: 1, resetTime: currentTime + windowMs });
        return next();
    }

    const record = loginAttempts.get(ip);

    if (currentTime > record.resetTime) {
        record.count = 1;
        record.resetTime = currentTime + windowMs;
        return next();
    }

    if (record.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((record.resetTime - currentTime) / 60000);
        return res.status(429).json({
            success: false,
            message: `Too many login attempts from this IP. Please try again after ${remainingMinutes} minutes.`
        });
    }

    record.count++;
    next();
};

// ---------------------------------------------------------
// 0. ROOT & HEALTH STATUS PORTAL (CleanTech API Gateway)
// ---------------------------------------------------------
app.get(['/', '/health', '/api'], (req, res) => {
    const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';

    const statusData = {
        service: "HeliosTrack Distributed Solar Fleet Telemetry Engine",
        version: "2.4.0",
        status: "operational",
        environment: process.env.NODE_ENV || "production",
        database: "TiDB Cloud Serverless (MySQL 8.0 protocol)",
        web_app: "https://helios-track-distributed-solar-moni.vercel.app",
        timestamp: new Date().toISOString(),
        endpoints: {
            demo_auth: "POST /api/auth/demo",
            register: "POST /api/auth/register",
            login: "POST /api/auth/login",
            panels: "GET /api/panels",
            latest_telemetry: "GET /api/logs/latest",
            telemetry_ingest: "POST /api/logs",
            websocket: "WSS /socket.io"
        }
    };

    if (isJson) {
        return res.status(200).json(statusData);
    }

    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HeliosTrack API Engine | Status: Operational</title>
    <link rel="icon" href="https://helios-track-distributed-solar-moni.vercel.app/icon.svg" type="image/svg+xml">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #070B14;
            color: #E2E8F0;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .card {
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(16px);
            border-radius: 20px;
            max-width: 640px;
            width: 100%;
            padding: 36px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.08);
        }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .logo-icon {
            width: 44px; height: 44px; border-radius: 12px;
            background: linear-gradient(135deg, #F59E0B, #D97706);
            display: flex; align-items: center; justify-content: center;
            font-size: 22px; box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
        }
        .brand-title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #FFF; font-family: 'JetBrains Mono', monospace; }
        .brand-title span { color: #F59E0B; }
        .badge {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34D399; font-size: 11px; font-weight: 700;
            padding: 5px 12px; border-radius: 9999px; font-family: 'JetBrains Mono', monospace;
        }
        .pulse { width: 8px; height: 8px; border-radius: 50%; background: #10B981; animation: ping 1.5s infinite; }
        @keyframes ping { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
        p.desc { font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px; }
        .grid-info {
            background: #0B1120;
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 28px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
        }
        .grid-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .grid-row:last-child { border-bottom: none; }
        .label { color: #64748B; }
        .val { color: #F1F5F9; font-weight: 600; }
        .val.ok { color: #34D399; }
        .cta-btn {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            width: 100%; padding: 14px 20px; border-radius: 12px;
            background: linear-gradient(135deg, #F59E0B, #D97706);
            color: #070B14; font-weight: 800; font-size: 14px; text-decoration: none;
            transition: all 0.2s ease; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.35);
        }
        .cta-btn:hover { background: linear-gradient(135deg, #FBBF24, #F59E0B); transform: translateY(-1px); }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="brand">
                <div class="logo-icon">☀️</div>
                <div>
                    <div class="brand-title">HELIOS<span>TRACK</span></div>
                    <div style="font-size: 10px; color: #64748B; font-family: monospace;">TELEMETRY ENGINE API</div>
                </div>
            </div>
            <div class="badge"><div class="pulse"></div>SYSTEM ONLINE</div>
        </div>
        <p class="desc">
            This is the distributed IoT solar telemetry infeed and WebSocket gateway for HeliosTrack.
            To access the interactive solar fleet monitoring dashboard, power flow synoptics, and virtual storage controls, launch the web application.
        </p>
        <div class="grid-info">
            <div class="grid-row"><span class="label">API Gateway</span><span class="val ok">Active (v2.4.0)</span></div>
            <div class="grid-row"><span class="label">Database</span><span class="val">TiDB Cloud Serverless</span></div>
            <div class="grid-row"><span class="label">Protocol</span><span class="val">REST API + Socket.io WSS</span></div>
            <div class="grid-row"><span class="label">Web App</span><span class="val"><a href="https://helios-track-distributed-solar-moni.vercel.app" style="color: #F59E0B; text-decoration: none;">helios-track...vercel.app</a></span></div>
        </div>
        <a href="https://helios-track-distributed-solar-moni.vercel.app" class="cta-btn">
            Launch HeliosTrack Web Application &rarr;
        </a>
    </div>
</body>
</html>`);
});

// ---------------------------------------------------------
// 1. AUTH: SECURE LOGIN API (Supports Admin & Multi-User)
// ---------------------------------------------------------
app.post(['/api/login', '/api/auth/login'], loginRateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

        // Timing Leak Prevention: Always run bcrypt.compare to prevent email enumeration
        const dummyHash = '$2b$10$CYZcjYFFgucPdueaB9OUMuL93dcAfEiLuIv5AHDQIbO1tb7l/yuGi';
        const hashToCompare = users.length > 0 ? users[0].password : dummyHash;

        const isMatch = await bcrypt.compare(password, hashToCompare);

        if (users.length === 0 || !isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = users[0];

        const clientIp = req.ip || req.connection.remoteAddress;
        loginAttempts.delete(clientIp);

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                email: user.email,
                fullName: user.full_name || 'Solar Operator'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token: token,
            role: user.role,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name || 'Solar Operator',
                role: user.role,
                is_demo: Boolean(user.is_demo)
            }
        });

    } catch (error) {
        console.error("Login API Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// ---------------------------------------------------------
// 2. AUTH: REGISTER NEW USER (With Automatic Starter Solar Panels)
// ---------------------------------------------------------
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const cleanEmail = email.toLowerCase().trim();
        if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
            return res.status(400).json({ success: false, message: "Please provide a valid email address." });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }

        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "An account with this email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const displayName = (full_name && full_name.trim()) || cleanEmail.split('@')[0];

        const [userResult] = await db.execute(
            'INSERT INTO users (email, password, role, full_name, is_demo) VALUES (?, ?, ?, ?, ?)',
            [cleanEmail, hashedPassword, 'user', displayName, false]
        );
        const newUserId = userResult.insertId;

        // Auto-provision 2 starter solar panels so the new user immediately sees live simulated data
        const secret1 = 'helios_key_' + Math.random().toString(36).substring(2, 12);
        const secret2 = 'helios_key_' + Math.random().toString(36).substring(2, 12);

        await db.execute(
            'INSERT INTO solar_panels (user_id, panel_name, panel_type, api_secret) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
            [
                newUserId, 'Main Rooftop Array', 'Monocrystalline 400W', secret1,
                newUserId, 'Secondary Carport Array', 'Polycrystalline 350W', secret2
            ]
        );

        // Seed default settings
        await db.execute(
            'INSERT INTO user_settings (user_id, cost_per_kwh, co2_per_kwh, currency_symbol, simulation_enabled) VALUES (?, 0.15, 0.40, "$", true) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP',
            [newUserId]
        );

        // Notify simulator to start feeding telemetry for new panels
        await sendPanelsToSimulator();

        // 🔔 Send Telegram notification for new operator registration
        const newAccountTelegram = `🎉 *NEW OPERATOR REGISTERED*\n\n*Name:* ${displayName}\n*Email:* ${cleanEmail}\n*Account ID:* #${newUserId}\n*Time:* ${new Date().toLocaleString()}\n*Fleet:* 2 Starter Strings Provisioned`;
        sendTelegramAlert(newAccountTelegram).catch(() => {});

        const token = jwt.sign(
            {
                userId: newUserId,
                role: 'user',
                email: cleanEmail,
                fullName: displayName
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: "Registration successful! Welcome to HeliosTrack.",
            token: token,
            role: 'user',
            user: {
                id: newUserId,
                email: cleanEmail,
                full_name: displayName,
                role: 'user',
                is_demo: false
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Internal server error during registration." });
    }
});

// ---------------------------------------------------------
// 3. AUTH: 1-CLICK INSTANT SHOWCASE DEMO ACCESS
// ---------------------------------------------------------
app.all(['/api/demo', '/api/auth/demo'], async (req, res) => {
    try {
        let [demoUsers] = await db.execute('SELECT * FROM users WHERE email = ?', ['demo@heliostrack.com']);
        let demoUser;

        if (demoUsers.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('HeliosDemo2026!', salt);
            const [insert] = await db.execute(
                'INSERT INTO users (email, password, role, full_name, is_demo) VALUES (?, ?, "demo", "Showcase Operator", TRUE)',
                ['demo@heliostrack.com', hashedPassword]
            );
            const [created] = await db.execute('SELECT * FROM users WHERE id = ?', [insert.insertId]);
            demoUser = created[0];

            await db.execute(
                'INSERT INTO solar_panels (user_id, panel_name, panel_type, api_secret) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
                [
                    demoUser.id, 'Demo Rooftop Array', 'Monocrystalline 400W', 'helios_demo_key_mono',
                    demoUser.id, 'Demo Ground Mount', 'Polycrystalline 350W', 'helios_demo_key_poly'
                ]
            );
            await sendPanelsToSimulator();
        } else {
            demoUser = demoUsers[0];
        }

        const token = jwt.sign(
            {
                userId: demoUser.id,
                role: demoUser.role,
                email: demoUser.email,
                fullName: demoUser.full_name || 'Showcase Operator',
                isDemo: true
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: "Showcase Demo session initialized",
            token: token,
            role: 'demo',
            user: {
                id: demoUser.id,
                email: demoUser.email,
                full_name: demoUser.full_name || 'Showcase Operator',
                role: 'demo',
                is_demo: true
            }
        });
    } catch (error) {
        console.error("Demo session error:", error);
        res.status(500).json({ success: false, message: "Failed to initialize showcase demo." });
    }
});

// ---------------------------------------------------------
// 4. AUTH: CURRENT USER PROFILE
// ---------------------------------------------------------
app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, email, full_name, role, is_demo, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const [settings] = await db.execute(
            'SELECT cost_per_kwh, co2_per_kwh, currency_symbol, simulation_enabled FROM user_settings WHERE user_id = ?',
            [req.user.userId]
        );

        res.status(200).json({
            success: true,
            user: {
                ...users[0],
                is_demo: Boolean(users[0].is_demo)
            },
            settings: settings[0] || {
                cost_per_kwh: 0.15,
                co2_per_kwh: 0.40,
                currency_symbol: '$',
                simulation_enabled: true
            }
        });
    } catch (error) {
        console.error("Auth me error:", error);
        res.status(500).json({ success: false, message: "Failed to load user profile." });
    }
});

// ---------------------------------------------------------
// 5. USER SETTINGS API (Tariff, CO2, Currency)
// ---------------------------------------------------------
app.get('/api/user/settings', verifyToken, async (req, res) => {
    try {
        const [settings] = await db.execute('SELECT * FROM user_settings WHERE user_id = ?', [req.user.userId]);
        if (settings.length === 0) {
            return res.status(200).json({
                success: true,
                settings: { cost_per_kwh: 0.15, co2_per_kwh: 0.40, currency_symbol: '$', simulation_enabled: true }
            });
        }
        res.status(200).json({ success: true, settings: settings[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch settings" });
    }
});

app.put('/api/user/settings', verifyToken, async (req, res) => {
    try {
        const { cost_per_kwh, co2_per_kwh, currency_symbol, simulation_enabled } = req.body;
        await db.execute(
            `INSERT INTO user_settings (user_id, cost_per_kwh, co2_per_kwh, currency_symbol, simulation_enabled) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                cost_per_kwh = VALUES(cost_per_kwh),
                co2_per_kwh = VALUES(co2_per_kwh),
                currency_symbol = VALUES(currency_symbol),
                simulation_enabled = VALUES(simulation_enabled)`,
            [
                req.user.userId,
                cost_per_kwh !== undefined ? parseFloat(cost_per_kwh) : 0.15,
                co2_per_kwh !== undefined ? parseFloat(co2_per_kwh) : 0.40,
                currency_symbol || '$',
                simulation_enabled !== undefined ? Boolean(simulation_enabled) : true
            ]
        );
        res.status(200).json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
});

// ---------------------------------------------------------
// 6. GET LATEST LOGS (USER-SCOPED)
// ---------------------------------------------------------
app.get('/api/logs/latest', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const sql = `
            SELECT 
                g.log_id, g.panel_id, p.panel_name, p.panel_type, g.voltage, g.current_amps, g.power_watts, g.recorded_at
            FROM generation_logs g
            JOIN solar_panels p ON g.panel_id = p.panel_id
            WHERE p.user_id = ?
            ORDER BY g.recorded_at DESC LIMIT 50
        `;
        const [rows] = await db.execute(sql, [userId]);
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Database query failed:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// ---------------------------------------------------------
// 7. SECURED IoT LOGS ENDPOINT + TARGETED USER WEBSOCKET + TELEGRAM ALERTS
// ---------------------------------------------------------
app.post('/api/logs', async (req, res) => {
    try {
        const { panel_id, voltage, current_amps, power_watts } = req.body;

        if (!panel_id || isNaN(voltage) || isNaN(current_amps) || isNaN(power_watts)) {
            return res.status(400).json({ success: false, message: "Invalid or missing data payload." });
        }

        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ success: false, message: "Unauthorized: Missing API Key" });
        }

        const [panels] = await db.execute(`
            SELECT p.panel_id, p.panel_name, p.panel_type, p.user_id, u.email, u.full_name, u.role, u.is_demo
            FROM solar_panels p
            JOIN users u ON p.user_id = u.id
            WHERE p.panel_id = ? AND p.api_secret = ?
        `, [panel_id, apiKey]);

        if (panels.length === 0) {
            return res.status(403).json({ success: false, message: "Forbidden: Invalid API Key for this panel" });
        }

        const panel = panels[0];
        const panel_type = panel.panel_type;
        const panel_name = panel.panel_name || panel_type;
        const operatorLabel = panel.is_demo 
            ? `Showcase Demo (Account #${panel.user_id})` 
            : `${panel.full_name || 'Operator'} (${panel.email}, ID #${panel.user_id})`;

        let alertTriggered = false;
        let alertMessage = "";

        if (voltage < 20.0) {
            alertTriggered = true;
            alertMessage = `CRITICAL ALARM: Voltage dropped to ${voltage}V!`;
            console.log('\x1b[31m%s\x1b[0m', alertMessage);

            const telegramMsg = `🚨 *HELIOSTRACK CRITICAL ALARM*\n\n*Account:* ${operatorLabel}\n*Panel String:* ${panel_name} (ID: #${panel_id})\n*Cell Type:* ${panel_type}\n*Voltage:* ${voltage}V (Below 20.0V safe threshold!)\n*Power:* ${power_watts}W | *Current:* ${current_amps}A\n*Time:* ${new Date().toLocaleString()}`;
            const now = Date.now();
            const lastAlertTime = lastAlertTimes[panel_id] || 0;
            // Only send Telegram alert if this is the Admin's own panel (user_id === 1)
            // Demo accounts and other operators will NOT spam your personal Telegram!
            const isOwnerPanel = panel.user_id === 1 && !panel.is_demo;

            if (isOwnerPanel && now - lastAlertTime > ALERT_COOLDOWN_MS) {
                await sendTelegramAlert(telegramMsg);
                lastAlertTimes[panel_id] = now;
                console.log(`📨 Telegram alert sent for your personal panel ${panel_id}. Cooldown 5min started.`);
            }
        } else if (voltage > 25.0) {
            alertTriggered = true;
            alertMessage = `WARNING: Voltage spike detected at ${voltage}V!`;
            console.log('\x1b[33m%s\x1b[0m', alertMessage);

            const now = Date.now();
            const lastAlertTime = lastAlertTimes[panel_id] || 0;
            const isOwnerPanel = panel.user_id === 1 && !panel.is_demo;

            if (isOwnerPanel && now - lastAlertTime > ALERT_COOLDOWN_MS) {
                const telegramMsg = `⚠️ *HELIOSTRACK VOLTAGE SPIKE*\n\n*Account:* ${operatorLabel}\n*Panel String:* ${panel_name} (ID: #${panel_id})\n*Cell Type:* ${panel_type}\n*Voltage:* ${voltage}V (Spike detected!)\n*Power:* ${power_watts}W | *Current:* ${current_amps}A\n*Time:* ${new Date().toLocaleString()}`;
                await sendTelegramAlert(telegramMsg);
                lastAlertTimes[panel_id] = now;
                console.log(`📨 Telegram spike alert sent for your personal panel ${panel_id}. Cooldown 5min started.`);
            }
        }

        const sql = `INSERT INTO generation_logs (panel_id, voltage, current_amps, power_watts, recorded_at) VALUES (?, ?, ?, ?, NOW())`;
        const [result] = await db.execute(sql, [panel_id, voltage, current_amps, power_watts]);

        const liveLogObject = {
            log_id: result.insertId,
            panel_id: panel.panel_id,
            panel_name: panel_name,
            panel_type: panel_type,
            voltage: voltage,
            current_amps: current_amps,
            power_watts: power_watts,
            recorded_at: new Date()
        };

        // Targeted emission: Only to the owner of this panel
        io.to(`user_${panel.user_id}`).emit('live_log_update', liveLogObject);
        // Also broadcast to admin room
        io.to('admin_room').emit('live_log_update', liveLogObject);

        res.status(201).json({ success: true, alert: alertTriggered ? alertMessage : null });
    } catch (error) {
        console.error("Failed to save log:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// 8. HISTORY API ENDPOINT (USER-SCOPED)
// ---------------------------------------------------------
app.get('/api/logs/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const startDate = req.query.start;
        const endDate = req.query.end;

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Please provide both start and end dates." });
        }

        const sql = `
            SELECT 
                MAX(g.log_id) AS log_id, ROUND(AVG(g.voltage), 2) AS voltage, ROUND(AVG(g.current_amps), 2) AS current_amps, ROUND(AVG(g.power_watts), 2) AS power_watts, DATE_FORMAT(g.recorded_at, '%Y-%m-%d %H:00:00') AS recorded_at, p.panel_type, p.panel_name, p.panel_id
            FROM generation_logs g
            JOIN solar_panels p ON g.panel_id = p.panel_id
            WHERE p.user_id = ? AND g.recorded_at BETWEEN ? AND ? 
            GROUP BY DATE_FORMAT(g.recorded_at, '%Y-%m-%d %H:00:00'), p.panel_id, p.panel_type, p.panel_name
            ORDER BY recorded_at ASC
        `;
        const formattedEndDate = endDate.includes(' ') ? endDate : `${endDate} 23:59:59`;
        const [rows] = await db.execute(sql, [userId, startDate, formattedEndDate]);
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (error) {
        console.error("Database error in history route:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// 9. DYNAMIC DEVICE MANAGEMENT (USER-SCOPED CRUD)
// ---------------------------------------------------------
const ALLOWED_PANEL_TYPES = [
    'Monocrystalline 400W',
    'Polycrystalline 350W',
    'Thin-Film 300W',
    'Bifacial 450W'
];

app.get('/api/panels', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const sql = 'SELECT panel_id, panel_name, panel_type, api_secret, added_at FROM solar_panels WHERE user_id = ? ORDER BY panel_id ASC';
        const [panels] = await db.execute(sql, [userId]);
        res.status(200).json({ success: true, data: panels });
    } catch (error) {
        console.error("Failed to fetch panels:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post('/api/panels', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { panel_type, panel_name } = req.body;

        if (!panel_type) {
            return res.status(400).json({ success: false, message: "Panel type is required" });
        }

        if (!ALLOWED_PANEL_TYPES.includes(panel_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid panel type. Allowed types: ${ALLOWED_PANEL_TYPES.join(', ')}`
            });
        }

        const name = (panel_name && panel_name.trim()) || `Solar Array ${panel_type.split(' ')[0]}`;
        const newApiSecret = 'helios_key_' + Math.random().toString(36).substring(2, 12);

        const sql = 'INSERT INTO solar_panels (user_id, panel_name, panel_type, api_secret) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(sql, [userId, name, panel_type, newApiSecret]);

        await sendPanelsToSimulator();

        res.status(201).json({
            success: true,
            message: "New panel registered successfully",
            panel_id: result.insertId,
            panel_name: name,
            panel_type: panel_type,
            api_secret: newApiSecret
        });
    } catch (error) {
        console.error("Failed to register new panel:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.delete('/api/panels/:panel_id', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const panelId = req.params.panel_id;

        const [existing] = await db.execute(
            'SELECT panel_id FROM solar_panels WHERE panel_id = ? AND user_id = ?',
            [panelId, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Panel not found or not owned by you." });
        }

        await db.execute('DELETE FROM solar_panels WHERE panel_id = ? AND user_id = ?', [panelId, userId]);
        await sendPanelsToSimulator();

        res.status(200).json({ success: true, message: "Panel removed successfully." });
    } catch (error) {
        console.error("Delete panel error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ---------------------------------------------------------
// 10. CSV EXPORT (USER-SCOPED WITH CSV INJECTION PROTECTION)
// ---------------------------------------------------------
app.get('/api/logs/export', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const sql = `
            SELECT 
                g.log_id, p.panel_name, p.panel_type, g.voltage, g.current_amps, g.power_watts, g.recorded_at
            FROM generation_logs g
            JOIN solar_panels p ON g.panel_id = p.panel_id
            WHERE p.user_id = ?
            ORDER BY g.recorded_at DESC
        `;
        const [rows] = await db.execute(sql, [userId]);

        let csvContent = "Log ID,Panel Name,Panel Type,Voltage (V),Current (A),Power (W),Recorded Time\n";
        rows.forEach(row => {
            let safeName = String(row.panel_name || '').replace(/"/g, '""');
            let safeType = String(row.panel_type || '').replace(/"/g, '""');
            csvContent += `${row.log_id},"${safeName}","${safeType}",${row.voltage},${row.current_amps},${row.power_watts},"${row.recorded_at}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="heliostrack_telemetry_export.csv"');
        res.status(200).send(csvContent);
    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ success: false, message: "Failed to export data" });
    }
});

// ---------------------------------------------------------
// IPC: Helper to send panel list to the simulator child process
// ---------------------------------------------------------
let simulatorProcess = null;

async function sendPanelsToSimulator() {
    if (!simulatorProcess) return;
    try {
        const sql = 'SELECT panel_id, panel_name, panel_type, api_secret, user_id FROM solar_panels';
        const [panels] = await db.execute(sql);
        simulatorProcess.send({ type: 'panels', data: panels });
        console.log(`Sent ${panels.length} panel(s) across fleet to simulator via IPC.`);
    } catch (error) {
        console.error("Failed to send panel list to simulator:", error);
    }
}

// ---------------------------------------------------------
// SERVER STARTUP & SIMULATOR FORK
// ---------------------------------------------------------
function startServer() {
    server.listen(PORT, () => {
        console.log(`HeliosTrack Backend API & WebSocket Server running on port ${PORT}`);

        if (process.env.DISABLE_SIMULATOR === 'true') {
            console.log("ℹ️ IoT Simulator disabled via DISABLE_SIMULATOR=true in .env");
            return;
        }

        const simulatorPath = path.join(__dirname, 'simulator.js');
        const proc = fork(simulatorPath);
        simulatorProcess = proc;

        console.log("IoT Simulator auto-started in the background.");

        simulatorProcess.on('message', (message) => {
            if (message.type === 'request_panels') {
                sendPanelsToSimulator();
            }
        });

        simulatorProcess.on('exit', (code) => {
            console.log(`Simulator exited with code ${code}`);
            simulatorProcess = null;
        });

        setTimeout(() => sendPanelsToSimulator(), 1000);
    });
}

// Export app and server for testing or serverless setups
module.exports = { app, server, startServer };

if (require.main === module) {
    startServer();
}

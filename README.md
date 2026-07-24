```markdown
# HeliosTrack - Distributed Solar Monitoring System

![Status](https://img.shields.io/badge/Status-Live-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

HeliosTrack is a full-stack, real-time IoT dashboard designed to monitor solar panel energy generation, battery storage, and grid flow. It features a live data simulator, secure authentication, dynamic charting, and business ROI calculations. 

Built with scalability in mind, it seamlessly adapts to both local desktop environments (Electron/Browser) and cloud deployments (Vercel & Render).

---

## Key Features

*   **Real-Time Monitoring:** Live WebSocket integration (`Socket.io`) for instant UI updates every 5 seconds without page reloads.
*   **Dynamic Data Visualization:** Smooth, interactive multi-line charts using `Chart.js` to track voltage fluctuations across multiple solar panels.
*   **IoT Simulator:** Built-in background Node.js process that simulates real IoT hardware data (Voltage, Current, Power).
*   **Virtual Battery & Grid Controller:** Simulates battery charging mechanics and automatic energy exporting to the grid once fully charged.
*   **Business ROI Metrics:** Calculates real-time session energy generated (kWh), money saved ($), and CO2 offset (kg).
*   **Secure Authentication:** JWT-based user authentication, Bcrypt password hashing, and anti-brute force rate limiting.
*   **Alerting System:** Visual UI banners and real-time Telegram alerts for critical voltage drops or spikes.
*   **Fully Responsive:** Optimized UI for Desktop, Tablet, and Mobile views.
*   **Data Export:** One-click CSV export for historical log analysis.

---

## Technology Stack

**Frontend:**
*   HTML5, CSS3, Vanilla JavaScript
*   Chart.js (Data Visualization)
*   Socket.io Client (Real-time communication)

**Backend:**
*   Node.js & Express.js
*   Socket.io (WebSocket Server)
*   JWT & Bcrypt (Security)
*   Child Process (Background IoT Simulator)

**Database & Deployment:**
*   MySQL (Aiven Cloud)
*   Vercel (Frontend Hosting)
*   Render (Backend Hosting)

---

## Local Installation & Setup

Follow these steps to run the project locally on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/heliostrack-distributed-solar-monitoring.git](https://github.com/your-username/heliostrack-distributed-solar-monitoring.git)
cd heliostrack-distributed-solar-monitoring

```

### 2. Setup the Backend

Navigate to the backend directory and install dependencies:

```bash
cd backend-api
npm install

```

Create a `.env` file in the `backend-api` folder and add the following variables:

```env
PORT=3001
DB_HOST=your_aiven_mysql_host
DB_USER=your_db_username
DB_PASS=your_db_password
DB_NAME=your_db_name
DB_PORT=your_db_port
JWT_SECRET=your_super_secret_jwt_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

```

Start the backend server (The IoT Simulator will auto-start):

```bash
npm start

```

### 3. Setup the Frontend

The frontend dynamically detects the environment. You can simply open the `web-client/index.html` file in your browser, or run it via a local development server like Live Server in VS Code.

---

## ☁️ Cloud Deployment

This project is configured for seamless cloud deployment:

### Backend (Render)
Deploy the `backend-api` directory as a Web Service on Render. Ensure all `.env` variables are added to the Render dashboard. The simulator is designed to run concurrently.

**Important:** After deploying to Render, run this command in **Render Shell** to create an admin user:
```bash
node setupAdmin.js
```

### Frontend (Vercel)
Deploy the `web-client` directory on Vercel. The `app.js` file makes API requests to the Render backend URL.

---

## 🔧 Login Problem Solving Guide (বাংলা)

### লগইন সমস্যা সমাধান — ধাপে ধাপে গাইড

#### ধাপ 1️⃣: ব্রাউজার Console চেক করুন
- আপনার Vercel সাইটে যান
- **F12** চাপুন → **Console** ট্যাবে দেখুন কী error আসছে
- **Network** ট্যাবে `login` request টি খুঁজুন, status code দেখুন

#### ধাপ 2️⃣: Render Logs চেক করুন
Render Dashboard → আপনার Web Service → **Logs** section এ যান।
নিচের error গুলো খুঁজুন:

| Error | মানে | সমাধান |
|-------|------|--------|
| `JWT_SECRET is not defined` | JWT_SECRET সেট করা নেই | Render Dashboard → Environment → `JWT_SECRET` যোগ করুন |
| `ECONNREFUSED` | Database connect হচ্ছে না | `DB_HOST`, `DB_USER`, `DB_PASS` চেক করুন |
| `Admin user created` | Admin ready ✅ | কিছু করতে হবে না |

#### ধাপ 3️⃣: Admin User তৈরি করুন
```bash
# Render Dashboard এ → Shell tab → নিচের command দিন:
cd backend-api && node setupAdmin.js
```
- Render Dashboard → Environment Variables এ `ADMIN_EMAIL` এবং `ADMIN_PASSWORD` সেট করা আছে কিনা নিশ্চিত হন
- `setupAdmin.js` রান করার পর `"✅ Admin user created successfully."` দেখতে হবে

#### ধাপ 4️⃣: Rate Limiter চেক করুন
- ৫ বার ভুল email/password দিলে ১৫ মিনিট ব্লক
- দেখুন response status `429` কিনা
- Render service restart দিলে এই limit রিসেট হবে

#### ধাপ 5️⃣: CORS Error
আমরা `server.js` এ Dynamic CORS fix করে দিয়েছি — এখন যেকোনো Vercel URL কাজ করবে।
যদি এখনো `Blocked by CORS` দেখে, তাহলে RENDER LOGS থেকে error টি কপি করে জানান।

#### ধাপ 6️⃣: একদম শেষ চেষ্টা
সব কিছু চেক করার পরেও যদি কাজ না করে:
1. Render Dashboard → আপনার Web Service → **Manual Deploy** → **Deploy latest commit**
2. আবার Login চেষ্টা করুন

---

## API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/login` | Authenticate user and receive JWT | No |
| `GET` | `/api/logs/latest` | Fetch the last 40 generation logs | Yes (JWT) |
| `POST` | `/api/logs` | Receive data from IoT panels | Yes (API Key) |
| `GET` | `/api/logs/history` | Filter logs by start and end date | Yes (JWT) |
| `GET` | `/api/panels` | Fetch all registered solar panels | No |
| `POST` | `/api/panels` | Register a new solar panel dynamically | No |
| `GET` | `/api/logs/export` | Download complete historical data as CSV | No |

---

## Author

**Ebnul Hasan Mahi**

*Software Engineering Student & Developer*

---

## License

This project is licensed under the MIT License. Feel free to use, modify, and distribute it for educational and portfolio purposes.

```

```

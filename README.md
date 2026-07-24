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

* **Backend (Render):** Deploy the `backend-api` directory as a Web Service on Render. Ensure all `.env` variables are added to the Render dashboard. The simulator is designed to run concurrently.
* **Frontend (Vercel):** Deploy the `web-client` directory on Vercel. The `app.js` file includes dynamic environment detection to automatically route API requests to the Render backend when hosted on Vercel.

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

# HeliosTrack - Distributed Solar Fleet & Virtual Grid Simulator

![Status](https://img.shields.io/badge/Status-Live-success)
![Version](https://img.shields.io/badge/Version-2.4.0-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019%20%7C%20Tailwind-black)
![License](https://img.shields.io/badge/License-MIT-green)

HeliosTrack is an industrial full-stack IoT platform designed to monitor distributed solar fleets, virtual battery storage kinetics, and smart grid infeed analytics. It features an interactive **Next.js 16 CleanTech Command Center**, **1-Click Instant Showcase Sandbox**, **isolated multi-tenant fleets**, targeted room-based WebSockets, automated Telegram alarms, and business ROI calculations.

> 📖 **Deep Dive Documentation**: For the detailed network topology, mathematical models, and data flow manual, see [**ARCHITECTURE.md**](./ARCHITECTURE.md).

---

## ⚡ Key Highlights in Version 2.4

*   **Public Showcase & Instant Sandbox:** Anyone can explore live telemetry with 1 click (`/api/auth/demo`) without registering, or create their own personal account to manage an isolated fleet.
*   **True Multi-Tenancy & Data Isolation:** Database schema and backend APIs isolate panels, logs, and settings per user. Zero cross-tenant leakage.
*   **Targeted Socket.io Rooms:** Live telemetry is routed directly to `user_${userId}` rooms, ensuring zero data leakage between operators.
*   **Automated Starter Fleet:** Newly registered operators are automatically provisioned with 2 starter virtual solar panels so their dashboard immediately streams live data.
*   **Executive Synoptic Single-Line Diagram:** Real-time visual power flow diagram between Solar Arrays, Hybrid Inverter (98.7% efficiency), Virtual Battery Bank, Local Facility Load, and Utility Grid Export.
*   **Virtual Storage & Infeed Controller:** Simulates 48V LiFePO4 battery charging curves. When fully charged, surplus solar power is automatically monetized via utility grid export.
*   **Scoped Telegram Alerts:** Your personal Telegram receives critical alerts only for your own personal solar panels (`user_id = 1`), preventing stranger accounts or demo sandbox noise from buzzing your phone.
*   **Resilient Fallback Engine:** If the backend server is sleeping on free cloud tiers or offline, the client automatically runs an internal simulation so visitors never see "failed to fetch".

---

## 🛠️ Technology Stack

**Frontend (`frontend/`):**
*   Next.js 16 (App Router) + React 19 + TypeScript
*   Tailwind CSS 4 (Custom Obsidian Cyber-Solar Tokens)
*   Lucide React Icons
*   Socket.io Client (Real-time telemetry stream)
*   Responsive SVG Real-Time Telemetry Curves

**Backend (`backend-api/`):**
*   Node.js & Express 5
*   Socket.io (Room-based targeted WebSocket emissions)
*   JWT & Bcrypt (Multi-tenant security)
*   Child Process (Dynamic IoT Fleet Simulator with auto-port resolution)
*   Anti-brute-force rate limiting & timing-leak protection

**Database & Cloud:**
*   TiDB Cloud Serverless (Distributed MySQL-compatible SQL)
*   Vercel (Next.js Frontend Hosting)
*   Render (Backend API & WebSocket Server)

---

## 🚀 Quick Start & Local Development

### 1. Database Migration
Ensure your `.env` file in `backend-api/.env` has your database credentials, then run:
```bash
npm run migrate
```
This migrates the schema for multi-tenancy, seeds default demo accounts, and provisions starter panels.

### 2. Start the Backend API & IoT Simulator
```bash
npm run dev:backend
```
The backend server runs on `http://127.0.0.1:3001` and starts the background IoT simulator.

### 3. Start the Next.js Frontend
In a separate terminal:
```bash
npm run dev:frontend
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

*   Click **"Launch Interactive Showcase Sandbox"** to jump into the live sandbox instantly.
*   Or click **"Provision Private Fleet"** to register and manage your own fleet.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Scope |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/demo` | **1-Click Showcase Sandbox** (Instant guest JWT with live data) | Public |
| `POST` | `/api/auth/register`| Register user + auto-provision 2 starter solar panels | Public |
| `POST` | `/api/auth/login` | Authenticate existing user | Public |
| `GET` | `/api/auth/me` | Fetch active user profile and custom tariff settings | User JWT |
| `GET` | `/api/logs/latest` | Fetch latest 50 logs for user's solar fleet | User JWT |
| `GET` | `/api/logs/history`| Query historical aggregated logs between `start` and `end` | User JWT |
| `GET` | `/api/logs/export` | Download complete fleet history as CSV (Injection-safe) | User JWT |
| `GET` | `/api/panels` | Fetch user's registered solar panels | User JWT |
| `POST` | `/api/panels` | Dynamically register a new solar panel | User JWT |
| `DELETE`| `/api/panels/:id` | Remove a solar panel from user's fleet | User JWT |
| `POST` | `/api/logs` | IoT hardware ingest endpoint | Hardware API Key |
| `GET` | `/api/user/settings`| Retrieve user tariff & CO₂ configurations | User JWT |
| `PUT` | `/api/user/settings`| Update user tariff & CO₂ configurations | User JWT |

---

## Author
**Ebnul Hasan Mahi**  
*Software Engineering Student & Developer*

---

## License
MIT License. Open for educational and portfolio showcases.

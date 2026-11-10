# HeliosTrack Next.js 16 Frontend

Enterprise CleanTech Microgrid Command Center built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS 4**.

---

## 🌟 Key Features & Components

* **Interactive Synoptic Single-Line Diagram (`components/PowerFlow.tsx`)**:
  * Real-time energy bus tracking photovoltaic arrays, central hybrid inverter (98.7% conversion efficiency), virtual 48V LiFePO4 battery bank, facility load, and utility grid interties.
  * Shows automated transition to green energy monetization (`Exporting to Grid 💸`) when battery hits 100%.
* **High-Frequency Telemetry Curves (`components/TelemetryChart.tsx`)**:
  * Multi-metric switcher (`Voltage (V)`, `Active Power (W)`, `Current (A)`).
  * Glowing gradient fills and threshold reference lines for undervoltage (<20V) and voltage spikes (>25V).
* **PV Fleet Manager (`components/PanelManager.tsx`)**:
  * Provision solar string hardware keys, choose PV cell architectures (Bifacial 450W, Monocrystalline 400W, Polycrystalline 350W, Thin-Film 300W).
  * In-card toast notifications with 1-click clipboard key copy (zero jarring browser popups).
* **Audit & Historical Logs (`components/LogsTable.tsx`)**:
  * Searchable and filterable time-series records with injection-safe CSV download.
* **Resilient Zero-Failure Sandbox Mode (`lib/api.ts` & `lib/socket.ts`)**:
  * If the backend server is sleeping or offline, the frontend seamlessly runs an internal microgrid telemetry generator so reviewers and visitors never experience broken states.

---

## 🛠️ Project Structure

```
frontend/
├── app/
│   ├── globals.css           # Obsidian CleanTech design system tokens & animations
│   ├── layout.tsx            # Root layout wrapped in AuthProvider
│   ├── page.tsx              # Public Showcase Landing Page with embedded synoptics
│   ├── (auth)/
│   │   ├── login/page.tsx    # Operator Authentication screen
│   │   └── register/page.tsx # Private Fleet Registration screen
│   └── dashboard/
│       └── page.tsx          # Microgrid Command Center with segmented tabs
├── components/
│   ├── Navbar.tsx            # Sticky header, connection pill, and tab switcher
│   ├── PowerFlow.tsx         # Synoptic Single-Line Diagram (SLD)
│   ├── TelemetryChart.tsx    # Responsive SVG multi-line telemetry chart
│   ├── PanelManager.tsx      # Solar string provisioning & hardware key gateway
│   └── LogsTable.tsx         # Audit trail & CSV report exporter
├── context/
│   └── AuthContext.tsx       # Auth provider, session token storage, & 1-click demo
└── lib/
    ├── api.ts                # Typed API client with auto-fallback engine
    └── socket.ts             # Socket.io client with local fallback generator
```

---

## 🚀 Running the Frontend

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)**.

### 3. Production Build
```bash
npm run build
npm run start
```

---

## 🌐 Environment Variables

Create `.env.local` in `frontend/` (optional):
```env
# URL of the HeliosTrack Backend API (defaults to http://127.0.0.1:3001 locally)
NEXT_PUBLIC_API_URL=http://127.0.0.1:3001
```
When deployed to Vercel, set `NEXT_PUBLIC_API_URL` to your Render backend URL.

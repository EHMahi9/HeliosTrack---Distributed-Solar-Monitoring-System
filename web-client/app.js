// HTML Sanitization Helper to prevent XSS in dynamic HTML injections
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let currentBatteryPercent = 50.0;
const BATTERY_MAX = 100; // NEW: Maximum battery percentage limit
const BATTERY_MIN = 0;   // NEW: Minimum battery percentage limit (just to be safe)

const API_URL = 'https://heliostrack-distributed-solar-monitoring.onrender.com';
const WS_URL = 'wss://heliostrack-distributed-solar-monitoring.onrender.com';
let voltageChart = null;
let socket = null; // Socket.io instance

// ROI Tracking Variables (Global Scope)
let sessionKwh = 0;
const COST_PER_KWH = 0.15; // $0.15 per kWh
const CO2_PER_KWH = 0.4;   // 0.4 kg CO2 per kWh

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('helios_token');
    
    if (token) {
        showDashboard();
    } else {
        showLogin();
    }

    setupAuth(); 
    setupFilterButtons(); 
});

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================
function setupAuth() {
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const errorText = document.getElementById('loginError');

        if (!email || !password) {
            errorText.innerText = "Please enter both email and password.";
            errorText.style.display = 'block';
            return;
        }

        try {
            // 🛠️ FIXED: Better error handling with detailed debug info
            console.log(`🔍 Attempting login to: ${API_URL}/api/login`);
            console.log(`📧 Email: ${email}`);
            
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log(`📡 Response status: ${response.status} ${response.statusText}`);

            // 🆕 Try to get response body even for non-JSON errors
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                const textBody = await response.text();
                console.error("❌ Non-JSON response:", textBody);
                errorText.innerText = `Server returned ${response.status}. Check Render logs.`;
                errorText.style.display = 'block';
                return;
            }

            console.log(`📦 Response data:`, data);

            if (data.success) {
                localStorage.setItem('helios_token', data.token);
                errorText.style.display = 'none';
                console.log("✅ Login successful! Token stored.");
                showDashboard();
            } else {
                errorText.innerText = data.message || "Invalid credentials!";
                errorText.style.display = 'block';
            }
        } catch (err) {
            console.error("❌ Login error:", err);
            errorText.innerText = `Server error. Check if backend is running at ${API_URL}`;
            errorText.style.display = 'block';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('helios_token'); 
        disconnectSocket(); 
        showLogin(); 
    });
}

function showDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    // NEW: Show Admin Controls
    document.getElementById('admin-controls').style.display = 'flex';
    fetchLogs(`${API_URL}/api/logs/latest`); // FIXED: Added proper endpoint for initial load
    initWebSocket();    // Start live WebSocket stream!
}

function showLogin() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('dashboard-container').style.display = 'none';
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
}

// Module-level guard to prevent concurrent auth failure triggers
let isHandlingAuthFailure = false;

// Central handler for expired or invalid JWT sessions across HTTP & WebSocket
function handleAuthFailure(message = "Session expired. Please log in again.") {
    if (isHandlingAuthFailure) return;
    isHandlingAuthFailure = true;

    disconnectSocket();
    localStorage.removeItem('helios_token');
    showLogin();

    const errorText = document.getElementById('loginError');
    if (errorText) {
        errorText.innerText = message;
        errorText.style.display = 'block';
    }

    setTimeout(() => {
        isHandlingAuthFailure = false;
    }, 1500);
}

// Connection status indicator helper
function updateConnectionUI(status) {
    const pill = document.getElementById('connectionStatusPill');
    const dot = document.getElementById('connectionStatusDot');
    const text = document.getElementById('connectionStatusText');
    if (!pill || !text) return;

    if (status === 'live') {
        pill.style.color = 'var(--accent-energy)';
        pill.style.background = 'var(--accent-energy-soft)';
        pill.style.borderColor = 'var(--accent-energy)';
        if (dot) {
            dot.style.background = 'var(--accent-energy)';
            dot.style.display = 'block';
        }
        text.innerText = 'LIVE DATA STREAM';
    } else if (status === 'reconnecting') {
        pill.style.color = 'var(--accent-warn, #FFA53D)';
        pill.style.background = 'rgba(255, 165, 61, 0.15)';
        pill.style.borderColor = 'var(--accent-warn, #FFA53D)';
        if (dot) {
            dot.style.background = 'var(--accent-warn, #FFA53D)';
            dot.style.display = 'block';
        }
        text.innerText = 'RECONNECTING...';
    } else if (status === 'disconnected') {
        pill.style.color = 'var(--text-muted, #8A96B3)';
        pill.style.background = 'rgba(255, 255, 255, 0.05)';
        pill.style.borderColor = 'var(--border-soft, #1c2a45)';
        if (dot) dot.style.display = 'none';
        text.innerText = 'OFFLINE';
    }
}

// ==========================================
// WEBSOCKET REAL-TIME STREAMING
// ==========================================
function initWebSocket() {
    if (socket) return; // Already connected

    const token = localStorage.getItem('helios_token');
    if (!token) {
        console.warn("WebSocket connection skipped: No token found.");
        return;
    }

    // Connect with JWT auth and resilient capped-backoff reconnection
    socket = io(API_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
    });

    socket.on('connect', () => {
        console.log("Connected to Enterprise WebSocket Stream!");
        updateConnectionUI('live');
    });

    socket.on('connect_error', (err) => {
        console.warn("WebSocket connection failed:", err.message);
        if (err.message === "Unauthorized") {
            handleAuthFailure("Session expired or unauthorized. Please log in again.");
        } else {
            // Network failure or cold start: show reconnecting status
            updateConnectionUI('reconnecting');
        }
    });

    socket.on('disconnect', (reason) => {
        console.warn("WebSocket disconnected:", reason);
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            updateConnectionUI('disconnected');
        } else {
            // Automatic reconnection will trigger
            updateConnectionUI('reconnecting');
        }
    });

    socket.io.on('reconnect_attempt', () => {
        updateConnectionUI('reconnecting');
    });

    socket.io.on('reconnect', () => {
        console.log("WebSocket reconnected successfully!");
        updateConnectionUI('live');
    });

    socket.on('session_expired', (data) => {
        console.warn("Session expired via WebSocket event:", data ? data.message : "Expired");
        handleAuthFailure(data ? data.message : "Session expired. Please log in again.");
    });

    // Listen for real-time logs pushed from the server
    socket.on('live_log_update', (newLog) => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate || endDate) return; 

        checkAlarms(newLog);
        prependSingleLogToTable(newLog);
        appendLiveLogToChart(newLog);
        updateBusinessMetrics(newLog.power_watts);
        
        // NEW: Trigger Battery Update
        updateBatteryStorage(newLog.power_watts);
    });
}

function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    updateConnectionUI('disconnected');
    // Reset session metric counters on logout
    sessionKwh = 0;
}

// ==========================================
// FETCH LOGS & FILTERS
// ==========================================
async function fetchLogs(targetUrl) {
    const tableBody = document.getElementById('logs-body');
    const token = localStorage.getItem('helios_token');

    try {
        const response = await fetch(targetUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            handleAuthFailure("Session expired. Please log in again.");
            return;
        }

        const result = await response.json();

        if (result.success && result.data.length > 0) {
            checkAlarms(result.data[0]); 
            updateTable(result.data);
            updateChart(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">No logs found.</td></tr>';
        }
    } catch (error) {
        console.error("Failed to fetch data:", error);
        tableBody.innerHTML = '<tr><td colspan="6" style="color: red;">Error connecting to the backend API.</td></tr>';
    }
}

function setupFilterButtons() {
    document.getElementById('filterBtn').addEventListener('click', () => {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;

        if (!start || !end) {
            alert("Please select both start and end dates.");
            return;
        }


        const filterUrl = `${API_URL}/api/logs/history?start=${start}&end=${end}`;
        fetchLogs(filterUrl); 
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        fetchLogs(`${API_URL}/api/logs/latest`); // FIXED: Using API_URL
    });

    document.getElementById('exportBtn').addEventListener('click', async () => {
        const token = localStorage.getItem('helios_token');
        if (!token) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Authentication Required',
                    text: 'Please log in to export historical logs.',
                    icon: 'warning',
                    confirmButtonColor: '#2DD4A7',
                    background: '#121A2B',
                    color: '#EAF0FB'
                });
            } else {
                alert('Please log in to export logs.');
            }
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/logs/export`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                handleAuthFailure("Session expired. Please log in again.");
                return;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Export failed with status ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'heliostrack_logs_report.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Export error:', err);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Export Failed',
                    text: err.message,
                    icon: 'error',
                    confirmButtonColor: '#2DD4A7',
                    background: '#121A2B',
                    color: '#EAF0FB'
                });
            } else {
                alert(`Export failed: ${err.message}`);
            }
        }
    });
}

// ==========================================
// DYNAMIC DEVICE MANAGEMENT (CRUD)
// ==========================================
document.getElementById('addPanelBtn').addEventListener('click', async () => {
    const panelType = document.getElementById('newPanelType').value;
    const btn = document.getElementById('addPanelBtn');
    
    // UI Feedback
    btn.innerText = "⏳ Adding...";
    btn.disabled = true;

    try {
        //FIXED: Fetch the token from LocalStorage
        const token = localStorage.getItem('helios_token');

        const response = await fetch(`${API_URL}/api/panels`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // 🛠️ FIXED: Attached the JWT token to bypass security
            },
            body: JSON.stringify({ panel_type: panelType })
        });

        if (response.status === 401 || response.status === 403) {
            handleAuthFailure("Session expired. Please log in again.");
            return;
        }

        const result = await response.json();
        
        if (result.success) {
            const safePanelId = escapeHtml(result.panel_id);
            const safePanelType = escapeHtml(panelType);
            const safeSecret = escapeHtml(result.api_secret);

            Swal.fire({
                title: 'Panel Registered!',
                icon: 'success',
                html: `
                    <p style="margin-bottom: 12px; font-size: 14px;"><strong>Panel ID:</strong> ${safePanelId} | <strong>Type:</strong> ${safePanelType}</p>
                    <div style="background: rgba(0,0,0,0.35); border: 1px solid #2DD4A7; border-radius: 6px; padding: 10px; margin: 12px 0;">
                        <label style="font-size: 11px; color: #94A3B8; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">API Secret (Hardware Key)</label>
                        <input type="text" readonly value="${safeSecret}" id="swalPanelSecret" 
                            style="width: 100%; background: transparent; border: none; color: #2DD4A7; font-family: monospace; font-size: 14px; text-align: center; cursor: pointer; user-select: all;" 
                            onclick="this.select(); navigator.clipboard.writeText(this.value);" />
                    </div>
                    <p style="color: #F59E0B; font-size: 12px; margin-top: 8px;">⚠️ <strong>Warning:</strong> Copy this secret now. It will not be shown again.</p>
                `,
                confirmButtonText: 'I have copied the secret',
                confirmButtonColor: '#2DD4A7',
                background: '#121A2B',
                color: '#EAF0FB'
            });
        } else {
            Swal.fire({
                title: 'Error!',
                text: `Failed to add panel: ${result.message || 'Unknown error'}`,
            icon: 'error',
                // 🛠️ FIXED: SweetAlert Dark Mode
                background: '#121A2B',
                color: '#EAF0FB',
                confirmButtonColor: '#FF5C5C'
            });
        }
    } catch (error) {
        console.error("Error adding panel:", error);
        Swal.fire({
            title: 'Error!',
            text: 'Server error. Check console.',
            icon: 'error',
            // 🛠️ FIXED: SweetAlert Dark Mode
            background: '#121A2B',
            color: '#EAF0FB',
            confirmButtonColor: '#FF5C5C'
        });
    } finally {
        btn.innerText = "➕ Add New Panel";
        btn.disabled = false;
    }
});

// ==========================================
// UI RENDERING HELPERS (DATATABLES INTEGRATION)
// ==========================================
let dataTableInstance = null;

// 1. Initial Load or Bulk Update
function updateTable(logs) {
    const tableBody = document.getElementById('logs-body');

    // Destroy existing DataTables instance if it exists
    if (dataTableInstance) {
        dataTableInstance.destroy(); 
    }

    tableBody.innerHTML = ''; // Clear old data

    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.log_id}</td>
            <td><strong>${log.panel_type}</strong></td>
            <td>${log.voltage}</td>
            <td>${log.current_amps}</td>
            <td>${log.power_watts}</td>
            <td>${new Date(log.recorded_at).toLocaleTimeString()}</td>
        `;
        tableBody.appendChild(row);
    });

    // 🛠️ Initialize DataTables
    dataTableInstance = $('#logsTable').DataTable({
        order: [[0, 'desc']], // Sort descending by Log ID
        pageLength: 10,       // Show 10 rows per page
        responsive: true,
        language: {
            search: "🔍 Search Logs:"
        }
    });
}

// 2. Live Data Update (For Simulator)
function prependSingleLogToTable(log) {
    if (dataTableInstance) {
        const newRowData = [
            log.log_id,
            `<strong>${log.panel_type}</strong>`,
            log.voltage,
            log.current_amps,
            log.power_watts,
            new Date(log.recorded_at).toLocaleTimeString()
        ];
        
        // Add new row via DataTables API and retain pagination
        dataTableInstance.row.add(newRowData).draw(false);
    }
}

// ==========================================
// CHART CONFIGURATION
// ==========================================
function updateChart(logs) {
    const chronologicalLogs = [...logs].reverse();
    const uniquePanels = [...new Set(chronologicalLogs.map(log => log.panel_type))];
    const allTimestamps = [...new Set(chronologicalLogs.map(log => new Date(log.recorded_at).toLocaleTimeString()))];

    const datasets = [];
    
    // 🎨 FIXED: Added more colors so 3 or more panels don't look the same
    // 🎨 FIXED: Updated to match the new Dark Theme Design Tokens
    const colors = [
        { border: '#2DD4A7', bg: 'rgba(45, 212, 167, 0.1)' }, // Energy Green (accent-energy)
        { border: '#F5A729', bg: 'rgba(245, 167, 41, 0.1)' }, // Solar Orange (accent-solar)
        { border: '#9D7BEA', bg: 'rgba(157, 123, 234, 0.1)' }, // Neon Purple (accent-purple)
        { border: '#FF5C5C', bg: 'rgba(255, 92, 92, 0.1)' },   // Alert Red (accent-alert)
        { border: '#FFA53D', bg: 'rgba(255, 165, 61, 0.1)' }   // Warn Orange (accent-warn)
    ];

    uniquePanels.forEach((panelName, index) => {
        const panelLogs = chronologicalLogs.filter(log => log.panel_type === panelName);
        let panelData = allTimestamps.map(timeLabel => {
            const logMatch = panelLogs.find(log => new Date(log.recorded_at).toLocaleTimeString() === timeLabel);
            return logMatch ? parseFloat(logMatch.voltage) : null; 
        });

        const color = colors[index % colors.length];
        datasets.push({
            label: `${panelName} (Voltage)`,
            data: panelData,
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            spanGaps: true 
        });
    });

    if (voltageChart) {
        voltageChart.data.labels = allTimestamps;
        voltageChart.data.datasets = datasets;
        voltageChart.update(); 
        return;
    }

    const ctx = document.getElementById('voltageChart').getContext('2d');
    voltageChart = new Chart(ctx, {
        type: 'line',
        data: { labels: allTimestamps, datasets: datasets },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            // 🛠️ FIXED: Chart.js Dark Mode Integration
            color: '#8A96B3', // Maps to var(--text-muted)
            scales: { 
                y: { 
                    beginAtZero: false,
                    grid: {
                        color: '#1c2a45' // Maps to var(--border-soft)
                    },
                    ticks: {
                        color: '#8A96B3'
                    }
                },
                x: {
                    grid: {
                        color: '#1c2a45'
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 8, 
                        maxRotation: 0,   
                        minRotation: 0,
                        color: '#8A96B3'
                    }
                }
            },
            layout: {
                padding: {
                    bottom: 20
                }
            }
        }
    });
}

function appendLiveLogToChart(log) {
    if (!voltageChart) return;

    const timeLabel = new Date(log.recorded_at).toLocaleTimeString();
    let labelIndex = voltageChart.data.labels.indexOf(timeLabel);
    
    // FIXED: Handled multiple WebSocket logs arriving at the exact same second
    if (labelIndex === -1) {
        // If it's a new second, add the label and placeholders for all datasets
        voltageChart.data.labels.push(timeLabel);
        voltageChart.data.datasets.forEach(dataset => {
            dataset.data.push(null); 
        });
        labelIndex = voltageChart.data.labels.length - 1;
    }

    // Now safely update only the specific panel's data at this correct time index
    voltageChart.data.datasets.forEach(dataset => {
        if (dataset.label.startsWith(log.panel_type)) {
            dataset.data[labelIndex] = parseFloat(log.voltage);
        }
    });

    // Cleanup old data smoothly
    if (voltageChart.data.labels.length > 40) {
        voltageChart.data.labels.shift();
        voltageChart.data.datasets.forEach(dataset => {
            dataset.data.shift();
        });
    }

    voltageChart.update();
}

function checkAlarms(latestLog) {
    const banner = document.getElementById('alarmBanner');
    if (!banner) return; 
    
    if (latestLog.voltage < 20.0) {
        banner.style.display = 'block';
        banner.style.backgroundColor = '#ff4c4c';
        banner.innerText = `⚠️ CRITICAL ALARM (${latestLog.panel_type}): Voltage dropped to ${latestLog.voltage}V!`;
    } else if (latestLog.voltage > 25.0) {
        banner.style.display = 'block';
        banner.style.backgroundColor = '#ff9800'; 
        banner.innerText = `⚠️ WARNING (${latestLog.panel_type}): Voltage spike detected at ${latestLog.voltage}V!`;
    } else {
        banner.style.display = 'none'; 
    }
}

// ==========================================
// BUSINESS ROI CALCULATOR
// ==========================================
function updateBusinessMetrics(powerWatts) {
    const roiContainer = document.getElementById('roi-widgets');
    if (roiContainer) roiContainer.style.display = 'flex';

    // Math: Convert Watts to kW, then calculate energy for a 5-second interval
    const kilowatts = powerWatts / 1000;
    const hours = 5 / 3600; 
    const energyKwh = kilowatts * hours;

    // Update cumulative total
    sessionKwh += energyKwh;

    // Calculate Business Values
    const moneySaved = sessionKwh * COST_PER_KWH;
    const co2Offset = sessionKwh * CO2_PER_KWH;

    // Update UI safely
    const kwhElem = document.getElementById('kwhValue');
    const moneyElem = document.getElementById('moneyValue');
    const co2Elem = document.getElementById('co2Value');

    if (kwhElem) kwhElem.innerText = `${sessionKwh.toFixed(4)} kWh`;
    if (moneyElem) moneyElem.innerText = `$${moneySaved.toFixed(4)}`;
    if (co2Elem) co2Elem.innerText = `${co2Offset.toFixed(4)} kg`;
}

// ==========================================
// VIRTUAL BATTERY & GRID CONTROLLER
// ==========================================
function updateBatteryStorage(powerWatts) {
    document.getElementById('battery-container').style.display = 'flex';

    // Battery charge/drain math
    const chargeAdded = (powerWatts / 1000) * 0.8; 
    const randomDrain = Math.random() * 0.5; 
    
    currentBatteryPercent = currentBatteryPercent + chargeAdded - randomDrain;

    // 🛠️ THE FIX: Enforce the minimum limit (Floor Bound)
    if (currentBatteryPercent < BATTERY_MIN) {
        currentBatteryPercent = BATTERY_MIN;
    }

    const batteryFill = document.getElementById('battery-fill');
    const batteryText = document.getElementById('batteryPercent');
    const statusText = document.getElementById('batteryStatusText');
    const gridText = document.getElementById('gridStatusText');
    const gridWidget = document.getElementById('gridStatusWidget');

    if (currentBatteryPercent >= BATTERY_MAX) {
        // Battery is Full - Selling to Grid
        currentBatteryPercent = BATTERY_MAX;
        batteryFill.style.width = '100%';
        batteryFill.classList.add('battery-full');
        batteryText.innerText = '100.0%';
        
        statusText.innerText = 'Fully Charged';
        statusText.style.color = 'var(--accent-solar)';
        
        gridText.innerText = 'Exporting to Grid 💸';
        gridText.style.color = 'var(--accent-energy)';
        gridWidget.style.borderTopColor = 'var(--accent-solar)';
    } else {
        // Still Charging or Draining normally
        batteryFill.style.width = `${currentBatteryPercent}%`;
        batteryText.innerText = `${currentBatteryPercent.toFixed(1)}%`;
        
        // 🛠️ FIX: Ensure full-battery class is removed if it drops below 100%
        batteryFill.classList.remove('battery-full');
        
        // Dynamic UI status for empty battery
        if (currentBatteryPercent <= BATTERY_MIN) {
            statusText.innerText = 'Battery Empty';
            statusText.style.color = 'var(--accent-alert)'; 
        } else {
            statusText.innerText = 'Charging from grid...';
            statusText.style.color = 'var(--text-muted)';
        }

        // Reset grid status UI
        gridText.innerText = 'Synchronized';
        gridText.style.color = 'var(--accent-purple)';
        gridWidget.style.borderTopColor = 'var(--accent-purple)';
    }
}
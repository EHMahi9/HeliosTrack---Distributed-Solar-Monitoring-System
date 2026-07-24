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
            // FIXED: Using API_URL instead of localhost
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('helios_token', data.token);
                errorText.style.display = 'none';
                showDashboard();
            } else {
                errorText.innerText = data.message || "Invalid credentials!";
                errorText.style.display = 'block';
            }
        } catch (err) {
            errorText.innerText = "Server error. Is the backend running?";
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

// ==========================================
// WEBSOCKET REAL-TIME STREAMING
// ==========================================
function initWebSocket() {
    if (socket) return; // Already connected

    // FIXED: Using API_URL instead of localhost
    socket = io(API_URL);

    socket.on('connect', () => {
        console.log("Connected to Enterprise WebSocket Stream!");
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
            localStorage.removeItem('helios_token');
            disconnectSocket();
            showLogin();
            alert("Session expired. Please login again.");
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

        // FIXED: Using API_URL instead of localhost
        const filterUrl = `${API_URL}/api/logs/history?start=${start}&end=${end}`;
        fetchLogs(filterUrl); 
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        fetchLogs(`${API_URL}/api/logs/latest`); // FIXED: Using API_URL
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        // FIXED: Using API_URL instead of localhost
        window.open(`${API_URL}/api/logs/export`, '_blank');
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
        // FIXED: Using API_URL instead of localhost
        const response = await fetch(`${API_URL}/api/panels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ panel_type: panelType })
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Success! New Panel Added.\nID: ${result.panel_id}\nType: ${panelType}\n\nThe Simulator will automatically detect this and start sending live data within 5 seconds!`);
        } else {
            alert("❌ Failed to add panel.");
        }
    } catch (error) {
        console.error("Error adding panel:", error);
        alert("Server error. Check console.");
    } finally {
        btn.innerText = "➕ Add New Panel";
        btn.disabled = false;
    }
});

// ==========================================
// UI RENDERING HELPERS
// ==========================================
function updateTable(logs) {
    const tableBody = document.getElementById('logs-body');
    tableBody.innerHTML = '';

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
}

function prependSingleLogToTable(log) {
    const tableBody = document.getElementById('logs-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${log.log_id}</td>
        <td><strong>${log.panel_type}</strong></td>
        <td>${log.voltage}</td>
        <td>${log.current_amps}</td>
        <td>${log.power_watts}</td>
        <td>${new Date(log.recorded_at).toLocaleTimeString()}</td>
    `;
    tableBody.insertBefore(row, tableBody.firstChild);

    if (tableBody.rows.length > 40) {
        tableBody.deleteRow(tableBody.rows.length - 1);
    }
}

function updateChart(logs) {
    const chronologicalLogs = [...logs].reverse();
    const uniquePanels = [...new Set(chronologicalLogs.map(log => log.panel_type))];
    const allTimestamps = [...new Set(chronologicalLogs.map(log => new Date(log.recorded_at).toLocaleTimeString()))];

    const datasets = [];
    
    // 🎨 FIXED: Added more colors so 3 or more panels don't look the same
    const colors = [
        { border: '#2980b9', bg: 'rgba(41, 128, 185, 0.1)' }, // Blue
        { border: '#27ae60', bg: 'rgba(39, 174, 96, 0.1)' },  // Green
        { border: '#e67e22', bg: 'rgba(230, 126, 34, 0.1)' }, // Orange
        { border: '#8e44ad', bg: 'rgba(142, 68, 173, 0.1)' }, // Purple
        { border: '#e74c3c', bg: 'rgba(231, 76, 60, 0.1)' }   // Red
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
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } } }
    });
}

function appendLiveLogToChart(log) {
    if (!voltageChart) return;

    const timeLabel = new Date(log.recorded_at).toLocaleTimeString();
    let labelIndex = voltageChart.data.labels.indexOf(timeLabel);
    
    // 🛠️ FIXED: Handled multiple WebSocket logs arriving at the exact same second
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

    // 🛠️ FIXED: Added realistic battery drain mechanic
    const chargeAdded = (powerWatts / 1000) * 0.8; 
    const randomDrain = Math.random() * 0.5; // randomly low percent charge decrease
    
    currentBatteryPercent = currentBatteryPercent + chargeAdded - randomDrain;

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
        statusText.style.color = '#f39c12';
        
        gridText.innerText = 'Exporting to Grid 💸';
        gridText.style.color = '#27ae60';
        gridWidget.style.borderTopColor = '#f1c40f';
    } else {
        // Still Charging
        batteryFill.style.width = `${currentBatteryPercent}%`;
        batteryText.innerText = `${currentBatteryPercent.toFixed(1)}%`;
    }
}
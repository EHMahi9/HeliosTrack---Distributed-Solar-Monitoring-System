// simulator.js - Acts as a Dynamic Virtual IoT Fleet
const port = process.env.PORT || 3001;
const API_URL_LOGS = process.env.SIMULATOR_TARGET_URL || `http://127.0.0.1:${port}/api/logs`;

let activePanels = []; // Updated in real-time via IPC from parent process

// 1. Listen for panel list updates from the parent server.js via IPC
process.on('message', (message) => {
    if (message.type === 'panels' && Array.isArray(message.data)) {
        activePanels = message.data;
        console.log(`Simulator received ${activePanels.length} panel(s) via IPC.`);
    }
});

// Request the initial panel list from the parent process on startup
if (process.send) {
    process.send({ type: 'request_panels' });
}

// 2. Send log using the specific API Key for each panel
async function sendLog(panel_id, api_secret, voltage, current_amps, power_watts) {
    try {
        await fetch(API_URL_LOGS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': api_secret
            },
            body: JSON.stringify({ panel_id, voltage, current_amps, power_watts })
        });
    } catch (error) {
        console.error(`Failed to send data for panel ${panel_id}:`, error.message);
    }
}

// 3. Generate data for all dynamically loaded panels
async function generateAndSendLog() {
    if (activePanels.length === 0) return;

    for (const panel of activePanels) {
        let voltage;
        
        // Base voltage logic based on panel_id to keep variations
        const baseVoltage = 23.5 + (panel.panel_id % 2); 
        
        // Occasional realistic dips/spikes
        const rand = Math.random();
        if (rand < 0.15) {
            voltage = 17.5 + (Math.random() * 2.0); // Critical alarm dip
        } else if (rand > 0.95) {
            voltage = 25.2 + (Math.random() * 1.5); // Spike warning
        } else {
            voltage = baseVoltage + (Math.random() * 2 - 1); // Normal fluctuation
        }

        const current_amps = 8.0 + (Math.random() * 0.6 - 0.3);
        const power_watts = voltage * current_amps;

        const voltageVal = parseFloat(voltage.toFixed(2));
        const currentVal = parseFloat(current_amps.toFixed(2));
        const powerVal = parseFloat(power_watts.toFixed(2));

        await sendLog(panel.panel_id, panel.api_secret, voltageVal, currentVal, powerVal);
    }
}

console.log(`Dynamic Multi-Site Fleet Simulator started (target: ${API_URL_LOGS})...`);
// Run the generator every 5 seconds
setInterval(generateAndSendLog, 5000);

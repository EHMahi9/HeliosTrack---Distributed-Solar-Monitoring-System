// simulator.js - Acts as a Dynamic Virtual IoT Fleet
const API_URL_LOGS = 'http://localhost:3001/api/logs';
const API_URL_PANELS = 'http://localhost:3001/api/panels';

let activePanels = []; // This array is now dynamic!

// 1. Fetch the latest list of panels from the database
async function fetchActivePanels() {
    try {
        const response = await fetch(API_URL_PANELS);
        const result = await response.json();
        if (result.success) {
            activePanels = result.data; // Contains panel_id, panel_type, and api_secret
        }
    } catch (error) {
        console.error("Failed to fetch active panels. Retrying...", error);
    }
}

// 2. Send log using the specific API Key for each panel
async function sendLog(panel_id, api_secret, voltage, current_amps, power_watts) {
    try {
        const response = await fetch(API_URL_LOGS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': api_secret // NEW: Using the dynamic secret key from the database
            },
            body: JSON.stringify({ panel_id, voltage, current_amps, power_watts })
        });
        // const result = await response.json();
    } catch (error) {
        console.error(`Failed to send data for panel ${panel_id}:`, error);
    }
}

// 3. Generate data for all dynamically loaded panels
async function generateAndSendLog() {
    // Refresh the panel list before generating data
    await fetchActivePanels();

    if (activePanels.length === 0) return; // If no panels exist, do nothing

    for (const panel of activePanels) {
        let voltage;
        
        // Base voltage logic based on panel_id to keep variations
        const baseVoltage = 23.5 + (panel.panel_id % 2); 
        
        if (Math.random() < 0.4) {
            voltage = 17.0 + (Math.random() * 2.5); // CRITICAL ALARM
        } else {
            voltage = baseVoltage + (Math.random() * 2 - 1); // Normal voltage
        }

        const current_amps = 8.0 + (Math.random() * 0.5 - 0.25);
        const power_watts = voltage * current_amps;

        const voltageVal = parseFloat(voltage.toFixed(2));
        const currentVal = parseFloat(current_amps.toFixed(2));
        const powerVal = parseFloat(power_watts.toFixed(2));

        // Send data using the panel's unique ID and unique API Secret
        await sendLog(panel.panel_id, panel.api_secret, voltageVal, currentVal, powerVal);
    }
}

console.log("Dynamic Multi-Site Fleet Simulator started...");
// Run the generator every 5 seconds
setInterval(generateAndSendLog, 5000);
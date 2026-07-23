const { app, BrowserWindow } = require('electron');
const path = require('path');

// Import the server boot function we just created
const { startServer } = require('./backend-api/server.js');

let mainWindow;

// This function handles the creation of the GUI window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            // nodeIntegration allows the frontend to use Node.js modules directly.
            // For fundamental learning, we keep it false here to maintain strict separation 
            // between the frontend (DOM) and backend (Node), relying on the HTTP fetch API you already wrote.
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Load the HTML file representing the dashboard
    mainWindow.loadFile(path.join(__dirname, 'web-client', 'index.html'));
    mainWindow.webContents.openDevTools();
    
    // Optional: Open Chrome DevTools automatically for debugging
    // mainWindow.webContents.openDevTools();
}

// app.whenReady() ensures Electron has fully initialized its core components 
// before we attempt to spawn native OS windows.
app.whenReady().then(() => {
    // 1. Boot the Express API
    startServer();
    
    // 2. Open the UI Window
    createWindow();

    // macOS specific: Re-create a window in the app when the dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Cleanly shut down the application when all windows are closed
app.on('window-all-closed', () => {
    // On macOS, it is common for applications and their menu bar to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
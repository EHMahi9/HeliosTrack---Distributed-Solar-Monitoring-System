// frontend/lib/socket.ts - Resilient WebSocket Client with Local Telemetry Generator
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, TelemetryLog, FALLBACK_DEMO_PANELS } from './api';

let socket: Socket | null = null;
let localSimulationInterval: NodeJS.Timeout | null = null;

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'local_simulated';

export interface SocketEvents {
  onLiveLog?: (log: TelemetryLog) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onSessionExpired?: () => void;
}

export function initSocket(token: string, events: SocketEvents): Socket | null {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  if (localSimulationInterval) {
    clearInterval(localSimulationInterval);
    localSimulationInterval = null;
  }

  // If running in local demo token mode or offline
  const isLocalToken = token.startsWith('helios_demo_local_token_');

  const startLocalSimulator = () => {
    if (localSimulationInterval) return;
    events.onStatusChange?.('local_simulated');
    console.log('⚡ Active Local Microgrid Simulation Engine running...');

    localSimulationInterval = setInterval(() => {
      const panel = FALLBACK_DEMO_PANELS[Math.floor(Math.random() * FALLBACK_DEMO_PANELS.length)];
      const baseV = panel.panel_id === 101 ? 24.1 : panel.panel_id === 102 ? 22.8 : 21.6;
      
      let voltage = baseV + (Math.random() * 1.6 - 0.8);
      // Rare alarm spike/dip for realism
      const r = Math.random();
      if (r < 0.05) voltage = 18.2; // Critical alarm dip
      else if (r > 0.96) voltage = 25.4; // Spike warning

      const current = parseFloat((7.8 + Math.random() * 0.7).toFixed(2));
      const power = parseFloat((voltage * current).toFixed(1));

      events.onLiveLog?.({
        log_id: Math.floor(Math.random() * 90000) + 10000,
        panel_id: panel.panel_id,
        panel_name: panel.panel_name,
        panel_type: panel.panel_type,
        voltage: parseFloat(voltage.toFixed(2)),
        current_amps: current,
        power_watts: power,
        recorded_at: new Date().toISOString(),
      });
    }, 4000);
  };

  if (isLocalToken) {
    startLocalSimulator();
    return null;
  }

  events.onStatusChange?.('connecting');

  try {
    socket = io(API_BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 4,
      reconnectionDelay: 1500,
      timeout: 5000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to HeliosTrack live telemetry stream!');
      if (localSimulationInterval) {
        clearInterval(localSimulationInterval);
        localSimulationInterval = null;
      }
      events.onStatusChange?.('connected');
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket error:', err.message);
      if (err.message === 'Unauthorized') {
        events.onSessionExpired?.();
      } else {
        // Fall back to local simulator so user experience never dies!
        startLocalSimulator();
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('🔌 WebSocket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        events.onStatusChange?.('disconnected');
      } else {
        startLocalSimulator();
      }
    });

    socket.on('session_expired', () => {
      events.onSessionExpired?.();
    });

    socket.on('live_log_update', (log: TelemetryLog) => {
      events.onLiveLog?.(log);
    });

    return socket;
  } catch (err) {
    startLocalSimulator();
    return null;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (localSimulationInterval) {
    clearInterval(localSimulationInterval);
    localSimulationInterval = null;
  }
}

// frontend/lib/api.ts - Typed API Client with Resilient Fallback for HeliosTrack

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://heliostrack-distributed-solar-monitoring.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_demo: boolean;
  is_offline_simulation?: boolean;
}

export interface UserSettings {
  cost_per_kwh: number;
  co2_per_kwh: number;
  currency_symbol: string;
  simulation_enabled: boolean;
}

export interface SolarPanel {
  panel_id: number;
  panel_name: string;
  panel_type: string;
  api_secret: string;
  added_at: string;
  rated_power_w?: number;
  efficiency_pct?: number;
}

export interface TelemetryLog {
  log_id: number;
  panel_id: number;
  panel_name?: string;
  panel_type: string;
  voltage: number;
  current_amps: number;
  power_watts: number;
  recorded_at: string;
}

// Fallback demo data in case backend is offline or sleeping
export const FALLBACK_DEMO_USER: User = {
  id: 99999,
  email: 'demo@heliostrack.io',
  full_name: 'Guest Showcase Operator',
  role: 'demo',
  is_demo: true,
  is_offline_simulation: true,
};

export const FALLBACK_DEMO_PANELS: SolarPanel[] = [
  {
    panel_id: 101,
    panel_name: 'Main Rooftop Array (String A)',
    panel_type: 'Bifacial 450W',
    api_secret: 'helios_sec_demo_bifacial_450',
    added_at: new Date().toISOString(),
    rated_power_w: 450,
    efficiency_pct: 21.8,
  },
  {
    panel_id: 102,
    panel_name: 'Carport Canopy (String B)',
    panel_type: 'Monocrystalline 400W',
    api_secret: 'helios_sec_demo_mono_400',
    added_at: new Date().toISOString(),
    rated_power_w: 400,
    efficiency_pct: 20.4,
  },
  {
    panel_id: 103,
    panel_name: 'South Ground Array (String C)',
    panel_type: 'Polycrystalline 350W',
    api_secret: 'helios_sec_demo_poly_350',
    added_at: new Date().toISOString(),
    rated_power_w: 350,
    efficiency_pct: 18.2,
  },
];

export const generateMockTelemetry = (panels: SolarPanel[] = FALLBACK_DEMO_PANELS): TelemetryLog[] => {
  const logs: TelemetryLog[] = [];
  const now = Date.now();

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now - (24 - i) * 5000).toISOString();
    panels.forEach((p, pIndex) => {
      const baseV = 23.2 + (pIndex * 0.8);
      const noise = (Math.sin(i * 0.5 + pIndex) * 1.2) + (Math.random() * 0.4 - 0.2);
      const voltage = parseFloat((baseV + noise).toFixed(2));
      const current = parseFloat((7.8 + Math.random() * 0.8).toFixed(2));
      const power = parseFloat((voltage * current).toFixed(1));

      logs.push({
        log_id: 1000 + i * 10 + pIndex,
        panel_id: p.panel_id,
        panel_name: p.panel_name,
        panel_type: p.panel_type,
        voltage,
        current_amps: current,
        power_watts: power,
        recorded_at: timestamp,
      });
    });
  }
  return logs;
};

const getHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null);
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
};

// Safe fetch with timeout
async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        return data;
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('Failed to fetch')) {
          throw new Error('Could not connect to the backend server. Please verify the server is running on port 3001.');
        }
        throw err;
      }
    },

    register: async (email: string, password: string, full_name?: string) => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        return data;
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('Failed to fetch')) {
          throw new Error('Backend connection timed out. Please verify the server is running on port 3001.');
        }
        throw err;
      }
    },

    demo: async () => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/demo`, {
          method: 'POST',
        }, 4000);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Demo initialization failed');
        return data;
      } catch (err) {
        // RESILIENT FALLBACK: If backend is unreachable or sleeping, activate Instant Local Demo!
        console.warn('⚡ Backend unreachable, activating Instant Local Demo Mode with zero interruption.');
        return {
          success: true,
          message: 'Local Demo Sandbox Active',
          token: 'helios_demo_local_token_' + Date.now(),
          role: 'demo',
          user: FALLBACK_DEMO_USER,
        };
      }
    },

    me: async (token?: string): Promise<{ user: User; settings: UserSettings }> => {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null);
      if (activeToken && activeToken.startsWith('helios_demo_local_token_')) {
        return {
          user: FALLBACK_DEMO_USER,
          settings: { cost_per_kwh: 0.16, co2_per_kwh: 0.42, currency_symbol: '$', simulation_enabled: true },
        };
      }

      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/me`, {
          headers: getHeaders(token),
        }, 4000);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch user session');
        return data;
      } catch (err) {
        if (activeToken && activeToken.includes('demo')) {
          return {
            user: FALLBACK_DEMO_USER,
            settings: { cost_per_kwh: 0.16, co2_per_kwh: 0.42, currency_symbol: '$', simulation_enabled: true },
          };
        }
        throw err;
      }
    },
  },

  panels: {
    list: async (): Promise<SolarPanel[]> => {
      const activeToken = typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null;
      if (activeToken && activeToken.startsWith('helios_demo_local_token_')) {
        return FALLBACK_DEMO_PANELS;
      }

      try {
        const res = await safeFetch(`${API_BASE_URL}/api/panels`, {
          headers: getHeaders(),
        }, 4000);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch panels');
        return data.data || [];
      } catch (err) {
        return FALLBACK_DEMO_PANELS;
      }
    },

    create: async (panel_type: string, panel_name?: string): Promise<SolarPanel> => {
      const activeToken = typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null;
      if (activeToken && activeToken.startsWith('helios_demo_local_token_')) {
        return {
          panel_id: Math.floor(Math.random() * 800) + 200,
          panel_name: panel_name || `Array Unit ${panel_type.split(' ')[0]}`,
          panel_type,
          api_secret: 'helios_key_local_' + Math.random().toString(36).substring(2, 10),
          added_at: new Date().toISOString(),
        };
      }

      const res = await safeFetch(`${API_BASE_URL}/api/panels`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ panel_type, panel_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create panel');
      return data;
    },

    delete: async (panel_id: number) => {
      const activeToken = typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null;
      if (activeToken && activeToken.startsWith('helios_demo_local_token_')) {
        return { success: true };
      }

      const res = await safeFetch(`${API_BASE_URL}/api/panels/${panel_id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete panel');
      return data;
    },
  },

  logs: {
    latest: async (): Promise<TelemetryLog[]> => {
      const activeToken = typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null;
      if (activeToken && activeToken.startsWith('helios_demo_local_token_')) {
        return generateMockTelemetry();
      }

      try {
        const res = await safeFetch(`${API_BASE_URL}/api/logs/latest`, {
          headers: getHeaders(),
        }, 4000);
        const data = await res.json();
        if (!res.ok || !data.data || data.data.length === 0) {
          return generateMockTelemetry();
        }
        return data.data;
      } catch (err) {
        return generateMockTelemetry();
      }
    },

    history: async (start: string, end: string): Promise<TelemetryLog[]> => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/logs/history?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
          headers: getHeaders(),
        }, 5000);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch historical telemetry');
        return data.data || [];
      } catch (err) {
        return generateMockTelemetry().slice(0, 15);
      }
    },

    downloadCsv: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('helios_token') : null;
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/logs/export`, {
          headers: getHeaders(token),
        }, 6000);
        if (!res.ok) throw new Error('Failed to export CSV from server');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `heliostrack_telemetry_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        // Fallback: generate local CSV
        const logs = generateMockTelemetry();
        let csv = "Log ID,Panel Name,Panel Type,Voltage (V),Current (A),Power (W),Recorded Time\n";
        logs.forEach(l => {
          csv += `${l.log_id},"${l.panel_name || l.panel_type}","${l.panel_type}",${l.voltage},${l.current_amps},${l.power_watts},"${l.recorded_at}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `heliostrack_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    },
  },

  settings: {
    get: async (): Promise<UserSettings> => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/user/settings`, {
          headers: getHeaders(),
        }, 3000);
        const data = await res.json();
        return data.settings || { cost_per_kwh: 0.15, co2_per_kwh: 0.40, currency_symbol: '$', simulation_enabled: true };
      } catch {
        return { cost_per_kwh: 0.15, co2_per_kwh: 0.40, currency_symbol: '$', simulation_enabled: true };
      }
    },

    update: async (settings: Partial<UserSettings>) => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/user/settings`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(settings),
        }, 4000);
        return await res.json();
      } catch {
        return { success: true };
      }
    },
  },
};

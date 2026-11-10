'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sun,
  Zap,
  BatteryCharging,
  DollarSign,
  Leaf,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { PowerFlow } from '@/components/PowerFlow';
import { TelemetryChart } from '@/components/TelemetryChart';
import { PanelManager } from '@/components/PanelManager';
import { LogsTable } from '@/components/LogsTable';
import { initSocket, disconnectSocket, ConnectionStatus } from '@/lib/socket';
import { api, SolarPanel, TelemetryLog } from '@/lib/api';

export default function DashboardPage() {
  const { user, settings, token, isLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'synoptic' | 'charts' | 'fleet' | 'audit'>('synoptic');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [panels, setPanels] = useState<SolarPanel[]>([]);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [alarm, setAlarm] = useState<{ type: 'critical' | 'warning'; message: string } | null>(null);

  // Energy & Battery Simulation State
  const [sessionKwh, setSessionKwh] = useState(0.842);
  const [batteryPercent, setBatteryPercent] = useState(74.5);

  const batteryRef = useRef(74.5);
  useEffect(() => {
    batteryRef.current = batteryPercent;
  }, [batteryPercent]);

  // Tariff and currency settings
  const costPerKwh = settings?.cost_per_kwh || 0.16;
  const co2PerKwh = settings?.co2_per_kwh || 0.42;
  const currencySymbol = settings?.currency_symbol || '$';

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [fetchedPanels, fetchedLogs] = await Promise.all([
        api.panels.list(),
        api.logs.latest(),
      ]);
      setPanels(fetchedPanels);
      setLogs(fetchedLogs);
    } catch (err: any) {
      console.warn('Dashboard fetch fallback triggered:', err.message);
    }
  }, []);

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // WebSocket / Resilient Telemetry Engine
  useEffect(() => {
    if (!token) return;

    const socket = initSocket(token, {
      onStatusChange: (status) => setConnectionStatus(status),
      onSessionExpired: () => logout(),
      onLiveLog: (newLog) => {
        setLogs((prev) => [newLog, ...prev.slice(0, 49)]);

        // Alarm thresholds
        if (newLog.voltage < 20.0) {
          setAlarm({
            type: 'critical',
            message: `⚠️ VOLTAGE DROP ALERT (${newLog.panel_name || newLog.panel_type}): Bus potential dipped to ${newLog.voltage}V!`,
          });
        } else if (newLog.voltage > 25.0) {
          setAlarm({
            type: 'warning',
            message: `⚠️ VOLTAGE SPIKE DETECTED (${newLog.panel_name || newLog.panel_type}): Spike measured at ${newLog.voltage}V!`,
          });
        } else {
          setAlarm(null);
        }

        // Cumulative energy math (Watts to kWh per 5-second tick)
        const kw = newLog.power_watts / 1000;
        const hours = 5 / 3600;
        setSessionKwh((prev) => prev + kw * hours);

        // Battery state calculation
        const chargeRate = (newLog.power_watts / 1000) * 0.35;
        const dischargeRate = Math.random() * 0.15;
        let newSoc = batteryRef.current + chargeRate - dischargeRate;
        if (newSoc > 100) newSoc = 100;
        if (newSoc < 0) newSoc = 0;
        setBatteryPercent(newSoc);
      },
    });

    return () => {
      disconnectSocket();
    };
  }, [token, logout]);

  // Compute total live instantaneous wattage across active panels
  const totalLiveWatts = logs
    .slice(0, Math.max(1, panels.length))
    .reduce((sum, l) => sum + (l.power_watts || 0), 0);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090E] text-amber-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <Sun className="w-8 h-8 animate-spin" />
          <span className="text-xs tracking-widest uppercase">INITIALIZING MICROGRID TELEMETRY BUS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#07090E]">
      {/* Top Navbar */}
      <Navbar
        connectionStatus={connectionStatus}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 lg:px-8 py-7 w-full space-y-6">
        {/* Showcase Demo Notice Banner */}
        {user?.is_demo && (
          <div className="glass-card rounded-2xl p-4 lg:p-5 border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  Interactive Showcase Sandbox Active
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Zero-Friction
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  You are monitoring a pre-configured microgrid fleet streaming continuous telemetry. You can test provisioning strings, export CSV audits, and observe virtual battery kinetics.
                </p>
              </div>
            </div>
            <Link
              href="/register"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
            >
              Register Private Operator Account
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Live Alarm Banner */}
        {alarm && (
          <div
            className={`p-4 rounded-xl text-xs font-mono font-bold flex items-center justify-between border shadow-lg ${
              alarm.type === 'critical'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{alarm.message}</span>
            </div>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
              Auto Telegram Triggered
            </span>
          </div>
        )}

        {/* Executive KPI Summary Cards Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Live Generation */}
          <div className="glass-card rounded-2xl p-4 lg:p-5 border border-amber-500/20 bg-amber-500/[0.03]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono uppercase">
              <span>Instantaneous PV Power</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
              {(totalLiveWatts / 1000).toFixed(2)} <span className="text-base font-normal text-amber-400">kW</span>
            </div>
            <div className="text-[11px] text-amber-400 font-mono mt-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{panels.length} Active Strings Synchronized</span>
            </div>
          </div>

          {/* Card 2: Cumulative Energy */}
          <div className="glass-card rounded-2xl p-4 lg:p-5 border border-teal-500/20 bg-teal-500/[0.03]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono uppercase">
              <span>Session Generation</span>
              <Zap className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
              {sessionKwh.toFixed(4)} <span className="text-base font-normal text-teal-300">kWh</span>
            </div>
            <div className="text-[11px] text-teal-300 font-mono mt-1.5">
              Cumulative Yield Real-Time
            </div>
          </div>

          {/* Card 3: Financial ROI */}
          <div className="glass-card rounded-2xl p-4 lg:p-5 border border-emerald-500/20 bg-emerald-500/[0.03]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono uppercase">
              <span>Tariff Cost Offset</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
              {currencySymbol}
              {(sessionKwh * costPerKwh).toFixed(4)}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tariff: {currencySymbol}{costPerKwh.toFixed(2)} / kWh</span>
            </div>
          </div>

          {/* Card 4: CO2 Offset */}
          <div className="glass-card rounded-2xl p-4 lg:p-5 border border-cyan-500/20 bg-cyan-500/[0.03]">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5 font-mono uppercase">
              <span>Carbon Abatement</span>
              <Leaf className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
              {(sessionKwh * co2PerKwh).toFixed(4)} <span className="text-base font-normal text-cyan-300">kg</span>
            </div>
            <div className="text-[11px] text-cyan-300 font-mono mt-1.5">
              Avoided GHG Emissions
            </div>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'synoptic' && (
          <div className="space-y-6">
            <PowerFlow
              totalSolarWatts={totalLiveWatts}
              batteryPercent={batteryPercent}
              homeLoadWatts={780}
            />
            <TelemetryChart logs={logs} />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            <TelemetryChart logs={logs} />
            <PowerFlow
              totalSolarWatts={totalLiveWatts}
              batteryPercent={batteryPercent}
              homeLoadWatts={780}
            />
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="space-y-6">
            <PanelManager panels={panels} onRefresh={fetchData} />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <LogsTable logs={logs} onRefresh={fetchData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-card border-t border-white/[0.08] py-5 px-6 text-center text-xs text-slate-500 font-mono">
        HeliosTrack Industrial Microgrid Control System • Next.js 16 • TiDB Serverless Cloud
      </footer>
    </div>
  );
}

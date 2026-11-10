'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sun,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BatteryCharging,
  Globe,
  BarChart3,
  Bell,
  Download,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PowerFlow } from '@/components/PowerFlow';

export default function LandingPage() {
  const { user, launchDemo } = useAuth();
  const [isDemoLaunching, setIsDemoLaunching] = useState(false);

  const handleDemoClick = async () => {
    setIsDemoLaunching(true);
    try {
      await launchDemo();
    } catch (err: any) {
      console.warn('Sandbox fallback active:', err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#07090E] text-slate-100 selection:bg-amber-500/20 selection:text-amber-300">
      {/* Top Header */}
      <header className="glass-card border-b border-white/[0.08] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Sun className="w-6 h-6 animate-[spin_20s_linear_infinite]" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-xl text-white font-mono">
                HELIOS<span className="text-amber-400">TRACK</span>
              </span>
              <span className="ml-2 text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                INDUSTRIAL v2.4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                Enter Command Center
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Operator Sign In
                </Link>
                <button
                  onClick={handleDemoClick}
                  disabled={isDemoLaunching}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isDemoLaunching ? 'Starting Sandbox...' : '1-Click Live Demo'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 lg:py-20 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/25 text-amber-400 text-xs font-mono mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Distributed Microgrid Telemetry Bus • High-Availability Cloud</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.12] mb-6 font-sans">
            Distributed Solar Fleet &amp; <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400">
              Virtual Grid Simulator
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 mb-9 leading-relaxed max-w-2xl mx-auto">
            Real-time telemetry routing between photovoltaic arrays, 48V LiFePO4 battery storage, and utility grid interties with sub-second WebSocket synchronization.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleDemoClick}
              disabled={isDemoLaunching}
              className="px-7 py-3.5 text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 flex items-center gap-2.5 shadow-xl shadow-amber-500/25 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isDemoLaunching ? 'Launching Sandbox Engine...' : 'Launch Interactive Showcase Sandbox'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/register"
              className="px-6 py-3.5 text-sm font-semibold rounded-xl glass-card hover:bg-white/10 text-white border border-white/15 transition-all"
            >
              Provision Private Fleet
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-4 font-mono flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Zero friction • Instant simulated sandbox preloaded with active strings
          </p>
        </div>

        {/* Live Synoptic Diagram Embedded in Hero */}
        <div className="mb-24">
          <PowerFlow totalSolarWatts={1680} batteryPercent={88.2} homeLoadWatts={780} />
        </div>

        {/* Technical Value Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] hover:border-amber-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Multi-Tenant Fleet Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Complete data partitioning ensures every operator monitors their own strings, historical records, and tariff formulas with zero cross-tenant leakage.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] hover:border-teal-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-400 flex items-center justify-center mb-4">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Virtual Storage Array (BESS)</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Mathematical battery charging curves model realistic DC resistance. When the storage array hits 100%, surplus clean wattage automatically shifts to utility grid export.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Targeted Room WebSockets</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Telemetry ingest maps hardware API secrets to user rooms in real-time, pushing live data to connected browsers without polling or page reloads.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Financial ROI &amp; CO₂ Offset</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Dynamic financial engine calculates dollar savings from avoided peak electricity consumption and computes carbon abatement metrics in real time.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] hover:border-purple-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center mb-4">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Telegram Alarm Dispatch</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Sub-second alarm triggers for undervoltage (&lt;20V) and voltage spikes (&gt;25V) with an intelligent 5-minute cooldown per string to prevent alert fatigue.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] hover:border-pink-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/25 text-pink-400 flex items-center justify-center mb-4">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-sans">Secured CSV Ingestion &amp; Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Full audit trails formatted with formula-injection defenses provide compliant telemetry exports for institutional enterprise records.
            </p>
          </div>
        </div>

        {/* Architecture Specs */}
        <div className="glass-card rounded-2xl p-8 border border-white/[0.08] text-center">
          <h4 className="text-xs font-mono uppercase text-slate-400 tracking-widest mb-4">Industrial Technology Stack</h4>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-300">
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">Next.js 16 (App Router)</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">React 19 &amp; TypeScript</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">Node.js Express 5 Engine</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">Socket.io Room Routing</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">TiDB Cloud Distributed SQL</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">Tailwind CSS 4</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-card border-t border-white/[0.08] py-6 px-6 text-center text-xs text-slate-500 font-mono">
        HeliosTrack Industrial Microgrid Control System • Designed for Next-Gen CleanTech Showcases
      </footer>
    </div>
  );
}

'use client';

import React from 'react';
import { Sun, Zap, BatteryCharging, Battery, Home, Globe, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface PowerFlowProps {
  totalSolarWatts: number;
  batteryPercent: number;
  homeLoadWatts?: number;
}

export const PowerFlow: React.FC<PowerFlowProps> = ({
  totalSolarWatts,
  batteryPercent,
  homeLoadWatts = 780,
}) => {
  const isBatteryFull = batteryPercent >= 99.0;
  const isBatteryEmpty = batteryPercent <= 5.0;

  // Power math
  const excessWatts = totalSolarWatts - homeLoadWatts;
  const isExporting = isBatteryFull && excessWatts > 0;
  const isImporting = totalSolarWatts < homeLoadWatts && batteryPercent <= 10.0;
  const gridWatts = isExporting ? excessWatts : isImporting ? (homeLoadWatts - totalSolarWatts) : 0;
  const batteryChargingWatts = !isBatteryFull && excessWatts > 0 ? excessWatts : 0;

  const solarKw = (totalSolarWatts / 1000).toFixed(2);
  const homeKw = (homeLoadWatts / 1000).toFixed(2);
  const gridKw = (gridWatts / 1000).toFixed(2);
  const batteryKw = (batteryChargingWatts / 1000).toFixed(2);

  // 10-segment battery visual
  const activeSegments = Math.round((Math.max(0, Math.min(100, batteryPercent)) / 100) * 10);

  return (
    <div className="glass-card rounded-2xl p-6 lg:p-7 relative overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
                Synoptic Microgrid Energy Bus
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Single-Line Diagram
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Real-time telemetry routing between PV strings, hybrid inverter, BESS, and grid intertie</p>
          </div>
        </div>

        {/* Operating Mode Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border glass-card">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400">BUS MODE:</span>
          <span className={`font-semibold ${isExporting ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isExporting ? 'SURPLUS GRID EXPORT' : 'SELF-CONSUMPTION & BESS BUFFER'}
          </span>
        </div>
      </div>

      {/* Synoptic Canvas / Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch relative">
        {/* LEFT NODE: Photovoltaic Generation (4 cols) */}
        <div className="md:col-span-4 glass-card rounded-xl p-5 border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-transparent flex flex-col justify-between relative group hover:border-amber-500/35 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 animate-[spin_16s_linear_infinite]" />
                PV Generation Array
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                DC Infeed
              </span>
            </div>

            <div className="text-3xl lg:text-4xl font-extrabold font-mono text-white tracking-tight tabular-nums">
              {solarKw} <span className="text-lg lg:text-xl font-normal text-amber-400">kW</span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Array Output:</span>
                <span className="text-slate-200 font-semibold tabular-nums">{totalSolarWatts.toFixed(0)} W</span>
              </div>
              <div className="flex justify-between">
                <span>Solar Irradiance:</span>
                <span className="text-amber-300 tabular-nums">842 W/m²</span>
              </div>
              <div className="flex justify-between">
                <span>DC Bus Potential:</span>
                <span className="text-slate-200 tabular-nums">23.8 V</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Activity className="w-3 h-3" /> Online
            </span>
            <span>MPPT String Active</span>
          </div>
        </div>

        {/* CENTER NODE: Central Hybrid PCS Inverter (4 cols) */}
        <div className="md:col-span-4 glass-card rounded-xl p-5 border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col justify-between relative group hover:border-white/20 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Hybrid Smart Inverter
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                DC ➔ AC
              </span>
            </div>

            <div className="text-3xl lg:text-4xl font-extrabold font-mono text-white tracking-tight tabular-nums">
              98.7<span className="text-lg lg:text-xl font-normal text-cyan-400">%</span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Conversion Ratio:</span>
                <span className="text-slate-200 font-semibold tabular-nums">{solarKw} kW ➔ AC</span>
              </div>
              <div className="flex justify-between">
                <span>Heat Sink Temp:</span>
                <span className="text-cyan-300 tabular-nums">41.8 °C (Normal)</span>
              </div>
              <div className="flex justify-between">
                <span>Grid Sync Frequency:</span>
                <span className="text-slate-200 tabular-nums">60.02 Hz</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="text-emerald-400">Pure Sine Inversion</span>
            <span className="text-cyan-400">PF 0.99</span>
          </div>
        </div>

        {/* RIGHT SUB-GRID: Battery, Facility, Grid (4 cols) */}
        <div className="md:col-span-4 space-y-3.5 flex flex-col justify-between">
          {/* Sub-node 1: Virtual Battery Array */}
          <div className="glass-card rounded-xl p-3.5 border border-teal-500/20 bg-teal-500/[0.03] hover:border-teal-500/35 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
                {batteryPercent > 90 ? <Battery className="w-3.5 h-3.5" /> : <BatteryCharging className="w-3.5 h-3.5" />}
                Virtual 48V Storage (BESS)
              </span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {batteryPercent.toFixed(1)}%
              </span>
            </div>

            {/* 10-Segment LED Meter */}
            <div className="grid grid-cols-10 gap-1 my-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-sm transition-all duration-300 ${
                    i < activeSegments
                      ? isBatteryFull
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                        : 'bg-emerald-400 shadow-sm shadow-emerald-400/40'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{isBatteryFull ? '100% Fully Charged' : `Buffering at +${batteryKw} kW`}</span>
              <span className="text-teal-300">LiFePO4 Chemistry</span>
            </div>
          </div>

          {/* Sub-node 2: Facility Load */}
          <div className="glass-card rounded-xl p-3.5 border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                Facility Demand Load
              </span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {homeKw} kW
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex justify-between">
              <span>Internal Self-Consumption</span>
              <span className="text-slate-300 tabular-nums">{homeLoadWatts} Watts</span>
            </div>
          </div>

          {/* Sub-node 3: Utility Intertie / Grid */}
          <div className={`glass-card rounded-xl p-3.5 border transition-all ${
            isExporting
              ? 'border-emerald-500/40 bg-emerald-500/[0.08]'
              : 'border-purple-500/20 bg-purple-500/[0.03]'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 text-purple-300">
                <Globe className="w-3.5 h-3.5" />
                Utility Grid Intertie
              </span>
              <span className={`text-xs font-mono font-bold tabular-nums ${isExporting ? 'text-emerald-400' : 'text-slate-300'}`}>
                {isExporting ? `+${gridKw} kW` : '0.00 kW'}
              </span>
            </div>
            <div className="text-[10px] font-mono flex justify-between items-center">
              {isExporting ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Net-Metering Exporting 💸
                </span>
              ) : (
                <span className="text-slate-400">Zero Infeed (Grid Parallel)</span>
              )}
              <span className="text-slate-400 tabular-nums">240V / 60Hz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

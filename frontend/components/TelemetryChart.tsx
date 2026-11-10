'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Radio, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { TelemetryLog } from '@/lib/api';

interface TelemetryChartProps {
  logs: TelemetryLog[];
}

const PANEL_PALETTE = [
  { stroke: '#10B981', fillStart: 'rgba(16, 185, 129, 0.25)', fillEnd: 'rgba(16, 185, 129, 0.0)' },
  { stroke: '#F59E0B', fillStart: 'rgba(245, 158, 11, 0.25)', fillEnd: 'rgba(245, 158, 11, 0.0)' },
  { stroke: '#06B6D4', fillStart: 'rgba(6, 182, 212, 0.25)', fillEnd: 'rgba(6, 182, 212, 0.0)' },
  { stroke: '#8B5CF6', fillStart: 'rgba(139, 92, 246, 0.25)', fillEnd: 'rgba(139, 92, 246, 0.0)' },
  { stroke: '#EC4899', fillStart: 'rgba(236, 72, 153, 0.25)', fillEnd: 'rgba(236, 72, 153, 0.0)' },
];

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ logs }) => {
  const [metric, setMetric] = useState<'voltage' | 'power_watts' | 'current_amps'>('voltage');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Take the most recent 30 records and order chronologically
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()).slice(-35);
  }, [logs]);

  // Extract unique panels
  const panels = useMemo(() => {
    const map = new Map<number, string>();
    sortedLogs.forEach((l) => {
      map.set(l.panel_id, l.panel_name || l.panel_type);
    });
    return Array.from(map.entries()).map(([id, name], idx) => ({
      id,
      name,
      color: PANEL_PALETTE[idx % PANEL_PALETTE.length],
    }));
  }, [sortedLogs]);

  // Timestamps
  const timestamps = useMemo(() => {
    const set = new Set<string>();
    sortedLogs.forEach((l) => {
      set.add(new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });
    return Array.from(set);
  }, [sortedLogs]);

  // Calculate dynamic min/max for the chosen metric
  const { minVal, maxVal, unit, metricLabel } = useMemo(() => {
    if (metric === 'voltage') {
      const vals = sortedLogs.map((l) => l.voltage);
      const min = Math.floor(Math.min(...vals, 18) - 1);
      const max = Math.ceil(Math.max(...vals, 26) + 1);
      return { minVal: min, maxVal: max, unit: 'V', metricLabel: 'DC Bus Voltage' };
    } else if (metric === 'power_watts') {
      const vals = sortedLogs.map((l) => l.power_watts);
      const min = Math.floor(Math.min(...vals, 100));
      const max = Math.ceil(Math.max(...vals, 220) + 20);
      return { minVal: Math.max(0, min), maxVal: max, unit: 'W', metricLabel: 'Active Generation' };
    } else {
      const vals = sortedLogs.map((l) => l.current_amps);
      const min = Math.floor(Math.min(...vals, 5));
      const max = Math.ceil(Math.max(...vals, 10));
      return { minVal: Math.max(0, min), maxVal: max, unit: 'A', metricLabel: 'String Current' };
    }
  }, [sortedLogs, metric]);

  const svgWidth = 860;
  const svgHeight = 270;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + graphHeight - ((clamped - minVal) / (maxVal - minVal)) * graphHeight;
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (total - 1)) * graphWidth;
  };

  // Y-axis grid levels
  const yTicks = useMemo(() => {
    const step = (maxVal - minVal) / 4;
    return [minVal, minVal + step, minVal + step * 2, minVal + step * 3, maxVal].map(v => parseFloat(v.toFixed(1)));
  }, [minVal, maxVal]);

  return (
    <div className="glass-card rounded-2xl p-6 lg:p-7 border border-white/[0.08] shadow-2xl relative">
      {/* Chart Top Header & Metric Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
                High-Frequency Telemetry Curves
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                {metricLabel} ({unit})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Real-time sub-second fluctuation logging across registered strings</p>
          </div>
        </div>

        {/* Metric Switcher Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono">
          <button
            onClick={() => setMetric('voltage')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
              metric === 'voltage' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Voltage (V)
          </button>
          <button
            onClick={() => setMetric('power_watts')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
              metric === 'power_watts' ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Power (W)
          </button>
          <button
            onClick={() => setMetric('current_amps')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-medium ${
              metric === 'current_amps' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Current (A)
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="w-full overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-64 lg:h-72 select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {panels.map((p) => (
              <linearGradient key={`grad-${p.id}`} id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p.color.stroke} stopOpacity="0.25" />
                <stop offset="100%" stopColor={p.color.stroke} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#1B2133"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {val}{unit}
                </text>
              </g>
            );
          })}

          {/* Threshold references for Voltage metric */}
          {metric === 'voltage' && (
            <>
              {/* <20V Alert line */}
              <line
                x1={padding.left}
                y1={getY(20)}
                x2={svgWidth - padding.right}
                y2={getY(20)}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x={svgWidth - padding.right} y={getY(20) - 5} textAnchor="end" fill="#EF4444" fontSize="9" fontFamily="monospace">
                Critical Drop (&lt;20V)
              </text>
            </>
          )}

          {/* Lines and Gradient Fills per Panel */}
          {panels.map((p) => {
            const panelLogs = sortedLogs.filter((l) => l.panel_id === p.id);
            if (panelLogs.length === 0) return null;

            const points = panelLogs.map((l) => {
              const timeStr = new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const timeIndex = timestamps.indexOf(timeStr);
              const x = getX(timeIndex >= 0 ? timeIndex : 0, timestamps.length);
              const val = l[metric];
              const y = getY(val);
              return { x, y, val };
            });

            const pathD = points.reduce((acc, pt, i) => {
              return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, '');

            const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;

            return (
              <g key={p.id}>
                {/* Gradient Area Fill */}
                <path d={areaD} fill={`url(#grad-${p.id})`} />

                {/* Main Curve Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={p.color.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Point markers */}
                {points.slice(-10).map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={3}
                    fill="#0A0D16"
                    stroke={p.color.stroke}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {/* Time axis labels */}
          {timestamps.slice(-6).map((time, idx, arr) => {
            const x = getX(timestamps.length - arr.length + idx, timestamps.length);
            return (
              <text
                key={idx}
                x={x}
                y={svgHeight - 10}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
                fontFamily="monospace"
              >
                {time}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {panels.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color.stroke }} />
              <span className="text-slate-300 font-medium">{p.name}</span>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Sampling Interval: 5.0 Seconds</span>
        </div>
      </div>
    </div>
  );
};

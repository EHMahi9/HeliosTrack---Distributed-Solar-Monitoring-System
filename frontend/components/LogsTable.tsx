'use client';

import React, { useState, useMemo } from 'react';
import { Table, Download, Search, Calendar, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { TelemetryLog, api } from '@/lib/api';

interface LogsTableProps {
  logs: TelemetryLog[];
  onRefresh: () => void;
}

export const LogsTable: React.FC<LogsTableProps> = ({ logs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredLogs, setFilteredLogs] = useState<TelemetryLog[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const displayLogs = useMemo(() => {
    const list = filteredLogs || logs;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (l) =>
        l.log_id.toString().includes(term) ||
        (l.panel_name && l.panel_name.toLowerCase().includes(term)) ||
        l.panel_type.toLowerCase().includes(term) ||
        l.voltage.toString().includes(term) ||
        l.power_watts.toString().includes(term)
    );
  }, [logs, filteredLogs, searchTerm]);

  const handleDateFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setNotice('Please provide both start and end timestamps.');
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setIsFiltering(true);
    setNotice(null);
    try {
      const data = await api.logs.history(startDate, endDate);
      setFilteredLogs(data);
    } catch (err: any) {
      setNotice(err.message || 'Failed to query date range');
    } finally {
      setIsFiltering(false);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setFilteredLogs(null);
    onRefresh();
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.logs.downloadCsv();
      setNotice('CSV telemetry report downloaded successfully.');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 lg:p-7 border border-white/[0.08] shadow-2xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
                Microgrid Telemetry Stream &amp; Audit Trail
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                {displayLogs.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Time-series audit trail of voltage, amperage, and active wattage</p>
          </div>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Generating Report...' : 'Export Telemetry CSV'}
        </button>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-amber-300 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Date Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <form onSubmit={handleDateFilter} className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">➔</span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isFiltering}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            {isFiltering ? 'Filtering...' : 'Query Window'}
          </button>
          {filteredLogs && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              Reset to Live Stream
            </button>
          )}
        </form>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search string, ID, voltage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 font-mono border-b border-white/[0.08]">
            <tr>
              <th className="py-3 px-4 font-semibold">Log ID</th>
              <th className="py-3 px-4 font-semibold">String Description</th>
              <th className="py-3 px-4 font-semibold">DC Voltage</th>
              <th className="py-3 px-4 font-semibold">Current (A)</th>
              <th className="py-3 px-4 font-semibold">Output (W)</th>
              <th className="py-3 px-4 font-semibold">Time UTC</th>
              <th className="py-3 px-4 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-mono tabular-nums">
            {displayLogs.slice(0, 35).map((log) => {
              const isLowV = log.voltage < 20.0;
              const isHighV = log.voltage > 25.0;

              return (
                <tr key={log.log_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-4 text-slate-400">#{log.log_id}</td>
                  <td className="py-2.5 px-4 text-white font-sans font-semibold">
                    {log.panel_name || log.panel_type}
                    <span className="block text-[10px] font-mono text-slate-400 font-normal">{log.panel_type}</span>
                  </td>
                  <td className="py-2.5 px-4 font-bold">
                    <span className={isLowV ? 'text-red-400' : isHighV ? 'text-amber-400' : 'text-emerald-400'}>
                      {log.voltage.toFixed(2)} V
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">{log.current_amps.toFixed(2)} A</td>
                  <td className="py-2.5 px-4 text-white font-bold">{log.power_watts.toFixed(1)} W</td>
                  <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                    {new Date(log.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {isLowV && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Undervoltage
                      </span>
                    )}
                    {isHighV && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Spike
                      </span>
                    )}
                    {!isLowV && !isHighV && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        <ShieldCheck className="w-3 h-3" /> Nominal
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {displayLogs.length === 0 && (
          <div className="py-14 text-center text-slate-500 font-mono text-xs">
            No telemetry records match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};

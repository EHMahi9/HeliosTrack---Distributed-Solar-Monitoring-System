'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Key, Check, Cpu, Copy, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { SolarPanel, api } from '@/lib/api';

interface PanelManagerProps {
  panels: SolarPanel[];
  onRefresh: () => void;
}

const PANEL_TYPES = [
  { type: 'Bifacial 450W', power: 450, eff: '22.4%' },
  { type: 'Monocrystalline 400W', power: 400, eff: '20.8%' },
  { type: 'Polycrystalline 350W', power: 350, eff: '18.5%' },
  { type: 'Thin-Film 300W', power: 300, eff: '16.9%' },
];

export const PanelManager: React.FC<PanelManagerProps> = ({ panels, onRefresh }) => {
  const [selectedType, setSelectedType] = useState(PANEL_TYPES[0].type);
  const [panelName, setPanelName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.panels.create(selectedType, panelName.trim() || undefined);
      setPanelName('');
      setFeedback({ type: 'success', message: 'Solar String provisioned and integrated into simulation fleet!' });
      onRefresh();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to provision panel string' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async (panelId: number) => {
    try {
      await api.panels.delete(panelId);
      setDeletingId(null);
      setFeedback({ type: 'success', message: 'Panel string decommissioned.' });
      onRefresh();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove panel' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="glass-card rounded-2xl p-6 lg:p-7 border border-white/[0.08] shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono uppercase">
                PV Fleet &amp; Hardware Ingestion Gateway
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                {panels.length} Active Strings
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Manage physical ESP32 / Arduino hardware keys or virtual solar string emulators</p>
          </div>
        </div>
      </div>

      {/* Provisioning Form */}
      <form onSubmit={handleAddPanel} className="glass-card rounded-xl p-4 border border-white/10 bg-slate-950/40 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5 font-semibold">
              String Label / Array Name
            </label>
            <input
              type="text"
              placeholder="e.g. South Roof String #3"
              value={panelName}
              onChange={(e) => setPanelName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1.5 font-semibold">
              Photovoltaic Cell Architecture
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
            >
              {PANEL_TYPES.map((pt) => (
                <option key={pt.type} value={pt.type}>
                  {pt.type} — {pt.power}W (Eff: {pt.eff})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Provisioning...' : 'Provision Solar String'}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border border-red-500/20'
            }`}
          >
            {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </form>

      {/* Grid of Strings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {panels.map((panel) => {
          const isPendingDelete = deletingId === panel.panel_id;

          return (
            <div
              key={panel.panel_id}
              className="glass-card rounded-xl p-4 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">{panel.panel_name || `String Unit ${panel.panel_id}`}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {panel.panel_type}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                      </span>
                    </div>
                  </div>

                  {isPendingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => confirmDelete(panel.panel_id)}
                        className="px-2 py-1 text-[10px] font-bold rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-1.5 py-1 text-[10px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(panel.panel_id)}
                      title="Decommission String"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                  <span>String ID: <strong className="text-slate-200">#{panel.panel_id}</strong></span>
                  <span className="text-slate-500">{new Date(panel.added_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Hardware Secret / API Key with In-Card Toast */}
              <div className="pt-3 mt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase mb-1">
                  <span>Hardware Telemetry Key</span>
                  <span className="text-cyan-400 lowercase font-sans">header: x-api-key</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/80 rounded-lg px-2.5 py-1.5 border border-white/5 font-mono text-[11px] text-slate-300">
                  <Key className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate flex-1">{panel.api_secret}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(panel.api_secret)}
                    className="p-1 hover:text-white transition-colors cursor-pointer text-slate-400"
                    title="Copy API Key"
                  >
                    {copiedKey === panel.api_secret ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copied!
                      </span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {panels.length === 0 && (
        <div className="py-12 text-center text-slate-500 font-mono text-xs">
          No PV strings provisioned yet. Use the form above to add your first string.
        </div>
      )}
    </div>
  );
};

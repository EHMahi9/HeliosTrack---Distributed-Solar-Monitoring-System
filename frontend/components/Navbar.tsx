'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, LogOut, Radio, User as UserIcon, Sparkles, Cpu, Layers, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ConnectionStatus } from '@/lib/socket';

interface NavbarProps {
  connectionStatus?: ConnectionStatus;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionStatus = 'connected',
  activeTab = 'synoptic',
  onTabChange,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/[0.08] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Sun className="w-5 h-5 animate-[spin_20s_linear_infinite]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base lg:text-lg text-white font-mono">
                  HELIOS<span className="text-amber-400">TRACK</span>
                </span>
                <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  PRO
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Tabs (if onTabChange provided) */}
          {onTabChange && (
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-950/70 border border-white/10 text-xs font-mono">
              <button
                onClick={() => onTabChange('synoptic')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'synoptic'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Microgrid Synoptic
              </button>
              <button
                onClick={() => onTabChange('charts')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'charts'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Telemetry Waves
              </button>
              <button
                onClick={() => onTabChange('fleet')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'fleet'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PV Fleet Units
              </button>
              <button
                onClick={() => onTabChange('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Audit &amp; Logs
              </button>
            </nav>
          )}
        </div>

        {/* Right Actions & Operator Status */}
        <div className="flex items-center gap-3">
          {/* Live Stream Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border glass-card">
            {connectionStatus === 'connected' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-semibold">LIVE STREAM</span>
              </>
            )}
            {connectionStatus === 'local_simulated' && (
              <>
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-cyan-400 font-semibold">LOCAL SANDBOX</span>
              </>
            )}
            {connectionStatus === 'connecting' && (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-amber-400">CONNECTING...</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                <span className="text-slate-400">OFFLINE</span>
              </>
            )}
          </div>

          {/* User Profile Pill */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl border border-white/10 bg-white/[0.04]">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center text-amber-300">
                {user.is_demo ? <Sparkles className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight font-sans">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {user.is_demo ? (
                    <span className="text-amber-400 font-semibold">Showcase Operator</span>
                  ) : (
                    <span>{user.email}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          {user && (
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

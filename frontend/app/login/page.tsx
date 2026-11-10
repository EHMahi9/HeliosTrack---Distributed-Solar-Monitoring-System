'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sun, Sparkles, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login, launchDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both operator email and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials or try the Showcase Demo.');
      setIsLoading(false);
    }
  };

  const handleDemo = async () => {
    setIsDemoLoading(true);
    setErrorMsg(null);
    try {
      await launchDemo();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start demo session.');
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-[#07090E] text-slate-100">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-500/[0.07] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/[0.08] shadow-2xl relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Sun className="w-6 h-6 animate-[spin_20s_linear_infinite]" />
            </div>
            <span className="font-extrabold tracking-tight text-2xl text-white font-mono">
              HELIOS<span className="text-amber-400">TRACK</span>
            </span>
          </Link>
          <h1 className="text-lg font-bold text-white font-sans">Operator Authentication</h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">Access your isolated microgrid fleet telemetry</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1.5 font-semibold">Operator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="operator@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1.5 font-semibold">Security Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isDemoLoading}
            className="w-full py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Verifying Gateway Credentials...' : 'Sign In to Telemetry Bus'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Or Instant Sandbox</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* 1-Click Instant Demo */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={isLoading || isDemoLoading}
          className="w-full py-2.5 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 hover:border-amber-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          {isDemoLoading ? 'Booting Sandbox Engine...' : '1-Click Instant Showcase Sandbox'}
        </button>

        {/* Bottom Link */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Need your own private fleet?{' '}
          <Link href="/register" className="text-amber-400 hover:underline font-semibold">
            Provision Account Here
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail } = useAuth();
  const { showToast } = useToast();

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = (emailOrId || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanInput) {
      showToast('Please enter your Employee ID or Email', 'warning');
      return;
    }
    if (!cleanPass) {
      showToast('Please enter your password', 'warning');
      return;
    }
    setIsLoading(true);

    try {
      const lower = cleanInput.toLowerCase();
      let email = cleanInput;
      let targetRoute = '/dashboard/machines';

      if (lower.includes('@')) {
        // Direct email input
        if (lower.startsWith('ceo@')) {
          email = 'ceo@textech.garments';
          targetRoute = '/dashboard/messages';
        } else if (lower.startsWith('admin@') || lower.startsWith('adm@')) {
          email = 'admin@textech.garments';
          targetRoute = '/dashboard/machines';
        } else if (lower.startsWith('seniorelectrician@')) {
          email = 'seniorelectrician@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else if (lower.startsWith('electrician@')) {
          email = 'electrician@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else if (lower.startsWith('senior') || lower.startsWith('seniormechanic@')) {
          email = 'seniormechanic@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else if (lower.startsWith('store') || lower.startsWith('stores@')) {
          email = 'stores@textech.garments';
          targetRoute = '/dashboard/store-inbox';
        } else if (lower.startsWith('mechanic@')) {
          email = 'mechanic@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else {
          email = cleanInput;
          targetRoute = '/dashboard/machines';
        }
      } else {
        // Employee ID / alias input
        if (lower.includes('ceo')) {
          email = 'ceo@textech.garments';
          targetRoute = '/dashboard/messages';
        } else if (lower.includes('admin') || lower.includes('adm')) {
          email = 'admin@textech.garments';
          targetRoute = '/dashboard/machines';
        } else if (lower.includes('senior elec') || lower.includes('seniorelectrician') || lower.includes('elec-01') || lower.includes('anand')) {
          email = 'seniorelectrician@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else if (lower.includes('electrician') || lower.includes('elec') || lower.includes('elec-02') || lower.includes('rajesh')) {
          email = 'electrician@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else if (lower.includes('senior') || lower.includes('mec-01') || lower.includes('ramesh')) {
          email = 'seniormechanic@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else if (lower.includes('store') || lower.includes('str') || lower.includes('arumugam')) {
          email = 'stores@textech.garments';
          targetRoute = '/dashboard/store-inbox';
        } else if (lower.includes('mec-08') || lower.includes('suresh') || lower === 'mechanic') {
          email = 'mechanic@textech.garments';
          targetRoute = '/dashboard/calendar';
        } else {
          email = cleanInput;
          targetRoute = '/dashboard/machines';
        }
      }

      await loginWithEmail(email, cleanPass);
      showToast('Successfully signed in. Welcome to TexTech CMMS!', 'success');
      router.push(targetRoute);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center p-4 py-8 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(241,245,249,0.9))]">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 p-6 sm:p-8 text-white text-center border-b border-indigo-500/30">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/25 text-white mb-3 shadow-inner">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">TexTech Garments</h1>
          <p className="text-xs uppercase tracking-widest text-indigo-100 font-semibold mt-1">
            Plant Maintenance & Asset Management (CMMS)
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleFormLogin} className="space-y-4">
            {/* Login / Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Employee ID or Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-slate-800"
                  placeholder="e.g. admin@textech.garments, ceo, MEC-01, ELEC-01"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition text-slate-800"
                  placeholder="Enter your password (e.g. password123)"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Garment Manufacturing Plant 03 • Coimbatore Unit • All role accounts verified
          </p>
        </div>
      </div>
    </div>
  );
}

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
  Shield,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface CompanyLoginFormProps {
  companySlug: string;
  companyName: string;
  description?: string;
}

export function CompanyLoginForm({ companySlug, companyName, description }: CompanyLoginFormProps) {
  const router = useRouter();
  const { loginWithEmail } = useAuth();
  const { showToast } = useToast();

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isTexplus = companySlug === 'texplus';
  const defaultAdminUser = isTexplus ? 'admin@texplus.com' : 'admin@esstee.com';

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
      await loginWithEmail(cleanInput, cleanPass, companySlug);
      showToast(`Welcome back to ${companyName} Plant Maintenance!`, 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setEmailOrId(defaultAdminUser);
    setPassword('admin123');
    setIsLoading(true);
    try {
      await loginWithEmail(defaultAdminUser, 'admin123', companySlug);
      showToast(`Signed in as ${companyName} Administrator`, 'success');
      router.push('/dashboard');
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
        
        {/* Header Banner Tailored to Company */}
        <div className={`p-6 sm:p-8 text-white text-center border-b ${
          isTexplus
            ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border-emerald-500/30'
            : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 border-indigo-500/30'
        }`}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/25 text-white mb-3 shadow-inner">
            <Wrench className="w-7 h-7" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wider uppercase mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Workspace: {companyName}</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">Maintenance Module</h1>
          <p className="text-xs uppercase tracking-widest text-white/90 font-semibold mt-1">
            {description || `${companyName} Industrial Asset Management`}
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
                  placeholder={`e.g. admin@${companySlug}.com or EMP-01`}
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
                  placeholder="Enter your password"
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
              className={`w-full py-3 text-white font-semibold text-sm rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60 ${
                isTexplus
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-500/25'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {companyName}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* 1-Click Admin Sign In Button */}
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              disabled={isLoading}
              className={`w-full py-2.5 border font-semibold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                isTexplus
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80'
              }`}
            >
              <Shield className={`w-4 h-4 ${isTexplus ? 'text-emerald-600' : 'text-indigo-600'}`} />
              <span>1-Click {companyName} Administrator Sign In</span>
            </button>

            {/* Workspace Isolation Security Note */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-left mt-2">
              <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Tenant Isolation Active:</span> You are connecting exclusively to{' '}
                <code className="text-slate-800 font-semibold bg-slate-200/80 px-1 py-0.5 rounded">compliance_{companySlug}</code>.
                Cross-company data access is strictly forbidden.
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center flex items-center justify-between text-[11px] text-slate-400">
          <span>{companyName} Workspace</span>
          <span>Database: compliance_{companySlug}</span>
        </div>
      </div>
    </div>
  );
}

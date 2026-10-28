'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  CheckCircle2,
  Factory,
  ExternalLink,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export interface CompanyOption {
  slug: string;
  name: string;
  databaseName: string;
  description?: string;
  active: boolean;
}

interface PreLoginFormProps {
  companies: CompanyOption[];
  initialCompanySlug?: string;
}

export function PreLoginForm({ companies, initialCompanySlug = 'esstee' }: PreLoginFormProps) {
  const router = useRouter();
  const { loginWithEmail } = useAuth();
  const { showToast } = useToast();

  const [selectedCompany, setSelectedCompany] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cmms_active_company');
      if (stored && companies.some((c) => c.slug === stored)) {
        return stored;
      }
    }
    const exists = companies.some((c) => c.slug === initialCompanySlug);
    return exists ? initialCompanySlug : (companies[0]?.slug || 'esstee');
  });

  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const activeCompany = companies.find((c) => c.slug === selectedCompany) || {
    slug: selectedCompany,
    name: selectedCompany === 'texplus' ? 'Texplus' : 'Esstee',
    description: selectedCompany === 'texplus' 
      ? 'Texplus Industrial Sewing & Manufacturing Unit' 
      : 'Esstee Garments & Plant Maintenance Operations',
    databaseName: `compliance_${selectedCompany}`,
    active: true,
  };

  const isTexplus = selectedCompany === 'texplus';
  const defaultAdminUser = isTexplus ? 'admin@texplus.com' : 'admin@esstee.com';

  // Smart workspace detection as user types
  const handleEmailChange = (val: string) => {
    setEmailOrId(val);
    const lower = val.toLowerCase();
    if (lower.includes('texplus') && selectedCompany !== 'texplus') {
      const match = companies.find((c) => c.slug === 'texplus');
      if (match) {
        setSelectedCompany('texplus');
        showToast('Switched workspace to Texplus based on credentials', 'info');
      }
    } else if ((lower.includes('esstee') || lower.includes('sahana')) && selectedCompany !== 'esstee') {
      const match = companies.find((c) => c.slug === 'esstee');
      if (match) {
        setSelectedCompany('esstee');
        showToast('Switched workspace to Esstee based on credentials', 'info');
      }
    }
  };

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
      await loginWithEmail(cleanInput, cleanPass, selectedCompany);
      showToast(`Welcome back to ${activeCompany.name} Plant Maintenance!`, 'success');
      router.push(`/${selectedCompany}/dashboard`);
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
      await loginWithEmail(defaultAdminUser, 'admin123', selectedCompany);
      showToast(`Signed in as ${activeCompany.name} Administrator`, 'success');
      router.push(`/${selectedCompany}/dashboard`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      {/* Left Brand & Story Section */}
      <section className="login-story" aria-label="Maintenance workspace introduction">
        <div className="login-brand">
          <span className="brand-mark">
            <Wrench size={22} />
          </span>
          Mainten<span className="text-teal-300">ance.</span>
        </div>

        <div className="login-story-content">
          <span className="login-eyebrow">
            <span /> MULTI-PLANT CMMS ARCHITECTURE
          </span>
          <h1>
            Select plant.<br />
            Sign in.<br />
            <span>Launch dashboard.</span>
          </h1>
          <p>
            Unified pre-login portal connecting your operations across Esstee Garments and Texplus Textiles with dedicated database isolation.
          </p>

          {/* Machine Graphic */}
          <div className="plant-illustration" aria-hidden="true">
            <div className="plant-line" />
            {[0, 1, 2].map((item) => (
              <div className="plant-machine" key={item}>
                <div className="machine-top">
                  <Wrench size={24} />
                  <span />
                </div>
                <div className="machine-body">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="machine-feet" />
              </div>
            ))}
          </div>

          <div className="login-features">
            <div>
              <span>01</span>
              <strong>Choose Company</strong>
              <p>Direct switch between Esstee & Texplus facilities.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Dedicated Isolation</strong>
              <p>Physical MongoDB database per company.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Direct Routing</strong>
              <p>Routes straight to /{selectedCompany}/dashboard.</p>
            </div>
          </div>
        </div>

        <div className="login-story-footer">
          <span>BUILT FOR INDUSTRIAL MANUFACTURING</span>
          <span>Esstee & Texplus Multi-Tenant System</span>
        </div>
      </section>

      {/* Right Form Section with Workspace Selection */}
      <section className="login-form-side">
        {/* Step Indicator Banner: Login -> Texplus/Esstee -> Dashboard */}
        <div className="mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
              Step 1: Login
            </span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
              <Building2 size={13} />
              Step 2: {activeCompany.name}
            </span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              Step 3: Dashboard
            </span>
          </div>
        </div>

        <div className="login-form-content" style={{ maxWidth: '440px' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="login-section-label">WORKSPACE AUTHENTICATION</span>
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
              Pre-Login Selector
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign in to Workspace
          </h2>
          <p className="login-description text-slate-500 text-xs mb-5">
            Select your plant facility to access maintenance equipment and tickets.
          </p>

          {/* Company Selector Cards */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              1. Select Plant Facility
            </label>
            <div className="grid grid-cols-2 gap-3">
              {companies.map((comp) => {
                const isSelected = selectedCompany === comp.slug;
                const isTex = comp.slug === 'texplus';
                return (
                  <button
                    key={comp.slug}
                    type="button"
                    onClick={() => setSelectedCompany(comp.slug)}
                    className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? isTex
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-600/20'
                          : 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? isTex
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Factory size={16} />
                      </div>
                      {isSelected ? (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isTex ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        {comp.name}
                        {isTex ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                            Unit 2
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded">
                            Unit 1
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {isTex ? 'Processing & Sewing' : 'Garments & Plant'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[11px] text-slate-500">
                Connected DB: <code className="text-slate-700 font-mono text-[10px]">{activeCompany.databaseName}</code>
              </span>
              <Link
                href={`/${selectedCompany}/login`}
                className="text-[11px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 hover:underline"
              >
                Direct link <ExternalLink size={11} />
              </Link>
            </div>
          </div>

          {/* Sign In Form for Selected Workspace */}
          <form onSubmit={handleFormLogin} className="login-form">
            <div>
              <label htmlFor="employee-id">
                2. Employee ID or Email ({activeCompany.name})
              </label>
              <div className="login-input-wrap">
                <User size={18} />
                <input
                  id="employee-id"
                  type="text"
                  value={emailOrId}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder={isTexplus ? 'e.g. admin@texplus.com' : 'e.g. admin@esstee.com'}
                  autoComplete="username"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <Lock size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              className="login-submit"
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: isTexplus ? '#059669' : '#4f46e5',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Signing into {activeCompany.name}...
                </>
              ) : (
                <>
                  Sign in to {activeCompany.name} <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="login-divider">
              <span />
              Quick Administrator Access
              <span />
            </div>

            <button
              className="login-admin hover:bg-slate-50 transition-colors"
              type="button"
              onClick={handleQuickAdminLogin}
              disabled={isLoading}
            >
              <Shield size={17} className={isTexplus ? 'text-emerald-600' : 'text-indigo-600'} />
              1-Click {activeCompany.name} Admin ({defaultAdminUser})
            </button>
          </form>

          <p className="login-help text-xs">
            After signing in, you will be redirected to{' '}
            <strong className="text-slate-700">/{selectedCompany}/dashboard</strong>
          </p>

          <div className="login-security">
            <Shield size={17} />
            <p>
              <strong>Multi-Company Isolation Enforced.</strong>
              <br />
              Secure cryptographic session partitioned to {activeCompany.name} operations.
            </p>
          </div>
        </div>

        <footer className="login-footer mt-auto pt-6 border-t border-slate-100">
          <span>Plant Maintenance CMMS</span>
          <span>Pre-Login Architecture (login → {selectedCompany} → dashboard)</span>
        </footer>
      </section>
    </main>
  );
}

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types/cmms';

export const ROLE_PASSWORDS: Record<UserRole, string> = {
  CEO: 'ceo123',
  ADMIN: 'admin123',
  ASSET_MANAGER: 'admin123',
  SENIOR_MECHANIC: 'senior123',
  MECHANIC: 'mechanic123',
  SENIOR_ELECTRICIAN: 'senior123',
  ELECTRICIAN: 'electrician123',
  STORE_PERSON: 'stores123',
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  companySlug: string;
  companyName: string;
  isLoading: boolean;
  loginAsRole: (role: UserRole) => Promise<void>;
  loginAsUser: (profile: UserProfile) => Promise<void>;
  loginWithEmail: (email: string, pass: string, companySlug?: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveUserTitle(role: UserRole, companyName: string = 'Company'): string {
  switch (role) {
    case 'CEO':
      return 'Chief Executive Officer (Managing Director)';
    case 'ADMIN':
    case 'ASSET_MANAGER':
      return 'Plant Administrator & Asset Director';
    case 'SENIOR_MECHANIC':
      return 'Senior Sewing Master Mechanic';
    case 'SENIOR_ELECTRICIAN':
      return 'Senior Plant Electrician & Automation Lead';
    case 'ELECTRICIAN':
      return 'Industrial Plant Electrician';
    case 'STORE_PERSON':
      return 'Tool Crib & Store In-Charge';
    case 'MECHANIC':
      return 'Line Sewing Mechanic';
    default:
      return `${companyName} Specialist`;
  }
}

const AUTH_STORAGE_KEY = 'cmms_current_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount and verify with server
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (typeof window !== 'undefined') {
          // 1. Try local storage cache for instant UI rendering
          const stored = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem('sahana_current_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.role) {
              parsed.role = parsed.role.toString().toUpperCase() as UserRole;
            }
            if (isMounted) setUser(parsed);
          }

          // 2. Authoritatively verify with server session
          try {
            const meRes = await fetch('/api/auth/me', { credentials: 'include' });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData?.authenticated && meData?.user) {
                if (isMounted) {
                  setUser(meData.user);
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(meData.user));
                  if (meData.company?.slug) {
                    localStorage.setItem('cmms_active_company', meData.company.slug);
                  }
                }
              }
            }
          } catch {}
        }
      } catch (e) {
        console.warn('Failed to restore auth session:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithEmail = async (
    rawEmail: string,
    rawPass: string,
    targetCompanySlug?: string
  ): Promise<void> => {
    setIsLoading(true);
    const email = (rawEmail || '').trim();
    const pass = (rawPass || '').trim();

    if (!email) {
      setIsLoading(false);
      throw new Error('Please enter your email or employee ID');
    }
    if (!pass) {
      setIsLoading(false);
      throw new Error('Please enter your password');
    }

    // Determine target company slug
    let effectiveSlug = targetCompanySlug;
    if (!effectiveSlug && typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0] !== 'maintenance' && pathParts[0] !== 'dashboard' && pathParts[0] !== 'api') {
        effectiveSlug = pathParts[0];
      }
    }
    if (!effectiveSlug) {
      effectiveSlug = email.toLowerCase().includes('texplus') ? 'texplus' : 'esstee';
    }

    try {
      const payload = JSON.stringify({
        email,
        password: pass,
        companySlug: effectiveSlug,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-company-slug': effectiveSlug,
      };

      // Call /api/auth/login directly (with /maintenance fallback)
      let res: Response | null = null;
      try {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers,
          body: payload,
          credentials: 'include',
        });
      } catch {
        res = await fetch('/maintenance/api/auth/login', {
          method: 'POST',
          headers,
          body: payload,
          credentials: 'include',
        });
      }

      if (!res) {
        throw new Error('Connection failed. Please check your internet connection.');
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || 'Invalid credentials. Please try again.');
      }

      setUser(data.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
        localStorage.setItem('cmms_active_company', data.user.companySlug || effectiveSlug);
        localStorage.setItem('cmms_active_tenant', data.user.companySlug || effectiveSlug);
        window.dispatchEvent(new Event('cmms_tenant_changed'));
      }
    } catch (err: unknown) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsUser = async (profile: UserProfile): Promise<void> => {
    setUser(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
      const slug = profile.companySlug || (profile.email.includes('texplus') ? 'texplus' : 'esstee');
      localStorage.setItem('cmms_active_company', slug);
      localStorage.setItem('cmms_active_tenant', slug);
      window.dispatchEvent(new Event('cmms_tenant_changed'));
    }
    setIsLoading(false);
  };

  const loginAsRole = async (targetRole: UserRole): Promise<void> => {
    const slug = user?.companySlug || 'esstee';
    const cName = user?.company || (slug === 'texplus' ? 'Texplus' : 'Esstee');
    const roleTitle = resolveUserTitle(targetRole, cName);
    const roleProfile: UserProfile = {
      uid: `${targetRole.slice(0, 3)}-01`,
      name: `${targetRole.replace('_', ' ')} Staff`,
      email: `${targetRole.toLowerCase()}@${slug}.com`,
      role: targetRole,
      title: roleTitle,
      company: cName,
      companySlug: slug,
      status: 'ACTIVE',
    };
    setUser(roleProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(roleProfile));
      localStorage.setItem('cmms_active_company', slug);
    }
    setIsLoading(false);
  };

  const updateUserPassword = async (newPassword: string): Promise<void> => {
    if (!user) {
      throw new Error('No user is currently authenticated.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const payload = JSON.stringify({
      email: user.email,
      password: newPassword,
      name: user.name,
      role: user.role,
    });
    const headers = {
      'Content-Type': 'application/json',
      'x-company-slug': user.companySlug || 'esstee',
    };

    let res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers,
      body: payload,
      credentials: 'include',
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch('/maintenance/api/auth/set-password', {
        method: 'POST',
        headers,
        body: payload,
        credentials: 'include',
      }).catch(() => null);
    }

    if (!res) {
      throw new Error('Failed to update password. Please check your connection.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update password');
    }
  };

  const logout = async (): Promise<void> => {
    const lastCompanySlug = user?.companySlug || 'esstee';
    setUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('sahana_current_user');
      localStorage.removeItem('textech_current_user');
      localStorage.removeItem('cmms_active_company');
      localStorage.removeItem('cmms_active_tenant');
      window.dispatchEvent(new Event('cmms_tenant_changed'));
      window.location.href = `/${lastCompanySlug}/login`;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ? (user.role.toString().toUpperCase() as UserRole) : null,
        companySlug: user?.companySlug || 'esstee',
        companyName: user?.company || (user?.companySlug === 'texplus' ? 'Texplus' : 'Esstee'),
        isLoading,
        loginAsRole,
        loginAsUser,
        loginWithEmail,
        updateUserPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

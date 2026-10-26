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
  isLoading: boolean;
  loginAsRole: (role: UserRole) => Promise<void>;
  loginAsUser: (profile: UserProfile) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveUserRole(email: string): UserRole {
  const lower = email.toLowerCase();
  if (lower.includes('ceo')) return 'CEO';
  if (lower.includes('admin') || lower.includes('mgr') || lower.includes('manager')) return 'ADMIN';
  if (lower.includes('electrician') || lower.includes('elec')) {
    if (lower.includes('senior') || lower.includes('chief') || lower.includes('lead')) return 'SENIOR_ELECTRICIAN';
    return 'ELECTRICIAN';
  }
  if (lower.includes('senior')) return 'SENIOR_MECHANIC';
  if (lower.includes('store')) return 'STORE_PERSON';
  return 'MECHANIC';
}

function resolveUserTitle(role: UserRole): string {
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
      return (role as string) || 'Garment Factory Specialist';
  }
}

const AUTH_STORAGE_KEY = 'sahana_current_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem('textech_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.role) {
            parsed.role = parsed.role.toString().toUpperCase() as UserRole;
          }
          setUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithEmail = async (rawEmail: string, rawPass: string): Promise<void> => {
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

    try {
      const payload = JSON.stringify({ email, password: pass });
      const headers = { 'Content-Type': 'application/json' };

      // Try basePath endpoint directly first to prevent 307 redirect from stripping POST body
      let res: Response | null = null;
      try {
        res = await fetch('/maintenance/api/auth/login', {
          method: 'POST',
          headers,
          body: payload,
        });
      } catch (directErr) {
        console.warn('Direct /maintenance/api/auth/login failed, attempting /api/auth/login:', directErr);
      }

      if (!res || !res.ok) {
        // Fallback to /api/auth/login if direct /maintenance route was unavailable
        try {
          const fallbackRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers,
            body: payload,
          });
          if (fallbackRes.ok || !res) {
            res = fallbackRes;
          }
        } catch {}
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
        const tenant = (data.user.email || '').toLowerCase().includes('texplus') ||
          (data.user.company || '').toLowerCase().includes('texplus')
            ? 'texplus'
            : 'maintanence';
        localStorage.setItem('cmms_active_tenant', tenant);
        document.cookie = `cmms_tenant=${tenant}; path=/; max-age=2592000; SameSite=Lax`;
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
      const tenant = (profile.email || '').toLowerCase().includes('texplus') ||
        (profile.company || '').toLowerCase().includes('texplus')
          ? 'texplus'
          : 'maintanence';
      localStorage.setItem('cmms_active_tenant', tenant);
      document.cookie = `cmms_tenant=${tenant}; path=/; max-age=2592000; SameSite=Lax`;
    }
    setIsLoading(false);
  };

  const loginAsRole = async (targetRole: UserRole): Promise<void> => {
    const roleTitle = resolveUserTitle(targetRole);
    const roleProfile: UserProfile = {
      uid: `${targetRole.slice(0, 3)}-01`,
      name: `${targetRole.replace('_', ' ')} Staff`,
      email: `${targetRole.toLowerCase()}@sahana.garments`,
      role: targetRole,
      title: roleTitle,
      status: 'ACTIVE',
    };
    setUser(roleProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(roleProfile));
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
    const headers = { 'Content-Type': 'application/json' };

    let res = await fetch('/maintenance/api/auth/set-password', {
      method: 'POST',
      headers,
      body: payload,
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers,
        body: payload,
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
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('textech_current_user');
      localStorage.removeItem('cmms_active_tenant');
      document.cookie = 'cmms_tenant=; path=/; max-age=0; SameSite=Lax';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ? (user.role.toString().toUpperCase() as UserRole) : null,
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

'use client';

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/services/cmmsService';
import { departmentNavigationChanged } from '@/lib/departmentNavigation';

interface NavContextType {
  isNavHidden: boolean;
  toggleNav: () => void;
  hideNav: () => void;
  showNav: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  departmentNavigation: string[] | null;
}

const NavContext = createContext<NavContextType>({
  isNavHidden: false,
  toggleNav: () => {},
  hideNav: () => {},
  showNav: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  openMobileNav: () => {},
  closeMobileNav: () => {},
  departmentNavigation: null,
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const accountKey = user ? `${user.companySlug}:${user.uid}:${user.department}` : null;
  const [menu, setMenu] = useState<{ accountKey: string; paths: string[] | null } | null>(null);
  const departmentNavigation = menu?.accountKey === accountKey ? menu.paths : null;

  useEffect(() => {
    if (!accountKey) return;
    let controller: AbortController;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await apiFetch('/api/departments', { signal: request.signal, cache: 'no-store' });
        if (!response.ok) return;
        const { navigation } = await response.json();
        if (!request.signal.aborted) setMenu({ accountKey, paths: Array.isArray(navigation) ? navigation : null });
      } catch { /* Keep the last available menu for this account. */ }
    };
    void refresh();
    window.addEventListener(departmentNavigationChanged, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      controller?.abort();
      window.removeEventListener(departmentNavigationChanged, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [accountKey]);
  const [isNavHidden, setIsNavHidden] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Keep navbar open and clear any old collapsed state
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('textech_nav_hidden');
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleNav = () => {
    setIsNavHidden((prev) => !prev);
  };

  const hideNav = () => {
    setIsNavHidden(true);
  };

  const showNav = () => {
    setIsNavHidden(false);
  };

  const openMobileNav = useCallback(() => setIsMobileOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileOpen(false), []);

  return (
    <NavContext.Provider
      value={{
        isNavHidden,
        toggleNav,
        hideNav,
        showNav,
        isMobileOpen,
        setIsMobileOpen,
        openMobileNav,
        closeMobileNav,
        departmentNavigation,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextType {
  return useContext(NavContext);
}

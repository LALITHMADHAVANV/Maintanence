'use client';

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/services/cmmsService';
import { departmentNavigationChanged } from '@/lib/departmentNavigation';
import { getUserScopedUnit } from '@/lib/constants/units';
import { reportDay } from '@/lib/dailyTicketReport';

interface NavContextType {
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  ticketDate: string;
  setTicketDate: (date: string) => void;
  isNavHidden: boolean;
  toggleNav: () => void;
  hideNav: () => void;
  showNav: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  departmentNavigation: string[] | null;
  departmentNavigationReady: boolean;
}

const NavContext = createContext<NavContextType>({
  selectedUnit: 'All Units',
  setSelectedUnit: () => {},
  ticketDate: '',
  setTicketDate: () => {},
  isNavHidden: false,
  toggleNav: () => {},
  hideNav: () => {},
  showNav: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  openMobileNav: () => {},
  closeMobileNav: () => {},
  departmentNavigation: null,
  departmentNavigationReady: true,
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const accountKey = user ? `${user.companySlug}:${user.uid}:${user.department}` : null;
  const [defaultTicketDate] = useState(() => reportDay(Date.now()));
  const [filters, setFilters] = useState<{ accountKey: string | null; unit?: string; date?: string }>({ accountKey: null });
  const activeFilters = filters.accountKey === accountKey ? filters : null;
  const selectedUnit = getUserScopedUnit(user, user?.role, activeFilters?.unit);
  const ticketDate = activeFilters?.date ?? defaultTicketDate;
  const setSelectedUnit = (unit: string) => setFilters({ accountKey, unit, date: ticketDate });
  const setTicketDate = (date: string) => setFilters({ accountKey, unit: selectedUnit, date });
  const [menu, setMenu] = useState<{ accountKey: string; paths: string[] | null } | null>(null);
  const departmentNavigation = menu?.accountKey === accountKey ? menu.paths : null;
  const departmentNavigationReady = !user || menu?.accountKey === accountKey;

  useEffect(() => {
    if (!accountKey) return;
    let controller: AbortController;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await apiFetch('/api/departments', { signal: request.signal, cache: 'no-store' });
        if (!response.ok) {
          if (!request.signal.aborted) setMenu({ accountKey, paths: null });
          return;
        }
        const { navigation } = await response.json();
        if (!request.signal.aborted) setMenu({ accountKey, paths: Array.isArray(navigation)
          ? [...new Set(navigation.map((path: string) => path === '/dashboard/active-tna' ? '/dashboard/history' : path))]
          : null });
      } catch {
        if (!request.signal.aborted) setMenu({ accountKey, paths: null });
      }
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
        selectedUnit,
        setSelectedUnit,
        ticketDate,
        setTicketDate,
        isNavHidden,
        toggleNav,
        hideNav,
        showNav,
        isMobileOpen,
        setIsMobileOpen,
        openMobileNav,
        closeMobileNav,
        departmentNavigation,
        departmentNavigationReady,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextType {
  return useContext(NavContext);
}

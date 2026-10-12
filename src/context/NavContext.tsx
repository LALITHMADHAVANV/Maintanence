'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface NavContextType {
  isNavHidden: boolean;
  toggleNav: () => void;
  hideNav: () => void;
  showNav: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
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
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [isNavHidden, setIsNavHidden] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Restore user preference from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('textech_nav_hidden');
      if (saved !== null) {
        setIsNavHidden(saved === 'true');
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleNav = () => {
    setIsNavHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('textech_nav_hidden', String(next));
      } catch {}
      return next;
    });
  };

  const hideNav = () => {
    setIsNavHidden(true);
    try {
      localStorage.setItem('textech_nav_hidden', 'true');
    } catch {}
  };

  const showNav = () => {
    setIsNavHidden(false);
    try {
      localStorage.setItem('textech_nav_hidden', 'false');
    } catch {}
  };

  const openMobileNav = () => setIsMobileOpen(true);
  const closeMobileNav = () => setIsMobileOpen(false);

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
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextType {
  return useContext(NavContext);
}

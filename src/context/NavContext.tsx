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

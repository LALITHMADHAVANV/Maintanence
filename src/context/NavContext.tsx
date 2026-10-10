'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface NavContextType {
  isNavHidden: boolean;
  toggleNav: () => void;
  hideNav: () => void;
  showNav: () => void;
}

const NavContext = createContext<NavContextType>({
  isNavHidden: false,
  toggleNav: () => {},
  hideNav: () => {},
  showNav: () => {},
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [isNavHidden, setIsNavHidden] = useState<boolean>(false);

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

  return (
    <NavContext.Provider value={{ isNavHidden, toggleNav, hideNav, showNav }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextType {
  return useContext(NavContext);
}

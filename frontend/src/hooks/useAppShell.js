import { useState, useEffect, useCallback } from 'react';

const LG = 1024;

/** Sidebar abierta en desktop, cerrada en móvil (evita overlay al cargar). */
export function useSidebarState() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= LG;
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < LG) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return [sidebarOpen, setSidebarOpen];
}

/** Bloquear scroll del body cuando el drawer móvil está abierto. */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function useIsMobile(breakpoint = LG) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

export function useHeaderMenus() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const closeMenus = useCallback(() => {
    setShowNotifications(false);
    setShowUserMenu(false);
  }, []);

  return {
    showNotifications,
    setShowNotifications,
    showUserMenu,
    setShowUserMenu,
    closeMenus,
  };
}

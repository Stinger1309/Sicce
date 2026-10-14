import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useSidebarState, useHeaderMenus, useBodyScrollLock, useIsMobile } from '../hooks/useAppShell';

/**
 * Shell autenticado responsive: Header + Sidebar + contenido + Footer.
 */
const AppLayout = ({
  children,
  darkMode = false,
  setDarkMode,
  handleLogout,
  notifications = [],
  unreadCount,
  markAsRead,
  user,
  contentClassName = '',
}) => {
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const {
    showNotifications,
    setShowNotifications,
    showUserMenu,
    setShowUserMenu,
  } = useHeaderMenus();
  const isMobile = useIsMobile();

  useBodyScrollLock(isMobile && sidebarOpen);

  return (
    <div
      className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${
        darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
      }`}
    >
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        user={user}
        handleLogout={handleLogout}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
      />

      <div className="flex flex-1 min-w-0">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
          }`}
        >
          <div className={`p-3 sm:p-4 md:p-6 mt-16 w-full max-w-full ${contentClassName}`}>
            {children}
          </div>
        </main>
      </div>

      <Footer darkMode={darkMode} />
    </div>
  );
};

export default AppLayout;

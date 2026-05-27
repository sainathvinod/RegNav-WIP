import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DemoModeBanner } from './DemoModeBanner';
import { useAppStore } from '../../store/appStore';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileOpen = useAppStore((state) => state.sidebarMobileOpen);
  const closeMobileSidebar = useAppStore((state) => state.closeMobileSidebar);
  const location = useLocation();

  // Close mobile drawer on route change so a fresh page never opens
  // with the drawer pinned over content.
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileOpen]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Sidebar />

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <button
          aria-label="Close navigation menu"
          onClick={closeMobileSidebar}
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        />
      )}

      <div className={`transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <DemoModeBanner />
        <TopBar title={title} />

        <main className="px-3 py-4 sm:px-4 md:px-6" style={{ backgroundColor: 'var(--bg)' }}>
          <div className="max-w-[1800px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

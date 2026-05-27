import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
  { id: 'organizations', label: 'Organizations', icon: '🏢', path: '/organizations' },
  { id: 'users', label: 'Users', icon: '👥', path: '/users' },
  { id: 'configuration', label: 'Configuration', icon: '⚙️', path: '/configuration' },
  { id: 'profiles', label: 'Portfolios', icon: '🗂️', path: '/profiles' },
  { id: 'regscout', label: 'RegScout', icon: '🔍', path: '/regscout' },
  { id: 'regingest', label: 'RegIngest', icon: '📄', path: '/regingest' },
  { id: 'ruleminer', label: 'RuleMiner', icon: '⛏️', path: '/ruleminer' },
  { id: 'rulesense', label: 'RuleSense', icon: '🧠', path: '/rulesense' },
  { id: 'regvalidate', label: 'RegValidate', icon: '✅', path: '/regvalidate' },
  { id: 'analytics', label: 'Analytics', icon: '📈', path: '/analytics' },
  { id: 'reports', label: 'Reports', icon: '📑', path: '/reports' },
  { id: 'audit', label: 'Audit Log', icon: '📜', path: '/audit' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileOpen = useAppStore((state) => state.sidebarMobileOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const closeMobileSidebar = useAppStore((state) => state.closeMobileSidebar);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Width:   mobile→w-72  | md collapsed→w-20 | md expanded→w-64
  // Slide:   mobile open→0, closed→-100% | md→always 0
  const widthClass = `w-72 ${collapsed ? 'md:w-20' : 'md:w-64'}`;
  const translateClass = mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0';
  const showLabel = mobileOpen || !collapsed;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen border-r transition-all duration-300 z-40 flex flex-col ${widthClass} ${translateClass}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
      aria-label="Primary navigation"
    >
      {/* Header */}
      <div
        className="h-16 border-b flex items-center justify-between px-4"
        style={{ borderColor: 'var(--border)' }}
      >
        {showLabel ? (
          <div className="flex items-center space-x-2">
            <span className="text-2xl" aria-hidden="true">🧭</span>
            <span
              className="font-bold text-xl bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgb(var(--color-accent-primary)), rgb(var(--color-accent-hover)))',
              }}
            >
              RegNav.AI
            </span>
          </div>
        ) : (
          <span className="text-2xl mx-auto" aria-hidden="true">🧭</span>
        )}

        {/* Mobile close button */}
        <button
          onClick={closeMobileSidebar}
          className="md:hidden p-2 rounded-lg transition-colors"
          aria-label="Close menu"
          style={{ color: 'var(--muted)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Desktop collapse/expand */}
        <button
          onClick={toggleSidebar}
          className="hidden md:inline-flex p-1.5 rounded-lg transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ backgroundColor: 'transparent', color: 'var(--muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-2)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={closeMobileSidebar}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''} group relative`}
                title={!showLabel ? item.label : ''}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{item.icon}</span>
                {showLabel && <span className="ml-3 flex-1">{item.label}</span>}
                {!showLabel && (
                  <div
                    className="absolute left-full ml-2 px-2 py-1 text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border shadow-lg"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

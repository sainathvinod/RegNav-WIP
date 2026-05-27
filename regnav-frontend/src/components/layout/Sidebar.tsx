import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
  { id: 'organizations', label: 'Organizations', icon: '🏢', path: '/organizations' },
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
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen border-r transition-all duration-300 z-40 flex flex-col ${collapsed ? 'w-20' : 'w-64'}`}
      style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)' 
      }}
    >
      {/* Header */}
      <div 
        className="h-16 border-b flex items-center justify-between px-4"
        style={{ borderColor: 'var(--border)' }}
      >
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧭</span>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-500 to-purple-400 bg-clip-text text-transparent">
              RegNav.AI
            </span>
          </div>
        )}
        {collapsed && <span className="text-2xl mx-auto">🧭</span>}
        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-lg transition-colors"
          style={{ 
            backgroundColor: 'transparent',
            color: 'var(--muted)'
          }}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''} group relative`}
                title={collapsed ? item.label : ''}
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-3 flex-1">{item.label}</span>}
                {collapsed && (
                  <div 
                    className="absolute left-full ml-2 px-2 py-1 text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border shadow-lg"
                    style={{ 
                      backgroundColor: 'var(--surface)', 
                      color: 'var(--text)',
                      borderColor: 'var(--border)'
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

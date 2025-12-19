import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useUserPreferences } from '../../store/userPreferencesStore';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { setThemeMode, effectiveTheme } = useUserPreferences();
  const currentTheme = effectiveTheme();
  
  const toggleTheme = () => {
    // Toggle directly between light and dark (override system)
    setThemeMode(currentTheme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <div 
      className="border-b sticky top-0 z-30"
      style={{ 
        backgroundColor: 'var(--color-bg-panel)', 
        borderColor: 'var(--color-border-subtle)' 
      }}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
            )}
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-medium">Status:</span>
                <span className="badge badge-success">All Systems Operational</span>
              </div>
              <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <span className="font-medium">API:</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  Connected
                </span>
              </div>
            </div>
          </div>
          
          {/* Global Light/Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-muted)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
            title={currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {currentTheme === 'dark' ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


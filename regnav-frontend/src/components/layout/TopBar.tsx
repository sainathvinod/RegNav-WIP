import React from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { UserMenu } from '../../auth/UserMenu';
import { useUserPreferences } from '../../store/userPreferencesStore';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { themeMode, setThemeMode, effectiveTheme } = useUserPreferences();
  const currentTheme = effectiveTheme();
  
  const toggleTheme = () => {
    // Cycle: system → light → dark → system
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };
  
  return (
    <div 
      className="border-b sticky top-0 z-30"
      style={{ 
        backgroundColor: 'var(--surface)', 
        borderColor: 'var(--border)' 
      }}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
            )}
            <div className="mt-4 flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--muted)' }}>
                <span className="font-medium">Status:</span>
                <span className="badge badge-success">All Systems Operational</span>
              </div>
              <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--muted)' }}>
                <span className="font-medium">API:</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                  Connected
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
          <UserMenu />
          {/* Global Light/Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'var(--surface-2)',
              color: 'var(--muted)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--muted)';
            }}
            title={
              themeMode === 'system' 
                ? `System (currently ${currentTheme}) - Click to switch to Light`
                : themeMode === 'light'
                ? 'Light Mode - Click to switch to Dark'
                : 'Dark Mode - Click to switch to System'
            }
          >
            {themeMode === 'system' ? (
              <ComputerDesktopIcon className="w-5 h-5" />
            ) : themeMode === 'light' ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

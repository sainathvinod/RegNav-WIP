import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { UserMenu } from '../../auth/UserMenu';
import { NotificationBell } from '../NotificationBell';
import { useAppStore } from '../../store/appStore';
import { useUserPreferences } from '../../store/userPreferencesStore';
import { getLLMHealth, type LLMHealth } from '../../services/health';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { themeMode, setThemeMode, effectiveTheme } = useUserPreferences();
  const openMobileSidebar = useAppStore((state) => state.openMobileSidebar);
  const currentTheme = effectiveTheme();
  const [health, setHealth] = useState<LLMHealth | null>(null);
  const [healthLoaded, setHealthLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getLLMHealth()
        .then((h) => {
          if (!cancelled) {
            setHealth(h);
            setHealthLoaded(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHealth(null);
            setHealthLoaded(true);
          }
        });
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const apiUp = Boolean(health?.providers?.anthropic?.ok && health?.providers?.openai?.ok);
  const apiDegraded = healthLoaded && health !== null && !apiUp;
  const apiUnreachable = healthLoaded && health === null;

  const toggleTheme = () => {
    if (themeMode === 'system') setThemeMode('light');
    else if (themeMode === 'light') setThemeMode('dark');
    else setThemeMode('system');
  };

  const themeTitle =
    themeMode === 'system'
      ? `System (currently ${currentTheme}) — switch to Light`
      : themeMode === 'light'
        ? 'Light mode — switch to Dark'
        : 'Dark mode — switch to System';

  return (
    <div
      className="border-b sticky top-0 z-30"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: mobile hamburger + title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={openMobileSidebar}
              className="md:hidden p-2 -ml-2 rounded-lg transition-colors"
              aria-label="Open navigation menu"
              style={{ color: 'var(--text)' }}
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="min-w-0 flex-1">
              {title && (
                <h1
                  className="text-lg sm:text-xl md:text-2xl font-bold truncate"
                  style={{ color: 'var(--text)' }}
                >
                  {title}
                </h1>
              )}
              <div
                className="hidden md:flex mt-2 items-center space-x-4 lg:space-x-6 text-xs lg:text-sm"
                style={{ color: 'var(--muted)' }}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Status:</span>
                  {!healthLoaded ? (
                    <span className="status-neutral inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border">
                      Checking…
                    </span>
                  ) : apiUp ? (
                    <span className="status-success inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border">
                      All Systems Operational
                    </span>
                  ) : apiDegraded ? (
                    <span
                      className="status-warning inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      title="One or more LLM providers are not responding"
                    >
                      Degraded
                    </span>
                  ) : (
                    <span
                      className="status-danger inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      title="Backend health endpoint is unreachable"
                    >
                      Unreachable
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">API:</span>
                  <span className="flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${apiUp ? 'animate-pulse' : ''}`}
                      style={{
                        backgroundColor: apiUnreachable
                          ? 'var(--error)'
                          : apiDegraded
                            ? 'var(--warning)'
                            : 'var(--success)',
                      }}
                    />
                    {apiUnreachable ? 'Offline' : apiDegraded ? 'Degraded' : 'Connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <NotificationBell />
            <UserMenu />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              aria-label={themeTitle}
              title={themeTitle}
              style={{
                backgroundColor: 'var(--surface-2)',
                color: 'var(--muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover)';
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
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

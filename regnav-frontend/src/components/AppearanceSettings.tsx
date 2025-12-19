/**
 * Appearance Settings (Simplified)
 * 
 * Theme & Appearance controls only - uses theme tokens.
 */

import React from 'react';
import { useUserPreferences } from '../store/userPreferencesStore';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export const AppearanceSettings: React.FC = () => {
  const prefs = useUserPreferences();
  
  const handleReset = () => {
    if (window.confirm('Reset appearance settings to defaults?')) {
      prefs.resetToDefaults();
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Theme & Appearance */}
      <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <SunIcon className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          Theme & Appearance
        </h3>
        
        <div className="space-y-6">
          {/* Theme Mode */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'system', label: 'System', icon: ComputerDesktopIcon },
                { value: 'light', label: 'Light', icon: SunIcon },
                { value: 'dark', label: 'Dark', icon: MoonIcon },
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => prefs.setThemeMode(mode.value as any)}
                  className="p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2"
                  style={{
                    borderColor: prefs.themeMode === mode.value ? 'rgb(var(--color-accent-primary))' : 'var(--border)',
                    backgroundColor: prefs.themeMode === mode.value ? 'rgba(var(--color-accent-primary), 0.1)' : 'var(--surface-2)',
                    color: prefs.themeMode === mode.value ? 'rgb(var(--color-accent-primary))' : 'var(--muted)',
                  }}
                >
                  <mode.icon className="w-6 h-6" />
                  <span className="font-medium">{mode.label}</span>
                  {prefs.themeMode === mode.value && (
                    <CheckIcon className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--disabled)' }}>
              System mode follows your operating system's theme preference
            </p>
          </div>
          
          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Accent Color
            </label>
            <div className="grid grid-cols-6 gap-3">
              {[
                { value: 'purple', label: 'Purple', color: 'bg-purple-600' },
                { value: 'blue', label: 'Blue', color: 'bg-blue-600' },
                { value: 'green', label: 'Green', color: 'bg-green-600' },
                { value: 'teal', label: 'Teal', color: 'bg-teal-600' },
                { value: 'red', label: 'Red', color: 'bg-red-600' },
                { value: 'yellow', label: 'Yellow', color: 'bg-yellow-600' },
              ].map((accent) => (
                <button
                  key={accent.value}
                  onClick={() => prefs.setAccent(accent.value as any)}
                  className="p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2"
                  style={{
                    borderColor: prefs.accent === accent.value ? 'rgb(var(--color-accent-primary))' : 'var(--border)',
                    backgroundColor: 'var(--surface-2)',
                  }}
                  title={accent.label}
                >
                  <div className={`w-8 h-8 rounded-full ${accent.color}`}></div>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{accent.label}</span>
                  {prefs.accent === accent.value && (
                    <CheckIcon className="w-3 h-3" style={{ color: 'rgb(var(--color-accent-primary))' }} />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--disabled)' }}>
              Accent color affects buttons, active navigation, and highlights
            </p>
          </div>
        </div>
      </div>
      
      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-lg transition-colors flex items-center gap-2 border"
          style={{
            backgroundColor: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-2)';
          }}
        >
          <ArrowPathIcon className="w-5 h-5" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

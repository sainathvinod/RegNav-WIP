/**
 * Appearance Settings (Simplified)
 * 
 * Theme & Appearance controls only.
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
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <SunIcon className="w-5 h-5 text-purple-400" />
          Theme & Appearance
        </h3>
        
        <div className="space-y-6">
          {/* Theme Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
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
                  className={`
                    p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                    ${prefs.themeMode === mode.value
                      ? 'border-purple-500 bg-purple-900/20 text-purple-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }
                  `}
                >
                  <mode.icon className="w-6 h-6" />
                  <span className="font-medium">{mode.label}</span>
                  {prefs.themeMode === mode.value && (
                    <CheckIcon className="w-4 h-4 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              System mode follows your operating system's theme preference
            </p>
          </div>
          
          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
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
                  className={`
                    p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                    ${prefs.accent === accent.value
                      ? 'border-gray-500 bg-gray-800'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }
                  `}
                  title={accent.label}
                >
                  <div className={`w-8 h-8 rounded-full ${accent.color}`}></div>
                  <span className="text-xs text-gray-400">{accent.label}</span>
                  {prefs.accent === accent.value && (
                    <CheckIcon className="w-3 h-3 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Accent color affects buttons, active navigation, and highlights
            </p>
          </div>
        </div>
      </div>
      
      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-700"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

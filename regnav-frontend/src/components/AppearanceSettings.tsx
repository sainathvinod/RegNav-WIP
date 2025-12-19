/**
 * Appearance & Preferences Settings
 * 
 * Global user settings for theme, appearance, and UX defaults.
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
    if (prefs.confirmDestructive) {
      if (!window.confirm('Reset all appearance and preferences to defaults?')) {
        return;
      }
    }
    prefs.resetToDefaults();
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
          </div>
          
          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Accent Color
            </label>
            <div className="flex gap-3">
              {[
                { value: 'purple', label: 'Purple', color: 'bg-purple-600' },
                { value: 'blue', label: 'Blue', color: 'bg-blue-600' },
                { value: 'teal', label: 'Teal', color: 'bg-teal-600' },
                { value: 'green', label: 'Green', color: 'bg-green-600' },
                { value: 'orange', label: 'Orange', color: 'bg-orange-600' },
              ].map((accent) => (
                <button
                  key={accent.value}
                  onClick={() => prefs.setAccent(accent.value as any)}
                  className={`
                    p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 flex-1
                    ${prefs.accent === accent.value
                      ? 'border-gray-500 bg-gray-800'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }
                  `}
                  title={accent.label}
                >
                  <div className={`w-8 h-8 rounded-full ${accent.color}`}></div>
                  <span className="text-xs text-gray-400">{accent.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Font Family
            </label>
            <select
              value={prefs.fontFamily}
              onChange={(e) => prefs.setFontFamily(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="inter">Inter</option>
              <option value="roboto">Roboto</option>
              <option value="system">System Font</option>
            </select>
          </div>
          
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Font Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ].map((size) => (
                <button
                  key={size.value}
                  onClick={() => prefs.setFontSize(size.value as any)}
                  className={`
                    p-3 rounded-lg border transition-all
                    ${prefs.fontSize === size.value
                      ? 'border-purple-500 bg-purple-900/20 text-purple-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }
                  `}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar Preferences */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Sidebar Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-300">Default Sidebar State</div>
              <div className="text-xs text-gray-500 mt-1">Choose initial sidebar appearance</div>
            </div>
            <select
              value={prefs.sidebarDefaultCollapsed ? 'collapsed' : 'expanded'}
              onChange={(e) => prefs.setSidebarDefaultCollapsed(e.target.value === 'collapsed')}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="expanded">Expanded</option>
              <option value="collapsed">Collapsed</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-300">Auto-collapse on Small Screens</div>
              <div className="text-xs text-gray-500 mt-1">Automatically collapse on mobile/tablet</div>
            </div>
            <button
              onClick={() => prefs.setSidebarAutoCollapse(!prefs.sidebarAutoCollapse)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${prefs.sidebarAutoCollapse ? 'bg-purple-600' : 'bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${prefs.sidebarAutoCollapse ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* UX Defaults */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          UX Defaults
        </h3>
        
        <div className="space-y-4">
          {/* Startup Behavior */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Startup Behavior
            </label>
            <select
              value={prefs.startupBehavior}
              onChange={(e) => prefs.setStartupBehavior(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="lastVisited">Open Last Visited Module</option>
              <option value="dashboard">Always Open Dashboard</option>
              <option value="profiles">Open Profiles</option>
            </select>
          </div>
          
          {/* Table Density */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Table Density
            </label>
            <select
              value={prefs.tableDensity}
              onChange={(e) => prefs.setTableDensity(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
          
          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={prefs.dateFormat}
              onChange={(e) => prefs.setDateFormat(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">ISO (YYYY-MM-DD)</option>
            </select>
          </div>
          
          {/* Default Discovery Confidence */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Discovery Confidence
            </label>
            <select
              value={prefs.defaultConfidence}
              onChange={(e) => prefs.setDefaultConfidence(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="70">70%</option>
              <option value="80">80%</option>
              <option value="90">90%</option>
              <option value="100">100%</option>
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Pre-populates RegScout confidence slider
            </div>
          </div>
          
          {/* Confirm Destructive Actions */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-300">Confirm Destructive Actions</div>
              <div className="text-xs text-gray-500 mt-1">Show confirmation dialogs for delete operations</div>
            </div>
            <button
              onClick={() => prefs.setConfirmDestructive(!prefs.confirmDestructive)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${prefs.confirmDestructive ? 'bg-purple-600' : 'bg-gray-700'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${prefs.confirmDestructive ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
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


/**
 * User Preferences Store
 * 
 * Global user settings for appearance, UX defaults, and preferences.
 * Persists across sessions via localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColor = 'purple' | 'blue' | 'teal' | 'green' | 'orange';
export type FontFamily = 'inter' | 'roboto' | 'system';
export type FontSize = 'sm' | 'md' | 'lg';
export type TableDensity = 'compact' | 'standard' | 'comfortable';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type StartupBehavior = 'lastVisited' | 'dashboard' | 'profiles';

export interface UserPreferences {
  // Theme & Appearance
  themeMode: ThemeMode;
  accent: AccentColor;
  fontFamily: FontFamily;
  fontSize: FontSize;
  
  // Sidebar
  sidebarDefaultCollapsed: boolean;
  sidebarAutoCollapse: boolean;
  
  // UX Defaults
  startupBehavior: StartupBehavior;
  tableDensity: TableDensity;
  dateFormat: DateFormat;
  defaultConfidence: number; // 70, 80, 90, 100
  confirmDestructive: boolean;
}

interface UserPreferencesStore extends UserPreferences {
  // Computed
  effectiveTheme: () => 'light' | 'dark';
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (color: AccentColor) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: FontSize) => void;
  setSidebarDefaultCollapsed: (collapsed: boolean) => void;
  setSidebarAutoCollapse: (autoCollapse: boolean) => void;
  setStartupBehavior: (behavior: StartupBehavior) => void;
  setTableDensity: (density: TableDensity) => void;
  setDateFormat: (format: DateFormat) => void;
  setDefaultConfidence: (confidence: number) => void;
  setConfirmDestructive: (confirm: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: 'dark',
  accent: 'purple',
  fontFamily: 'inter',
  fontSize: 'md',
  sidebarDefaultCollapsed: false,
  sidebarAutoCollapse: true,
  startupBehavior: 'lastVisited',
  tableDensity: 'standard',
  dateFormat: 'MM/DD/YYYY',
  defaultConfidence: 70,
  confirmDestructive: true,
};

export const useUserPreferences = create<UserPreferencesStore>()(
  persist(
    (set, get) => ({
      // Initial state (defaults)
      ...DEFAULT_PREFERENCES,
      
      // Computed
      effectiveTheme: () => {
        const prefs = get();
        if (prefs.themeMode === 'system') {
          // Check system preference
          if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return 'dark'; // fallback
        }
        return prefs.themeMode;
      },
      
      // Actions
      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccent: (color) => set({ accent: color }),
      setFontFamily: (font) => set({ fontFamily: font }),
      setFontSize: (size) => set({ fontSize: size }),
      setSidebarDefaultCollapsed: (collapsed) => set({ sidebarDefaultCollapsed: collapsed }),
      setSidebarAutoCollapse: (autoCollapse) => set({ sidebarAutoCollapse: autoCollapse }),
      setStartupBehavior: (behavior) => set({ startupBehavior: behavior }),
      setTableDensity: (density) => set({ tableDensity: density }),
      setDateFormat: (format) => set({ dateFormat: format }),
      setDefaultConfidence: (confidence) => set({ defaultConfidence: confidence }),
      setConfirmDestructive: (confirm) => set({ confirmDestructive: confirm }),
      
      resetToDefaults: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: 'regnav.userPreferences',
    }
  )
);


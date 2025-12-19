/**
 * User Preferences Store
 * 
 * Global user settings for appearance, UX defaults, and preferences.
 * Persists across sessions via localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColor = 'purple' | 'blue' | 'green' | 'teal' | 'red' | 'yellow';

export interface UserPreferences {
  // Theme & Appearance (simplified)
  themeMode: ThemeMode;
  accent: AccentColor;
}

interface UserPreferencesStore extends UserPreferences {
  // Computed
  effectiveTheme: () => 'light' | 'dark';
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (color: AccentColor) => void;
  resetToDefaults: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: 'light', // Product default is Light theme
  accent: 'purple',
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
          return 'light'; // fallback to light (product default)
        }
        return prefs.themeMode;
      },
      
      // Actions
      setThemeMode: (mode) => set({ themeMode: mode }),
      setAccent: (color) => set({ accent: color }),
      resetToDefaults: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: 'regnav.userPreferences',
    }
  )
);


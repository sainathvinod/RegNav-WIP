/**
 * ThemeProvider
 * 
 * CANONICAL THEME SYSTEM - SINGLE SOURCE OF TRUTH
 * 
 * Two themes only: Light and Dark
 * System mode resolves to one of these based on OS preference
 * Applies theme globally via:
 * - CSS class (theme-light / theme-dark)
 * - data-theme attribute (light / dark)
 * - CSS variables (--color-accent-*)
 * 
 * Listens to OS theme changes when in system mode.
 */

import { useEffect, useState } from 'react';
import { useUserPreferences } from '../store/userPreferencesStore';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { themeMode, accent } = useUserPreferences();
  
  // State to track resolved theme (light or dark only)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    // Initial resolution
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeMode;
  });
  
  // Effect 1: Resolve theme based on mode and system preference
  useEffect(() => {
    if (themeMode === 'system') {
      // Listen to system preference changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      
      // Set initial value
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      
      // Add listener
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      // Direct mode (light or dark)
      setResolvedTheme(themeMode);
    }
  }, [themeMode]);
  
  // Effect 2: Apply resolved theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove old theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    // Apply new theme class
    root.classList.add(`theme-${resolvedTheme}`);
    
    // Apply data-theme attribute for stricter scoping
    root.setAttribute('data-theme', resolvedTheme);
    
  }, [resolvedTheme]);
  
  // Effect 3: Apply accent color CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    const accentColors = {
      purple: {
        primary: '147 51 234', // purple-600
        hover: '126 34 206', // purple-700
        light: '196 181 253', // purple-300
      },
      blue: {
        primary: '37 99 235', // blue-600
        hover: '29 78 216', // blue-700
        light: '147 197 253', // blue-300
      },
      green: {
        primary: '22 163 74', // green-600
        hover: '21 128 61', // green-700
        light: '134 239 172', // green-300
      },
      teal: {
        primary: '20 184 166', // teal-600
        hover: '17 94 89', // teal-700
        light: '94 234 212', // teal-300
      },
      red: {
        primary: '220 38 38', // red-600
        hover: '185 28 28', // red-700
        light: '252 165 165', // red-300
      },
      yellow: {
        primary: '202 138 4', // yellow-600
        hover: '161 98 7', // yellow-700
        light: '253 224 71', // yellow-300
      },
    };
    
    const selectedAccent = accentColors[accent];
    root.style.setProperty('--color-accent-primary', selectedAccent.primary);
    root.style.setProperty('--color-accent-hover', selectedAccent.hover);
    root.style.setProperty('--color-accent-light', selectedAccent.light);
    
  }, [accent]);
  
  return <>{children}</>;
};


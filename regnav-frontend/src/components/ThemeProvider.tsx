/**
 * ThemeProvider
 * 
 * Applies user preferences globally via CSS variables and root classes.
 * Updates dynamically when preferences change.
 */

import { useEffect } from 'react';
import { useUserPreferences } from '../store/userPreferencesStore';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    effectiveTheme,
    accent,
  } = useUserPreferences();
  
  useEffect(() => {
    const theme = effectiveTheme();
    const root = document.documentElement;
    
    // Apply theme class
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    
    // Apply accent color CSS variables
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
    
  }, [effectiveTheme, accent]);
  
  return <>{children}</>;
};


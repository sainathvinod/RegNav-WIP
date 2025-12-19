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
    fontFamily,
    fontSize,
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
      teal: {
        primary: '20 184 166', // teal-600
        hover: '17 94 89', // teal-700
        light: '94 234 212', // teal-300
      },
      green: {
        primary: '22 163 74', // green-600
        hover: '21 128 61', // green-700
        light: '134 239 172', // green-300
      },
      orange: {
        primary: '234 88 12', // orange-600
        hover: '194 65 12', // orange-700
        light: '253 186 116', // orange-300
      },
    };
    
    const selectedAccent = accentColors[accent];
    root.style.setProperty('--color-accent-primary', selectedAccent.primary);
    root.style.setProperty('--color-accent-hover', selectedAccent.hover);
    root.style.setProperty('--color-accent-light', selectedAccent.light);
    
    // Apply font family
    const fontFamilies = {
      inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      roboto: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    };
    root.style.setProperty('--font-family-base', fontFamilies[fontFamily]);
    
    // Apply font size
    const fontSizes = {
      sm: '14px',
      md: '16px',
      lg: '18px',
    };
    root.style.setProperty('--font-size-base', fontSizes[fontSize]);
    
  }, [effectiveTheme, accent, fontFamily, fontSize]);
  
  return <>{children}</>;
};


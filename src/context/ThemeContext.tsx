import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'ai-bi-theme-preference';

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getStoredPreference(): ThemePreference {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  }
  return 'system';
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => getStoredPreference());
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getStoredPreference()));

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', newTheme);
    // Also set color-scheme for native elements
    root.style.colorScheme = newTheme;
  }, []);

  // Handle preference change
  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    localStorage.setItem(THEME_STORAGE_KEY, preference);
    const resolvedTheme = resolveTheme(preference);
    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  }, [applyTheme]);

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference, applyTheme]);

  // Apply theme on initial mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeContext };


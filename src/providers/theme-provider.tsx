import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'theme.preference';

type ThemeContextValue = {
  isReady: boolean;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (next: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyScheme(next: ThemePreference) {
  nativewindColorScheme.set(next);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const { colorScheme } = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        const next: ThemePreference = stored === 'dark' ? 'dark' : 'light';
        applyScheme(next);
        if (mounted) setPreferenceState(next);
      })
      .catch(() => {
        applyScheme('light');
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(preference === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isReady,
      preference,
      isDark: (colorScheme ?? preference) === 'dark',
      setPreference,
      toggleTheme,
    }),
    [colorScheme, isReady, preference, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const value = use(ThemeContext);
  if (!value) throw new Error('useThemePreference must be used within ThemeProvider');
  return value;
}

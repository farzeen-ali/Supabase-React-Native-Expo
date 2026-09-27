import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { MotiView } from 'moti';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ThemeProvider, useThemePreference } from '@/providers/theme-provider';

import '@/global.css';

cssInterop(MotiView, { className: 'style' });

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <SplashGate />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function SplashGate() {
  const { isReady: authReady } = useAuth();
  const { isReady: themeReady } = useThemePreference();

  useEffect(() => {
    if (authReady && themeReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [authReady, themeReady]);

  return null;
}

function RootNavigator() {
  const { isReady, session, recoveryInProgress } = useAuth();
  const { isDark } = useThemePreference();
  const pathname = usePathname();
  const signedIn = Boolean(session);
  const showApp = isReady && signedIn && !recoveryInProgress;
  const showAuth = isReady && !showApp;

  useEffect(() => {
    if (!isReady || recoveryInProgress || signedIn) return;
    if (pathname === '/reset-password') {
      router.replace('/sign-in');
    }
  }, [isReady, pathname, recoveryInProgress, signedIn]);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Protected guard={showApp}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={showAuth}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}

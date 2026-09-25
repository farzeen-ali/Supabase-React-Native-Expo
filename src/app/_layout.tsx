import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
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
  const { isReady, session } = useAuth();
  const { isDark } = useThemePreference();
  const signedIn = Boolean(session);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Protected guard={isReady && signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={isReady && !signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}

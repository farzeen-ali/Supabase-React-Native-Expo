import { Moon, Sun } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/providers/auth-provider';
import { useThemePreference } from '@/providers/theme-provider';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme, preference } = useThemePreference();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setError(null);
    setLoading(true);
    const result = await signOut();
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 380 }}
        className="flex-1 gap-6 px-6 py-8">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="text-sm font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Protected
            </Text>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            onPress={toggleTheme}
            className="h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-800">
            <MotiView
              key={preference}
              from={{ rotate: '0deg', scale: 0.8 }}
              animate={{ rotate: '360deg', scale: 1 }}
              transition={{ type: 'spring', damping: 14 }}>
              {isDark ? <Moon color="#E2E8F0" size={22} /> : <Sun color="#0F172A" size={22} />}
            </MotiView>
          </Pressable>
        </View>

        <View className="gap-3 rounded-3xl bg-white p-5 dark:bg-slate-900">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Signed in as</Text>
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">{user?.email ?? 'Unknown user'}</Text>
          <Text className="text-sm text-slate-600 dark:text-slate-300">
            User ID {user?.id ? `${user.id.slice(0, 8)}…` : 'unavailable'}
          </Text>
          <Text className="text-sm text-slate-600 dark:text-slate-300">
            Theme {preference === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </View>

        {error ? <Text className="text-sm text-rose-600 dark:text-rose-400">{error}</Text> : null}
        <SubmitButton label="Sign out" loading={loading} onPress={onSignOut} />
      </MotiView>
    </SafeAreaView>
  );
}

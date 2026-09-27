import { Link, router, type Href } from 'expo-router';
import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SecureField } from '@/components/auth/secure-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { fieldErrors, sanitizeEmail, sanitizePassword, signInSchema } from '@/lib/validation';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const { signIn, lockoutRemainingMs, isConfigured, beginRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const locked = lockoutRemainingMs > 0;

  const liveErrors = useMemo(() => {
    if (!email && !password) return {};
    const parsed = signInSchema.safeParse({
      email: sanitizeEmail(email),
      password: sanitizePassword(password),
    });
    return parsed.success ? {} : fieldErrors(parsed.error);
  }, [email, password]);

  async function onSubmit() {
    setFormError(null);
    const parsed = signInSchema.safeParse({
      email: sanitizeEmail(email),
      password: sanitizePassword(password),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await signIn(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (result.error) setFormError(result.error);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 420 }}
            className="gap-6">
            <View className="gap-2">
              <Text className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</Text>
              <Text className="text-base text-slate-600 dark:text-slate-300">
                Sign in with the email and password on your account.
              </Text>
            </View>

            {!isConfigured ? (
              <Text className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                Copy .env.example to .env.local and add your Supabase URL and publishable key.
              </Text>
            ) : null}

            <SecureField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email ?? (email ? liveErrors.email : undefined)}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <SecureField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password ?? (password ? liveErrors.password : undefined)}
              secure
              textContentType="password"
              autoComplete="password"
            />

            {locked ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Text className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  Too many failed attempts. Try again in {Math.ceil(lockoutRemainingMs / 1000)}s.
                </Text>
              </MotiView>
            ) : null}
            {formError ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Text className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                  {formError}
                </Text>
              </MotiView>
            ) : null}

            <SubmitButton label="Sign in" loading={loading} disabled={locked} onPress={onSubmit} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                beginRecovery();
                router.push('/reset-password' as Href);
              }}
              className="items-center py-1">
              <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">Forgot password?</Text>
            </Pressable>
            <Link href="/sign-up" className="text-center text-sm font-medium text-sky-700 dark:text-sky-300">
              Need an account? Create one
            </Link>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

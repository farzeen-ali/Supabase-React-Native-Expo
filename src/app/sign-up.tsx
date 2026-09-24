import { Link } from 'expo-router';
import { MotiView } from 'moti';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordStrength } from '@/components/auth/password-strength';
import { SecureField } from '@/components/auth/secure-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/providers/auth-provider';
import { fieldErrors, sanitizeEmail, sanitizePassword, signUpSchema } from '@/lib/validation';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const liveErrors = useMemo(() => {
    if (!email && !password && !confirmPassword) return {};
    const parsed = signUpSchema.safeParse({
      email: sanitizeEmail(email),
      password: sanitizePassword(password),
      confirmPassword: sanitizePassword(confirmPassword),
    });
    return parsed.success ? {} : fieldErrors(parsed.error);
  }, [confirmPassword, email, password]);

  async function onSubmit() {
    setFormError(null);
    setNotice(null);
    const parsed = signUpSchema.safeParse({
      email: sanitizeEmail(email),
      password: sanitizePassword(password),
      confirmPassword: sanitizePassword(confirmPassword),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await signUp(parsed.data.email, parsed.data.password, parsed.data.confirmPassword);
    setLoading(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice('Account created. Confirm the email we sent, then sign in.');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 420 }}
            className="gap-6">
            <View className="gap-2">
              <Text className="text-3xl font-bold text-slate-900 dark:text-white">Create account</Text>
              <Text className="text-base text-slate-600 dark:text-slate-300">
                Use a unique password. We never send it anywhere except Supabase Auth.
              </Text>
            </View>

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
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <PasswordStrength password={password} />
            <SecureField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword ?? (confirmPassword ? liveErrors.confirmPassword : undefined)}
              secure
              textContentType="newPassword"
              autoComplete="password-new"
            />

            {formError ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Text className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                  {formError}
                </Text>
              </MotiView>
            ) : null}
            {notice ? (
              <Text className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {notice}
              </Text>
            ) : null}

            <SubmitButton label="Create account" loading={loading} onPress={onSubmit} />
            <Link href="/sign-in" className="text-center text-sm font-medium text-sky-700 dark:text-sky-300">
              Already have an account? Sign in
            </Link>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

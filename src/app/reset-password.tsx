import { router, type Href } from 'expo-router';
import { MotiView } from 'moti';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OtpInput } from '@/components/auth/otp-input';
import { PasswordStrength } from '@/components/auth/password-strength';
import { SecureField } from '@/components/auth/secure-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { hapticSuccess } from '@/lib/haptics';
import {
  fieldErrors,
  newPasswordSchema,
  recoveryEmailSchema,
  sanitizeEmail,
  sanitizePassword,
} from '@/lib/validation';
import { useAuth } from '@/providers/auth-provider';
import { saveNewPassword, sendRecoveryCode, verifyRecoveryCode } from '@/services/passwordReset';

type Step = 'email' | 'code' | 'password' | 'done';

const RESEND_SECONDS = 60;

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { endRecovery, signOut } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const busy = useRef(false);
  const verified = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  async function onSendCode() {
    if (busy.current || secondsLeft > 0) return;
    setFormError(null);
    const parsed = recoveryEmailSchema.safeParse({ email: sanitizeEmail(email) });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    busy.current = true;
    setLoading(true);
    const result = await sendRecoveryCode(parsed.data.email);
    setLoading(false);
    busy.current = false;
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setEmail(parsed.data.email);
    setCode('');
    setSecondsLeft(RESEND_SECONDS);
    setStep('code');
  }

  async function onVerify(nextCode = code) {
    if (busy.current || verified.current || nextCode.length !== 6) return;
    setFormError(null);
    busy.current = true;
    setLoading(true);
    const result = await verifyRecoveryCode(email, nextCode);
    setLoading(false);
    busy.current = false;
    if (result.error) {
      setFormError(result.error);
      return;
    }
    verified.current = true;
    hapticSuccess();
    setStep('password');
  }

  async function onSavePassword() {
    if (busy.current) return;
    setFormError(null);
    const parsed = newPasswordSchema.safeParse({
      password: sanitizePassword(password),
      confirmPassword: sanitizePassword(confirmPassword),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    busy.current = true;
    setLoading(true);
    const result = await saveNewPassword(parsed.data.password);
    setLoading(false);
    busy.current = false;
    if (result.error) {
      setFormError(result.error);
      return;
    }
    hapticSuccess();
    setStep('done');
    setTimeout(() => {
      endRecovery();
    }, 900);
  }

  const minutes = `0:${String(secondsLeft).padStart(2, '0')}`;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="flex-grow px-6 pt-6"
            contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                signOut().finally(() => {
                  endRecovery();
                  router.replace('/sign-in' as Href);
                });
              }}
              className="mb-8 self-start">
              <Text className="text-sm font-medium text-sky-700 dark:text-sky-300">Back to sign in</Text>
            </Pressable>

            <View className="mb-8 flex-row gap-2">
              {(['email', 'code', 'password'] as const).map((item) => {
                const active = step === item || (step === 'done' && item === 'password');
                const complete =
                  (item === 'email' && step !== 'email') ||
                  (item === 'code' && (step === 'password' || step === 'done'));
                return (
                  <MotiView
                    key={item}
                    animate={{ scaleX: active || complete ? 1 : 0.96 }}
                    className={`h-1.5 flex-1 rounded-full ${
                      active || complete ? 'bg-sky-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                );
              })}
            </View>

            <MotiView
              key={step}
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 180 }}
              className="gap-6">
              {step === 'email' ? (
                <>
                  <View className="gap-2">
                    <Text className="text-3xl font-bold text-slate-900 dark:text-white">Reset password</Text>
                    <Text className="text-base leading-6 text-slate-600 dark:text-slate-300">
                      We will email a 6-digit code. It expires quickly, and you can request a new one after one minute.
                    </Text>
                  </View>
                  <SecureField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    error={errors.email}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                  />
                  <SubmitButton label="Send code" loading={loading} onPress={onSendCode} />
                </>
              ) : null}

              {step === 'code' ? (
                <>
                  <View className="gap-2">
                    <Text className="text-3xl font-bold text-slate-900 dark:text-white">Enter the code</Text>
                    <Text className="text-base leading-6 text-slate-600 dark:text-slate-300">
                      Sent to {email}. Check your inbox and spam folder.
                    </Text>
                  </View>
                  <OtpInput
                    value={code}
                    onChange={setCode}
                    disabled={loading}
                    onComplete={(next) => {
                      onVerify(next);
                    }}
                  />
                  <View className="items-center">
                    {secondsLeft > 0 ? (
                      <MotiView
                        from={{ scale: 0.92, opacity: 0.6 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 12 }}
                        className="h-20 w-20 items-center justify-center rounded-full border-2 border-sky-500">
                        <Text className="text-lg font-semibold text-slate-900 dark:text-white">{minutes}</Text>
                      </MotiView>
                    ) : (
                      <Pressable accessibilityRole="button" onPress={onSendCode} disabled={loading}>
                        <Text className="text-base font-semibold text-sky-700 dark:text-sky-300">Resend code</Text>
                      </Pressable>
                    )}
                  </View>
                  <SubmitButton
                    label="Verify code"
                    loading={loading}
                    disabled={code.length !== 6}
                    onPress={() => onVerify()}
                  />
                </>
              ) : null}

              {step === 'password' ? (
                <>
                  <View className="gap-2">
                    <Text className="text-3xl font-bold text-slate-900 dark:text-white">Choose a new password</Text>
                    <Text className="text-base leading-6 text-slate-600 dark:text-slate-300">
                      Use at least 12 characters with upper and lower case, a number, and a symbol.
                    </Text>
                  </View>
                  <SecureField
                    label="New password"
                    value={password}
                    onChangeText={setPassword}
                    error={errors.password}
                    secure
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                  <PasswordStrength password={password} />
                  <SecureField
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    error={errors.confirmPassword}
                    secure
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                  <SubmitButton label="Update password" loading={loading} onPress={onSavePassword} />
                </>
              ) : null}

              {step === 'done' ? (
                <View className="items-center gap-3 py-16">
                  <MotiView
                    from={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
                    <Text className="text-3xl text-white">✓</Text>
                  </MotiView>
                  <Text className="text-2xl font-bold text-slate-900 dark:text-white">Password updated</Text>
                  <Text className="text-center text-base text-slate-600 dark:text-slate-300">
                    Taking you into the app.
                  </Text>
                </View>
              ) : null}

              {formError ? (
                <MotiView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }}>
                  <Text className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                    {formError}
                  </Text>
                </MotiView>
              ) : null}
            </MotiView>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

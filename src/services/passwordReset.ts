import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { recoveryCodeSchema, recoveryEmailSchema, sanitizeEmail } from '@/lib/validation';

export type ResetResult = { error: string | null };

function mapError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('rate') || normalized.includes('too many')) {
    return 'Too many requests. Wait a minute, then try again.';
  }
  if (normalized.includes('otp') || normalized.includes('token') || normalized.includes('expired')) {
    return 'That code is invalid or expired. Request a new one.';
  }
  if (normalized.includes('password')) return 'Choose a stronger password and try again.';
  return 'Something went wrong. Try again in a moment.';
}

export async function sendRecoveryCode(email: string): Promise<ResetResult> {
  if (!isSupabaseConfigured) {
    return { error: 'Add your Supabase URL and publishable key to .env.local.' };
  }

  const parsed = recoveryEmailSchema.safeParse({ email: sanitizeEmail(email) });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) return { error: mapError(error.message) };
  return { error: null };
}

export async function verifyRecoveryCode(email: string, token: string): Promise<ResetResult> {
  const parsedEmail = recoveryEmailSchema.safeParse({ email: sanitizeEmail(email) });
  const parsedCode = recoveryCodeSchema.safeParse(token.replace(/\D/g, ''));
  if (!parsedEmail.success || !parsedCode.success) {
    return { error: 'Enter the 6-digit code from your email.' };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: parsedEmail.data.email,
    token: parsedCode.data,
    type: 'recovery',
  });
  if (error) return { error: mapError(error.message) };
  return { error: null };
}

export async function saveNewPassword(password: string): Promise<ResetResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: mapError(error.message) };
  return { error: null };
}

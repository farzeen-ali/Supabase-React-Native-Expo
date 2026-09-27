import type { Session, User } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  clearLockout,
  readLockout,
  recordFailedSignIn,
  remainingLockMs,
  type LockoutState,
} from '@/lib/rate-limit';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { sanitizeEmail, sanitizePassword, signInSchema, signUpSchema } from '@/lib/validation';

type AuthContextValue = {
  isReady: boolean;
  isConfigured: boolean;
  session: Session | null;
  user: User | null;
  lockout: LockoutState;
  lockoutRemainingMs: number;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  recoveryInProgress: boolean;
  beginRecovery: () => void;
  endRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authMessage(error: { message: string; status?: number }) {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login')) return 'Email or password is incorrect.';
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  if ((error.status ?? 0) >= 500) return 'The auth service is unavailable. Try again shortly.';
  return 'Something went wrong. Check your details and try again.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lockout, setLockout] = useState<LockoutState>({ failures: 0, lockedUntil: 0 });
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;

    readLockout()
      .then((state) => {
        if (mounted) setLockout(state);
      })
      .catch(() => undefined);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsReady(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (remainingLockMs(lockout, now) <= 0) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockout, now]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: 'Add your Supabase URL and publishable key to .env.local.' };
    }

    const remaining = remainingLockMs(lockout);
    if (remaining > 0) {
      return { error: `Too many attempts. Try again in ${Math.ceil(remaining / 1000)}s.` };
    }

    const parsed = signInSchema.safeParse({
      email: sanitizeEmail(email),
      password: sanitizePassword(password),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check your email and password.' };
    }

    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      const invalidCredentials = error.message.toLowerCase().includes('invalid login');
      if (invalidCredentials) {
        const next = await recordFailedSignIn();
        setLockout(next);
        setNow(Date.now());
      }
      return { error: authMessage(error) };
    }

    const cleared = await clearLockout();
    setLockout(cleared);
    setRecoveryInProgress(false);
    return { error: null };
  }, [lockout]);

  const signUp = useCallback(async (email: string, password: string, confirmPassword: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: 'Add your Supabase URL and publishable key to .env.local.',
        needsConfirmation: false,
      };
    }

    const parsed = signUpSchema.safeParse({
      email: sanitizeEmail(email),
      password: sanitizePassword(password),
      confirmPassword: sanitizePassword(confirmPassword),
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
        needsConfirmation: false,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return { error: authMessage(error), needsConfirmation: false };
    }

    return { error: null, needsConfirmation: !data.session };
  }, []);

  const beginRecovery = useCallback(() => {
    setRecoveryInProgress(true);
  }, []);

  const endRecovery = useCallback(() => {
    setRecoveryInProgress(false);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: authMessage(error) };
    setSession(null);
    return { error: null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isConfigured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      lockout,
      lockoutRemainingMs: remainingLockMs(lockout, now),
      signIn,
      signUp,
      signOut,
      recoveryInProgress,
      beginRecovery,
      endRecovery,
    }),
    [beginRecovery, endRecovery, isReady, lockout, now, recoveryInProgress, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

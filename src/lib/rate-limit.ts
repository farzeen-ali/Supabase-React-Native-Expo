import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEY = 'auth.signin.lockout';
const FAILURES_BEFORE_LOCK = 3;
const BASE_LOCK_MS = 5_000;
const MAX_LOCK_MS = 5 * 60_000;

export type LockoutState = {
  failures: number;
  lockedUntil: number;
};

const emptyState: LockoutState = { failures: 0, lockedUntil: 0 };

async function readRaw() {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeRaw(value: string | null) {
  if (Platform.OS === 'web') {
    if (value == null) globalThis.localStorage?.removeItem(STORAGE_KEY);
    else globalThis.localStorage?.setItem(STORAGE_KEY, value);
    return;
  }
  if (value == null) {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readLockout(): Promise<LockoutState> {
  const raw = await readRaw();
  if (!raw) return emptyState;
  try {
    const parsed = JSON.parse(raw) as Partial<LockoutState>;
    return {
      failures: typeof parsed.failures === 'number' ? parsed.failures : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
    };
  } catch {
    return emptyState;
  }
}

export function lockoutDelayMs(failures: number) {
  const exponent = Math.max(0, failures - FAILURES_BEFORE_LOCK);
  return Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** exponent);
}

export async function recordFailedSignIn(now = Date.now()): Promise<LockoutState> {
  const current = await readLockout();
  const failures = current.failures + 1;
  const lockedUntil =
    failures >= FAILURES_BEFORE_LOCK ? now + lockoutDelayMs(failures) : current.lockedUntil;
  const next = { failures, lockedUntil };
  await writeRaw(JSON.stringify(next));
  return next;
}

export async function clearLockout() {
  await writeRaw(null);
  return emptyState;
}

export function remainingLockMs(state: LockoutState, now = Date.now()) {
  return Math.max(0, state.lockedUntil - now);
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase sessions exceed the historical ~2048 byte Keychain limit, so each
 * value is split across hardware-encrypted entries (Android Keystore / iOS Keychain).
 * Web has no SecureStore, so the same interface falls back to localStorage.
 */
const CHUNK_SIZE = 1800;

const keychainOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function entryKey(key: string, suffix: string) {
  const safe = key.replace(/[^A-Za-z0-9._-]/g, '_');
  return `${safe}.${suffix}`;
}

async function readChunkCount(key: string) {
  const raw = await SecureStore.getItemAsync(entryKey(key, 'count'));
  const count = Number(raw);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }

    const count = await readChunkCount(key);
    if (count === 0) return null;

    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(entryKey(key, String(index)));
      if (part == null) return null;
      parts.push(part);
    }

    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }

    await this.removeItem(key);

    const chunkCount = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(entryKey(key, String(index)), chunk, keychainOptions);
    }

    await SecureStore.setItemAsync(entryKey(key, 'count'), String(chunkCount), keychainOptions);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }

    const count = await readChunkCount(key);
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(entryKey(key, String(index))),
      ),
    );
    await SecureStore.deleteItemAsync(entryKey(key, 'count'));
  },
};

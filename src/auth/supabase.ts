import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
    this.name = 'SupabaseConfigurationError';
  }
}

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const browserAuthStorageKey = 'luma-auth-session';

function isPkceVerifierKey(key: string): boolean {
  return (
    key === `${browserAuthStorageKey}-code-verifier` ||
    key === `${browserAuthStorageKey}-flows-code-verifier` ||
    (key.startsWith(`${browserAuthStorageKey}-flow-`) &&
      key.endsWith('-code-verifier'))
  );
}

function getBrowserStorage(key: string): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // The session remains tab-local. The short-lived verifier is shared so a
    // magic link opened by Gmail in a new tab can complete the same flow.
    return isPkceVerifierKey(key) ? window.localStorage : window.sessionStorage;
  } catch {
    return window.sessionStorage;
  }
}

const browserStorage = {
  getItem: async (key: string) => {
    return getBrowserStorage(key)?.getItem(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    getBrowserStorage(key)?.setItem(key, value);
  },
  removeItem: async (key: string) => {
    getBrowserStorage(key)?.removeItem(key);
  },
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function getSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) throw new SupabaseConfigurationError();

  return createClient(config.url, config.publishableKey, {
    auth: {
      storage: Platform.OS === 'web' ? browserStorage : nativeStorage,
      storageKey: 'luma-auth-session',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // The web app is client-only, so implicit links do not depend on a
      // verifier living in the browser profile that started the request.
      // Native deep links keep PKCE because the verifier is held in SecureStore.
      flowType: Platform.OS === 'web' ? 'implicit' : 'pkce',
    },
  });
}

let client: SupabaseClient | undefined;
let clientConfigKey: string | undefined;

/** Returns one client instance per configured project. */
export function getConfiguredSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) throw new SupabaseConfigurationError();
  const key = `${config.url}|${config.publishableKey}`;
  if (!client || clientConfigKey !== key) {
    client = getSupabaseClient();
    clientConfigKey = key;
  }
  return client;
}

export function getAuthRedirectUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SUPABASE_AUTH_REDIRECT_URL?.trim();
  if (configured) {
    try {
      const redirect = new URL(configured);
      if (redirect.pathname === '/' && !redirect.search && !redirect.hash) {
        redirect.pathname = '/auth/callback';
        return redirect.toString();
      }
    } catch {
      // Preserve a custom native/deep-link value if URL parsing is unavailable.
    }
    return configured;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return Linking.createURL('auth/callback');
}

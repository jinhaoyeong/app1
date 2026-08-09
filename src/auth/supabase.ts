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

const browserStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
  },
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
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
      flowType: 'pkce',
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
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return Linking.createURL('auth/callback');
}

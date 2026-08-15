import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { Account as WebAccount, Client as WebClient } from 'appwrite';
import {
  Account as NativeAccount,
  Client as NativeClient,
} from 'react-native-appwrite';

export type AppwriteUser = {
  $id: string;
  email?: string | null;
};

/** The small common Account surface used by Luma across web and native. */
export interface AppwriteAccount {
  get(): Promise<AppwriteUser>;
  getPrefs<T = Record<string, unknown>>(): Promise<T>;
  updatePrefs<T = Record<string, unknown>>(params: { prefs: T }): Promise<T>;
  create(params: {
    userId: string;
    email: string;
    password: string;
  }): Promise<unknown>;
  createEmailPasswordSession(params: {
    email: string;
    password: string;
  }): Promise<unknown>;
  createSession(params: { userId: string; secret: string }): Promise<unknown>;
  createOAuth2Session(params: {
    provider: string;
    success?: string;
    failure?: string;
  }): void | string | URL;
  createMagicURLToken(params: {
    userId: string;
    email: string;
    url: string;
  }): Promise<unknown>;
  deleteSession(params: { sessionId: string }): Promise<unknown>;
}
type AppwriteClient = WebClient | NativeClient;

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
}

export class AppwriteConfigurationError extends Error {
  constructor() {
    super(
      'Appwrite is not configured. Add EXPO_PUBLIC_APPWRITE_ENDPOINT and EXPO_PUBLIC_APPWRITE_PROJECT_ID.',
    );
    this.name = 'AppwriteConfigurationError';
  }
}

export function getAppwriteConfig(): AppwriteConfig | null {
  const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID?.trim();
  if (!endpoint || !projectId) return null;
  return { endpoint, projectId };
}

export function getAppwriteClient(): AppwriteClient {
  const config = getAppwriteConfig();
  if (!config) throw new AppwriteConfigurationError();

  const platform = Platform.OS as string;
  if (platform === 'web') {
    // The browser must use Appwrite's Web SDK so its session cookie and
    // localStorage fallback are forwarded on follow-up account requests.
    return new WebClient()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId);
  }

  const client = new NativeClient()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

  // Native builds need the registered bundle/package identifier so Appwrite
  // can validate them.
  client.setPlatform(
    process.env.EXPO_PUBLIC_APPWRITE_PLATFORM?.trim() || 'app.luma.cycle',
  );

  return client;
}

let client: AppwriteClient | undefined;
let account: AppwriteAccount | undefined;
let clientConfigKey: string | undefined;

/** Returns one Account instance per configured Appwrite project. */
export function getConfiguredAppwriteAccount(): AppwriteAccount {
  const config = getAppwriteConfig();
  if (!config) throw new AppwriteConfigurationError();
  const key = `${config.endpoint}|${config.projectId}|${Platform.OS}`;
  if (!client || !account || clientConfigKey !== key) {
    client = getAppwriteClient();
    account =
      (Platform.OS as string) === 'web'
        ? (new WebAccount(client as WebClient) as unknown as AppwriteAccount)
        : (new NativeAccount(
            client as NativeClient,
          ) as unknown as AppwriteAccount);
    clientConfigKey = key;
  }
  return account;
}

export function getAppwriteAuthRedirectUrl(): string {
  const configured = process.env.EXPO_PUBLIC_APPWRITE_AUTH_REDIRECT_URL?.trim();
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return Linking.createURL('auth/callback');
}

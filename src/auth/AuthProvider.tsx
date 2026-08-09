import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Linking, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import {
  exchangeAuthUrl,
  hasAuthResponse,
  type AuthUrlParams,
  parseAuthUrl,
} from './deepLink';
import {
  getAuthRedirectUrl,
  getConfiguredSupabaseClient,
  getSupabaseConfig,
} from './supabase';
import { useLumaStore } from '@/store/lumaStore';
import type { AuthSession, AuthStatus } from '@/sync/types';

interface AuthContextValue {
  session: AuthSession | null;
  authStatus: AuthStatus;
  authError?: string;
  configured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signUpWithPassword: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  sendSignInLink: (email: string) => Promise<boolean>;
  verifyEmailCode: (email: string, code: string) => Promise<boolean>;
  verifyTokenHash: (tokenHash: string) => Promise<boolean>;
  resetAuthFlow: () => void;
  processAuthUrl: (url: string) => Promise<boolean>;
  retryHydration: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapSession(session: Session): AuthSession {
  return {
    userId: session.user.id,
    email: session.user.email ?? undefined,
    expiresAt: session.expires_at ?? undefined,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('pkce code verifier')) {
      return 'This sign-in link is no longer connected to this browser. Request a new link and open it in the same browser.';
    }
    if (
      message.includes('otp_expired') ||
      message.includes('email link is invalid') ||
      message.includes('token has expired')
    ) {
      return 'This sign-in link has already been used or has expired. Request a fresh link and open it once.';
    }
    if (message.includes('invalid login credentials')) {
      return 'That email or password is incorrect.';
    }
    if (message.includes('email not confirmed')) {
      return 'Your email is not confirmed yet. Confirm it in your inbox, or turn off email confirmations in Supabase Auth settings.';
    }
    if (message.includes('user already registered')) {
      return 'An account with this email already exists. Switch to Sign in.';
    }
    if (message.includes('password should be at least')) {
      return error instanceof Error
        ? error.message
        : 'Choose a longer password.';
    }
    if (
      message.includes('provider is not enabled') ||
      message.includes('unsupported provider')
    ) {
      return 'Google sign-in is not enabled for this Luma project yet.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function clearBrowserAuthParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    for (const key of [
      'code',
      'sb_flow_id',
      'error',
      'error_code',
      'error_description',
    ]) {
      url.searchParams.delete(key);
    }
    url.hash = '';
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // URL cleanup is a privacy improvement, not a condition for signing in.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    getSupabaseConfig() ? 'loading' : 'signed_out',
  );
  const [authError, setAuthError] = useState<string | undefined>(() =>
    getSupabaseConfig()
      ? undefined
      : 'Add your Supabase URL and publishable key to the app environment before signing in.',
  );
  const [configured] = useState(() => !!getSupabaseConfig());
  const clientRef = useRef<
    ReturnType<typeof getConfiguredSupabaseClient> | undefined
  >(undefined);
  const hydratedUserRef = useRef<string | undefined>(undefined);
  const processedAuthKeysRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const getClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;
    const client = getConfiguredSupabaseClient();
    clientRef.current = client;
    return client;
  }, []);

  const hydrateSession = useCallback(
    async (next: Session): Promise<boolean> => {
      const mapped = mapSession(next);
      if (hydratedUserRef.current === mapped.userId) {
        setSession(mapped);
        setAuthStatus('signed_in');
        return true;
      }

      setSession(mapped);
      setAuthStatus('hydrating');
      setAuthError(undefined);
      try {
        await useLumaStore.getState().hydrateAccount(mapped.userId);
        hydratedUserRef.current = mapped.userId;
        if (mountedRef.current) setAuthStatus('signed_in');
        return true;
      } catch (error) {
        hydratedUserRef.current = undefined;
        if (mountedRef.current) {
          setAuthStatus('error');
          setAuthError(errorMessage(error));
        }
        return false;
      }
    },
    [],
  );

  const processAuthUrl = useCallback(
    async (url: string): Promise<boolean> => {
      let client: ReturnType<typeof getConfiguredSupabaseClient>;
      try {
        client = getClient();
      } catch {
        setAuthError('Supabase is not configured for this build.');
        setAuthStatus('error');
        return false;
      }
      let authKey: string | undefined;
      try {
        const params = parseAuthUrl(url);
        authKey = params.code
          ? `code:${params.code}`
          : params.accessToken && params.refreshToken
            ? `tokens:${params.accessToken}:${params.refreshToken}`
            : params.error
              ? `error:${params.error}:${params.errorDescription ?? ''}`
              : undefined;
      } catch {
        // exchangeAuthUrl below provides the user-facing invalid-link error.
      }
      if (authKey && processedAuthKeysRef.current.has(authKey)) return true;
      if (authKey) processedAuthKeysRef.current.add(authKey);
      try {
        await exchangeAuthUrl(client, url);
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session || !(await hydrateSession(data.session))) {
          throw new Error('The sign-in session could not be loaded.');
        }
        clearBrowserAuthParams();
        return true;
      } catch (error) {
        if (authKey) processedAuthKeysRef.current.delete(authKey);
        setAuthError(errorMessage(error));
        setAuthStatus('error');
        return false;
      }
    },
    [getClient, hydrateSession],
  );

  useEffect(() => {
    mountedRef.current = true;
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const config = getSupabaseConfig();
      if (!config) {
        return () => {
          mountedRef.current = false;
        };
      }

      const client = getConfiguredSupabaseClient();
      clientRef.current = client;
      const listener = client.auth.onAuthStateChange((event, next) => {
        if (event === 'SIGNED_OUT' || !next) {
          hydratedUserRef.current = undefined;
          processedAuthKeysRef.current.clear();
          useLumaStore.getState().resetCloudState();
          if (mountedRef.current) {
            setSession(null);
            setAuthStatus('signed_out');
            setAuthError(undefined);
          }
          return;
        }
        if (event === 'TOKEN_REFRESHED' && next.user.id === session?.userId) {
          if (mountedRef.current) setSession(mapSession(next));
          return;
        }
        // Supabase invokes auth listeners synchronously. Hydrate on the next
        // turn so this callback never blocks token persistence or refresh.
        setTimeout(() => {
          if (mountedRef.current) void hydrateSession(next);
        }, 0);
      });
      subscription = listener.data.subscription;

      const handleUrl = (url: string) => {
        let params: AuthUrlParams;
        try {
          params = parseAuthUrl(url);
        } catch {
          return;
        }
        if (hasAuthResponse(params)) {
          void processAuthUrl(url);
        }
      };

      // Supabase normally redirects to /auth/callback. Also process the
      // current web URL so older/custom email templates that redirect to the
      // site root cannot silently return the user to the sign-in form.
      const initialWebUrl =
        typeof window !== 'undefined' &&
        hasAuthResponse(parseAuthUrl(window.location.href))
          ? window.location.href
          : undefined;
      if (initialWebUrl) handleUrl(initialWebUrl);

      void client.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!mountedRef.current) return;
          if (data.session) {
            void hydrateSession(data.session);
          } else if (!initialWebUrl) {
            setAuthStatus('signed_out');
          }
        })
        .catch((error) => {
          if (!mountedRef.current) return;
          setAuthStatus('error');
          setAuthError(errorMessage(error));
        });

      void Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });
      const urlSubscription = Linking.addEventListener('url', ({ url }) =>
        handleUrl(url),
      );
      const unsubscribeUrl = () => urlSubscription.remove();
      const originalUnsubscribe = subscription;
      subscription = {
        unsubscribe: () => {
          originalUnsubscribe?.unsubscribe();
          unsubscribeUrl();
        },
      };
    } catch (error) {
      setTimeout(() => {
        if (!mountedRef.current) return;
        setAuthStatus('error');
        setAuthError(errorMessage(error));
      }, 0);
    }

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
    // The session ref is intentionally read from the current state only for
    // token refreshes; hydration itself is stable for the provider lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrateSession, processAuthUrl]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !normalized.includes('@')) {
        setAuthError('Enter a valid email address.');
        setAuthStatus('error');
        return false;
      }
      if (!password) {
        setAuthError('Enter your password.');
        setAuthStatus('error');
        return false;
      }
      let client: ReturnType<typeof getConfiguredSupabaseClient>;
      try {
        client = getClient();
      } catch {
        setAuthError('Supabase is not configured for this build.');
        setAuthStatus('error');
        return false;
      }
      setAuthStatus('signing_in');
      setAuthError(undefined);
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error) throw error;
        if (!data.session || !(await hydrateSession(data.session))) {
          throw new Error('The sign-in session could not be loaded.');
        }
        return true;
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getClient, hydrateSession],
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !normalized.includes('@')) {
        setAuthError('Enter a valid email address.');
        setAuthStatus('error');
        return false;
      }
      if (password.length < 8) {
        setAuthError('Use a password with at least 8 characters.');
        setAuthStatus('error');
        return false;
      }
      let client: ReturnType<typeof getConfiguredSupabaseClient>;
      try {
        client = getClient();
      } catch {
        setAuthError('Supabase is not configured for this build.');
        setAuthStatus('error');
        return false;
      }
      setAuthStatus('signing_up');
      setAuthError(undefined);
      try {
        const { data, error } = await client.auth.signUp({
          email: normalized,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });
        if (error) throw error;
        if (data.session) {
          if (!(await hydrateSession(data.session))) return false;
          return true;
        }
        if (!data.user) {
          throw new Error('The account could not be created.');
        }
        setAuthStatus('account_created');
        return true;
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getClient, hydrateSession],
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    let client: ReturnType<typeof getConfiguredSupabaseClient>;
    try {
      client = getClient();
    } catch {
      setAuthError('Supabase is not configured for this build.');
      setAuthStatus('error');
      return false;
    }
    setAuthStatus('oauth_redirect');
    setAuthError(undefined);
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(),
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      if (error) throw error;
      if (Platform.OS !== 'web') {
        if (!data.url) {
          throw new Error('Google sign-in did not return a redirect URL.');
        }
        await Linking.openURL(data.url);
      }
      return true;
    } catch (error) {
      setAuthStatus('error');
      setAuthError(errorMessage(error));
      return false;
    }
  }, [getClient]);

  const sendSignInLink = useCallback(
    async (email: string) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !normalized.includes('@')) {
        setAuthError('Enter a valid email address.');
        setAuthStatus('error');
        return false;
      }
      let client: ReturnType<typeof getConfiguredSupabaseClient>;
      try {
        client = getClient();
      } catch {
        setAuthError('Supabase is not configured for this build.');
        setAuthStatus('error');
        return false;
      }
      setAuthStatus('sending_link');
      setAuthError(undefined);
      const { error } = await client.auth.signInWithOtp({
        email: normalized,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
      setAuthStatus('link_sent');
      return true;
    },
    [getClient],
  );

  const verifyEmailCode = useCallback(
    async (email: string, code: string): Promise<boolean> => {
      const normalized = email.trim().toLowerCase();
      const token = code.trim();
      if (!normalized || !normalized.includes('@')) {
        setAuthError('Enter the email address used for this sign-in link.');
        setAuthStatus('error');
        return false;
      }
      if (!/^\d{6}$/.test(token)) {
        setAuthError('Enter the 6-digit code from your Luma email.');
        setAuthStatus('error');
        return false;
      }
      let client: ReturnType<typeof getConfiguredSupabaseClient>;
      try {
        client = getClient();
      } catch {
        setAuthError('Supabase is not configured for this build.');
        setAuthStatus('error');
        return false;
      }
      setAuthStatus('verifying');
      setAuthError(undefined);
      try {
        const { data, error } = await client.auth.verifyOtp({
          email: normalized,
          token,
          type: 'email',
        });
        if (error) throw error;
        if (!data.session || !(await hydrateSession(data.session))) {
          throw new Error('The sign-in session could not be loaded.');
        }
        return true;
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getClient, hydrateSession],
  );

  const verifyTokenHash = useCallback(
    async (tokenHash: string): Promise<boolean> => {
      const token = tokenHash.trim();
      if (!token) {
        setAuthError('This sign-in link is missing its verification token.');
        setAuthStatus('error');
        return false;
      }
      let client: ReturnType<typeof getConfiguredSupabaseClient>;
      try {
        client = getClient();
      } catch {
        setAuthError('Supabase is not configured for this build.');
        setAuthStatus('error');
        return false;
      }
      setAuthStatus('verifying');
      setAuthError(undefined);
      try {
        const { data, error } = await client.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });
        if (error) throw error;
        if (!data.session || !(await hydrateSession(data.session))) {
          throw new Error('The sign-in session could not be loaded.');
        }
        return true;
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getClient, hydrateSession],
  );

  const resetAuthFlow = useCallback(() => {
    setAuthError(
      configured
        ? undefined
        : 'Add your Supabase URL and publishable key to the app environment before signing in.',
    );
    setAuthStatus(configured ? 'signed_out' : 'error');
  }, [configured]);

  const retryHydration = useCallback(async () => {
    let client: ReturnType<typeof getConfiguredSupabaseClient>;
    try {
      client = getClient();
    } catch {
      return false;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      setAuthStatus('signed_out');
      return false;
    }
    hydratedUserRef.current = undefined;
    return hydrateSession(data.session);
  }, [getClient, hydrateSession]);

  const signOut = useCallback(async () => {
    let client: ReturnType<typeof getConfiguredSupabaseClient>;
    try {
      client = getClient();
    } catch {
      return false;
    }
    const { error } = await client.auth.signOut();
    if (error) {
      setAuthError(errorMessage(error));
      setAuthStatus('error');
      return false;
    }
    useLumaStore.getState().resetCloudState();
    setSession(null);
    setAuthStatus('signed_out');
    return true;
  }, [getClient]);

  const deleteAccount = useCallback(async () => {
    const deleted = await useLumaStore.getState().deleteAccount();
    if (!deleted) return false;
    hydratedUserRef.current = undefined;
    setSession(null);
    setAuthStatus('signed_out');
    return true;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authStatus,
      authError,
      configured,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      sendSignInLink,
      verifyEmailCode,
      verifyTokenHash,
      resetAuthFlow,
      processAuthUrl,
      retryHydration,
      signOut,
      deleteAccount,
    }),
    [
      session,
      authStatus,
      authError,
      configured,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      sendSignInLink,
      verifyEmailCode,
      verifyTokenHash,
      resetAuthFlow,
      processAuthUrl,
      retryHydration,
      signOut,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

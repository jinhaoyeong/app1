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
import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { exchangeAuthUrl, type AuthUrlParams, parseAuthUrl } from './deepLink';
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
  sendSignInLink: (email: string) => Promise<boolean>;
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
    if (error.message.toLowerCase().includes('pkce code verifier')) {
      return 'This sign-in link is no longer connected to this browser. Request a new link and open it in the same browser.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
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

  const processAuthUrl = useCallback(async (url: string): Promise<boolean> => {
    const client = clientRef.current;
    if (!client) {
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
      return true;
    } catch (error) {
      if (authKey) processedAuthKeysRef.current.delete(authKey);
      setAuthError(errorMessage(error));
      setAuthStatus('error');
      return false;
    }
  }, []);

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

      void client.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) throw error;
          if (!mountedRef.current) return;
          if (data.session) {
            void hydrateSession(data.session);
          } else {
            setAuthStatus('signed_out');
          }
        })
        .catch((error) => {
          if (!mountedRef.current) return;
          setAuthStatus('error');
          setAuthError(errorMessage(error));
        });

      const handleUrl = (url: string) => {
        const params: AuthUrlParams = parseAuthUrl(url);
        if (params.code || params.accessToken || params.error) {
          void processAuthUrl(url);
        }
      };
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

  const sendSignInLink = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      setAuthError('Enter a valid email address.');
      setAuthStatus('error');
      return false;
    }
    const client = clientRef.current;
    if (!client) {
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
  }, []);

  const resetAuthFlow = useCallback(() => {
    setAuthError(
      configured
        ? undefined
        : 'Add your Supabase URL and publishable key to the app environment before signing in.',
    );
    setAuthStatus(configured ? 'signed_out' : 'error');
  }, [configured]);

  const retryHydration = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return false;
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      setAuthStatus('signed_out');
      return false;
    }
    hydratedUserRef.current = undefined;
    return hydrateSession(data.session);
  }, [hydrateSession]);

  const signOut = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return false;
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
  }, []);

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
      sendSignInLink,
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
      sendSignInLink,
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

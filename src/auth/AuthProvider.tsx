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
import { ID, OAuthProvider } from 'react-native-appwrite';
import {
  type AppwriteAccount,
  type AppwriteUser,
  getAppwriteAuthRedirectUrl,
  getAppwriteConfig,
  getConfiguredAppwriteAccount,
} from './appwrite';
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
  verifyTokenHash: (tokenHash: string, userId?: string) => Promise<boolean>;
  resetAuthFlow: () => void;
  processAuthUrl: (url: string) => Promise<boolean>;
  retryHydration: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(user: AppwriteUser): AuthSession {
  return {
    userId: user.$id,
    email: user.email || undefined,
  };
}

function appwriteErrorDetails(error: unknown): {
  message: string;
  type: string;
  code?: number;
} {
  if (error instanceof Error) {
    const candidate = error as Error & { type?: unknown; code?: unknown };
    return {
      message: error.message,
      type: typeof candidate.type === 'string' ? candidate.type : '',
      code: typeof candidate.code === 'number' ? candidate.code : undefined,
    };
  }
  return { message: String(error), type: '' };
}

function isSignedOutError(error: unknown): boolean {
  const details = appwriteErrorDetails(error);
  return (
    details.code === 401 ||
    details.type.includes('unauthorized') ||
    details.type === 'user_not_found'
  );
}

function errorMessage(error: unknown): string {
  const details = appwriteErrorDetails(error);
  const message = details.message.toLowerCase();
  const type = details.type.toLowerCase();

  if (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('could not be reached')
  ) {
    return 'Appwrite could not be reached. Check your internet connection and project endpoint.';
  }
  if (message.includes('invalid origin') || type.includes('origin')) {
    return 'Appwrite rejected this origin. Add localhost to the project Web platform, then reload Luma.';
  }
  if (type === 'user_already_exists' || message.includes('already exists')) {
    return 'An account with this email already exists. Switch to Sign in.';
  }
  if (
    type === 'user_invalid_credentials' ||
    message.includes('invalid credentials') ||
    message.includes('invalid email or password')
  ) {
    return 'That email or password is incorrect.';
  }
  if (type === 'user_password_too_short') {
    return 'Use a password with at least 8 characters.';
  }
  if (type === 'general_rate_limit_exceeded') {
    return 'Too many attempts. Wait a moment, then try again.';
  }
  if (type === 'user_blocked') {
    return 'This account is currently unavailable. Contact support if you need help.';
  }
  if (type === 'project_not_found') {
    return 'The Appwrite project could not be found. Check the project ID in the app environment.';
  }
  if (type === 'general_argument_invalid' && message.includes('email')) {
    return 'Enter a valid email address.';
  }
  return details.message || 'Something went wrong. Please try again.';
}

function clearBrowserAuthParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    for (const key of [
      'userId',
      'secret',
      'error',
      'error_description',
      'error_code',
      'code',
      'access_token',
      'refresh_token',
    ]) {
      url.searchParams.delete(key);
    }
    url.hash = '';
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // URL cleanup is a privacy improvement, not a condition for signing in.
  }
}

function hasAppwriteAuthResponse(url: string): boolean {
  try {
    const parsed = new URL(url);
    return Boolean(
      parsed.searchParams.get('userId') ||
      parsed.searchParams.get('secret') ||
      parsed.searchParams.get('error') ||
      parsed.pathname.endsWith('/auth/callback'),
    );
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    getAppwriteConfig() ? 'loading' : 'signed_out',
  );
  const [authError, setAuthError] = useState<string | undefined>(() =>
    getAppwriteConfig()
      ? undefined
      : 'Add your Appwrite endpoint and project ID to the app environment before signing in.',
  );
  const [configured] = useState(() => !!getAppwriteConfig());
  const accountRef = useRef<AppwriteAccount | undefined>(undefined);
  const hydratedUserRef = useRef<string | undefined>(undefined);
  const processedAuthKeysRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const getAccount = useCallback(() => {
    if (accountRef.current) return accountRef.current;
    const account = getConfiguredAppwriteAccount();
    accountRef.current = account;
    return account;
  }, []);

  const hydrateUser = useCallback(async (user: AppwriteUser) => {
    const mapped = mapUser(user);
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
  }, []);

  const hydrateCurrentUser = useCallback(async (): Promise<boolean> => {
    const user = await getAccount().get();
    return hydrateUser(user);
  }, [getAccount, hydrateUser]);

  const createSessionFromToken = useCallback(
    async (userId: string, secret: string): Promise<boolean> => {
      await getAccount().createSession({ userId, secret });
      return hydrateCurrentUser();
    },
    [getAccount, hydrateCurrentUser],
  );

  const processAuthUrl = useCallback(
    async (url: string): Promise<boolean> => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        setAuthStatus('error');
        setAuthError('This sign-in link is not valid. Request a fresh one.');
        return false;
      }

      const userId = parsed.searchParams.get('userId');
      const secret = parsed.searchParams.get('secret');
      const authErrorParam = parsed.searchParams.get('error');
      const authErrorDescription = parsed.searchParams.get('error_description');
      const authKey =
        userId && secret
          ? `token:${userId}:${secret}`
          : authErrorParam
            ? `error:${authErrorParam}:${authErrorDescription ?? ''}`
            : `callback:${parsed.origin}${parsed.pathname}`;
      if (processedAuthKeysRef.current.has(authKey)) return true;
      processedAuthKeysRef.current.add(authKey);

      try {
        if (authErrorParam) {
          throw new Error(authErrorDescription || authErrorParam);
        }
        if (userId && secret) {
          if (!(await createSessionFromToken(userId, secret))) return false;
        } else if (!(await hydrateCurrentUser())) {
          throw new Error('The sign-in session could not be loaded.');
        }
        clearBrowserAuthParams();
        return true;
      } catch (error) {
        processedAuthKeysRef.current.delete(authKey);
        setAuthError(errorMessage(error));
        setAuthStatus('error');
        return false;
      }
    },
    [createSessionFromToken, hydrateCurrentUser],
  );

  useEffect(() => {
    mountedRef.current = true;
    let urlSubscription: { remove: () => void } | undefined;
    try {
      if (!getAppwriteConfig()) {
        return () => {
          mountedRef.current = false;
        };
      }

      const account = getAccount();
      const handleUrl = (url: string) => {
        if (hasAppwriteAuthResponse(url)) void processAuthUrl(url);
      };

      const initialWebUrl =
        typeof window !== 'undefined' &&
        hasAppwriteAuthResponse(window.location.href)
          ? window.location.href
          : undefined;
      if (initialWebUrl) handleUrl(initialWebUrl);

      void account
        .get()
        .then((user) => {
          if (!mountedRef.current || initialWebUrl) return;
          void hydrateUser(user);
        })
        .catch((error) => {
          if (!mountedRef.current) return;
          if (isSignedOutError(error)) {
            setAuthStatus('signed_out');
            return;
          }
          setAuthStatus('error');
          setAuthError(errorMessage(error));
        });

      void Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });
      const linkingSubscription = Linking.addEventListener('url', ({ url }) =>
        handleUrl(url),
      );
      urlSubscription = { remove: () => linkingSubscription.remove() };
    } catch (error) {
      setTimeout(() => {
        if (!mountedRef.current) return;
        setAuthStatus('error');
        setAuthError(errorMessage(error));
      }, 0);
    }

    return () => {
      mountedRef.current = false;
      urlSubscription?.remove();
    };
  }, [getAccount, hydrateUser, processAuthUrl]);

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
      try {
        setAuthStatus('signing_in');
        setAuthError(undefined);
        await getAccount().createEmailPasswordSession({
          email: normalized,
          password,
        });
        return hydrateCurrentUser();
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getAccount, hydrateCurrentUser],
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
      try {
        setAuthStatus('signing_up');
        setAuthError(undefined);
        await getAccount().create({
          userId: ID.unique(),
          email: normalized,
          password,
        });
        // Appwrite account creation does not create a session by itself.
        await getAccount().createEmailPasswordSession({
          email: normalized,
          password,
        });
        return hydrateCurrentUser();
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getAccount, hydrateCurrentUser],
  );

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      setAuthStatus('oauth_redirect');
      setAuthError(undefined);
      const redirect = getAccount().createOAuth2Session({
        provider: OAuthProvider.Google,
        success: getAppwriteAuthRedirectUrl(),
        failure: getAppwriteAuthRedirectUrl(),
      });
      if (!redirect)
        throw new Error('Google sign-in did not return a redirect URL.');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(String(redirect));
      } else {
        await Linking.openURL(String(redirect));
      }
      return true;
    } catch (error) {
      setAuthStatus('error');
      setAuthError(errorMessage(error));
      return false;
    }
  }, [getAccount]);

  const sendSignInLink = useCallback(
    async (email: string) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !normalized.includes('@')) {
        setAuthError('Enter a valid email address.');
        setAuthStatus('error');
        return false;
      }
      try {
        setAuthStatus('sending_link');
        setAuthError(undefined);
        await getAccount().createMagicURLToken({
          userId: ID.unique(),
          email: normalized,
          url: getAppwriteAuthRedirectUrl(),
        });
        setAuthStatus('link_sent');
        return true;
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [getAccount],
  );

  const verifyEmailCode = useCallback(
    async (_email: string, _code: string): Promise<boolean> => {
      setAuthStatus('error');
      setAuthError(
        'Appwrite uses a secure email link for passwordless sign-in. Open the link from your inbox instead of entering a code.',
      );
      return false;
    },
    [],
  );

  const verifyTokenHash = useCallback(
    async (tokenHash: string, suppliedUserId?: string): Promise<boolean> => {
      const secret = tokenHash.trim();
      const userId =
        suppliedUserId ??
        (typeof window !== 'undefined'
          ? (new URL(window.location.href).searchParams.get('userId') ??
            undefined)
          : undefined);
      if (!secret || !userId) {
        setAuthError('This sign-in link is missing its verification details.');
        setAuthStatus('error');
        return false;
      }
      try {
        setAuthStatus('verifying');
        setAuthError(undefined);
        return await createSessionFromToken(userId, secret);
      } catch (error) {
        setAuthStatus('error');
        setAuthError(errorMessage(error));
        return false;
      }
    },
    [createSessionFromToken],
  );

  const resetAuthFlow = useCallback(() => {
    setAuthError(
      configured
        ? undefined
        : 'Add your Appwrite endpoint and project ID to the app environment before signing in.',
    );
    setAuthStatus(configured ? 'signed_out' : 'error');
  }, [configured]);

  const retryHydration = useCallback(async () => {
    try {
      hydratedUserRef.current = undefined;
      return await hydrateCurrentUser();
    } catch (error) {
      if (isSignedOutError(error)) {
        setAuthStatus('signed_out');
        return false;
      }
      setAuthStatus('error');
      setAuthError(errorMessage(error));
      return false;
    }
  }, [hydrateCurrentUser]);

  const signOut = useCallback(async () => {
    try {
      await getAccount().deleteSession({ sessionId: 'current' });
    } catch (error) {
      if (!isSignedOutError(error)) {
        setAuthError(errorMessage(error));
        setAuthStatus('error');
        return false;
      }
    }
    hydratedUserRef.current = undefined;
    useLumaStore.getState().resetCloudState();
    setSession(null);
    setAuthStatus('signed_out');
    return true;
  }, [getAccount]);

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

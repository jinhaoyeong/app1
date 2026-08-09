import type { Href } from 'expo-router';

/**
 * Expo Router serves app/auth/index.tsx at /auth. SDK 57's generated typed
 * route union currently exposes the source filename as /auth/index instead,
 * so keep the runtime-canonical path in one small, documented bridge.
 */
export const AUTH_ROUTE = '/auth' as unknown as Href;

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthUrlParams {
  code?: string;
  flowId?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
}

export function hasAuthResponse(params: AuthUrlParams): boolean {
  return Boolean(
    params.code || (params.accessToken && params.refreshToken) || params.error,
  );
}

export function parseAuthUrl(url: string): AuthUrlParams {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const get = (name: string) =>
    parsed.searchParams.get(name) ?? hash.get(name) ?? undefined;
  return {
    code: get('code'),
    flowId: get('sb_flow_id'),
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    error: get('error'),
    errorDescription: get('error_description'),
  };
}

/** Completes both PKCE code links and legacy implicit-token links. */
export async function exchangeAuthUrl(
  client: SupabaseClient,
  url: string,
): Promise<void> {
  const params = parseAuthUrl(url);
  if (params.error) {
    throw new Error(params.errorDescription ?? params.error);
  }
  if (params.code) {
    const { error } = await client.auth.exchangeCodeForSession(
      params.code,
      params.flowId ? { flowId: params.flowId } : undefined,
    );
    if (error) throw error;
    return;
  }
  if (params.accessToken && params.refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (error) throw error;
  }
}

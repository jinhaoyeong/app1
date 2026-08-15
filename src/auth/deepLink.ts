export interface CodeExchangeClient {
  auth: {
    exchangeCodeForSession: (
      code: string,
      options?: { flowId?: string },
    ) => PromiseLike<{ error: unknown }>;
  };
}

export interface AuthUrlParams {
  code?: string;
  flowId?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
}

export function parseAuthUrl(rawUrl: string): AuthUrlParams {
  const url = new URL(rawUrl);
  const params = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return {
    code: params.get('code') ?? undefined,
    flowId: params.get('sb_flow_id') ?? undefined,
    accessToken: hash.get('access_token') ?? undefined,
    refreshToken: hash.get('refresh_token') ?? undefined,
    error: params.get('error') ?? hash.get('error') ?? undefined,
    errorDescription:
      params.get('error_description') ??
      hash.get('error_description') ??
      undefined,
  };
}

export function hasAuthResponse(params: AuthUrlParams): boolean {
  return Boolean(
    params.code ||
      (params.accessToken && params.refreshToken) ||
      params.error,
  );
}

export async function exchangeAuthUrl(
  client: CodeExchangeClient,
  rawUrl: string,
): Promise<void> {
  const params = parseAuthUrl(rawUrl);
  if (params.error) {
    throw new Error(params.errorDescription || params.error);
  }
  if (params.code) {
    const { error } = await client.auth.exchangeCodeForSession(params.code, {
      flowId: params.flowId,
    });
    if (error) throw error;
    return;
  }
  if (params.accessToken && params.refreshToken) return;
  throw new Error('The sign-in link is missing its authentication response.');
}

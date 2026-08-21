export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly publicMessage: string;

  constructor(code: string, status: number, publicMessage: string) {
    super(publicMessage);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export class ProviderError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'ProviderError';
    this.code = code;
  }
}

export function providerAppError(error: unknown): AppError {
  const code = error instanceof ProviderError ? error.code : 'provider_unavailable';
  const status =
    code === 'provider_not_configured' || code === 'provider_pricing_unconfigured' || code === 'provider_disabled' ? 503
    : code === 'provider_auth_failed' || code === 'provider_access_denied' ? 502
    : code === 'provider_model_unavailable' ? 502
    : code === 'provider_rate_limited' ? 429
    : code === 'provider_timeout' ? 504
    : code === 'asset_persist_failed' || code === 'asset_url_failed' ? 500
    : 502;

  const messages: Record<string, string> = {
    provider_not_configured: 'The requested AI provider is not configured in backend secrets.',
    provider_pricing_unconfigured: 'Provider pricing is not configured on the server.',
    provider_disabled: 'This image provider is not enabled on the server.',
    provider_auth_failed: 'Provider authentication failed. Verify the API key in Edge Function secrets.',
    provider_access_denied: 'Provider access denied for this model or account.',
    provider_model_unavailable: 'The requested AI model is unavailable or not found on the provider.',
    provider_rate_limited: 'AI provider rate limit reached. Please try again shortly.',
    provider_timeout: 'AI provider request timed out. Please try again.',
    provider_unavailable: 'AI provider service is temporarily unavailable.',
    provider_invalid_output: 'The AI provider returned an unexpected response format.',
    provider_contract_invalid: 'The AI provider response did not meet the expected contract.',
    asset_persist_failed: 'Failed to persist generated image to workspace storage.',
    asset_url_failed: 'Failed to create access URL for generated image.',
  };

  return new AppError(code, status, messages[code] ?? 'The configured AI provider could not complete this request.');
}

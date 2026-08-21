import { AIErrorCode, AIOperationType, GenerationMetadata } from '../../types/providers';
import { ModelRegistry } from './modelRegistry';
import { UsageTracker } from './usageTracker';

export interface ClassifiedAIError {
  errorCode: AIErrorCode;
  message: string;
  isDailyQuotaExhausted: boolean;
  isRateLimit: boolean;
  isAuthError: boolean;
  isModelUnavailable: boolean;
  retryable: boolean;
}

export class QuotaManager {
  /**
   * Classifies error responses from Google Gemini or NVIDIA APIs.
   */
  public static classifyError(err: any): ClassifiedAIError {
    const rawMsg = String(err?.message || err || '').toLowerCase();
    const status = err?.status || err?.statusCode || err?.response?.status;

    // 1. Invalid or missing API key
    if (
      status === 401 ||
      status === 403 ||
      rawMsg.includes('api_key_invalid') ||
      rawMsg.includes('invalid api key') ||
      rawMsg.includes('unauthorized') ||
      rawMsg.includes('permission_denied')
    ) {
      return {
        errorCode: 'invalid_api_key',
        message: 'Invalid or missing API key. Please check your AI provider credentials in Settings.',
        isDailyQuotaExhausted: false,
        isRateLimit: false,
        isAuthError: true,
        isModelUnavailable: false,
        retryable: false,
      };
    }

    // 2. Daily Quota Exhaustion (429 with RPD / Daily mention)
    if (
      (status === 429 && (rawMsg.includes('perday') || rawMsg.includes('day') || rawMsg.includes('quota exceeded') || rawMsg.includes('resource_exhausted'))) ||
      rawMsg.includes('daily limit') ||
      rawMsg.includes('free_tier_requests_per_day')
    ) {
      return {
        errorCode: 'daily_quota_exhausted',
        message: 'Daily model quota reached for this Gemini model. Automatically routing to high-volume fallback.',
        isDailyQuotaExhausted: true,
        isRateLimit: true,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: false, // Do not repeatedly retry daily exhaustion on the same model
      };
    }

    // 3. RPM Rate Limit
    if (status === 429 && (rawMsg.includes('perminute') || rawMsg.includes('rpm') || rawMsg.includes('rate limit'))) {
      return {
        errorCode: 'rate_limit_rpm',
        message: 'Requests per minute (RPM) rate limit reached. Routing to fallback.',
        isDailyQuotaExhausted: false,
        isRateLimit: true,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: true,
      };
    }

    // 4. TPM Rate Limit
    if (status === 429 && (rawMsg.includes('token') || rawMsg.includes('tpm'))) {
      return {
        errorCode: 'rate_limit_tpm',
        message: 'Tokens per minute (TPM) limit reached.',
        isDailyQuotaExhausted: false,
        isRateLimit: true,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: true,
      };
    }

    // 5. Generic 429
    if (status === 429) {
      return {
        errorCode: 'rate_limit_rpm',
        message: 'Rate limit encountered (HTTP 429). Routing to fallback.',
        isDailyQuotaExhausted: false,
        isRateLimit: true,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: true,
      };
    }

    // 6. Model Not Found / Unavailable
    if (
      status === 404 ||
      rawMsg.includes('not found') ||
      rawMsg.includes('is not supported') ||
      rawMsg.includes('unknown model')
    ) {
      return {
        errorCode: 'model_unavailable',
        message: 'Requested AI model is not available for this project. Routing to compatible model.',
        isDailyQuotaExhausted: false,
        isRateLimit: false,
        isAuthError: false,
        isModelUnavailable: true,
        retryable: false,
      };
    }

    // 7. Safety Refusal
    if (rawMsg.includes('safety') || rawMsg.includes('blocked') || rawMsg.includes('harmful')) {
      return {
        errorCode: 'safety_refusal',
        message: 'Content generation was flagged by safety guidelines.',
        isDailyQuotaExhausted: false,
        isRateLimit: false,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: false,
      };
    }

    // 8. Malformed Response / JSON parse failure
    if (rawMsg.includes('json') || rawMsg.includes('unexpected token') || rawMsg.includes('syntaxerror')) {
      return {
        errorCode: 'malformed_structured_response',
        message: 'Structured JSON response could not be parsed.',
        isDailyQuotaExhausted: false,
        isRateLimit: false,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: true,
      };
    }

    // 9. Provider Outage / 5xx
    if (status >= 500 && status <= 599) {
      return {
        errorCode: 'provider_outage',
        message: 'AI Provider service is temporarily unavailable (5xx).',
        isDailyQuotaExhausted: false,
        isRateLimit: false,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: true,
      };
    }

    // 10. Timeout
    if (rawMsg.includes('timeout') || rawMsg.includes('aborted')) {
      return {
        errorCode: 'timeout',
        message: 'AI request timed out.',
        isDailyQuotaExhausted: false,
        isRateLimit: false,
        isAuthError: false,
        isModelUnavailable: false,
        retryable: true,
      };
    }

    // Default Generic Failure
    return {
      errorCode: 'generic_api_failure',
      message: rawMsg || 'An unexpected AI provider error occurred.',
      isDailyQuotaExhausted: false,
      isRateLimit: false,
      isAuthError: false,
      isModelUnavailable: false,
      retryable: false,
    };
  }

  /**
   * Executes an AI operation with intelligent fallback routing and metadata recording.
   */
  public static async executeWithFallback<T>(params: {
    requestedModelId: string;
    operation: AIOperationType;
    execute: (modelId: string, isFallback: boolean) => Promise<T>;
    onFallback?: (fromModel: string, toModel: string, reason: string) => void;
    fallbackToMock?: () => Promise<T>;
    skipFallback?: boolean;
    provider?: string;
  }): Promise<{ result: T; metadata: GenerationMetadata }> {
    const startTime = Date.now();
    const providerName = params.provider || 'gemini';
    const chain = [params.requestedModelId, ...ModelRegistry.getFallbackChain(params.requestedModelId)];
    
    let lastError: any = null;
    let fallbackOccurred = false;
    let fallbackReason: string | undefined = undefined;

    for (let i = 0; i < chain.length; i++) {
      const currentModelId = chain[i];
      const isFallbackStep = i > 0;

      try {
        if (isFallbackStep) {
          fallbackOccurred = true;
          const fromModel = chain[i - 1];
          const toModel = currentModelId;
          fallbackReason = `Primary model ${fromModel} failed with ${lastError?.errorCode || 'error'}; switched to ${toModel}.`;
          params.onFallback?.(fromModel, toModel, fallbackReason);
        }

        const result = await params.execute(currentModelId, isFallbackStep);
        const latencyMs = Date.now() - startTime;

        // Record successful usage
        UsageTracker.recordUsage({
          provider: providerName,
          model: currentModelId,
          operation: params.operation,
          success: true,
          latencyMs,
          requestedModel: params.requestedModelId,
          fallbackOccurred,
          fallbackReason,
        });

        const metadata: GenerationMetadata = {
          requestedModel: params.requestedModelId,
          actualModel: currentModelId,
          fallbackOccurred,
          fallbackReason,
          latencyMs,
          timestamp: new Date().toISOString(),
        };

        return { result, metadata };
      } catch (err: any) {
        lastError = this.classifyError(err);

        // Record failed attempt
        UsageTracker.recordUsage({
          provider: providerName,
          model: currentModelId,
          operation: params.operation,
          success: false,
          latencyMs: Date.now() - startTime,
          errorCode: lastError.errorCode,
          requestedModel: params.requestedModelId,
          fallbackOccurred,
          fallbackReason: lastError.message,
        });

        console.warn(`Model ${currentModelId} failed during ${params.operation}:`, lastError.message);

        if (params.skipFallback) {
          throw err;
        }
      }
    }

    // If all real models in chain failed and mock fallback exists
    if (params.fallbackToMock) {
      console.info(`All live models failed. Falling back to high-fidelity mock fixture for ${params.operation}.`);
      fallbackOccurred = true;
      fallbackReason = `All live Gemini models failed (${lastError?.message || 'Quota/Network error'}). Operating in high-fidelity mock fixture mode.`;
      params.onFallback?.(params.requestedModelId, 'mock-provider', fallbackReason);

      const result = await params.fallbackToMock();
      const latencyMs = Date.now() - startTime;

      const metadata: GenerationMetadata = {
        requestedModel: params.requestedModelId,
        actualModel: 'mock-provider',
        fallbackOccurred: true,
        fallbackReason,
        latencyMs,
        timestamp: new Date().toISOString(),
      };

      return { result, metadata };
    }

    throw new Error(`AI Generation failed for ${params.requestedModelId}: ${lastError?.message || 'Unknown error'}`);
  }
}

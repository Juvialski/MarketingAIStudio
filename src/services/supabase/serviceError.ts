export type ServiceErrorCode =
  | 'not_configured'
  | 'unauthenticated'
  | 'forbidden'
  | 'access_denied'
  | 'auth_required'
  | 'not_found'
  | 'validation_error'
  | 'network_error'
  | 'query_failed'
  | 'write_failed'
  | 'storage_failed'
  | 'asset_persist_failed'
  | 'campaign_save_failed'
  | 'review_publish_failed'
  | 'export_failed'
  | 'health_check_failed';

/** Stable, UI-safe error shape for persistence and backend operations. */
export class ServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly cause?: unknown;

  public constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.cause = cause;
  }
}

export const isServiceError = (error: unknown): error is ServiceError =>
  error instanceof ServiceError;

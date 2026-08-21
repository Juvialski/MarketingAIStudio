export type ServiceErrorCode =
  | 'not_configured'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'query_failed'
  | 'write_failed'
  | 'storage_failed'
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

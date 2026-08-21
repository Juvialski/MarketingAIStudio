import { AppError } from './errors.ts';

const DEFAULT_ORIGIN = 'http://localhost:3000';

function allowedOrigins(): string[] {
  return (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? DEFAULT_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || allowedOrigins().includes(origin);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const configured = allowedOrigins();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && configured.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  else if (!origin) headers['Access-Control-Allow-Origin'] = configured[0] ?? DEFAULT_ORIGIN;
  return headers;
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function errorResponse(req: Request, error: unknown): Response {
  const appError = error instanceof AppError
    ? error
    : new AppError('internal_error', 500, 'The request could not be completed.');
  if (!(error instanceof AppError)) console.error('[edge] internal error', error);
  return jsonResponse(req, { error: appError.code, message: appError.publicMessage }, appError.status);
}

export function ensurePost(req: Request): void {
  if (req.method !== 'POST') throw new AppError('method_not_allowed', 405, 'POST is required.');
  if (!isOriginAllowed(req)) throw new AppError('origin_not_allowed', 403, 'Origin is not allowed.');
}

export function handleOptions(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  if (!isOriginAllowed(req)) return jsonResponse(req, { error: 'origin_not_allowed' }, 403);
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function readJsonBody(req: Request, maxBytes = 300_000): Promise<unknown> {
  const declaredLength = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new AppError('request_too_large', 413, 'The request is too large.');
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new AppError('request_too_large', 413, 'The request is too large.');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('invalid_json', 400, 'The request body must be valid JSON.');
  }
}

export function idempotencyKey(req: Request, body: { idempotencyKey?: unknown }): string {
  const value = req.headers.get('idempotency-key') ?? body.idempotencyKey;
  if (typeof value !== 'string' || value.trim().length < 8 || value.trim().length > 128) {
    throw new AppError('idempotency_key_required', 400, 'An idempotency key is required.');
  }
  return value.trim();
}

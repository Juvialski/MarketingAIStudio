/**
 * The execution boundary for every user-facing data or generation operation.
 *
 * Demo mode is an intentional, fixture-backed workspace. Live mode is an
 * authenticated backend workspace and must fail closed when its backend is
 * unavailable.
 */
export type RuntimeMode = 'demo' | 'live';

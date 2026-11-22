const EVENTS = ['delivery_attempt', 'delivery_storage', 'screen_error'] as const;
const AREAS = ['checkin', 'workout', 'app'] as const;
const OUTCOMES = ['acknowledged', 'queued', 'blocked', 'error'] as const;
const REASONS = ['transport', 'temporary-server', 'auth', 'permission', 'conflict', 'validation', 'unknown', 'local-storage'] as const;

export type DiagnosticArea = typeof AREAS[number];
export type Diagnostic = {
  event: typeof EVENTS[number];
  area: DiagnosticArea;
  outcome: typeof OUTCOMES[number];
  reason?: typeof REASONS[number];
  durationMs?: number;
  ageMs?: number;
};

let sink: ((event: Diagnostic) => void) | undefined;

function member<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function timing(value: unknown, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(maximum, Math.round(value))
    : undefined;
}

/** A strict allowlist: identifiers, answers, URLs and error messages never pass. */
export function sanitizeDiagnostic(input: unknown): Diagnostic | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (!member(EVENTS, value.event) || !member(AREAS, value.area) || !member(OUTCOMES, value.outcome)) return null;
  const durationMs = timing(value.durationMs, 86_400_000);
  const ageMs = timing(value.ageMs, 2_592_000_000);
  return {
    event: value.event,
    area: value.area,
    outcome: value.outcome,
    ...(member(REASONS, value.reason) ? { reason: value.reason } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(ageMs !== undefined ? { ageMs } : {}),
  };
}

export function setDiagnosticSink(next?: (event: Diagnostic) => void): void {
  sink = next;
}

export function recordDiagnostic(input: unknown): void {
  const event = sanitizeDiagnostic(input);
  if (!event) return;
  try { sink?.(event); } catch { /* Diagnostics must never change a user action's outcome. */ }
}

import { sanitizeDiagnostic } from './diagnostics';

type Data = Record<string, unknown>;
const object = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const positive = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

/** Rebuild events from an allowlist; never forward SDK request, user or scope data. */
export function sanitizeTelemetryEvent(input: Data): Data | null {
  const diagnostic = sanitizeDiagnostic(object(input.extra).diagnostic);
  if (!diagnostic) return null;
  const { durationMs, ageMs, ...categories } = diagnostic;
  const event: Data = {
    message: `Dawnage ${diagnostic.event}`,
    level: diagnostic.outcome === 'error' ? 'error' : diagnostic.outcome === 'blocked' ? 'warning' : 'info',
    tags: categories,
    extra: { ...(durationMs !== undefined ? { durationMs } : {}), ...(ageMs !== undefined ? { ageMs } : {}) },
  };
  if (typeof input.event_id === 'string' && /^[a-f0-9]{32}$/.test(input.event_id)) event.event_id = input.event_id;
  if (typeof input.timestamp === 'number' && Number.isFinite(input.timestamp)) event.timestamp = input.timestamp;
  if (diagnostic.event === 'screen_error') {
    const exceptions = object(input.exception).values;
    const first = Array.isArray(exceptions) ? object(exceptions[0]) : {};
    const frames = object(first.stacktrace).frames;
    const safeFrames = Array.isArray(frames) ? frames.slice(-40).flatMap((value) => {
      const frame = object(value);
      const filename = typeof frame.filename === 'string' ? frame.filename.split(/[?#]/)[0].split(/[\\/]/).pop() : '';
      if (!filename || !/^[a-zA-Z0-9_.-]{1,120}\.(?:js|jsx|ts|tsx|bundle)$/.test(filename)) return [];
      return [{ filename, ...(positive(frame.lineno) !== undefined ? { lineno: frame.lineno } : {}), ...(positive(frame.colno) !== undefined ? { colno: frame.colno } : {}) }];
    }) : [];
    event.exception = { values: [{ type: 'ScreenError', value: 'Dawnage screen could not render', ...(safeFrames.length ? { stacktrace: { frames: safeFrames } } : {}) }] };
  }
  return event;
}

import { sanitizeTelemetryEvent } from './telemetry-event';

const diagnostic = { event: 'delivery_attempt', area: 'checkin', outcome: 'queued', reason: 'transport', durationMs: 20 };

it('drops all identifiers, request data, URLs, answers and unrecognized events', () => {
  const output = sanitizeTelemetryEvent({
    event_id: 'a'.repeat(32), message: 'private-answer', user: { id: 'private-user' },
    request: { url: 'private-photo' }, contexts: { secret: 'private-token' },
    breadcrumbs: [{ message: 'private-log' }], extra: { diagnostic, secret: 'private-secret' },
  });
  expect(JSON.stringify(output)).not.toContain('private-');
  expect(output).toMatchObject({ message: 'Dawnage delivery_attempt', tags: { area: 'checkin' }, extra: { durationMs: 20 } });
  expect(sanitizeTelemetryEvent({ message: 'unrecognized' })).toBeNull();
});

it('keeps only sanitized source locations for a caught screen error', () => {
  const output = sanitizeTelemetryEvent({
    extra: { diagnostic: { event: 'screen_error', area: 'app', outcome: 'error' } },
    exception: { values: [{ value: 'private-answer', stacktrace: { frames: [
      { filename: '/Users/private-user/check-in.tsx?token=private-token', lineno: 23, colno: 5, vars: { secret: 'private-secret' } },
      { filename: 'https://private-photo?token=private-token', lineno: -1 },
    ] } }] },
  });
  expect(JSON.stringify(output)).not.toContain('private-');
  expect(output?.exception).toEqual({ values: [{ type: 'ScreenError', value: 'Dawnage screen could not render', stacktrace: { frames: [{ filename: 'check-in.tsx', lineno: 23, colno: 5 }] } }] });
});

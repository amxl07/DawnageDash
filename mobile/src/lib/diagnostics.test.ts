import { recordDiagnostic, setDiagnosticSink } from './diagnostics';

afterEach(() => setDiagnosticSink());

it('emits only approved categories and bounded timing, never arbitrary payload fields', () => {
  const sink = jest.fn();
  setDiagnosticSink(sink);
  recordDiagnostic({ event: 'delivery_attempt', area: 'checkin', outcome: 'queued', reason: 'transport', durationMs: 123.7, ageMs: 2000, payload: { notes: 'private' }, userId: 'private', url: 'https://private.invalid' });
  expect(sink).toHaveBeenCalledWith({ event: 'delivery_attempt', area: 'checkin', outcome: 'queued', reason: 'transport', durationMs: 124, ageMs: 2000 });
});

it('rejects unknown categories and removes untrusted error text and invalid timing', () => {
  const sink = jest.fn();
  setDiagnosticSink(sink);
  recordDiagnostic({ event: 'secret', area: 'checkin', outcome: 'queued' });
  recordDiagnostic({ event: 'delivery_attempt', area: 'workout', outcome: 'blocked', reason: 'private backend response', durationMs: Infinity, ageMs: -1 });
  expect(sink.mock.calls).toEqual([[{ event: 'delivery_attempt', area: 'workout', outcome: 'blocked' }]]);
});

it('cannot turn a telemetry failure into a failed user action', () => {
  setDiagnosticSink(() => { throw new Error('transport unavailable'); });
  expect(() => recordDiagnostic({ event: 'screen_error', area: 'app', outcome: 'error' })).not.toThrow();
});

it('detaches a sink and caps unusually large durations', () => {
  const sink = jest.fn();
  setDiagnosticSink(sink);
  recordDiagnostic({ event: 'delivery_attempt', area: 'workout', outcome: 'acknowledged', durationMs: 1e20, ageMs: 1e20 });
  expect(sink.mock.calls[0][0]).toMatchObject({ durationMs: 86_400_000, ageMs: 2_592_000_000 });
  setDiagnosticSink();
  recordDiagnostic({ event: 'screen_error', area: 'app', outcome: 'error' });
  expect(sink).toHaveBeenCalledTimes(1);
});

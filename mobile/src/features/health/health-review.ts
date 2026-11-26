import { HEALTH_FIELDS, healthDayWindow, normalizeMeasurement, sameReviewScope, type HealthField, type HealthReadResult, type HealthReviewScope, type HealthWindow } from './health-model';

type Values = Partial<Record<HealthField, number>>;
export type HealthReviewState = { stage: 'closed' | 'intro' | 'loading' | 'result'; scope: HealthReviewScope | null; result: HealthReadResult | null; selected: HealthField[]; error: string | null };
type Ports = {
  flush: () => boolean;
  capture: () => HealthReviewScope | null;
  apply: (expected: HealthReviewScope, values: Values) => boolean;
  read: (window: HealthWindow, isCurrent: () => boolean) => Promise<HealthReadResult>;
  onChange: (state: HealthReviewState) => void;
  now?: () => Date;
};
const closed = (): HealthReviewState => ({ stage: 'closed', scope: null, result: null, selected: [], error: null });

/** One in-memory transaction; close/scope changes invalidate every late native response. */
export function createHealthReview(ports: Ports) {
  let state = closed();
  let request = 0;
  const publish = (next: HealthReviewState) => { state = next; ports.onChange(state); };
  const stale = () => publish({ ...state, stage: 'intro', result: null, selected: [], error: 'Your check-in or timezone changed. Close this review and open it again for the current values.' });
  return {
    getState: () => state,
    open() {
      if (!ports.flush()) return false;
      const scope = ports.capture();
      if (!scope) return false;
      request += 1;
      publish({ stage: 'intro', scope: { ...scope, form: { ...scope.form } }, result: null, selected: [], error: null });
      return true;
    },
    close() { request += 1; publish(closed()); },
    async read() {
      const expected = state.scope;
      if (!expected || state.stage === 'loading' || state.stage === 'closed' || state.error) return;
      if (!sameReviewScope(expected, ports.capture())) { stale(); return; }
      let window: HealthWindow;
      try { window = healthDayWindow(expected.date, ports.now?.()); }
      catch { publish({ ...state, error: 'Choose an elapsed reporting day, then open health review again.' }); return; }
      const token = ++request;
      const isCurrent = () => token === request && sameReviewScope(expected, ports.capture());
      publish({ ...state, stage: 'loading', error: null });
      try {
        const result = await ports.read(window, isCurrent);
        if (token !== request) return;
        if (!isCurrent()) { stale(); return; }
        // Do not permit malformed adapter results to become editable choices.
        const measurements = result.measurements.filter(m => HEALTH_FIELDS.includes(m.field) && normalizeMeasurement(m.field, m.value) === m.value);
        publish({ ...state, stage: 'result', result: { ...result, measurements }, selected: measurements.filter(m => expected.form[m.field] === null).map(m => m.field) });
      } catch {
        if (token !== request) return;
        if (!isCurrent()) { stale(); return; }
        publish({ ...state, stage: 'result', result: { status: 'error', provider: 'Health', window, measurements: [], issues: [], retryable: true, message: 'Health records could not be read. Unlock your device, check access and try again.' } });
      }
    },
    toggle(field: HealthField) {
      if (state.stage !== 'result' || !state.result?.measurements.some(m => m.field === field)) return;
      publish({ ...state, selected: state.selected.includes(field) ? state.selected.filter(f => f !== field) : [...state.selected, field] });
    },
    apply() {
      const expected = state.scope;
      if (state.stage !== 'result' || !state.result || !expected || !state.selected.length) return false;
      if (!ports.flush() || !sameReviewScope(expected, ports.capture())) { stale(); return false; }
      const values: Values = {};
      for (const m of state.result.measurements) if (state.selected.includes(m.field)) values[m.field] = m.value;
      if (!ports.apply(expected, values)) { stale(); return false; }
      request += 1; publish(closed()); return true;
    },
  };
}

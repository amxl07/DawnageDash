import { StrictMode } from 'react';
import { act, create } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import { NativeSurfaceBootstrap, useWorkoutActivity } from './hooks';
import { NativeSurfaceController } from './controller';
import type { NativeActivity, NativeSurfaceAdapter, RestClock, WorkoutProgress } from './model';

let mockUser: { id: string } | null;
let mockController: NativeSurfaceController;
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
// Keep the exported object stable even if Expo snapshots the named import.
// Each method resolves the per-test real controller only when it is called.
jest.mock('./service', () => ({ nativeSurfaceController: {
  setAccount: (account: string | null) => mockController.setAccount(account),
  claimWorkout: (account: string, date: string) => mockController.claimWorkout(account, date),
  updateWorkout: (lease: number, progress: WorkoutProgress) => mockController.updateWorkout(lease, progress),
  updateRest: (account: string, rest: RestClock) => mockController.updateRest(account, rest),
  endWorkout: (lease: number) => mockController.endWorkout(lease),
  reconcile: () => mockController.reconcile(),
} }));
jest.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
const links = { checkIn: 'dawnage-dev:///daily-check-in', training: 'dawnage-dev:///plans', workout: 'dawnage-dev:///logger' };
let events: string[];
let snapshots: unknown[];
let live: Map<string, NativeActivity>;
let listeners: Set<(state: AppStateStatus) => void>;
let subscriptions: number;
let makeActivity: (id: string) => NativeActivity;
const originalState = AppState.currentState;
async function flush() { await act(async () => { for (let index = 0; index < 30; index++) await Promise.resolve(); }); }
beforeEach(() => {
  mockUser = null; events = []; snapshots = []; live = new Map(); listeners = new Set(); subscriptions = 0;
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    subscriptions++;
    listeners.add(listener);
    return { remove: () => { listeners.delete(listener); } };
  });
  let sequence = 0;
  makeActivity = (id) => ({ getId: () => id, update: async (props) => { events.push(`update:${id}`); snapshots.push(props); }, end: async () => { events.push(`end:${id}`); live.delete(id); } });
  const adapter: NativeSurfaceAdapter = {
    initialize: (props) => { events.push('widgets'); snapshots.push(props); },
    getInstances: () => [...live.values()],
    start: (props) => { const id = String(++sequence); const activity = makeActivity(id); live.set(id, activity); events.push(`start:${id}`); snapshots.push(props); return activity; },
  };
  mockController = new NativeSurfaceController(async () => adapter, () => links);
});
afterEach(async () => { await mockController.setAccount(null); jest.restoreAllMocks(); Object.defineProperty(AppState, 'currentState', { value: originalState, configurable: true }); });
function Editor() { useWorkoutActivity({ userId: mockUser?.id ?? '', date: '2026-09-25', eligible: Boolean(mockUser), exerciseIndex: 0, exercises: [{ sets: [{ completed: true }, { completed: false }] }] }); return null; }

it('initializes generic signed-out shortcuts and clears cold orphans, then clears an authenticated activity on sign-out', async () => {
  live.set('orphan', makeActivity('orphan'));
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<><NativeSurfaceBootstrap /><Editor /></>); }); await flush();
  expect(events).toEqual(['widgets', 'end:orphan']);
  expect(snapshots).toEqual([links]);
  mockUser = { id: 'fictional-account' };
  await act(async () => { view.update(<><NativeSurfaceBootstrap /><Editor /></>); }); await flush();
  expect([...live.keys()]).toEqual(['1']);
  mockUser = null;
  await act(async () => { view.update(<><NativeSurfaceBootstrap /><Editor /></>); }); await flush();
  expect(live.size).toBe(0); expect(events).toEqual(['widgets', 'end:orphan', 'start:1', 'end:1']);
  await act(async () => { view.unmount(); }); await flush(); expect(listeners.size).toBe(0);
});

it('survives StrictMode effect replay with one subscription, one snapshot initialization and one activity', async () => {
  mockUser = { id: 'fictional-account' };
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<StrictMode><NativeSurfaceBootstrap /><Editor /></StrictMode>); }); await flush();
  expect(subscriptions).toBeGreaterThanOrEqual(2);
  expect(listeners.size).toBe(1);
  expect(events).toEqual(['widgets', 'start:1']);
  expect(live.size).toBe(1);
  await act(async () => { view.unmount(); }); await flush();
  expect(listeners.size).toBe(0); expect(live.size).toBe(0); expect(events).toEqual(['widgets', 'start:1', 'end:1']);
});

it('reconciles once on real foreground transitions and ignores repeated active events', async () => {
  mockUser = { id: 'fictional-account' };
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<><NativeSurfaceBootstrap /><Editor /></>); }); await flush();
  const emit = async (state: AppStateStatus) => { await act(async () => { listeners.forEach((listener) => listener(state)); }); await flush(); };
  await emit('active'); await emit('active');
  expect(events).toEqual(['widgets', 'start:1']);
  await emit('background'); live.set('orphan', makeActivity('orphan'));
  await emit('active'); await emit('active');
  expect(events).toEqual(['widgets', 'start:1', 'end:orphan', 'update:1']);
  live.delete('1'); await emit('inactive'); await emit('active'); await emit('active');
  expect(live.size).toBe(0);
  expect(events.filter((event) => event.startsWith('start:'))).toEqual(['start:1']);
  await act(async () => { view.unmount(); }); await flush();
});

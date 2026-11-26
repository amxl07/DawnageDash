import { act, create } from 'react-test-renderer';
import { RestTimerProvider, useRestTimerActions, useRestTimerClock, type RestTimerActions, type RestTimerClock } from '@/components/logger/useRestTimer';
import { NativeWorkoutRestBridge, useWorkoutActivity } from './hooks';
import { nativeSurfaceController } from './service';

const mockPayloads: Record<string, unknown>[] = [];
const mockEvents: string[] = [];
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('expo-router/react-navigation', () => {
  const React = jest.requireActual('react');
  const Focus = React.createContext(true);
  return { useIsFocused: () => React.useContext(Focus), FocusProvider: Focus.Provider };
});
const FocusProvider = jest.requireMock('expo-router/react-navigation').FocusProvider;
jest.mock('./service', () => {
  const { NativeSurfaceController } = jest.requireActual('./controller');
  let active: any = null;
  return { nativeSurfaceController: new NativeSurfaceController(async () => ({
    initialize: () => {}, getInstances: () => active ? [active] : [],
    start: (props: any) => { mockEvents.push('start'); mockPayloads.push(props); active = { getId: () => 'fixture', update: async (value: any) => { mockPayloads.push(value); }, end: async () => { mockEvents.push('end'); active = null; } }; return active; },
  }), () => ({ checkIn: 'dawnage-dev:///daily-check-in', training: 'dawnage-dev:///plans', workout: 'dawnage-dev:///logger' })) };
});

beforeEach(async () => { jest.useFakeTimers(); jest.setSystemTime(1_000); await nativeSurfaceController.setAccount(null); await nativeSurfaceController.setAccount('fixture-account'); mockPayloads.length = 0; mockEvents.length = 0; });
afterEach(async () => { await nativeSurfaceController.setAccount(null); jest.useRealTimers(); });
const exercises = [{ sets: [{ completed: true }, { completed: false }] }];
async function flush() { await act(async () => { for (let index = 0; index < 20; index++) await Promise.resolve(); }); }

it('keeps rest timestamps stable through display ticks, then updates after logger unmount', async () => {
  let controls!: RestTimerActions; let clock!: RestTimerClock; let clockRenders = 0;
  function Dock() { controls = useRestTimerActions(); clock = useRestTimerClock(); clockRenders++; return null; }
  function Editor() { useWorkoutActivity({ userId: 'fixture-account', date: '2026-09-25', eligible: true, exerciseIndex: 0, exercises }); return null; }
  function Shell({ show }: { show: boolean }) { return <RestTimerProvider userId="fixture-account"><NativeWorkoutRestBridge userId="fixture-account" /><Dock />{show ? <Editor /> : null}</RestTimerProvider>; }
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<Shell show />); }); await flush();
  await act(async () => { controls.start(90); }); await flush();
  expect(clock.endsAt).toBe(91_000);
  const initialClock = clock; const updates = mockPayloads.length; const renders = clockRenders;
  await act(async () => { jest.advanceTimersByTime(3_000); }); await flush();
  expect(clock).toBe(initialClock); expect(clockRenders).toBe(renders); expect(mockPayloads).toHaveLength(updates);
  await act(async () => { view.update(<Shell show={false} />); controls.toggle(); }); await flush();
  expect(mockEvents).toEqual(['start']);
  expect(mockPayloads.at(-1)).toMatchObject({ restEndsAt: null, pausedRemainingMs: 87_000 });
  await act(async () => { controls.extend(30); }); await flush();
  expect(mockPayloads.at(-1)).toMatchObject({ restEndsAt: null, pausedRemainingMs: 117_000 });
  await act(async () => { controls.toggle(); }); await flush();
  expect(mockPayloads.at(-1)).toMatchObject({ restEndsAt: 121_000, pausedRemainingMs: null });
  await act(async () => { view.unmount(); });
});

it('ends on explicit finish and resumes only when editing is explicitly resumed', async () => {
  let activity!: ReturnType<typeof useWorkoutActivity>;
  function Editor() { activity = useWorkoutActivity({ userId: 'fixture-account', date: '2026-09-25', eligible: true, exerciseIndex: 0, exercises }); return null; }
  let view!: ReturnType<typeof create>; await act(async () => { view = create(<Editor />); }); await flush();
  await act(async () => { activity.end(); }); await flush();
  expect(mockEvents).toEqual(['start', 'end']);
  await act(async () => { view.update(<Editor />); }); await flush();
  expect(mockEvents).toEqual(['start', 'end']);
  await act(async () => { activity.resume(); }); await flush();
  expect(mockEvents).toEqual(['start', 'end', 'start']);
  await act(async () => { view.unmount(); });
});

it('never creates an activity for past or saved log editing', async () => {
  function Editor() { useWorkoutActivity({ userId: 'fixture-account', date: '2026-09-24', eligible: false, exerciseIndex: 0, exercises }); return null; }
  let view!: ReturnType<typeof create>; await act(async () => { view = create(<Editor />); }); await flush();
  expect(mockEvents).toEqual([]); await act(async () => { view.unmount(); });
});

it('reclaims and publishes a retained logger on focus return without letting covered editors take ownership', async () => {
  const controls: Record<string, ReturnType<typeof useWorkoutActivity>> = {};
  function Editor({ name, completed }: { name: string; completed: number }) {
    controls[name] = useWorkoutActivity({ userId: 'fixture-account', date: '2026-09-25', eligible: true, exerciseIndex: 0, exercises: [{ sets: Array.from({ length: 3 }, (_, index) => ({ completed: index < completed })) }] });
    return null;
  }
  function Stack({ focus, originalCount = 1, newerCount = 2 }: { focus: 'original' | 'newer' | null; originalCount?: number; newerCount?: number }) {
    return <><FocusProvider value={focus === 'original'}><Editor name="original" completed={originalCount} /></FocusProvider><FocusProvider value={focus === 'newer'}><Editor name="newer" completed={newerCount} /></FocusProvider></>;
  }
  let view!: ReturnType<typeof create>;
  await act(async () => { view = create(<Stack focus="original" />); }); await flush();
  expect(mockPayloads.at(-1)).toMatchObject({ completedSets: 1 });
  await act(async () => { view.update(<Stack focus={null} />); }); await flush();
  expect(mockEvents).toEqual(['start']);
  await act(async () => { view.update(<Stack focus="newer" />); }); await flush();
  expect(mockPayloads.at(-1)).toMatchObject({ completedSets: 2 });
  const count = mockPayloads.length;
  await act(async () => { view.update(<Stack focus="newer" originalCount={3} />); }); await flush();
  expect(mockPayloads).toHaveLength(count);
  await act(async () => { view.update(<Stack focus="original" originalCount={3} />); }); await flush();
  expect(mockPayloads.at(-1)).toMatchObject({ completedSets: 3 });
  await act(async () => { view.update(<Stack focus="original" originalCount={3} newerCount={0} />); controls.newer.end(); }); await flush();
  expect(mockEvents).toEqual(['start']);
  await act(async () => { controls.original.end(); }); await flush();
  expect(mockEvents).toEqual(['start', 'end']);
  await act(async () => { view.unmount(); });
});

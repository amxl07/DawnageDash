/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { act, fireEvent, render } from '@testing-library/react-native';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useWorkoutSession } from '@/features/workout/useWorkoutSession';
import { initialWorkoutState } from '@/features/workout/workoutReducer';
import { applyWorkoutEdit } from '@/features/workout/workoutSave';
import LoggerScreen from '../../../app/(app)/logger';
const mockRestStart = jest.fn();
const mockRestReset = jest.fn();
let mockRestPreference = { autoStart: false, seconds: null as number | null };
let mockPreviousData: any;
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn(), useIsFocused: () => true }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mockPreviousData }), useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(), useNavigation: jest.fn(), useRouter: jest.fn() }));
jest.mock('lucide-react-native', () => ({ Check: () => null, ChevronDown: () => null, ChevronLeft: () => null, ChevronRight: () => null, X: () => null }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
jest.mock('@/features/workout/useWorkoutSession', () => ({ useWorkoutSession: jest.fn() }));
jest.mock('@/components/logger/useRestTimer', () => ({ useRestTimerActions: () => ({ start: mockRestStart, reset: mockRestReset }) }));
jest.mock('@/components/logger/RestDock', () => ({ RestDock: () => null, WorkoutRestFooter: ({ children }: any) => { const { View } = require('react-native'); return <View testID="workout-rest-footer">{children}</View>; }, useRestPreference: () => ({ preference: mockRestPreference, change: jest.fn() }) }));
jest.mock('@/components/logger/PlanDayButton', () => ({ PlanDayButton: () => null }));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: any) => children }));
jest.mock('@/components/logger/ExerciseSlide', () => ({ ExerciseSlide: ({ exercise, onUpdateSet, onCompleteSet, onContinue, continueLabel }: any) => { const { Pressable, Text, View } = require('react-native'); const complete = exercise.sets.length > 0 && exercise.sets.every((set: any) => set.completed); return <View><Text>{exercise.name}</Text>{!complete && exercise.sets[0] ? <><Pressable accessibilityRole="button" accessibilityLabel="Complete set" onPress={() => onCompleteSet(exercise.sets[0].id, {})}><Text>Complete set</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Clear and complete rapidly" onPress={() => { onUpdateSet(exercise.sets[0].id, 'reps', ''); onCompleteSet(exercise.sets[0].id, {}); }}><Text>Clear and complete rapidly</Text></Pressable></> : null}{complete && onContinue ? <Pressable accessibilityRole="button" accessibilityLabel={continueLabel} onPress={onContinue}><Text>{continueLabel}</Text></Pressable> : null}</View>; } }));
jest.mock('@/components/logger/SwipeableSlide', () => ({ SwipeableSlide: require('react-native').View }));
jest.mock('@/components/logger/WorkoutSummary', () => ({ WorkoutSummary: ({ onSave, onEdit }: any) => { const { Pressable, Text } = require('react-native'); return <><Pressable accessibilityRole="button" accessibilityLabel="Save workout" onPress={onSave}><Text>Review workout</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Return to editing" onPress={onEdit} /></>; } }));
jest.mock('@/components/ui', () => {
  const { View, Pressable, Text, TextInput } = require('react-native');
  return { Screen: View, Text, Card: View, RecordStatus: () => null, SkeletonCard: () => null, SheetScrollView: View,
    Sheet: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    Input: ({ label, ...props }: any) => <TextInput accessibilityLabel={label} {...props} />,
    Button: ({ label, onPress, ...props }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...props}><Text>{label}</Text></Pressable>,
    StickyActionBar: ({ onPrimary, primaryLabel }: any) => <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={onPrimary}><Text>{primaryLabel}</Text></Pressable>,
  };
});
jest.mock('@/theme', () => ({ spacing: {}, radius: {}, HIT_SLOP_MIN: 44, iconSize: {}, useTheme: () => ({ colors: {} }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/outbox', () => ({ flushOutbox: jest.fn(), readOutbox: jest.fn() }));
let session: any;
beforeEach(() => {
  jest.clearAllMocks();
  mockPreviousData = { byName: {}, names: [] };
  mockRestPreference = { autoStart: false, seconds: null };
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-15' });
  jest.mocked(useRouter).mockReturnValue({ back: jest.fn(), replace: jest.fn(), setParams: jest.fn() } as never);
  jest.mocked(useNavigation).mockReturnValue({ dispatch: jest.fn() } as never);
  session = { state: { ...initialWorkoutState, title: 'Draft', isDirty: true }, scope: { userId: 'u', date: '2026-09-15', logId: null }, entry: { kind: 'ready', source: 'draft' }, deliveryState: 'idle', draftState: 'saved', edit: jest.fn(() => true), save: jest.fn(async () => 'synced'), flushDraft: jest.fn(async () => false), discardDraft: jest.fn(async () => false), plan: null };
  jest.mocked(useWorkoutSession).mockImplementation(() => session);
});
it('rejects malformed and future route dates before mounting an editor', async () => {
  for (const date of ['not-a-date', '2026-02-30', '2999-01-01']) {
    jest.mocked(useLocalSearchParams).mockReturnValue({ date });
    const view = await render(<LoggerScreen />);
    expect(view.getByText('This workout date is unavailable')).toBeTruthy();
    await view.unmount();
  }
  expect(useWorkoutSession).not.toHaveBeenCalled();
});
const workoutExercise = (id: string, name: string, completed: boolean) => ({
  id, name, tracking: 'weight-reps' as const,
  sets: [{ id: `${id}-set-1`, weight: '50', reps: '8', rpe: '', duration: '', kind: 'work' as const, completed }],
});

it('auto-starts rest silently for the stable set completed by the user', async () => {
  mockRestPreference = { autoStart: true, seconds: 90 };
  session.state = { ...session.state, exercises: [workoutExercise('a', 'Squat', false)] };
  const view = await render(<LoggerScreen />);

  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));

  expect(session.edit).toHaveBeenCalledWith({ type: 'COMPLETE_SET', payload: { exerciseIndex: 0, setIndex: 0, suggestion: {} } });
  expect(mockRestStart).toHaveBeenCalledWith(90, { haptic: false });
});

it('does not start rest for a stale completion rejected by the latest cleared state, then accepts one corrected retry', async () => {
  mockRestPreference = { autoStart: true, seconds: 90 };
  session.state = { ...session.state, exercises: [workoutExercise('a', 'Squat', false)] };
  let snapshot = { generation: 0, state: session.state };
  session.edit = jest.fn((action) => {
    const next = applyWorkoutEdit(snapshot, action);
    const accepted = next !== snapshot;
    snapshot = next;
    session.state = next.state;
    return accepted;
  });
  const view = await render(<LoggerScreen />);

  await fireEvent.press(view.getByRole('button', { name: 'Clear and complete rapidly' }));
  expect(snapshot.state.exercises[0].sets[0]).toMatchObject({ reps: '', completed: false });
  expect(mockRestStart).not.toHaveBeenCalled();

  await act(() => { session.edit({ type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: 0, field: 'reps', value: '8' } }); });
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));
  expect(snapshot.state.exercises[0].sets[0].completed).toBe(true);
  expect(mockRestStart).toHaveBeenCalledTimes(1);
});

it('continues to the next unfinished exercise after the current one', async () => {
  session.state = { ...session.state, exercises: [workoutExercise('a', 'Squat', true), workoutExercise('b', 'Bench', true), workoutExercise('c', 'Row', false)] };
  const view = await render(<LoggerScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Continue to Row' }));
  expect(view.getByText('Row')).toBeTruthy();
  expect(view.getByText('EXERCISE 3 OF 3')).toBeTruthy();
});
it('wraps to an earlier unfinished exercise after scanning later entries', async () => {
  session.state = { ...session.state, exercises: [workoutExercise('a', 'Squat', false), workoutExercise('b', 'Bench', true), workoutExercise('c', 'Row', true)] };
  const view = await render(<LoggerScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Next exercise' }));
  await fireEvent.press(view.getByRole('button', { name: 'Next exercise' }));
  await fireEvent.press(view.getByRole('button', { name: 'Continue to Squat' }));
  expect(view.getByText('Squat')).toBeTruthy();
  expect(view.getByText('EXERCISE 1 OF 3')).toBeTruthy();
});
it('opens final review from exercise completion before calling persistence', async () => {
  session.state = { ...session.state, exercises: [workoutExercise('a', 'Squat', true)] };
  const view = await render(<LoggerScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Review workout' }));
  expect(session.save).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Save workout' }));
  expect(session.save).toHaveBeenCalledTimes(1);
});
it('keeps Add exercise in Overview and exposes partial-workout review from the logger', async () => {
  session.state = { ...session.state, exercises: [workoutExercise('a', 'Squat', false)] };
  const view = await render(<LoggerScreen />);
  expect(view.getByTestId('workout-rest-footer')).toBeTruthy();
  expect(view.queryByLabelText('Exercise name')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Finish workout' }));
  expect(session.save).not.toHaveBeenCalled();
  expect(view.getByRole('button', { name: 'Save workout' })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Return to editing' }));
  await fireEvent.press(view.getByTestId('workout-overview'));
  const exerciseName = view.getByTestId('workout-exercise-name');
  expect(exerciseName.props.sheetAware).toBe(true);
  expect(exerciseName.props.value).toBe('');
  expect(view.getByTestId('workout-overview-scroll').props.keyboardShouldPersistTaps).toBe('handled');
  await fireEvent.changeText(exerciseName, 'Cable fly');
  expect(view.getByTestId('workout-exercise-name').props.value).toBe('Cable fly');
  await fireEvent.press(view.getByTestId('workout-add-exercise'));
  expect(session.edit).toHaveBeenCalledWith({ type: 'ADD_EXERCISE', payload: { name: 'Cable fly' } });
  await fireEvent.press(view.getByTestId('workout-overview'));
  await fireEvent.press(view.getByTestId('logger-finish'));
  expect(session.save).not.toHaveBeenCalled();
  expect(view.getByRole('button', { name: 'Save workout' })).toBeTruthy();
});
it('opens Overview from the clear empty-session action', async () => {
  const view = await render(<LoggerScreen />);
  expect(view.queryByLabelText('Exercise name')).toBeNull();
  await fireEvent.press(view.getByTestId('workout-empty-add'));
  expect(view.getByTestId('workout-exercise-name')).toBeTruthy();
});
it('offers exercise names from the available plan and recent workout history', async () => {
  session.plan = { days: [{ day_number: 1, exercises: [{ id: 'bench', name: 'Bench Press', sets: 3, reps: '8', warmupSets: 0, substitutions: [] }] }] };
  mockPreviousData = { byName: {}, names: ['Cable Row'] };
  const view = await render(<LoggerScreen />);
  await fireEvent.press(view.getByTestId('workout-empty-add'));
  expect(view.getByRole('button', { name: 'Add Bench Press from suggestions' })).toBeTruthy();
  expect(view.getByRole('button', { name: 'Add Cable Row from suggestions' })).toBeTruthy();
});
it('keeps session details available without placing title editing ahead of each set', async () => {
  const view = await render(<LoggerScreen />);
  expect(view.queryByLabelText('Workout title')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Edit session details. Draft' }));
  await fireEvent.changeText(view.getByLabelText('Workout title'), 'Evening session');
  expect(session.edit).toHaveBeenCalledWith({ type: 'SET_TITLE', payload: 'Evening session' });
  await fireEvent.press(view.getByRole('button', { name: 'Edit session details. Draft' }));
  expect(view.queryByLabelText('Workout title')).toBeNull();
  expect(view.queryByRole('button', { name: 'Finish workout' })).toBeNull();
});
it('keeps an unfinished Overview exercise name in the draft-and-exit guard', async () => {
  session.state = { ...session.state, isDirty: false };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = await render(<LoggerScreen />);
  await fireEvent.press(view.getByTestId('workout-overview'));
  await fireEvent.changeText(view.getByTestId('workout-exercise-name'), 'Cable fly');
  const call = jest.mocked(usePreventRemove).mock.calls.at(-1)!;
  expect(call[0]).toBe(true);
  await act(() => call[1]({ data: { action: { type: 'GO_BACK' } } } as never));
  const buttons = alert.mock.calls.at(-1)![2]!;
  await act(async () => { await buttons.find((button) => button.text === 'Save draft & exit')!.onPress?.(); });
  expect(session.edit).toHaveBeenCalledWith({ type: 'ADD_EXERCISE', payload: { name: 'Cable fly' } });
  expect(session.flushDraft).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});
it('keeps native or programmatic navigation blocked when draft flush fails', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<LoggerScreen />);
  const call = jest.mocked(usePreventRemove).mock.calls.at(-1)!;
  expect(call[0]).toBe(true);
  await act(() => call[1]({ data: { action: { type: 'GO_BACK' } } } as never));
  const buttons = alert.mock.calls.at(-1)![2]!;
  await act(async () => { await buttons.find((button) => button.text === 'Save draft & exit')!.onPress?.(); });
  expect(session.flushDraft).toHaveBeenCalledTimes(1);
  expect(useNavigation().dispatch).not.toHaveBeenCalled();
  alert.mockRestore();
});

it('keeps plain-text history outside editable and finish controls', async () => {
  session.legacyText = 'Original historical note';
  const view = await render(<LoggerScreen />);
  expect(view.getByText('Original historical note')).toBeTruthy();
  expect(view.queryByLabelText('Workout title')).toBeNull();
  expect(view.queryByRole('button', { name: 'Finish workout' })).toBeNull();
});
it('routes a deliberate recovery choice with its canonical outbox identity', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-15', outboxId: 'source' });
  session.entry = { kind: 'choose-log', ids: ['a', 'b'] };
  session.records = [{ id: 'a', title: 'Workout A' }, { id: 'b', title: 'Workout B' }];
  session.selectLog = jest.fn(async () => ({ logId: 'b', outboxId: 'canonical' }));
  const view = await render(<LoggerScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Workout B' }));
  expect(session.selectLog).toHaveBeenCalledWith('b');
  expect(useRouter().setParams).toHaveBeenCalledWith({ logId: 'b', outboxId: 'canonical' });
});

it.each(['source', 'canonical'])('shows an ordered recovery action from the %s Logs route', async (outboxId) => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-09-15', outboxId, ...(outboxId === 'canonical' ? { logId: 'a' } : {}) });
  session.entry = { kind: 'choose-log', ids: ['a'] };
  session.recovery = { versions: [{ id: 'source', title: 'Earlier version', content: '[]' }, { id: 'canonical', title: 'Later version', content: '[]' }], targets: [{ id: 'a', title: 'Workout A' }], canRetry: true };
  session.recoverSavedVersions = jest.fn(async () => ({ logId: 'a' }));
  const view = await render(<LoggerScreen />);
  expect(view.getByText('Earlier version')).toBeTruthy();
  expect(view.getByText('Later version')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Retry saved versions' }));
  expect(session.recoverSavedVersions).toHaveBeenCalledWith('a');
  expect(useRouter().setParams).toHaveBeenCalledWith({ logId: 'a', outboxId: '' });
});

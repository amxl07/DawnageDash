/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import CheckInScreen from '../../../app/(app)/daily-check-in';
import { EMPTY_FORM, toPayload } from './model';

const valid = { ...EMPTY_FORM, morningWeight: 72.4, calorieIntake: 1800, waterLiters: 2.5, dailySteps: 8000, protein: 140, carbs: 220, fats: 60, notes: 'Rest day; felt recovered.', sleepHours: 7, energyLevel: 5, stressLevel: 4, hungerLevel: 3, digestion: 'none' as const, workoutStatus: 'rest_day' as const, nutritionScore: 6 };
const REVIEW_STEP = 3;
let mockRows: any[] | undefined = [];
let mockQueryError = false;
let mockQueue: any[] = [];
let mockParams: Record<string, string> = { date: '2026-09-14' };
let mockDraft: any;
let mockDeliveryListener: ((event: any) => void) | undefined;
const mockSave = jest.fn();
const mockNow = jest.fn(async (..._args: any[]) => true);
const mockClear = jest.fn(async () => true);
const mockLoad = jest.fn(async (_date: string) => mockDraft);
const mockSaveDraft = jest.fn();
const mockRefetch = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockBack = jest.fn();
const mockRouter = { canGoBack: () => true, back: mockBack, replace: jest.fn(), navigate: mockNavigate, setParams: mockSetParams };
const mockReadQueue = jest.fn(async () => mockQueue);

jest.mock('lucide-react-native', () => ({ Check: () => null, Clock3: () => null, CircleAlert: () => null, ClipboardCheck: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('expo-router/react-navigation', () => ({ useNavigation: () => ({ dispatch: jest.fn() }), usePreventRemove: () => {}, useFocusEffect: (callback: () => void) => { require('react').useEffect(callback, [callback]); } }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
jest.mock('@/hooks/usePlans', () => ({ useUserProfile: () => ({ data: { package_start_date: '2026-09-01' }, isError: false }), useWorkoutPlan: () => ({ data: { source: 'none', days: [] } }) }));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: mockRows, isLoading: false, isError: mockQueryError, refetch: mockRefetch }) }));
jest.mock('@/hooks/useCheckInMutation', () => ({ useCheckInMutation: () => ({ mutateAsync: mockSave }), findPreviousCheckIn: () => ({ date: '2026-09-13', morning_weight: 70.6, calorie_intake: 2000 }) }));
jest.mock('@/hooks/useCheckInDraft', () => ({ clearCheckInDraftIfUnchanged: jest.fn(async () => true), useCheckInDraft: (_user: string, date: string) => require('react').useMemo(() => ({ loadDraft: () => mockLoad(date), saveDraft: mockSaveDraft, saveDraftNow: mockNow, clearDraft: mockClear, draftStatus: 'saved' }), [date]) }));
jest.mock('./checkInOutbox', () => ({
  readCheckInOutbox: () => mockReadQueue(),
  subscribeCheckInDelivery: (listener: (event: any) => void) => { mockDeliveryListener = listener; return () => { if (mockDeliveryListener === listener) mockDeliveryListener = undefined; }; },
}));
jest.mock('@/features/home/useHomeDate', () => ({ useHomeDate: () => require('@/lib/dates').localDateString() }));
jest.mock('@/features/home/useHomeLocal', () => ({ useHomeLocal: () => ({ data: undefined, isError: false }) }));
jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => ({ height: 850, fontScale: 1 }) }));
jest.mock('@/components/checkin/CheckInStageHeader', () => ({ CheckInStageHeader: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: any) => children }));
jest.mock('./components/HistoryCaption', () => ({ HistoryCaption: () => null }));
jest.mock('@/lib/dates', () => ({ ...jest.requireActual('@/lib/dates'), localDateString: (date?: Date) => date ? jest.requireActual('@/lib/dates').localDateString(date) : '2026-09-16' }));
jest.mock('react-native-gesture-handler', () => ({ Gesture: { Pan: () => { const chain: any = {}; for (const key of ['enabled', 'activeOffsetX', 'failOffsetY', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) chain[key] = () => chain; return chain; } }, GestureDetector: ({ children }: any) => children }));
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (callback: any, ...args: any[]) => callback(...args) }));
jest.mock('react-native-reanimated', () => ({ __esModule: true, default: { View: require('react-native').View }, useAnimatedStyle: (fn: () => any) => fn(), useSharedValue: (initial: number) => { const ref = require('react').useRef(null); if (!ref.current) { let value = initial; ref.current = { get: () => value, set: (next: number) => { value = next; } }; } return ref.current; } }));
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 }, HIT_SLOP_MIN: 44, radius: { md: 8, pill: 999 }, type: { metric: {} }, tabularNums: {}, useTheme: () => ({ colors: {} }), useMotion: () => ({ enabled: false }) }));
jest.mock('@/components/ui', () => {
  const React = require('react'); const { Text, View, Pressable, TextInput } = require('react-native');
  const Button = ({ label, onPress, testID, disabled }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID} disabled={disabled}><Text>{label}</Text></Pressable>;
  return { Text, Button, Input: React.forwardRef(function MockInput({ label, error, ...props }: any, ref: any) { return <View><TextInput ref={ref} accessibilityLabel={label} {...props} />{error ? <Text>{error}</Text> : null}</View>; }), Card: View, Screen: React.forwardRef(function MockScreen({ children }: any, _ref: unknown) { return <View>{children}</View>; }), ErrorState: ({ title, message, onRetry }: any) => <View><Text>{title}</Text><Text>{message}</Text><Button label="Retry" onPress={onRetry} /></View>, SkeletonCard: () => <Text>Loading</Text>, RecordStatus: ({ value }: any) => <Text>{value}</Text>, StickyActionBar: ({ primaryLabel, onPrimary, primaryTestID }: any) => <Button testID={primaryTestID} label={primaryLabel} onPress={onPrimary} />, Sheet: ({ visible, children }: any) => visible ? <View>{children}</View> : null, SheetScrollView: View, SheetFlatList: ({ data, renderItem }: any) => <View>{data.map((item: any) => <View key={item.dateString}>{renderItem({ item })}</View>)}</View> };
});
jest.mock('@/components/checkin/CheckInForm', () => {
  const { NumericEntry } = require('./components/NumericEntry');
  const { PreviousValueButton } = require('./components/PreviousValueButton');
  return { CheckInForm: ({ form, setForm }: any) => <><NumericEntry label="Calories" value={form.calorieIntake} onChange={(value: number | null) => setForm((prev: any) => ({ ...prev, calorieIntake: value }))} min={0} max={20000} precision={0}><PreviousValueButton label="Calories" value={2000} currentValue={form.calorieIntake} date="2026-09-13" onApply={(value: number) => setForm((prev: any) => ({ ...prev, calorieIntake: value }))} onRestore={(value: number | null) => setForm((prev: any) => ({ ...prev, calorieIntake: value }))} /></NumericEntry><NumericEntry label="Morning weight" value={form.morningWeight} onChange={(value: number | null) => setForm((prev: any) => ({ ...prev, morningWeight: value }))} min={20} max={400} precision={1} unit="kg"><PreviousValueButton label="Morning weight" value={70.6} currentValue={form.morningWeight} date="2026-09-13" onApply={(value: number) => setForm((prev: any) => ({ ...prev, morningWeight: value }))} onRestore={(value: number | null) => setForm((prev: any) => ({ ...prev, morningWeight: value }))} /></NumericEntry></> };
});
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
type Screen = Awaited<ReturnType<typeof render>>;
async function typeNumber(screen: Screen, label: string, text: string) {
  const input = screen.getByLabelText(label);
  await fireEvent(input, 'focus'); await fireEvent.changeText(input, text);
}
function queued(date: string, blocked = false) { return { id: date, userId: 'u', payload: toPayload(valid, date), queuedAt: Date.now(), ...(blocked ? { failure: { kind: 'permission', retryable: false, code: '42501' } } : {}) }; }
beforeEach(() => { jest.clearAllMocks(); mockDeliveryListener = undefined; mockParams = { date: '2026-09-14' }; mockRows = []; mockQueryError = false; mockQueue = []; mockDraft = { form: valid, step: REVIEW_STEP, savedAt: Date.now() }; mockLoad.mockImplementation(async () => mockDraft); mockSave.mockResolvedValue({ status: 'synced', updated: false }); mockNow.mockResolvedValue(true); mockClear.mockResolvedValue(true); });

it.each([['Calories', '2345', 'calorie_intake', 2345], ['Morning weight', '75.4', 'morning_weight', 75.4]] as const)('preserves %s typed after Submit and persists its newer valid snapshot', async (label, text, key, expected) => {
  const saved = deferred<any>(); mockSave.mockReturnValueOnce(saved.promise);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories');
  await fireEvent.press(screen.getByTestId('checkin-save')); await typeNumber(screen, label, text);
  await act(async () => { saved.resolve({ status: 'synced', updated: false }); });
  await waitFor(() => expect(mockNow).toHaveBeenLastCalledWith(expect.objectContaining({ [key === 'calorie_intake' ? 'calorieIntake' : 'morningWeight']: expected }), REVIEW_STEP));
  expect(screen.queryByTestId('checkin-receipt')).toBeNull();
  expect(screen.getByLabelText(label).props.value).toBe(text);
  expect(mockClear).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('checkin-save'));
  await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: expected })));
  await screen.findByTestId('checkin-receipt');
});

it.each(['Calories', 'Morning weight'])('keeps invalid %s text through draft cleanup and reports it as unsaved', async (label) => {
  const cleared = deferred<boolean>(); mockClear.mockReturnValueOnce(cleared.promise);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories');
  await fireEvent.press(screen.getByTestId('checkin-save')); await waitFor(() => expect(mockClear).toHaveBeenCalled());
  await typeNumber(screen, label, 'bad');
  await act(async () => { cleared.resolve(true); });
  expect(screen.queryByTestId('checkin-receipt')).toBeNull();
  expect(screen.getByLabelText(label).props.value).toBe('bad');
  expect(screen.getByText('Unsaved entry')).toBeTruthy();
});

it.each(['Calories', 'Morning weight'])('keeps %s editing open when a queued receipt syncs in the background', async (label) => {
  mockDraft = null; mockQueue = [queued('2026-09-14')];
  const screen = await render(<CheckInScreen />); await screen.findByTestId('checkin-receipt');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit this record' })); await typeNumber(screen, label, label === 'Calories' ? '2345' : '75.4');
  mockQueue = []; mockRows = [{ ...toPayload(valid, '2026-09-14'), id: 'row', user_id: 'u' }];
  await screen.rerender(<CheckInScreen />);
  expect(screen.getByText('Unsaved entry')).toBeTruthy();
  expect(screen.queryByTestId('checkin-receipt')).toBeNull();
  expect(screen.getByLabelText(label).props.value).toBe(label === 'Calories' ? '2345' : '75.4');
  await fireEvent(screen.getByLabelText(label), 'blur');
  await waitFor(() => expect(screen.getByText(/Editing a new draft · previous version saved/)).toBeTruthy());
});

it('does not close an explicitly reopened editor on a receipt-only refresh', async () => {
  mockDraft = null; mockRows = [{ ...toPayload(valid, '2026-09-14'), id: 'row', user_id: 'u' }];
  const screen = await render(<CheckInScreen />); await screen.findByTestId('checkin-receipt');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit this record' }));
  mockRows = [...mockRows!]; await screen.rerender(<CheckInScreen />);
  expect(screen.queryByTestId('checkin-receipt')).toBeNull(); expect(screen.getByLabelText('Calories')).toBeTruthy();
});

it.each([['Calories', '2150', 'calorie_intake', 2000, 2150], ['Morning weight', '75.4', 'morning_weight', 70.6, 75.4]] as const)('reconciles focused %s text before Copy and captures the visible value for Undo', async (label, text, key, copied, restored) => {
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await typeNumber(screen, label, text);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`Use previous ${label} value`) }));
  await fireEvent.press(screen.getByRole('button', { name: `Undo copied ${label}` }));
  await fireEvent.press(screen.getByTestId('checkin-save'));
  await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: restored })));
  expect(copied).not.toBe(restored);
});
it.each([['Calories', '2150', 'calorie_intake', 2000], ['Morning weight', '75.4', 'morning_weight', 70.6]] as const)('submits the explicit copied %s value without a blur', async (label, text, key, expected) => {
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await typeNumber(screen, label, text);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`Use previous ${label} value`) })); await fireEvent.press(screen.getByTestId('checkin-save'));
  await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: expected })));
});

it('rechecks numeric text entered while an exit flush awaits storage', async () => {
  const disk = deferred<boolean>(); mockNow.mockReturnValueOnce(disk.promise);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await typeNumber(screen, 'Calories', '2150');
  await fireEvent.press(screen.getByRole('button', { name: 'Save draft and return Home' })); await typeNumber(screen, 'Calories', 'bad');
  await act(async () => { disk.resolve(true); });
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Retry saving' })).toBeNull();
  await typeNumber(screen, 'Calories', '2345'); await fireEvent.press(screen.getByRole('button', { name: 'Continue leaving' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  expect(mockNow).toHaveBeenLastCalledWith(expect.objectContaining({ calorieIntake: 2345 }), REVIEW_STEP);
});

it('replays an invalid-text date selection only after explicit continuation', async () => {
  mockQueue = [queued('2026-09-10')];
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await typeNumber(screen, 'Calories', 'bad');
  await fireEvent.press(screen.getByRole('button', { name: 'History' }));
  await fireEvent.press(screen.getByRole('button', { name: /10 September.*waiting to sync/ }));
  expect(mockSetParams).not.toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-10' }));
  expect(screen.queryByRole('button', { name: 'Retry saving' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Discard draft' })).toBeNull();
  await typeNumber(screen, 'Calories', '2345');
  await fireEvent(screen.getByLabelText('Calories'), 'blur');
  expect(screen.queryByText('Enter a valid number in the highlighted field.')).toBeNull();
  expect(mockSetParams).not.toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-10' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to selected day' }));
  await waitFor(() => expect(mockSetParams).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-10' })));
});

it('makes first-use queued and blocked backfills selectable without server history', async () => {
  mockQueue = [queued('2026-09-10'), queued('2026-08-01', true)]; mockParams = { date: '2026-09-14', history: '1' };
  const screen = await render(<CheckInScreen />);
  await screen.findByRole('button', { name: /10 September.*waiting to sync/ });
  expect(screen.getByRole('button', { name: /1 August.*needs attention/ }).props.accessibilityState.disabled).toBe(false);
});

it('keeps an acknowledged previous version saved when a newer submission is blocked', async () => {
  mockDraft = null;
  mockRows = [{ ...toPayload(valid, '2026-09-14'), id: 'row', user_id: 'u' }];
  mockSave.mockResolvedValueOnce({ status: 'blocked', failure: { kind: 'permission', retryable: false, code: '42501' } });
  const screen = await render(<CheckInScreen />);
  await screen.findByTestId('checkin-receipt');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit this record' }));
  await typeNumber(screen, 'Calories', '2345');
  await fireEvent(screen.getByLabelText('Calories'), 'blur');
  for (let step = 0; step < REVIEW_STEP; step += 1) await fireEvent.press(screen.getByTestId('checkin-next'));
  await fireEvent.press(screen.getByTestId('checkin-save'));
  await screen.findByRole('button', { name: 'Retry sync' });
  expect(screen.getByLabelText('Calories').props.value).toBe('2345');
  expect(screen.getByText('Editing a new draft · previous version saved')).toBeTruthy();
  expect(screen.queryByText(/previous version couldn’t sync/)).toBeNull();
  expect(screen.getByText(/does not currently have permission/)).toBeTruthy();
});

it.each([['Calories', '2345', 'calorieIntake', 2345], ['Morning weight', '75.4', 'morningWeight', 75.4]] as const)('re-persists valid %s typed during asynchronous cleanup', async (label, text, key, expected) => {
  const cleared = deferred<boolean>(); mockClear.mockReturnValueOnce(cleared.promise);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories');
  await fireEvent.press(screen.getByTestId('checkin-save')); await waitFor(() => expect(mockClear).toHaveBeenCalled());
  await typeNumber(screen, label, text); await act(async () => { cleared.resolve(true); });
  await waitFor(() => expect(mockNow).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: expected }), REVIEW_STEP));
  expect(screen.queryByTestId('checkin-receipt')).toBeNull();
  expect(screen.getByLabelText(label).props.value).toBe(text);
});
it('selects a queued backfill before the first synced record', async () => {
  mockQueue = [queued('2026-08-01')]; mockRows = [{ ...toPayload(valid, '2026-09-13'), id: 'server', user_id: 'u' }];
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await fireEvent.press(screen.getByRole('button', { name: 'History' }));
  await fireEvent.press(screen.getByRole('button', { name: /1 August.*waiting to sync/ }));
  await waitFor(() => expect(mockSetParams).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-01' })));
});
it('replaces a failed date target and never replays it after a later success', async () => {
  mockQueue = [queued('2026-09-10'), queued('2026-08-01')]; mockNow.mockResolvedValueOnce(false);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories');
  await typeNumber(screen, 'Calories', '2150'); await fireEvent.press(screen.getByRole('button', { name: 'History' }));
  await fireEvent.press(screen.getByRole('button', { name: /10 September.*waiting to sync/ }));
  await screen.findByRole('button', { name: 'Retry saving' });
  await fireEvent.press(screen.getByRole('button', { name: 'History' })); await fireEvent.press(screen.getByRole('button', { name: /1 August.*waiting to sync/ }));
  await waitFor(() => expect(mockSetParams).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-01' })));
  mockNow.mockResolvedValueOnce(false); await typeNumber(screen, 'Calories', '2345');
  await fireEvent.press(screen.getByRole('button', { name: 'Save draft and return Home' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  expect(mockSetParams).not.toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-10' }));
});
it('does not apply an older date when another selection supersedes its disk wait', async () => {
  mockQueue = [queued('2026-09-10'), queued('2026-08-01')]; const disk = deferred<boolean>(); mockNow.mockReturnValueOnce(disk.promise);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await typeNumber(screen, 'Calories', '2150');
  await fireEvent.press(screen.getByRole('button', { name: 'History' })); await fireEvent.press(screen.getByRole('button', { name: /10 September.*waiting to sync/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'History' })); await fireEvent.press(screen.getByRole('button', { name: /1 August.*waiting to sync/ }));
  await waitFor(() => expect(mockSetParams).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-01' })));
  await act(async () => { disk.resolve(true); });
  expect(mockSetParams).not.toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-10' }));
});
it('cancels a date blocked by invalid input without discarding the typed text', async () => {
  mockQueue = [queued('2026-09-10')]; const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories');
  await typeNumber(screen, 'Calories', 'bad'); await fireEvent.press(screen.getByRole('button', { name: 'History' }));
  await fireEvent.press(screen.getByRole('button', { name: /10 September.*waiting to sync/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Stay on this day' }));
  expect(screen.getByLabelText('Calories').props.value).toBe('bad');
  expect(screen.queryByRole('button', { name: 'Continue to selected day' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Discard draft' })).toBeNull();
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockSetParams).not.toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-10' }));
});

it('clears a corrected numeric error on commit without presenting storage recovery', async () => {
  const screen = await render(<CheckInScreen />);
  await screen.findByLabelText('Calories');
  await typeNumber(screen, 'Calories', 'bad');
  await fireEvent.press(screen.getByTestId('checkin-save'));
  expect(screen.getByText('Enter a valid number in the highlighted field.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Retry saving' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Discard draft' })).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
  await typeNumber(screen, 'Calories', '2200');
  await fireEvent(screen.getByLabelText('Calories'), 'blur');
  expect(screen.queryByText('Enter a valid number in the highlighted field.')).toBeNull();
  expect(screen.getByLabelText('Calories').props.value).toBe('2200');
  expect(mockSave).not.toHaveBeenCalled();
});


it('opens an acknowledged queued day from first-use offline recovery', async () => {
  mockDraft = null; mockRows = undefined; mockQueryError = true; mockQueue = [queued('2026-08-01')];
  const screen = await render(<CheckInScreen />); await screen.findByText('Your record needs recovery');
  await fireEvent.press(screen.getByRole('button', { name: 'Choose a saved day' }));
  await fireEvent.press(screen.getByRole('button', { name: /1 August.*waiting to sync/ }));
  await screen.findByTestId('checkin-receipt');
  expect(mockSetParams).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-01' }));
  expect(screen.getByText('Saved on this device')).toBeTruthy();
});

it('shows an actionable blocked reconnect outcome without losing the mounted record', async () => {
  mockDraft = null; mockQueue = [queued('2026-09-14')];
  const screen = await render(<CheckInScreen />);
  await screen.findByTestId('checkin-receipt');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit this record' }));
  await typeNumber(screen, 'Calories', '2345');
  await fireEvent(screen.getByLabelText('Calories'), 'blur');
  await screen.findByText('Editing a new draft · previous version waiting to sync');
  mockQueue = [queued('2026-09-14', true)];

  await act(async () => { mockDeliveryListener?.({ userId: 'u', date: '2026-09-14', revision: 1, status: 'blocked', failure: { kind: 'permission', retryable: false, code: '42501' } }); });
  await screen.findByRole('button', { name: 'Retry sync' });
  expect(screen.getByText(/does not currently have permission/)).toBeTruthy();
  expect(screen.getByLabelText('Calories').props.value).toBe('2345');
  expect(screen.getByText('Editing a new draft · previous version couldn’t sync')).toBeTruthy();
  expect(screen.queryByText(/previous version waiting to sync/)).toBeNull();
  await typeNumber(screen, 'Calories', '2400');
  expect(screen.getByText('Unsaved entry')).toBeTruthy();
  expect(screen.queryByText(/Editing a new draft/)).toBeNull();
});

it.each([['Calories', '2345', 'calorieIntake', 2345], ['Morning weight', '75.4', 'morningWeight', 75.4]] as const)('does not discard %s typed after deliberate discard began', async (label, text, key, expected) => {
  const clearing = deferred<boolean>(); mockClear.mockReturnValueOnce(clearing.promise);
  mockNow.mockResolvedValueOnce(false);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories'); await typeNumber(screen, label, label === 'Calories' ? '2150' : '73.5');
  await fireEvent.press(screen.getByRole('button', { name: 'Save draft and return Home' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Discard draft' })); await waitFor(() => expect(mockClear).toHaveBeenCalled());
  await typeNumber(screen, label, text); await act(async () => { clearing.resolve(true); });
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByLabelText(label).props.value).toBe(text);
  expect(screen.getByText('Unsaved entry')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  expect(mockNow).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: expected }), REVIEW_STEP);
});

it('does not close a reopened different day when an older reporting-day submit completes', async () => {
  const saved = deferred<any>(); mockSave.mockReturnValueOnce(saved.promise); mockQueue = [queued('2026-08-01')];
  mockLoad.mockImplementation(async (date) => date === '2026-09-14' ? mockDraft : null);
  const screen = await render(<CheckInScreen />); await screen.findByLabelText('Calories');
  await fireEvent.press(screen.getByTestId('checkin-save'));
  await fireEvent.press(screen.getByRole('button', { name: 'History' })); await fireEvent.press(screen.getByRole('button', { name: /1 August.*waiting to sync/ }));
  await screen.findByTestId('checkin-receipt'); await fireEvent.press(screen.getByRole('button', { name: 'Edit this record' }));
  await act(async () => { saved.resolve({ status: 'synced', updated: false }); });
  expect(screen.queryByTestId('checkin-receipt')).toBeNull(); expect(screen.getByLabelText('Calories')).toBeTruthy();
});


it('commits the last typed number before the explicit Close returns to the hub', async () => {
  const screen = await render(<CheckInScreen />);
  await waitFor(() => expect(screen.getByLabelText('Calories')).toBeTruthy());
  await typeNumber(screen, 'Calories', '2190');
  await fireEvent.press(screen.getByRole('button', { name: 'Close check-in' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(mockNow).toHaveBeenCalled();
});

it('retries submission after its durable write fails instead of only saving a draft', async () => {
  mockSave.mockRejectedValueOnce(new Error('Device storage unavailable'));
  const screen = await render(<CheckInScreen />);
  await screen.findByLabelText('Calories');
  await fireEvent.press(screen.getByTestId('checkin-save'));
  await screen.findByRole('button', { name: 'Retry saving' });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('checkin-receipt')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
  await screen.findByTestId('checkin-receipt');
  expect(screen.getByText('Check-in saved')).toBeTruthy();
});

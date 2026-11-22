/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { EMPTY_FORM, toPayload } from './model';
import { NumericEntry } from './components/NumericEntry';
import { NumericCommitProvider, useNumericCommits } from './components/NumericCommitProvider';
import { useCheckInEditor } from './useCheckInEditor';

const validForm = { ...EMPTY_FORM, sleepHours: 7, energyLevel: 5, stressLevel: 4, hungerLevel: 3, digestion: 'none' as const, workoutStatus: 'rest_day' as const, nutritionScore: 6 };
let mockUser = 'u';
let mockDraft: unknown;
let mockRows: unknown[];
const mockSave = jest.fn();
const mockNow = jest.fn(async () => true);
const mockClear = jest.fn(async () => true);
const mockConditionalClear = jest.fn(async (..._args: unknown[]) => true);
const mockLoad = jest.fn(async () => mockDraft);
const mockOutbox = jest.fn(async (_userId?: unknown): Promise<any[]> => []);
let mockDeliveryListener: ((event: any) => void) | undefined;
const mockSaveDraft = jest.fn();
const mockRefetch = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mockUser } }) }));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: mockRows, isLoading: false, isError: false, refetch: mockRefetch }) }));
jest.mock('@/hooks/useCheckInMutation', () => ({ useCheckInMutation: () => ({ mutateAsync: mockSave }) }));
jest.mock('@/hooks/useCheckInDraft', () => ({ clearCheckInDraftIfUnchanged: (...args: unknown[]) => mockConditionalClear(...args), useCheckInDraft: () => ({ loadDraft: mockLoad, saveDraft: mockSaveDraft, saveDraftNow: mockNow, clearDraft: mockClear, draftStatus: 'idle' }) }));
jest.mock('./checkInOutbox', () => ({
  readCheckInOutbox: (...args: unknown[]) => mockOutbox(...args),
  subscribeCheckInDelivery: (listener: (event: any) => void) => { mockDeliveryListener = listener; return () => { if (mockDeliveryListener === listener) mockDeliveryListener = undefined; }; },
}));
jest.mock('./components/HistoryCaption', () => ({ HistoryCaption: () => null }));
jest.mock('@/components/ui', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return { Input: React.forwardRef(function MockInput({ label, ...props }: { label: string }, ref: unknown) { return <TextInput ref={ref} accessibilityLabel={label} {...props} />; }) };
});
jest.mock('@/theme', () => ({
  spacing: { xs: 4 },
  useTheme: () => ({
    colors: {
      borderStrong: '#777777',
      elevated: '#ffffff',
      primary: '#bb3300',
      primaryFill: '#cc3300',
    },
  }),
}));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { jest.clearAllMocks(); mockDeliveryListener = undefined; mockUser = 'u'; mockRows = []; mockDraft = { form: validForm, step: 0, savedAt: Date.now() }; mockSave.mockResolvedValue({ status: 'synced', updated: false }); mockLoad.mockImplementation(async () => mockDraft); mockNow.mockResolvedValue(true); mockClear.mockResolvedValue(true); mockOutbox.mockResolvedValue([]); });

it('locks rapid submissions and preserves an edit made before acknowledgment', async () => {
  const pending = deferred<{ status: string; updated: boolean }>();
  mockSave.mockReturnValue(pending.promise);
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  let first!: Promise<unknown>, second!: Promise<unknown>;
  await act(async () => { first = result.current.submit(); second = result.current.submit(); result.current.setField('notes', 'newer'); });
  expect(mockSave).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve({ status: 'synced', updated: false }); await Promise.all([first, second]); });
  expect(result.current.form.notes).toBe('newer');
  expect(result.current.generation).toBeGreaterThan(result.current.submittedGeneration!);
  expect(result.current.hasEdits).toBe(true);
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockNow).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'newer' }), 0);
});

it('re-persists an edit that races acknowledged draft cleanup', async () => {
  const cleanup = deferred<boolean>();
  mockClear.mockReturnValue(cleanup.promise);
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  let save!: Promise<unknown>;
  await act(async () => { save = result.current.submit(); });
  await waitFor(() => expect(mockClear).toHaveBeenCalled());
  await act(async () => { result.current.setField('notes', 'during cleanup'); cleanup.resolve(true); await save; });
  expect(result.current.hasEdits).toBe(true);
  expect(mockNow).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'during cleanup' }), 0);
});

it('keeps the reporting date until a confirmed flush and rejects malformed/future dates', async () => {
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  mockNow.mockResolvedValueOnce(false);
  await act(async () => { expect(await result.current.requestDateChange('2026-09-13')).toBe(false); });
  expect(result.current.date).toBe('2026-09-14');
  await act(async () => { expect(await result.current.requestDateChange('2026-02-30')).toBe(false); expect(await result.current.requestDateChange('2999-01-01')).toBe(false); expect(await result.current.requestDateChange('2026-09-13')).toBe(true); });
  expect(result.current.date).toBe('2026-09-13');
});

it('does not apply an old account acknowledgment to the new account', async () => {
  const pending = deferred<{ status: string; updated: boolean }>(); mockSave.mockReturnValue(pending.promise);
  const { result, rerender } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  let save!: Promise<unknown>;
  await act(async () => { save = result.current.submit(); });
  mockUser = 'other'; mockDraft = null;
  await rerender(undefined);
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  await act(async () => { pending.resolve({ status: 'synced', updated: false }); await save; });
  expect(result.current.form).toEqual(EMPTY_FORM);
  expect(result.current.deliveryState).toBe('idle');
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockConditionalClear).toHaveBeenCalledWith('u', '2026-09-14', validForm);
});

it('shows corruption as recovery, then retries without fabricating an empty draft', async () => {
  mockLoad.mockRejectedValueOnce(new Error('corrupt'));
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('error'));
  await act(async () => { result.current.retryLoad(); });
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  expect(result.current.form.sleepHours).toBe(7);
});

it('maps permanent rejection to blocked while retaining values and a draft', async () => {
  mockSave.mockResolvedValueOnce({ status: 'blocked', failure: { kind: 'permission', retryable: false, code: '42501' } });
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  await act(async () => { expect(await result.current.submit()).toBe('blocked'); });
  expect(result.current.deliveryState).toBe('blocked');
  expect(result.current.failure?.kind).toBe('permission');
  expect(result.current.form.sleepHours).toBe(7);
  expect(mockClear).not.toHaveBeenCalled();
});

it('commits typed text without blur into the actual immediate submission payload', async () => {
  function Probe() {
    const editor = useCheckInEditor('2026-09-14');
    const commits = useNumericCommits();
    return <><Text>{editor.loadState}</Text><NumericEntry label="Calories" value={editor.form.calorieIntake} onChange={(value) => editor.setField('calorieIntake', value)} min={0} max={20000} precision={0} /><Pressable accessibilityRole="button" accessibilityLabel="Submit" onPress={() => { if (commits?.flush()) void editor.submit(); }} /></>;
  }
  const screen = await render(<NumericCommitProvider><Probe /></NumericCommitProvider>);
  await screen.findByText('ready');
  const input = screen.getByLabelText('Calories');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, '2345');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ calorie_intake: 2345, date: '2026-09-14' })));
});

it('hydrates a queued payload before server data and replaces that day deliberately', async () => {
  const payload = toPayload({ ...validForm, notes: 'queued' }, '2026-09-14');
  mockDraft = null;
  mockOutbox.mockResolvedValue([{ payload, userId: 'u', id: 'queued', queuedAt: Date.now() }]);
  mockSave.mockResolvedValue({ status: 'offline', updated: null });
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  expect(result.current.form.notes).toBe('queued');
  expect(result.current.deliveryState).toBe('queued');
  await act(async () => { result.current.setField('notes', 'replacement'); });
  await act(async () => { expect(await result.current.submit()).toBe('queued'); });
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-14', notes: 'replacement' }));
  expect(result.current.receipt?.form.notes).toBe('replacement');
});

it('adopts a durable queued-to-blocked reconnect outcome while retaining newer draft bytes', async () => {
  const submitted = toPayload({ ...validForm, notes: 'submitted' }, '2026-09-14');
  mockDraft = null;
  mockOutbox.mockResolvedValue([{ payload: submitted, userId: 'u', id: 'queued', queuedAt: 1, revision: 1 }]);
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.deliveryState).toBe('queued'));
  await act(async () => { result.current.setField('notes', 'newer local draft'); });
  mockOutbox.mockResolvedValue([{ payload: submitted, userId: 'u', id: 'queued', queuedAt: 1, revision: 1, failure: { kind: 'permission', retryable: false, code: '42501' } }]);

  await act(async () => { mockDeliveryListener?.({ userId: 'u', date: '2026-09-14', revision: 1, status: 'blocked', failure: { kind: 'permission', retryable: false, code: '42501' } }); });
  await waitFor(() => expect(result.current.deliveryState).toBe('blocked'));
  expect(result.current.failure).toEqual({ kind: 'permission', retryable: false, code: '42501' });
  expect(result.current.form.notes).toBe('newer local draft');
  expect(result.current.hasEdits).toBe(true);
});

it('ignores delivery events for another scope and rereads current bytes after an old revision event', async () => {
  const submitted = toPayload({ ...validForm, notes: 'submitted' }, '2026-09-14');
  mockDraft = null;
  mockOutbox.mockResolvedValue([{ payload: submitted, userId: 'u', id: 'queued', queuedAt: 1, revision: 2 }]);
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.deliveryState).toBe('queued'));
  const reads = mockOutbox.mock.calls.length;

  await act(async () => { mockDeliveryListener?.({ userId: 'other', date: '2026-09-14', revision: 2, status: 'blocked' }); });
  await act(async () => { mockDeliveryListener?.({ userId: 'u', date: '2026-09-13', revision: 2, status: 'blocked' }); });
  expect(mockOutbox).toHaveBeenCalledTimes(reads);

  await act(async () => { mockDeliveryListener?.({ userId: 'u', date: '2026-09-14', revision: 1, status: 'blocked' }); });
  await waitFor(() => expect(mockOutbox).toHaveBeenCalledTimes(reads + 1));
  expect(result.current.deliveryState).toBe('queued');
  expect(result.current.failure).toBeNull();
});

it('does not rehydrate local edits when late server data arrives', async () => {
  const { result, rerender } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  await act(async () => { result.current.setField('notes', 'local edit'); });
  mockRows = [{ date: '2026-09-14', notes: 'late server version' }];
  await rerender(undefined);
  expect(result.current.form.notes).toBe('local edit');
});

it('preserves values and retries a durable-intent storage failure', async () => {
  mockSave.mockRejectedValueOnce(new Error('disk full'));
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  await act(async () => { expect(await result.current.submit()).toBe('storage-error'); });
  expect(result.current.form).toEqual(validForm);
  expect(mockClear).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.submit()).toBe('synced'); });
  expect(result.current.receipt?.status).toBe('synced');
});

it('keeps invalid local numeric text editable and prevents a controlled exit', async () => {
  const leave = jest.fn();
  function Probe() {
    const editor = useCheckInEditor('2026-09-14');
    const commits = useNumericCommits();
    return <><Text>{editor.loadState}</Text><NumericEntry label="Calories" value={editor.form.calorieIntake} onChange={(value) => editor.setField('calorieIntake', value)} min={0} max={20000} precision={0} /><Pressable accessibilityRole="button" accessibilityLabel="Leave" onPress={() => { if (commits?.flush()) void editor.flushDraft().then((saved) => { if (saved) leave(); }); }} /></>;
  }
  const screen = await render(<NumericCommitProvider><Probe /></NumericCommitProvider>);
  await screen.findByText('ready');
  const input = screen.getByLabelText('Calories');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, 'not a number');
  await fireEvent.press(screen.getByRole('button', { name: 'Leave' }));
  expect(leave).not.toHaveBeenCalled();
  expect(mockNow).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Calories').props.value).toBe('not a number');
});

it('freezes a mounted editor date when the initial date prop changes', async () => {
  const { result, rerender } = await renderHook<ReturnType<typeof useCheckInEditor>, { date: string }>(({ date }) => useCheckInEditor(date), { initialProps: { date: '2026-09-14' } });
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  await rerender({ date: '2026-09-15' });
  expect(result.current.date).toBe('2026-09-14');
});

it('cleans only the unchanged old-date snapshot when delivery finishes after a date change', async () => {
  const pending = deferred<{ status: string; updated: boolean }>();
  mockSave.mockReturnValue(pending.promise);
  const { result } = await renderHook(() => useCheckInEditor('2026-09-14'));
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  let save!: Promise<unknown>;
  await act(async () => { save = result.current.submit(); });
  await act(async () => { expect(await result.current.requestDateChange('2026-09-13')).toBe(true); });
  await waitFor(() => expect(result.current.loadState).toBe('ready'));
  await act(async () => { pending.resolve({ status: 'synced', updated: false }); await save; });
  expect(result.current.date).toBe('2026-09-13');
  expect(result.current.deliveryState).toBe('idle');
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockConditionalClear).toHaveBeenCalledWith('u', '2026-09-14', validForm);
});

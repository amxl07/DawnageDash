/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';
import CheckInScreen from '../../../../app/(app)/(tabs)/check-in';
import { EMPTY_FORM } from '@/features/checkin/model';

let mockParams: Record<string, string> = {};
let mockEditor: any;
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockDispatch = jest.fn();
let mockRemove: ((event: any) => void) | undefined;
const mockChangeDate = jest.fn(async () => true);
const mockSubmit = jest.fn(async () => 'invalid');
const mockFlush = jest.fn(async () => true);
const mockNumericFlush = jest.fn(() => true);
const mockNumericCommits = { flush: mockNumericFlush };
const mockWebFocus = jest.fn();
const mockScrollIntoView = jest.fn();
const mockMeasureLayout = jest.fn();
const mockFieldNode = { focus: mockWebFocus, scrollIntoView: mockScrollIntoView, measureLayout: mockMeasureLayout };
let mockRegisterFields = false;
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate, setParams: mockSetParams }), useLocalSearchParams: () => mockParams }));
jest.mock('expo-router/react-navigation', () => ({ useNavigation: () => ({ dispatch: mockDispatch }), usePreventRemove: (_enabled: boolean, callback: (event: any) => void) => { mockRemove = callback; }, useFocusEffect: (callback: () => void) => { require('react').useEffect(callback, [callback]); } }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
jest.mock('@/features/checkin/useCheckInEditor', () => ({ useCheckInEditor: () => mockEditor }));
jest.mock('@/features/checkin/components/NumericCommitProvider', () => ({
  NumericCommitProvider: ({ children }: { children: React.ReactNode }) => children,
  useNumericCommits: () => mockNumericCommits,
}));
jest.mock('@/hooks/useCheckInMutation', () => ({ findPreviousCheckIn: () => null }));
jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => ({ height: 850, fontScale: 1 }) }));
jest.mock('@/features/checkin/history', () => ({ buildHistoryStats: () => ({}) }));
jest.mock('@/lib/checkin-utils', () => ({ processCheckInHistory: () => [] }));
jest.mock('@/components/checkin/CheckInStageHeader', () => ({ CheckInStageHeader: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: any) => children }));
jest.mock('@/features/checkin/components/CheckInDateHistorySheet', () => ({ CheckInDateHistorySheet: ({ visible, onSelectDay }: any) => visible ? <MockButton label="Select 2026-09-10" onPress={() => onSelectDay('2026-09-10')} /> : null }));
jest.mock('@/components/checkin/CheckInForm', () => ({ CheckInForm: ({ step, form, errors, setForm, focusField, registerField, onEditSection }: any) => {
  require('react').useEffect(() => {
    if (!mockRegisterFields || !focusField) return;
    registerField?.(focusField, mockFieldNode);
    return () => registerField?.(focusField, null);
  }, [focusField, registerField]);
  return <>
    <MockText>{`Wizard ${step}`}</MockText>
    <MockText>{`Energy ${form.energyLevel ?? 'empty'}`}</MockText>
    {focusField ? <MockText>{`Focus ${focusField}`}</MockText> : null}
    {Object.keys(errors).map((field) => <MockText key={field}>{`Error ${field}`}</MockText>)}
    <MockButton label="Answer readiness" onPress={() => setForm((current: any) => ({ ...current, energyLevel: 7, stressLevel: 3 }))} />
    {step === 'finish' ? <MockButton label="Edit recovery" onPress={() => onEditSection?.('recovery')} /> : null}
  </>;
} }));
jest.mock('@/components/ui', () => {
  const React = require('react'); const { Text, View, Pressable } = require('react-native');
  const Button = ({ label, onPress, testID, disabled }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID} disabled={disabled}><Text>{label}</Text></Pressable>;
  return { Text, Button, Card: View, Screen: React.forwardRef(function MockScreen({ children }: any, _ref: unknown) { return <View>{children}</View>; }), ErrorState: ({ title, message, onRetry }: any) => <View><Text>{title}</Text><Text>{message}</Text><Button label="Retry" onPress={onRetry} /></View>, SkeletonCard: () => <Text>Loading record</Text>, RecordStatus: ({ value }: any) => <Text>{value}</Text>, StickyActionBar: ({ primaryLabel, onPrimary, primaryTestID, secondaryLabel, onSecondary }: any) => <View testID="sticky-action-bar"><Button testID={primaryTestID} label={primaryLabel} onPress={onPrimary} /><Button label={secondaryLabel} onPress={onSecondary} /></View>, Sheet: ({ visible, children }: any) => visible ? <View>{children}</View> : null, SheetScrollView: View };
});
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 }, useMotion: () => ({ enabled: false }) }));
const { Text: MockText, Button: MockButton } = require('@/components/ui');

beforeEach(() => {
  jest.clearAllMocks(); mockParams = {}; mockRegisterFields = false;
  mockNumericFlush.mockReset().mockReturnValue(true);
  mockFlush.mockReset().mockResolvedValue(true);
  mockChangeDate.mockReset().mockResolvedValue(true);
  mockSubmit.mockReset().mockResolvedValue('invalid');
  mockEditor = { date: '2026-09-14', form: { ...EMPTY_FORM }, errors: {}, loadState: 'ready', draftState: 'clean', deliveryState: 'idle', generation: 0, submittedGeneration: null, isSubmitting: false, hasEdits: false, step: 0, receipt: null, failure: null, recoveryMessage: null, firstInvalidField: null, checkIns: [], existing: null, historyIsStale: false, flushDraft: mockFlush, refreshDelivery: jest.fn(async () => {}), submit: mockSubmit, requestDateChange: mockChangeDate, retryLoad: jest.fn(), setStep: jest.fn(), getSnapshot: () => mockEditor.form, updateForm: jest.fn(), discardDraft: jest.fn(async () => true) };
});

it.each(['2026-02-30', 'bad-date', '2999-01-01'])('visibly rejects route date %s before formatting', async (date) => {
  mockParams = { date };
  const screen = await render(<CheckInScreen />);
  expect(screen.getByText('Choose a reporting day')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Return to today' }));
  expect(mockChangeDate).toHaveBeenCalled();
  expect(screen.queryByText('All check-in fields')).toBeNull();
});

it('opens the history route intent and sends the chosen backfill through the controller', async () => {
  mockParams = { history: '1' };
  const screen = await render(<CheckInScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Select 2026-09-10' }));
  expect(mockChangeDate).toHaveBeenCalledWith('2026-09-10', expect.any(Function));
});

it('mounts one persisted section, validates locally, preserves answers on Back, and submits only from review', async () => {
  const screen = await render(<CheckInScreen />);
  expect(screen.getByText('Wizard readiness')).toBeTruthy();
  expect(screen.queryByText('All check-in fields')).toBeNull();

  await fireEvent.press(screen.getByTestId('checkin-next'));
  expect(mockSubmit).not.toHaveBeenCalled();
  expect(mockEditor.setStep).not.toHaveBeenCalledWith(1);
  expect(mockEditor.setStep).toHaveBeenLastCalledWith(0);
  expect(screen.getByText('Error energyLevel')).toBeTruthy();
  expect(screen.getByText('Error stressLevel')).toBeTruthy();

  mockEditor.updateForm.mockImplementation((updater: any) => { mockEditor.form = updater(mockEditor.form); });
  await fireEvent.press(screen.getByRole('button', { name: 'Answer readiness' }));
  await screen.rerender(<CheckInScreen />);
  await fireEvent.press(screen.getByTestId('checkin-next'));
  expect(mockSubmit).not.toHaveBeenCalled();
  expect(mockEditor.setStep).toHaveBeenLastCalledWith(1);

  mockEditor.step = 1;
  mockEditor.form = { ...mockEditor.form, sleepHours: 7, hungerLevel: 5, digestion: 'none' };
  await screen.rerender(<CheckInScreen />);
  expect(screen.getByText('Wizard recovery')).toBeTruthy();
  expect(screen.queryByText('Wizard readiness')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(mockEditor.setStep).toHaveBeenLastCalledWith(0);

  mockEditor.step = 0;
  await screen.rerender(<CheckInScreen />);
  expect(screen.getByText('Energy 7')).toBeTruthy();

  mockEditor.step = 3;
  await screen.rerender(<CheckInScreen />);
  expect(screen.getByText('Wizard finish')).toBeTruthy();
  expect(screen.queryByTestId('checkin-next')).toBeNull();
  await fireEvent.press(screen.getByTestId('checkin-save'));
  expect(mockSubmit).toHaveBeenCalledTimes(1);
});

it('uses inline review editing to return to the selected persisted section', async () => {
  mockEditor.step = 3;
  const screen = await render(<CheckInScreen />);

  await fireEvent.press(screen.getByRole('button', { name: 'Edit recovery' }));

  expect(mockEditor.setStep).toHaveBeenCalledWith(1);
  expect(mockSubmit).not.toHaveBeenCalled();
});

it('reveals a hidden invalid optional field without invoking full submission', async () => {
  mockEditor.form = { ...EMPTY_FORM, morningWeight: 500, energyLevel: 7, stressLevel: 3 };
  const screen = await render(<CheckInScreen />);

  await fireEvent.press(screen.getByTestId('checkin-next'));

  expect(mockSubmit).not.toHaveBeenCalled();
  expect(screen.getByText('Error morningWeight')).toBeTruthy();
  expect(screen.getByText('Focus morningWeight')).toBeTruthy();
  expect(mockEditor.setStep).toHaveBeenCalledWith(0);
});

it('focuses repeated invalid fields safely on web without native node lookup', async () => {
  mockRegisterFields = true;
  mockEditor.form = { ...EMPTY_FORM, morningWeight: 500, energyLevel: 7, stressLevel: 3 };
  const platform = jest.replaceProperty(Platform, 'OS', 'web');
  const frame = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  try {
    const screen = await render(<CheckInScreen />);

    await fireEvent.press(screen.getByTestId('checkin-next'));
    await fireEvent.press(screen.getByTestId('checkin-next'));

    expect(mockWebFocus).toHaveBeenCalledTimes(2);
    expect(mockScrollIntoView).toHaveBeenCalledTimes(2);
    expect(mockMeasureLayout).not.toHaveBeenCalled();
  } finally {
    frame.mockRestore();
    platform.restore();
  }
});

it('clears a corrected numeric warning on Continue but preserves storage warnings', async () => {
  mockNumericFlush.mockReturnValueOnce(false).mockReturnValue(true);
  mockEditor.form = { ...EMPTY_FORM, energyLevel: 7, stressLevel: 3 };
  const screen = await render(<CheckInScreen />);

  await fireEvent.press(screen.getByTestId('checkin-next'));
  expect(screen.getByText('Correct the highlighted number or clear it before continuing.')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('checkin-next'));
  expect(screen.queryByText('Correct the highlighted number or clear it before continuing.')).toBeNull();
  expect(mockEditor.setStep).toHaveBeenCalledWith(1);

  mockFlush.mockResolvedValueOnce(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Save draft and return Home' }));
  expect(screen.getByText('Changes could not be saved on this device. Retry to stay safe, or discard this draft deliberately.')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('checkin-next'));
  expect(screen.getByText('Changes could not be saved on this device. Retry to stay safe, or discard this draft deliberately.')).toBeTruthy();
});

it('keeps an offline receipt dated and avoids a coach availability claim', async () => {
  mockEditor.receipt = { date: '2026-09-14', form: EMPTY_FORM, status: 'queued', generation: 0 };
  const screen = await render(<CheckInScreen />);
  expect(screen.getByTestId('checkin-receipt')).toBeTruthy();
  expect(screen.getByText('Saved on this device')).toBeTruthy();
  expect(screen.queryByText('Your record is available to your coach.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit this record' }));
  expect(screen.getByText('Wizard readiness')).toBeTruthy();
});

it('keeps a failed controlled exit open and replays only after retry acknowledges storage', async () => {
  mockFlush.mockResolvedValueOnce(false);
  const screen = await render(<CheckInScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Save draft and return Home' }));
  expect(mockNavigate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving' }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

it('guards hardware/removal actions through the same confirmed flush', async () => {
  await render(<CheckInScreen />);
  const action = { type: 'GO_BACK' };
  await act(async () => { mockRemove?.({ data: { action } }); });
  expect(mockFlush).toHaveBeenCalled();
  expect(mockDispatch).toHaveBeenCalledWith(action);
});

it('moves actions into the scroll while the keyboard is open', async () => {
  const callbacks = new Map<string, () => void>();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event: any, listener: any) => { callbacks.set(event, listener); return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>; });
  const screen = await render(<CheckInScreen />);
  expect(screen.getByTestId('sticky-action-bar')).toBeTruthy();
  await act(async () => { callbacks.get('keyboardDidShow')?.(); });
  expect(screen.queryByTestId('sticky-action-bar')).toBeNull();
  expect(screen.getByTestId('checkin-next')).toBeTruthy();
  jest.restoreAllMocks();
});

it('keeps a mounted editor visible when a later route date is malformed', async () => {
  const screen = await render(<CheckInScreen />);
  mockParams = { date: '2026-02-30' };
  await screen.rerender(<CheckInScreen />);
  expect(screen.getByText('Wizard readiness')).toBeTruthy();
  expect(screen.getByText('This reporting date is not valid. Use a calendar date written as YYYY-MM-DD.')).toBeTruthy();
  expect(mockChangeDate).not.toHaveBeenCalled();
});

it('keeps a mounted editor frozen until Home supplies an explicit next-day date', async () => {
  const screen = await render(<CheckInScreen />);
  await screen.rerender(<CheckInScreen />);
  expect(mockChangeDate).not.toHaveBeenCalled();

  mockParams = { date: '2026-09-15' };
  await screen.rerender(<CheckInScreen />);
  expect(mockChangeDate).toHaveBeenCalledWith('2026-09-15', expect.any(Function));
});

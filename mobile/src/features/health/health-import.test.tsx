import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { HealthImport } from './health-import';
import { EMPTY_FORM } from '@/features/checkin/model';
import { useCheckInEditor } from '@/features/checkin/useCheckInEditor';
import { NumericCommitProvider, useNumericCommits } from '@/features/checkin/components/NumericCommitProvider';
import { NumericEntry } from '@/features/checkin/components/NumericEntry';
import { healthDayWindow } from './health-model';
const mockSubmit = jest.fn();
const mockSaveDraft = jest.fn();
const mockLoad = jest.fn(async () => ({ form: { ...EMPTY_FORM }, step: 0 }));
const mockOutbox = jest.fn(async () => []);
const mockRead = jest.fn();
const mockRows: never[] = [];
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'fictional-user' } }) }));
jest.mock('@/hooks/useCheckInDraft', () => ({ useCheckInDraft: () => ({ loadDraft: mockLoad, saveDraft: mockSaveDraft, saveDraftNow: async () => true, clearDraft: async () => true }), clearCheckInDraftIfUnchanged: jest.fn() }));
jest.mock('@/hooks/useCheckInMutation', () => ({ useCheckInMutation: () => ({ mutateAsync: mockSubmit }) }));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: mockRows, refetch: jest.fn() }) }));
jest.mock('@/features/checkin/checkInOutbox', () => ({ readCheckInOutbox: () => mockOutbox(), subscribeCheckInDelivery: () => () => {} }));
jest.mock('./health-service', () => ({ readHealthDay: (...args: unknown[]) => mockRead(...args) }));
jest.mock('@/features/checkin/components/HistoryCaption', () => ({ HistoryCaption: () => null }));
jest.mock('@/theme', () => ({ HIT_SLOP_MIN: 48, radius: { md: 12 }, spacing: { xs: 4, sm: 8 }, useTheme: () => ({ colors: { foreground: '#111', mutedForeground: '#666', pressed: '#ccc', borderStrong: '#777', elevated: '#fff', primary: '#a11', primaryFill: '#a11' } }) }));
jest.mock('@/components/ui', () => {
  const React = require('react');
  const { TextInput, Text } = require('react-native');
  return { Text, Input: React.forwardRef(function Input({ label, ...props }: any, ref: any) { return <TextInput ref={ref} accessibilityLabel={label} {...props} />; }) };
});
jest.mock('./health-review-sheet', () => {
  const { View, Text, Pressable } = require('react-native');
  return { HealthReviewSheet: ({ state, onRead, onApply }: any) => state.stage === 'closed' ? null : <View><Text>Health review open</Text><Pressable accessibilityRole="button" accessibilityLabel="Read health" onPress={onRead} /><Pressable accessibilityRole="button" accessibilityLabel="Apply health" onPress={onApply} /></View> };
});
function Probe({ disabled = false }: { disabled?: boolean }) {
  const editor = useCheckInEditor('2026-09-24');
  const commits = useNumericCommits();
  return <><Text>{editor.loadState}</Text><Text testID="form">{JSON.stringify(editor.form)}</Text><NumericEntry label="Calories" value={editor.form.calorieIntake} min={0} max={20000} precision={0} onChange={value => editor.setField('calorieIntake', value)} /><HealthImport disabled={disabled} editor={editor} accountId="fictional-user" beforeOpen={() => commits?.flush() !== false} onApplied={() => {}} /></>;
}
beforeEach(() => { jest.clearAllMocks(); mockRead.mockResolvedValue({ status: 'ready', provider: 'Apple Health', window: healthDayWindow('2026-09-24', new Date(2026, 8, 25)), issues: [], measurements: [{ field: 'calorieIntake', value: 1800, sources: ['Fictional food'] }, { field: 'dailySteps', value: 4000, sources: ['Fictional phone'] }] }); });
it('flushes unblurred numbers into the actual editor baseline and applies selected fields in one draft update without submitting', async () => {
  const screen = await render(<NumericCommitProvider><Probe /></NumericCommitProvider>);
  await screen.findByText('ready');
  await fireEvent(screen.getByLabelText('Calories'), 'focus');
  await fireEvent.changeText(screen.getByLabelText('Calories'), '2100');
  await fireEvent.press(screen.getByRole('button', { name: 'Import from health app' }));
  await screen.findByText('Health review open');
  await fireEvent.press(screen.getByRole('button', { name: 'Read health' }));
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
  await act(async () => { await Promise.resolve(); });
  mockSaveDraft.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: 'Apply health' }));
  const form = JSON.parse(screen.getByTestId('form').props.children);
  expect(form.calorieIntake).toBe(2100); expect(form.dailySteps).toBe(4000); expect(form.energyLevel).toBeNull();
  expect(mockSaveDraft).toHaveBeenCalledTimes(1); expect(mockSubmit).not.toHaveBeenCalled();
});
it('keeps invalid typed text editable and does not open the review', async () => {
  const screen = await render(<NumericCommitProvider><Probe /></NumericCommitProvider>);
  await screen.findByText('ready');
  await fireEvent(screen.getByLabelText('Calories'), 'focus');
  await fireEvent.changeText(screen.getByLabelText('Calories'), 'unfinished');
  await fireEvent.press(screen.getByRole('button', { name: 'Import from health app' }));
  expect(screen.queryByText('Health review open')).toBeNull();
  expect(screen.getByLabelText('Calories').props.value).toBe('unfinished');
  expect(mockRead).not.toHaveBeenCalled(); expect(mockSubmit).not.toHaveBeenCalled();
});

it('keeps a disabled import trigger visibly muted and unable to open the review', async () => {
  const screen = await render(<NumericCommitProvider><Probe disabled /></NumericCommitProvider>);
  await screen.findByText('ready');
  const trigger = screen.getByRole('button', { name: 'Import from health app' });
  expect(trigger.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText('Import from health app').props.style).toEqual({ color: '#666' });
  await fireEvent.press(trigger);
  expect(screen.queryByText('Health review open')).toBeNull();
  expect(mockRead).not.toHaveBeenCalled();
});

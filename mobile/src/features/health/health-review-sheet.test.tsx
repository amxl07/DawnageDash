import { render, fireEvent } from '@testing-library/react-native';
import { EMPTY_FORM } from '@/features/checkin/model';
import { HealthReviewSheet } from './health-review-sheet';
import { healthDayWindow } from './health-model';
import type { HealthReviewState } from './health-review';
jest.mock('@/components/ui', () => {
  const { Text, View, ScrollView, Pressable } = require('react-native');
  return { Text, Sheet: ({ visible, children }: any) => visible ? <View>{children}</View> : null, SheetScrollView: ScrollView, Button: ({ label, onPress, disabled }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}><Text>{label}</Text></Pressable> };
});
jest.mock('@/theme', () => ({ HIT_SLOP_MIN: 48, iconSize: { sm: 16, lg: 24 }, radius: { sm: 8, md: 12 }, spacing: { xs: 4, sm: 8, base: 16, lg: 24 }, useTheme: () => ({ colors: { border: '#ddd', elevated: '#eee', foreground: '#111', primary: '#a11', primaryFill: '#a11', borderStrong: '#777', onPrimary: '#fff', pressed: '#ccc', mutedForeground: '#666' } }) }));
const state: HealthReviewState = { stage: 'result', scope: { identity: {}, accountId: 'fictional', date: '2026-09-24', timezone: 'UTC', revision: 0, form: { ...EMPTY_FORM, calorieIntake: 2200 } }, result: { status: 'ready', provider: 'Apple Health', window: healthDayWindow('2026-09-24', new Date(2026, 8, 25)), measurements: [{ field: 'calorieIntake', value: 1800, sources: ['Fictional food log'] }, { field: 'morningWeight', value: 74, sources: ['Fictional scale'], observedAt: new Date('2026-09-24T07:30:00Z') }], issues: [] }, selected: ['morningWeight'], error: null };
it('shows source/date/time and explicit replacement with accessible checked state', async () => {
  const toggle = jest.fn();
  const screen = await render(<HealthReviewSheet state={state} onRead={() => {}} onClose={() => {}} onToggle={toggle} onApply={() => {}} />);
  expect(screen.getByText(/2026-09-24/)).toBeTruthy();
  expect(screen.getByText(/Fictional scale/)).toBeTruthy();
  expect(screen.getByText(/Observed/)).toBeTruthy();
  const replace = screen.getByRole('checkbox', { name: /Replace Food calories/ });
  expect(replace.props.accessibilityState.checked).toBe(false);
  await fireEvent.press(replace); expect(toggle).toHaveBeenCalledWith('calorieIntake');
  const morning = screen.getByRole('checkbox', { name: /Use Morning weight/ });
  expect(morning.props.accessibilityState.checked).toBe(true);
  expect(morning.props.accessibilityLabel).toContain('Fictional scale');
  expect(morning.props.accessibilityLabel).toMatch(/Observed.*7:30.*UTC/);
  expect(replace.props.accessibilityLabel).toContain('Fictional food log');
  expect(replace.props.accessibilityLabel).toMatch(/current entry/);
});
it('explains coach sharing and review before the access action', async () => {
  const read = jest.fn();
  const screen = await render(<HealthReviewSheet state={{ ...state, stage: 'intro', result: null, selected: [] }} onRead={read} onClose={() => {}} onToggle={() => {}} onApply={() => {}} />);
  expect(screen.getByText(/shared with your coach when you submit/)).toBeTruthy();
  expect(read).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Choose access and read this day' }));
  expect(read).toHaveBeenCalledTimes(1);
});

it('disables previous choices while a retry is reading and retains their accessible checked state', async () => {
  const toggle = jest.fn(); const apply = jest.fn();
  const screen = await render(<HealthReviewSheet state={{ ...state, stage: 'loading' }} onRead={() => {}} onClose={() => {}} onToggle={toggle} onApply={apply} />);
  const morning = screen.getByRole('checkbox', { name: /Use Morning weight/ });
  expect(morning.props.accessibilityState).toEqual({ checked: true, disabled: true });
  await fireEvent.press(morning);
  await fireEvent.press(screen.getByRole('button', { name: 'Use 1 selected value' }));
  expect(toggle).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
});

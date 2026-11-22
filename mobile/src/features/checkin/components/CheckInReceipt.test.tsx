/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';
import { EMPTY_FORM } from '../model';
import { CheckInReceipt } from './CheckInReceipt';

jest.mock('lucide-react-native', () => ({ Check: () => null, Clock3: () => null, CircleAlert: () => null, ClipboardCheck: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/components/ui', () => {
  const { View, Text, Pressable } = require('react-native');
  return { Card: View, Text, RecordStatus: ({ value }: { value: string }) => <Text>{value}</Text>,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable> };
});
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 }, useTheme: () => ({ colors: {} }) }));

const receipt = { date: '2026-09-14', form: { ...EMPTY_FORM, sleepHours: 8, energyLevel: 7 }, status: 'synced' as const, generation: 2 };

it('keeps the reporting date and recorded values, with Home and Edit callbacks', async () => {
  const onHome = jest.fn(), onEdit = jest.fn();
  const view = await render(<CheckInReceipt receipt={receipt} onHome={onHome} onEdit={onEdit} />);
  expect(view.getByText('Monday, 14 September 2026')).toBeTruthy();
  expect(view.getByText('8 h')).toBeTruthy();
  expect(view.queryByText('Not recorded')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Back to Home' }));
  await fireEvent.press(view.getByRole('button', { name: 'Edit this record' }));
  expect(onHome).toHaveBeenCalledTimes(1);
  expect(onEdit).toHaveBeenCalledTimes(1);
});

it('uses the eligible contextual action without invoking Home or saving again', async () => {
  const onPress = jest.fn(), onHome = jest.fn();
  const view = await render(<CheckInReceipt receipt={receipt} onHome={onHome} onEdit={jest.fn()} nextAction={{ label: 'View your training', detail: 'Your assigned plan is ready to view.', onPress }} />);
  expect(view.getByText('Your assigned plan is ready to view.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'View your training' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onHome).not.toHaveBeenCalled();
});

it.each(['queued', 'synced'] as const)('distinguishes %s first-check-in delivery', async (status) => {
  const view = await render(<CheckInReceipt receipt={{ ...receipt, status }} firstCheckIn onHome={jest.fn()} onEdit={jest.fn()} />);
  expect(view.getByText(status === 'synced' ? 'Your Day 1 is recorded.' : 'Your first check-in is waiting to sync.')).toBeTruthy();
  if (status === 'queued') expect(view.queryByText('Your Day 1 is recorded.')).toBeNull();
});

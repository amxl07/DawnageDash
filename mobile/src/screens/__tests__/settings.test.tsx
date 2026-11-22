/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import SettingsScreen from '../../../app/(app)/settings';

const mockList = jest.fn();
const mockPermission = jest.fn();
const mockRequest = jest.fn();
const mockLoad = jest.fn();
const mockReconcile = jest.fn();
const mockWaitForChanges = jest.fn();
const mockApply = jest.fn(async (_settings: unknown) => true);
let mockFocus: () => void;
let mockForeground: (state: AppStateStatus) => void;
const mockSettings = { dailyEnabled: true, dailyHour: 8, dailyMinute: 0, weeklyEnabled: false, weeklyWeekday: 1, weeklyHour: 18, weeklyMinute: 0 };
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), useFocusEffect: (callback: () => void) => { mockFocus = callback; require('react').useEffect(callback, [callback]); } }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
jest.mock('lucide-react-native', () => ({ Bell: () => null }));
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }), useThemePreference: () => ({ preference: 'dark', setPreference: jest.fn() }) }));
jest.mock('@/components/ui', () => {
  const { Text, View, Pressable } = require('react-native');
  return { Text, Card: View, Screen: View, PageHeader: () => null, Sheet: () => null, OptionRow: () => null,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable> };
});
jest.mock('@/lib/reminders', () => ({
  DEFAULT_SETTINGS: { dailyEnabled: false, dailyHour: 8, dailyMinute: 0, weeklyEnabled: false, weeklyWeekday: 1, weeklyHour: 18, weeklyMinute: 0 },
  DAILY_ID: 'daily-checkin-reminder', WEEKLY_ID: 'weekly-checkin-reminder',
  loadSettings: () => mockLoad(), remindersAvailable: () => true, reconcile: () => mockReconcile(),
  waitForReminderChanges: () => mockWaitForChanges(),
  listScheduled: () => mockList(), hasPermission: () => mockPermission(), requestPermission: () => mockRequest(),
  applyReminderSettings: (settings: unknown) => mockApply(settings),
  reminderDelivery: (_settings: unknown, scheduled: unknown[] | null) => ({ daily: scheduled === null ? 'unavailable' : scheduled.length ? 'scheduled' : 'pending', weekly: 'off' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([{ identifier: 'daily-checkin-reminder', trigger: { hour: 8, minute: 0 } }]);
  mockPermission.mockResolvedValue(true);
  mockLoad.mockResolvedValue(mockSettings);
  mockReconcile.mockResolvedValue(undefined);
  mockWaitForChanges.mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => { mockForeground = listener as typeof mockForeground; return { remove: jest.fn() }; });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

it('shows denied permission when enabled preferences finish loading after native status', async () => {
  const saved = deferred<typeof mockSettings>();
  mockLoad.mockReturnValue(saved.promise);
  mockPermission.mockResolvedValue(false);
  const view = await render(<SettingsScreen />);
  await act(async () => { await Promise.resolve(); });
  await act(async () => { saved.resolve(mockSettings); await saved.promise; });
  expect(view.getByText(/Notifications are turned off for Dawnage/)).toBeTruthy();
  expect(view.getByRole('switch', { name: 'Daily check-in reminder' }).props).toMatchObject({
    value: false,
    accessibilityState: { checked: false },
  });
  expect(mockRequest).not.toHaveBeenCalled();

  await fireEvent(view.getByRole('switch', { name: 'Daily check-in reminder' }), 'valueChange', true);
  expect(mockApply).toHaveBeenCalledWith(expect.objectContaining({ dailyEnabled: false }));
});

it('reads the foreground schedule after the repair has finished', async () => {
  const view = await render(<SettingsScreen />);
  const repair = deferred<void>();
  mockList.mockResolvedValue([]);
  mockReconcile.mockReturnValueOnce(repair.promise);
  const readsBefore = mockList.mock.calls.length;
  await act(async () => { mockForeground('active'); await Promise.resolve(); });
  expect(mockList).toHaveBeenCalledTimes(readsBefore);
  mockList.mockResolvedValue([{ identifier: 'daily-checkin-reminder', trigger: { hour: 8, minute: 0 } }]);
  await act(async () => { repair.resolve(); await repair.promise; });
  expect(view.getByText('1 reminder scheduled on this device.')).toBeTruthy();
});

it('offers a read-only retry when native status is unavailable', async () => {
  mockList.mockRejectedValueOnce(new Error('Native status unavailable'));
  const view = await render(<SettingsScreen />);
  expect(view.getByText('Schedule status unavailable.')).toBeTruthy();
  const repairsBefore = mockReconcile.mock.calls.length;
  await fireEvent.press(view.getByRole('button', { name: 'Refresh reminder status' }));
  expect(view.getByText('1 reminder scheduled on this device.')).toBeTruthy();
  expect(mockReconcile).toHaveBeenCalledTimes(repairsBefore);
  expect(mockRequest).not.toHaveBeenCalled();
});

it('keeps a manual status retry behind an already-running foreground repair', async () => {
  mockList.mockRejectedValueOnce(new Error('Native status unavailable'));
  const view = await render(<SettingsScreen />);
  const repair = deferred<void>();
  mockReconcile.mockReturnValueOnce(repair.promise);
  mockWaitForChanges.mockReturnValueOnce(repair.promise);
  mockList.mockResolvedValue([]);
  const readsBefore = mockList.mock.calls.length;
  await act(async () => { mockForeground('active'); await Promise.resolve(); });
  await fireEvent.press(view.getByRole('button', { name: 'Refresh reminder status' }));
  expect(mockList).toHaveBeenCalledTimes(readsBefore);
  mockList.mockResolvedValue([{ identifier: 'daily-checkin-reminder', trigger: { hour: 8, minute: 0 } }]);
  await act(async () => { repair.resolve(); await repair.promise; });
  expect(view.getByText('1 reminder scheduled on this device.')).toBeTruthy();
});
afterEach(() => jest.restoreAllMocks());

it('refreshes notification permission and the actual schedule after returning to the app', async () => {
  const view = await render(<SettingsScreen />);
  await act(async () => { await Promise.resolve(); });
  expect(view.getByText('1 reminder scheduled on this device.')).toBeTruthy();
  mockPermission.mockResolvedValue(false);
  mockList.mockResolvedValue([]);
  await act(async () => { mockForeground('active'); await Promise.resolve(); });
  expect(view.getByText(/Notifications are turned off for Dawnage/)).toBeTruthy();
  expect(view.getByText('0 reminders scheduled on this device.')).toBeTruthy();
  mockPermission.mockResolvedValue(true);
  await act(async () => { mockFocus(); await Promise.resolve(); });
  expect(view.queryByText(/Notifications are turned off for Dawnage/)).toBeNull();
  expect(mockRequest).not.toHaveBeenCalled();
});

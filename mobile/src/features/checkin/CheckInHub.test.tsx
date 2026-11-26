import { fireEvent, render } from '@testing-library/react-native';
import { CheckInHub } from './CheckInHub';

let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
const mockSetParams = jest.fn((next) => { mockParams = { ...mockParams, ...next }; });
const mockRouter = { push: mockPush, setParams: mockSetParams };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: [], isLoading: false }) }));
jest.mock('@/features/home/useHomeDate', () => ({ useHomeDate: () => '2026-09-24' }));
jest.mock('@/features/home/useHomeLocal', () => ({ useHomeLocal: () => ({ data: { checkIns: [], checkInDraft: null }, isLoading: false }) }));
jest.mock('@/components/ui', () => {
  const { Text, View, Pressable } = jest.requireActual('react-native');
  return { Text, Card: View, Screen: View, SkeletonCard: View, ErrorState: () => null, PageHeader: ({ title }: any) => <Text>{title}</Text>, Button: ({ label, onPress }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable> };
});
jest.mock('./components/CheckInDateHistorySheet', () => { const { Text } = jest.requireActual('react-native'); return { CheckInDateHistorySheet: ({ visible }: any) => visible ? <Text>History open</Text> : null }; });
jest.mock('@/theme', () => ({ spacing: { lg: 24, base: 16, sm: 8, xs: 4 } }));
beforeEach(() => { jest.clearAllMocks(); mockParams = {}; });
it('starts the current local day with one action from the hub', async () => {
  const view = await render(<CheckInHub />);
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Check in for today' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-24' } });
});
it('consumes a dated legacy entry once so returning does not reopen the editor', async () => {
  mockParams = { date: '2026-09-18' };
  const view = await render(<CheckInHub />);
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-18' } });
  expect(mockSetParams).toHaveBeenCalledWith({ date: undefined, history: undefined, edit: undefined });
  await view.rerender(<CheckInHub />);
  expect(mockPush).toHaveBeenCalledTimes(1);
});
it('opens history without creating or navigating to an editable draft', async () => {
  mockParams = { history: '1' };
  const view = await render(<CheckInHub />);
  expect(view.getByText('History open')).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

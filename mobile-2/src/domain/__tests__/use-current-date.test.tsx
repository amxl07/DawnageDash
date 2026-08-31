import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useCurrentDate } from '@/domain/use-current-date';

let mockFocusCallback: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
  },
}));

describe('useCurrentDate', () => {
  it('refreshes after midnight when the retained tab regains focus or the app activates', async () => {
    let current = new Date('2026-09-01T23:59:00');
    let appStateListener: ((state: string) => void) | undefined;
    const addEventListener = jest.spyOn(AppState, 'addEventListener').mockImplementation(
      (_event, listener) => {
        appStateListener = listener as (state: string) => void;
        return { remove: jest.fn() };
      },
    );
    const now = () => current;
    const { result } = await renderHook(() => useCurrentDate(now));

    expect(result.current).toBe('2026-09-01');

    current = new Date('2026-09-02T00:01:00');
    await act(async () => mockFocusCallback?.());
    expect(result.current).toBe('2026-09-02');

    current = new Date('2026-09-03T08:00:00');
    await act(async () => appStateListener?.('active'));
    expect(result.current).toBe('2026-09-03');

    addEventListener.mockRestore();
  });
});

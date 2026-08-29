import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { readWorkoutDraft } from './useWorkoutDraft';
import {
  completedPlanDaysFromLogs,
  derivePlanDayStatuses,
  planDayNumberFromDraft,
  usePlanProgress,
} from './usePlanProgress';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockStorage = jest.mocked(AsyncStorage);
const mockRefetch = jest.fn(async () => undefined);
type MockQueryOptions = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
};
const mockUseQuery = jest.fn((_options: MockQueryOptions) => ({
  data: { activeDay: null, completedDays: [] },
  isError: false,
  isLoading: false,
  refetch: mockRefetch,
}));
let mockFocusCallback: (() => void) | undefined;
const mockLte = jest.fn(async () => ({ data: [], error: null }));
const mockGte = jest.fn(() => ({ lte: mockLte }));
const mockEq = jest.fn(() => ({ gte: mockGte }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect }));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: MockQueryOptions) => mockUseQuery(options),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    mockFocusCallback = callback;
  },
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function renderHook<T>(hook: () => T) {
  let current: T | undefined;
  let renderer!: ReturnType<typeof create>;

  function HookProbe() {
    current = hook();
    return null;
  }

  act(() => {
    renderer = create(React.createElement(HookProbe));
  });

  return {
    result: {
      get current() {
        return current as T;
      },
    },
    rerender: () => act(() => renderer.update(React.createElement(HookProbe))),
    unmount: () => act(() => renderer.unmount()),
  };
}

describe('derivePlanDayStatuses', () => {
  it('prioritizes an active draft over completed and upcoming states', () => {
    expect(derivePlanDayStatuses([1, 2, 3], { activeDay: 2, completedDays: [1] })).toEqual({
      1: 'complete',
      2: 'active',
      3: 'upcoming',
    });
  });

  it('marks the first incomplete day as today when there is no active draft', () => {
    expect(derivePlanDayStatuses([1, 2, 3], { activeDay: null, completedDays: [1] })).toEqual({
      1: 'complete',
      2: 'today',
      3: 'upcoming',
    });
  });

  it('keeps a completed active day active and does not mark another day today', () => {
    expect(derivePlanDayStatuses([1, 2, 3], { activeDay: 2, completedDays: [1, 2] })).toEqual({
      1: 'complete',
      2: 'active',
      3: 'upcoming',
    });
  });

  it('marks every plan day complete when the week is complete', () => {
    expect(derivePlanDayStatuses([1, 2], { activeDay: null, completedDays: [1, 2, 2] })).toEqual({
      1: 'complete',
      2: 'complete',
    });
  });

  it('ignores invalid, duplicate, and out-of-plan day values', () => {
    expect(
      derivePlanDayStatuses([1, 2, 2, 0, Number.NaN], {
        activeDay: 99,
        completedDays: [1, 1, 42, Number.NaN],
      }),
    ).toEqual({
      1: 'complete',
      2: 'today',
    });
  });

  it('returns no statuses when plan days are missing', () => {
    expect(derivePlanDayStatuses([], { activeDay: 1, completedDays: [1] })).toEqual({});
  });
});

describe('plan progress data', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T08:00:00.000Z'));
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.removeItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collects unique valid day numbers only from version-two logs', () => {
    expect(
      completedPlanDaysFromLogs([
        { content: '{"version":2,"planDayNumber":2,"exercises":[]}' },
        { content: { version: 2, planDayNumber: 2, exercises: [] } },
        { content: { version: 2, planDayNumber: 3, exercises: [] } },
        { content: [{ exercise: 'Legacy', sets: [] }] },
        { content: { version: 2, planDayNumber: 0, exercises: [] } },
        { content: { version: 2, planDayNumber: 1.5, exercises: [] } },
        { content: 'not json' },
        { content: null },
      ]),
    ).toEqual([2, 3]);
  });

  it('reads the same unexpired local draft without mounting the logger hook', async () => {
    const draft = {
      workoutTitle: 'Upper body',
      exercises: [],
      selectedPlanId: '2',
      existingLogId: null,
      savedAt: Date.now(),
    };
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(draft));

    await expect(readWorkoutDraft('user-1', '2026-08-30')).resolves.toEqual(draft);
    expect(mockStorage.getItem).toHaveBeenCalledWith('workout-draft:user-1:2026-08-30');
    expect(planDayNumberFromDraft(draft)).toBe(2);
  });

  it('expires old drafts and safely rejects invalid or custom plan selections', async () => {
    const expired = {
      workoutTitle: 'Old workout',
      exercises: [],
      selectedPlanId: 'custom',
      existingLogId: null,
      savedAt: Date.now() - 24 * 60 * 60 * 1000 - 1,
    };
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(expired));

    await expect(readWorkoutDraft('user-1', '2026-08-30')).resolves.toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('workout-draft:user-1:2026-08-30');
    expect(planDayNumberFromDraft(expired)).toBeNull();
    expect(planDayNumberFromDraft({ ...expired, selectedPlanId: '-1' })).toBeNull();
    expect(planDayNumberFromDraft({ ...expired, selectedPlanId: '1.5' })).toBeNull();
  });
});

describe('usePlanProgress refresh lifecycle', () => {
  const planDays = [
    {
      id: 'day-1',
      day_number: 1,
      focus: null,
      exercises: [],
      notes: null,
      updated_at: null,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T08:00:00.000Z'));
    jest.clearAllMocks();
    mockFocusCallback = undefined;
    mockUseQuery.mockReturnValue({
      data: { activeDay: null, completedDays: [] },
      isError: false,
      isLoading: false,
      refetch: mockRefetch,
    });
    mockStorage.getItem.mockResolvedValue(null);
    mockLte.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refetches once when the Plans screen regains focus, not on its first focus', () => {
    const { unmount } = renderHook(() => usePlanProgress(planDays));
    if (!mockFocusCallback) throw new Error('Focus callback was not registered');

    act(() => mockFocusCallback?.());
    expect(mockRefetch).not.toHaveBeenCalled();

    act(() => mockFocusCallback?.());
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('keys and reads progress by local date, refreshing the query identity after midnight', async () => {
    const { rerender, unmount } = renderHook(() => usePlanProgress(planDays));
    expect(mockUseQuery.mock.calls.at(-1)?.[0]).toMatchObject({
      queryKey: ['workoutLogs', 'user-1', 'plan-progress', '2026-08-24', '2026-08-30'],
    });
    if (!mockFocusCallback) throw new Error('Focus callback was not registered');
    act(() => mockFocusCallback?.());

    jest.setSystemTime(new Date('2026-08-31T08:00:00.000Z'));
    act(() => mockFocusCallback?.());
    rerender();

    const options = mockUseQuery.mock.calls.at(-1)![0];
    expect(options.queryKey).toEqual([
      'workoutLogs',
      'user-1',
      'plan-progress',
      '2026-08-31',
      '2026-08-31',
    ]);

    await options.queryFn();
    expect(mockGte).toHaveBeenCalledWith('date', '2026-08-31');
    expect(mockLte).toHaveBeenCalledWith('date', '2026-09-06');
    expect(mockStorage.getItem).toHaveBeenCalledWith('workout-draft:user-1:2026-08-31');
    expect(mockRefetch).not.toHaveBeenCalled();
    unmount();
  });
});

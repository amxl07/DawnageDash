import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import type { FitnessRepository } from '@/data/fitness-repository';
import type { Food } from '@/domain/models';
import { useAddFoodEntry, useFoodSearch } from '@/features/food/use-food-search';

type FoodSearchHookResult = ReturnType<typeof useFoodSearch>;

const mockRepository: jest.Mocked<FitnessRepository> = {
  addFoodEntry: jest.fn(),
  getDailySummary: jest.fn(),
  getMealTypes: jest.fn(),
  searchFoods: jest.fn(),
};

let mockConnection = { isOnline: true };
let mockSession: { mode: 'connected' | 'demo' } | null = { mode: 'demo' };

jest.mock('@/data/repository-context', () => ({
  useFitnessRepository: () => mockRepository,
}));

jest.mock('@/query/query-provider', () => ({
  useConnectionState: () => mockConnection,
}));

jest.mock('@/session/session-context', () => ({
  useSession: () => ({ session: mockSession }),
}));

const oats: Food = {
  id: 'oats',
  name: 'Steel cut oats',
  nutrition: { calories: 380, carbohydrates: 68, fat: 7, protein: 13 },
  servingSize: 100,
  servingUnit: 'g',
  variantId: 'oats-default',
};

function createWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('food search hooks', () => {
  let client: QueryClient;
  let previousOnline: boolean;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: {
        mutations: { gcTime: 0, retry: false },
        queries: { gcTime: 0, retry: false },
      },
    });
    mockConnection = { isOnline: true };
    mockSession = { mode: 'demo' };
    mockRepository.addFoodEntry.mockReset();
    mockRepository.searchFoods.mockReset();
    previousOnline = onlineManager.isOnline();
  });

  afterEach(async () => {
    await act(async () => {
      client.clear();
      onlineManager.setOnline(previousOnline);
      await Promise.resolve();
    });
    jest.useRealTimers();
  });

  it('runs demo additions immediately while the query network is offline', async () => {
    const addedEntry = {
      calories: 3.8,
      carbohydrates: 0.68,
      fat: 0.07,
      foodId: oats.id,
      foodName: oats.name,
      id: 'entry-1',
      mealTypeId: 'lunch',
      protein: 0.13,
      quantity: 1,
      unit: 'g',
    };
    mockRepository.addFoodEntry.mockResolvedValue(addedEntry);
    const { result } = await renderHook(() => useAddFoodEntry(), {
      wrapper: createWrapper(client),
    });

    onlineManager.setOnline(false);
    await act(async () => {
      await result.current.mutateAsync({
        date: '2026-09-01',
        foodId: oats.id,
        mealTypeId: 'lunch',
        quantity: 1,
        unit: 'g',
        variantId: oats.variantId,
      });
    });

    expect(mockRepository.addFoodEntry).toHaveBeenCalledTimes(1);
    expect(result.current.isPaused).toBe(false);
  });

  it('keeps connected diary additions guarded while the connection is offline', async () => {
    mockSession = { mode: 'connected' };
    mockConnection = { isOnline: false };
    const { result } = await renderHook(() => useAddFoodEntry(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({
        date: '2026-09-01',
        foodId: oats.id,
        mealTypeId: 'lunch',
        quantity: 1,
        unit: 'g',
        variantId: oats.variantId,
      })).rejects.toThrow('Reconnect to add food to your connected diary.');
    });
    expect(mockRepository.addFoodEntry).not.toHaveBeenCalled();
  });

  it('hides old results as soon as the input advances beyond the debounced term', async () => {
    mockRepository.searchFoods.mockResolvedValue({ items: [oats], total: 1 });
    const { result, rerender } = await renderHook<FoodSearchHookResult, { term: string }>(({ term }) => useFoodSearch(term), {
      initialProps: { term: 'oats' },
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.data?.items).toEqual([oats]));
    jest.useFakeTimers();
    await rerender({ term: 'salmon' });

    expect(result.current.data).toBeUndefined();
    expect(result.current.data?.items).toBeUndefined();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
  });

  it('hides old results when the input is cleared or becomes shorter than two characters', async () => {
    mockRepository.searchFoods.mockResolvedValue({ items: [oats], total: 1 });
    const { result, rerender } = await renderHook<FoodSearchHookResult, { term: string }>(({ term }) => useFoodSearch(term), {
      initialProps: { term: 'oats' },
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.data?.items).toEqual([oats]));
    jest.useFakeTimers();
    await rerender({ term: 'o' });
    expect(result.current.data).toBeUndefined();

    await rerender({ term: '' });
    expect(result.current.data).toBeUndefined();
  });
});

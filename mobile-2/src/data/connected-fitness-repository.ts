import { z } from 'zod';

import { ApiError } from '@/data/api-error';
import type { FitnessRepository } from '@/data/fitness-repository';
import {
  dailySummarySchema,
  foodEntrySchema,
  foodSearchResultSchema,
  mealTypesSchema,
} from '@/domain/schemas';
import type { AddFoodEntryInput } from '@/domain/models';

export interface ConnectedRepositorySession {
  mode: 'connected';
  serverUrl: string;
  token: string;
  email: string;
}

export type FetchImplementation = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

function apiErrorFromUnknown(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError('network', 'Unable to reach the server.');
}

export function createConnectedFitnessRepository(
  session: ConnectedRepositorySession,
  fetchImpl: FetchImplementation = fetch,
): FitnessRepository {
  const baseUrl = session.serverUrl.replace(/\/$/, '');
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.token}`,
    'X-Meal-Model-Version': '2',
  };

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...headers,
          ...init?.headers,
        },
      });
    } catch (error) {
      throw apiErrorFromUnknown(error);
    }

    if (!response.ok) {
      throw new ApiError('http', 'The server could not complete the request.', response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('data-format', 'The server returned invalid data.', response.status);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ApiError('data-format', 'The server returned invalid data.', response.status);
    }

    return result.data;
  }

  return {
    getDailySummary(date) {
      return request(`/api/daily-summary?date=${encodeURIComponent(date)}`, dailySummarySchema);
    },
    searchFoods(term) {
      const query = new URLSearchParams({ search: term });
      return request(`/api/foods/foods-paginated?${query.toString()}`, foodSearchResultSchema);
    },
    getMealTypes() {
      return request('/api/meal-types', mealTypesSchema);
    },
    addFoodEntry(input: AddFoodEntryInput) {
      return request('/api/food-entries/', foodEntrySchema, {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    },
  };
}

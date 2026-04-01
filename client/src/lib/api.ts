import { supabase } from './supabase';

/**
 * Authenticated fetch helper for server API endpoints.
 * Automatically attaches the Supabase JWT as a Bearer token.
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `API error ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Food
// ---------------------------------------------------------------------------
export function fetchFoodItems() {
  return apiFetch<any[]>('/api/food');
}

// ---------------------------------------------------------------------------
// Users / Notes / Supplements
// ---------------------------------------------------------------------------
export function fetchMyClients() {
  return apiFetch<any[]>('/api/users/my-clients');
}

export function fetchUserProfile(userId: string) {
  return apiFetch<{ activeWorkoutPlan: string | null; activeMealPlan: string | null }>(
    `/api/users/${userId}/profile`,
  );
}

export function fetchNote(userId: string, noteType: string) {
  return apiFetch<{ value: string | null }>(`/api/users/${userId}/notes/${noteType}`);
}

export function updateNote(userId: string, field: string, value: string | null) {
  return apiFetch(`/api/users/${userId}/notes`, {
    method: 'PUT',
    body: JSON.stringify({ field, value }),
  });
}

export function fetchSupplements(userId: string) {
  return apiFetch<{ supplementsData: string | null }>(`/api/users/${userId}/supplements`);
}

export function updateSupplements(userId: string, supplementsData: string | null) {
  return apiFetch(`/api/users/${userId}/supplements`, {
    method: 'PUT',
    body: JSON.stringify({ supplementsData }),
  });
}

export function copyNotes(
  userId: string,
  field: string,
  targetClientIds: string[],
) {
  return apiFetch(`/api/users/${userId}/copy-notes`, {
    method: 'POST',
    body: JSON.stringify({ field, targetClientIds }),
  });
}

// ---------------------------------------------------------------------------
// Workout Plans
// ---------------------------------------------------------------------------
export interface WorkoutPlanQuery {
  level: string;
  workoutType: string;
  daysPerWeek: number;
  subCategory?: string;
}

export function fetchWorkoutPlan(userId: string, params: WorkoutPlanQuery) {
  const qs = new URLSearchParams({
    level: params.level,
    workoutType: params.workoutType,
    daysPerWeek: String(params.daysPerWeek),
    ...(params.subCategory ? { subCategory: params.subCategory } : {}),
  });
  return apiFetch<{ source: 'custom' | 'template'; plans: any[] }>(
    `/api/plans/${userId}/workout?${qs}`,
  );
}

export interface SaveWorkoutPayload {
  level: string;
  workoutType: string;
  daysPerWeek: number;
  subCategory?: string | null;
  days: { dayNumber: number; focus?: string; exercises: string }[];
  updateActivePreference?: boolean;
}

export function saveWorkoutPlan(userId: string, payload: SaveWorkoutPayload) {
  return apiFetch(`/api/plans/${userId}/workout`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function copyWorkoutPlan(
  userId: string,
  payload: SaveWorkoutPayload & { targetClientIds: string[] },
) {
  return apiFetch(`/api/plans/${userId}/workout/copy`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateActiveWorkout(
  userId: string,
  data: { level: string; workoutType: string; subCategory?: string | null; daysPerWeek: number },
) {
  return apiFetch(`/api/plans/${userId}/active-workout`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Meal Plans
// ---------------------------------------------------------------------------
export interface MealPlanQuery {
  caloriesTarget: number;
  dietType: string;
}

export function fetchMealPlan(userId: string, params: MealPlanQuery) {
  const qs = new URLSearchParams({
    caloriesTarget: String(params.caloriesTarget),
    dietType: params.dietType,
  });
  return apiFetch<{ source: 'custom' | 'template'; plans: any[] }>(
    `/api/plans/${userId}/meal?${qs}`,
  );
}

export interface MealRow {
  dayOfWeek: string;
  mealType: string;
  description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fats?: number | null;
}

export interface SaveMealPayload {
  caloriesTarget: number;
  dietType: string;
  meals: MealRow[];
  updateActivePreference?: boolean;
}

export function saveMealPlan(userId: string, payload: SaveMealPayload) {
  return apiFetch(`/api/plans/${userId}/meal`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function copyMealPlan(
  userId: string,
  payload: SaveMealPayload & { targetClientIds: string[] },
) {
  return apiFetch(`/api/plans/${userId}/meal/copy`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateActiveMeal(
  userId: string,
  data: { calories: number; dietType: string },
) {
  return apiFetch(`/api/plans/${userId}/active-meal`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Coach Management
// ---------------------------------------------------------------------------
export function fetchUnassignedClients() {
  return apiFetch<any[]>('/api/coach/unassigned-clients');
}

export function fetchCoachClientsFullList() {
  return apiFetch<any[]>('/api/coach/clients');
}

export function claimClient(clientId: string, packageType: string, packageDuration: number) {
  return apiFetch<{ success: boolean; emailSent: boolean }>('/api/coach/claim-client', {
    method: 'POST',
    body: JSON.stringify({ clientId, packageType, packageDuration }),
  });
}

export function updateClientPackage(
  clientId: string,
  data: { packageType: string; packageDuration: number; packageStartDate?: string },
) {
  return apiFetch(`/api/coach/clients/${clientId}/package`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function saveCoachNote(clientId: string, note: string) {
  return apiFetch(`/api/coach/clients/${clientId}/note`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  });
}

export function unassignClient(clientId: string) {
  return apiFetch(`/api/coach/clients/${clientId}/unassign`, {
    method: 'POST',
  });
}

export function fetchClientCheckIns(clientIds: string[], days = 60) {
  if (clientIds.length === 0) return Promise.resolve([]);
  return apiFetch<any[]>(`/api/coach/clients/check-ins?clientIds=${clientIds.join(',')}&days=${days}`);
}

export function fetchClientWeeklyCheckIns(clientIds: string[]) {
  if (clientIds.length === 0) return Promise.resolve([]);
  return apiFetch<any[]>(`/api/coach/clients/weekly-check-ins?clientIds=${clientIds.join(',')}`);
}

export function fetchClientMeasurements(clientIds: string[]) {
  if (clientIds.length === 0) return Promise.resolve([]);
  return apiFetch<any[]>(`/api/coach/clients/measurements?clientIds=${clientIds.join(',')}`);
}

export function fetchClientPhotos(clientIds: string[]) {
  if (clientIds.length === 0) return Promise.resolve([]);
  return apiFetch<any[]>(`/api/coach/clients/photos?clientIds=${clientIds.join(',')}`);
}

// ---------------------------------------------------------------------------
// Daily Check-Ins
// ---------------------------------------------------------------------------
export function fetchCheckIn(userId: string, date: string) {
  return apiFetch<any>(`/api/checkins/${userId}/${date}`);
}

export function saveCheckIn(userId: string, data: any) {
  return apiFetch<{ success: boolean; id: string }>(`/api/checkins/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Body Measurements
// ---------------------------------------------------------------------------
export function fetchMeasurement(userId: string, date: string) {
  return apiFetch<any>(`/api/tracking/measurements/${userId}/${date}`);
}

export function saveMeasurement(userId: string, data: any) {
  return apiFetch(`/api/tracking/measurements/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Workout Logs
// ---------------------------------------------------------------------------
export function fetchWorkoutLog(userId: string, date: string) {
  return apiFetch<any>(`/api/tracking/workout-logs/${userId}/${date}`);
}

export function saveWorkoutLog(userId: string, data: any) {
  return apiFetch(`/api/tracking/workout-logs/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Progress Photos
// ---------------------------------------------------------------------------
export function fetchProgressPhotos(userId: string, date: string) {
  return apiFetch<any>(`/api/tracking/photos/${userId}/${date}`);
}

export function saveProgressPhotos(userId: string, data: any) {
  return apiFetch(`/api/tracking/photos/${userId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

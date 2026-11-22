import { createAsyncOutbox } from '@/lib/asyncOutbox';
import type { DeliveryFailure } from '@/lib/delivery-errors';
import { supabase } from '@/lib/supabase';

import { persistCheckIn, type CheckInPayload } from './persistence';

const KEY = 'checkin-outbox';

type CheckInSaveInput = {
  userId: string;
  payload: CheckInPayload;
};

export type CheckInOutboxItem = CheckInSaveInput & {
  id: string;
  queuedAt: number;
  revision?: number;
  failure?: DeliveryFailure;
};

export type CheckInSaveResult =
  | { status: 'synced'; updated: boolean }
  | { status: 'offline'; updated: null }
  | { status: 'blocked'; updated: null; failure: DeliveryFailure };

export type CheckInDeliveryEvent = {
  userId: string;
  date: string;
  revision: number;
  payload: CheckInPayload;
  status: 'queued' | 'blocked' | 'synced';
  failure?: DeliveryFailure;
};
const deliveryListeners = new Set<(event: CheckInDeliveryEvent) => void>();
export function subscribeCheckInDelivery(listener: (event: CheckInDeliveryEvent) => void) {
  deliveryListeners.add(listener);
  return () => { deliveryListeners.delete(listener); };
}
const publish = (event: CheckInDeliveryEvent) => { for (const listener of deliveryListeners) listener(event); };

const checkInOutbox = createAsyncOutbox<CheckInSaveInput, CheckInOutboxItem>({
  storageKey: KEY,
  diagnosticArea: 'checkin',
  belongsTo: (item, userId) => item.userId === userId,
  sameTarget: (item, input) =>
    item.userId === input.userId && item.payload.date === input.payload.date,
  toItem: (input) => ({
    ...input,
    id: `${input.userId}:${input.payload.date}`,
    queuedAt: Date.now(),
  }),
  onDeliveryState: (item, result) => publish({
    userId: item.userId,
    date: item.payload.date,
    revision: item.revision ?? 0,
    payload: item.payload,
    status: result.status === 'offline' ? 'queued' : result.status,
    ...(result.status === 'blocked' ? { failure: result.failure } : {}),
  }),
  refreshAuth: async () => {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
  },
});

export function readCheckInOutbox(userId: string): Promise<CheckInOutboxItem[]> {
  return checkInOutbox.read(userId);
}

/** Retryable delivery failures remain queued; permanent failures remain blocked. */
export function saveCheckIn(
  userId: string,
  payload: CheckInPayload,
): Promise<CheckInSaveResult> {
  return checkInOutbox
    .save({ userId, payload }, (item) => persistCheckIn(item.userId, item.payload))
    .then((result): CheckInSaveResult => {
      if (result.status === 'synced') {
        return { status: 'synced', updated: result.value.updated };
      }
      if (result.status === 'blocked') {
        return { status: 'blocked', updated: null, failure: result.failure };
      }
      return { status: 'offline', updated: null };
    });
}

export function flushCheckInOutbox(userId: string): Promise<number> {
  return checkInOutbox.flush(userId, (item) => persistCheckIn(item.userId, item.payload));
}

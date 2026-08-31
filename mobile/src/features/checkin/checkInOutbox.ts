import { createAsyncOutbox } from '@/lib/asyncOutbox';

import { persistCheckIn, type CheckInPayload } from './persistence';

const KEY = 'checkin-outbox';

type CheckInSaveInput = {
  userId: string;
  payload: CheckInPayload;
};

export type CheckInOutboxItem = CheckInSaveInput & {
  id: string;
  queuedAt: number;
};

export type CheckInSaveResult =
  | { status: 'synced'; updated: boolean }
  | { status: 'offline'; updated: null };

const checkInOutbox = createAsyncOutbox<CheckInSaveInput, CheckInOutboxItem>({
  storageKey: KEY,
  belongsTo: (item, userId) => item.userId === userId,
  sameTarget: (item, input) =>
    item.userId === input.userId && item.payload.date === input.payload.date,
  toItem: (input) => ({
    ...input,
    id: `${input.userId}:${input.payload.date}`,
    queuedAt: Date.now(),
  }),
});

export function readCheckInOutbox(userId: string): Promise<CheckInOutboxItem[]> {
  return checkInOutbox.read(userId);
}

/** A network failure becomes a durable queued save, not lost client input. */
export function saveCheckIn(
  userId: string,
  payload: CheckInPayload,
): Promise<CheckInSaveResult> {
  return checkInOutbox
    .save({ userId, payload }, (input) => persistCheckIn(input.userId, input.payload))
    .then((result) =>
      result.status === 'synced'
        ? { status: 'synced', updated: result.value.updated }
        : { status: 'offline', updated: null },
    );
}

export function flushCheckInOutbox(userId: string): Promise<number> {
  return checkInOutbox.flush(userId, (item) => persistCheckIn(item.userId, item.payload));
}

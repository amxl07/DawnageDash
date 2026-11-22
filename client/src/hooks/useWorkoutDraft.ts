import { useCallback, useEffect, useRef } from "react";
import {
  newLegacyWorkout,
  readWorkoutRecord,
  workoutStructureMatches,
  workoutContextMatches,
  type WorkoutRecord,
  type WorkoutRecordContext,
  type WorkoutRecordExercise,
} from "../lib/workout-record";

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DraftTimerScheduler {
  set(callback: () => void): unknown;
  clear(handle: unknown): void;
}

export type WorkoutDraftIdentity = Omit<WorkoutRecordContext, "original">;

export interface WorkoutDraftPayload {
  workoutTitle: string;
  exercises: WorkoutRecordExercise[];
  selectedPlanId: string;
  context: WorkoutRecordContext;
  recordFormat: WorkoutRecord["format"];
}

export interface StoredWorkoutDraft extends WorkoutDraftPayload {
  version: 2;
  savedAt: number;
}

export type WorkoutDraftInspection =
  | { status: "none" }
  | { status: "ready"; draft: StoredWorkoutDraft }
  | { status: "invalid" | "unsupported"; reason: string };

export type WorkoutDraftResolution =
  | { status: "none" }
  | { status: "restore"; draft: StoredWorkoutDraft }
  | { status: "blocked"; reason: string };

export type NewWorkoutDraftResolution =
  | { status: "none" }
  | { status: "restore"; draft: StoredWorkoutDraft; document: WorkoutRecord }
  | { status: "blocked"; reason: string };

type LegacyWorkoutDraft = {
  workoutTitle: string;
  exercises: { name: string; sets: { reps: string; weight: string; rpe: string }[] }[];
  selectedPlanId: string;
  existingLogId: string | null;
  savedAt: number;
};

export type LegacyWorkoutDraftInspection =
  | { status: "none" }
  | { status: "ready"; draft: LegacyWorkoutDraft }
  | { status: "invalid"; reason: string };

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function workoutDraftKey(identity: WorkoutDraftIdentity): string {
  return `workout-draft:v2:${identity.userId}:${identity.dateKey}:${identity.logId ?? "new"}`;
}

export function legacyWorkoutDraftKey(userId: string, dateKey: string): string {
  return `workout-draft:${userId}:${dateKey}`;
}

function sameIdentity(context: WorkoutRecordContext, identity: WorkoutDraftIdentity): boolean {
  return context.userId === identity.userId && context.dateKey === identity.dateKey && context.logId === identity.logId;
}

export function writeWorkoutDraft(
  storage: DraftStorage,
  identity: WorkoutDraftIdentity,
  payload: WorkoutDraftPayload,
  now = Date.now(),
): void {
  if (!sameIdentity(payload.context, identity)) {
    throw new Error("The draft context does not match the active workout.");
  }
  const draft: StoredWorkoutDraft = { ...payload, version: 2, savedAt: now };
  storage.setItem(workoutDraftKey(identity), JSON.stringify(draft));
}

export function inspectWorkoutDraft(
  storage: DraftStorage,
  identity: WorkoutDraftIdentity,
  now = Date.now(),
): WorkoutDraftInspection {
  const raw = storage.getItem(workoutDraftKey(identity));
  if (!raw) return { status: "none" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "invalid", reason: "The saved draft is damaged and was left untouched." };
  }
  if (!isRecord(value)) return { status: "invalid", reason: "The saved draft is invalid and was left untouched." };
  if (value.version !== 2) {
    return { status: "unsupported", reason: "This draft was written by a newer or unsupported version and was left untouched." };
  }
  if (typeof value.savedAt !== "number" || !Number.isFinite(value.savedAt)) {
    return { status: "invalid", reason: "The saved draft has no valid timestamp and was left untouched." };
  }
  if (now - value.savedAt > DRAFT_EXPIRY_MS) {
    storage.removeItem(workoutDraftKey(identity));
    return { status: "none" };
  }
  if (typeof value.workoutTitle !== "string" || typeof value.selectedPlanId !== "string" ||
      !Array.isArray(value.exercises) || !isRecord(value.context) || typeof value.recordFormat !== "string") {
    return { status: "invalid", reason: "The saved draft is incomplete and was left untouched." };
  }
  const context = value.context as unknown as WorkoutRecordContext;
  if (typeof context.userId !== "string" || typeof context.dateKey !== "string" ||
      (context.logId !== null && typeof context.logId !== "string")) {
    return { status: "invalid", reason: "The saved draft has an invalid workout context and was left untouched." };
  }
  return { status: "ready", draft: value as unknown as StoredWorkoutDraft };
}

export function inspectLegacyWorkoutDraft(
  storage: DraftStorage,
  userId: string,
  dateKey: string,
  now = Date.now(),
): LegacyWorkoutDraftInspection {
  const key = legacyWorkoutDraftKey(userId, dateKey);
  const raw = storage.getItem(key);
  if (!raw) return { status: "none" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "invalid", reason: "An older workout draft is damaged and was left untouched." };
  }
  if (!isRecord(value) || typeof value.savedAt !== "number" || !Number.isFinite(value.savedAt)) {
    return { status: "invalid", reason: "An older workout draft is invalid and was left untouched." };
  }
  if (now - value.savedAt > DRAFT_EXPIRY_MS) {
    storage.removeItem(key);
    return { status: "none" };
  }
  if (typeof value.workoutTitle !== "string" || typeof value.selectedPlanId !== "string" ||
      (value.existingLogId !== null && typeof value.existingLogId !== "string") || !Array.isArray(value.exercises)) {
    return { status: "invalid", reason: "An older workout draft is incomplete and was left untouched." };
  }
  const exercises: LegacyWorkoutDraft["exercises"] = [];
  for (const exercise of value.exercises) {
    if (!isRecord(exercise) || typeof exercise.name !== "string" || !Array.isArray(exercise.sets)) {
      return { status: "invalid", reason: "An older workout draft has an unsupported structure and was left untouched." };
    }
    const sets: LegacyWorkoutDraft["exercises"][number]["sets"] = [];
    for (const set of exercise.sets) {
      if (!isRecord(set) || typeof set.reps !== "string" || typeof set.weight !== "string" || typeof set.rpe !== "string") {
        return { status: "invalid", reason: "An older workout draft has an unsupported set and was left untouched." };
      }
      sets.push({ reps: set.reps, weight: set.weight, rpe: set.rpe });
    }
    exercises.push({ name: exercise.name, sets });
  }
  return { status: "ready", draft: {
    workoutTitle: value.workoutTitle,
    selectedPlanId: value.selectedPlanId,
    existingLogId: value.existingLogId,
    savedAt: value.savedAt,
    exercises,
  } };
}

export function resolveLegacyWorkoutDraft(
  inspection: LegacyWorkoutDraftInspection,
  current: WorkoutRecordContext,
): WorkoutDraftResolution {
  if (inspection.status === "none") return { status: "none" };
  if (inspection.status !== "ready") return { status: "blocked", reason: inspection.reason };
  if (current.logId !== null || inspection.draft.existingLogId !== null || current.original !== null) {
    return { status: "blocked", reason: "This older draft has no verified source context, so it cannot replace an existing workout." };
  }
  const document = newLegacyWorkout(inspection.draft.exercises);
  return { status: "restore", draft: {
    version: 2,
    savedAt: inspection.draft.savedAt,
    workoutTitle: inspection.draft.workoutTitle,
    selectedPlanId: inspection.draft.selectedPlanId,
    exercises: document.exercises,
    context: { ...current, original: document.original },
    recordFormat: "legacy",
  } };
}

export function resolveWorkoutDraft(
  inspection: WorkoutDraftInspection,
  current: WorkoutRecordContext,
  document: WorkoutRecord,
): WorkoutDraftResolution {
  if (inspection.status === "none") return { status: "none" };
  if (inspection.status !== "ready") return { status: "blocked", reason: inspection.reason };
  const { draft } = inspection;
  if (!workoutContextMatches(draft.context, current)) {
    return { status: "blocked", reason: "The workout changed since this draft was saved. Reload or discard the draft before editing." };
  }
  if (draft.recordFormat !== document.format || !document.editable) {
    return { status: "blocked", reason: "This draft cannot be safely applied to the current workout format." };
  }
  if (!workoutStructureMatches(document, draft.exercises)) {
    return { status: "blocked", reason: "The saved draft structure no longer matches this workout. Reload or discard the draft." };
  }
  return { status: "restore", draft };
}

export function resolveNewWorkoutDraft(
  inspection: WorkoutDraftInspection,
  identity: WorkoutDraftIdentity,
): NewWorkoutDraftResolution {
  if (inspection.status === "none") return { status: "none" };
  if (inspection.status !== "ready") return { status: "blocked", reason: inspection.reason };
  if (identity.logId !== null || inspection.draft.recordFormat !== "legacy" || inspection.draft.context.logId !== null) {
    return { status: "blocked", reason: "This saved content is not a compatible new workout draft." };
  }
  const document = readWorkoutRecord(inspection.draft.context.original);
  const current: WorkoutRecordContext = { ...identity, original: inspection.draft.context.original };
  const resolution = resolveWorkoutDraft(inspection, current, document);
  return resolution.status === "restore" ? { ...resolution, document } : resolution;
}

export function removeWorkoutDraft(storage: DraftStorage, identity: WorkoutDraftIdentity): void {
  storage.removeItem(workoutDraftKey(identity));
}

export function removeLegacyWorkoutDraft(storage: DraftStorage, userId: string, dateKey: string): void {
  storage.removeItem(legacyWorkoutDraftKey(userId, dateKey));
}

const browserDraftTimers: DraftTimerScheduler = {
  set: callback => setTimeout(callback, 500),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class WorkoutDraftWriteQueue {
  private handle: unknown = null;
  private pending: (() => void) | null = null;
  private generation = 0;

  constructor(private readonly timers: DraftTimerScheduler = browserDraftTimers) {}

  schedule(storage: DraftStorage, identity: WorkoutDraftIdentity, payload: WorkoutDraftPayload): void {
    this.cancel();
    const generation = this.generation;
    this.pending = () => {
      if (generation !== this.generation) return;
      try {
        writeWorkoutDraft(storage, identity, payload);
      } catch {
        // Storage can be unavailable or full. The in-memory form remains intact.
      }
    };
    this.handle = this.timers.set(() => {
      if (generation !== this.generation) return;
      this.handle = null;
      const write = this.pending;
      this.pending = null;
      write?.();
    });
  }

  flush(): void {
    if (this.handle !== null) this.timers.clear(this.handle);
    this.handle = null;
    const write = this.pending;
    this.pending = null;
    write?.();
  }

  cancel(): void {
    this.generation += 1;
    if (this.handle !== null) this.timers.clear(this.handle);
    this.handle = null;
    this.pending = null;
  }

  cancelAndRemove(storage: DraftStorage, identity: WorkoutDraftIdentity): void {
    this.cancel();
    removeWorkoutDraft(storage, identity);
  }
}

export function useWorkoutDraft(userId: string | undefined, dateKey: string, logId: string | null) {
  const queueRef = useRef<WorkoutDraftWriteQueue | null>(null);
  if (!queueRef.current) queueRef.current = new WorkoutDraftWriteQueue();
  const identity = userId ? { userId, dateKey, logId } : null;
  const identityKey = identity ? workoutDraftKey(identity) : "no-workout-draft";

  const flushDraft = useCallback(() => {
    queueRef.current?.flush();
  }, []);

  const saveDraft = useCallback((data: WorkoutDraftPayload) => {
    if (!identity) return;
    queueRef.current?.schedule(sessionStorage, identity, data);
  }, [identityKey]);

  const loadDraft = useCallback((): WorkoutDraftInspection => {
    if (!identity) return { status: "none" };
    try {
      return inspectWorkoutDraft(sessionStorage, identity);
    } catch {
      return { status: "invalid", reason: "Saved drafts are unavailable in this browser session." };
    }
  }, [identityKey]);

  const loadLegacyDraft = useCallback((): LegacyWorkoutDraftInspection => {
    if (!userId) return { status: "none" };
    try {
      return inspectLegacyWorkoutDraft(sessionStorage, userId, dateKey);
    } catch {
      return { status: "invalid", reason: "Older saved drafts are unavailable in this browser session." };
    }
  }, [userId, dateKey]);

  const clearDraft = useCallback(() => {
    if (!identity) return;
    try {
      queueRef.current?.cancelAndRemove(sessionStorage, identity);
    } catch {
      // Ignore unavailable storage; the active form can still close safely.
    }
  }, [identityKey]);

  const clearLegacyDraft = useCallback(() => {
    if (!userId) return;
    try {
      removeLegacyWorkoutDraft(sessionStorage, userId, dateKey);
    } catch {
      // Ignore unavailable storage; the active form remains intact.
    }
  }, [userId, dateKey]);

  useEffect(() => flushDraft, [identityKey, flushDraft]);

  return { saveDraft, loadDraft, loadLegacyDraft, clearDraft, clearLegacyDraft, flushDraft };
}

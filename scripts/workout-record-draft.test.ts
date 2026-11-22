import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newLegacyWorkout, readWorkoutRecord, serializeWorkoutRecord } from '../client/src/lib/workout-record';
import {
  inspectLegacyWorkoutDraft,
  inspectWorkoutDraft,
  WorkoutDraftWriteQueue,
  removeWorkoutDraft,
  resolveLegacyWorkoutDraft,
  resolveNewWorkoutDraft,
  resolveWorkoutDraft,
  workoutDraftKey,
  writeWorkoutDraft,
  type DraftStorage,
  type WorkoutDraftIdentity,
} from '../client/src/hooks/useWorkoutDraft';

class MemoryStorage implements DraftStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const source = {
  version: 2,
  planDayNumber: 3,
  sessionMeta: { device: 'mobile', keep: true },
  exercises: [{
    name: 'Plank', tracking: 'duration',
    sets: [{ setNumber: 1, duration: '60', reps: '', weight: '', rpe: '7', kind: 'work', completed: true, note: 'steady' }],
  }],
};

const identity: WorkoutDraftIdentity = { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a' };

test('a saved-record draft round trips its exact source context and editable metadata', () => {
  const storage = new MemoryStorage();
  const document = readWorkoutRecord(source);
  document.exercises[0].sets[0].duration = '75.5';
  writeWorkoutDraft(storage, identity, {
    workoutTitle: 'Core', selectedPlanId: 'custom', exercises: document.exercises,
    context: { ...identity, original: JSON.stringify(source) }, recordFormat: 'v2',
  }, 1_000);

  const inspection = inspectWorkoutDraft(storage, identity, 2_000);
  assert.equal(inspection.status, 'ready');
  assert.equal(inspection.draft?.exercises[0].sets[0].duration, '75.5');
  assert.equal(inspection.draft?.exercises[0].sets[0].completed, true);
  assert.deepEqual(inspection.draft?.context.original, JSON.stringify(source));
  assert.equal(resolveWorkoutDraft(inspection, { ...identity, original: source }, readWorkoutRecord(source)).status, 'restore');
});

test('account, day and row switches cannot read or remove another context draft', () => {
  const storage = new MemoryStorage();
  const document = readWorkoutRecord(source);
  writeWorkoutDraft(storage, identity, {
    workoutTitle: 'Core', selectedPlanId: 'custom', exercises: document.exercises,
    context: { ...identity, original: source }, recordFormat: 'v2',
  }, 1_000);
  const originalKey = workoutDraftKey(identity);

  for (const other of [
    { ...identity, userId: 'user-b' },
    { ...identity, dateKey: '2026-09-30' },
    { ...identity, logId: 'log-b' },
  ]) {
    assert.equal(inspectWorkoutDraft(storage, other, 2_000).status, 'none');
    removeWorkoutDraft(storage, other);
    assert.ok(storage.getItem(originalKey));
  }
});

test('a source mismatch blocks restore and preserves the draft', () => {
  const storage = new MemoryStorage();
  const document = readWorkoutRecord(source);
  writeWorkoutDraft(storage, identity, {
    workoutTitle: 'Core', selectedPlanId: 'custom', exercises: document.exercises,
    context: { ...identity, original: source }, recordFormat: 'v2',
  }, 1_000);
  const inspection = inspectWorkoutDraft(storage, identity, 2_000);
  const changed = structuredClone(source);
  changed.exercises[0].sets[0].duration = '90';
  const resolution = resolveWorkoutDraft(inspection, { ...identity, original: changed }, readWorkoutRecord(changed));
  assert.equal(resolution.status, 'blocked');
  assert.match(resolution.reason ?? '', /changed/i);
  assert.ok(storage.getItem(workoutDraftKey(identity)));
});

test('unsupported future draft versions remain stored and are reported as blocked', () => {
  const storage = new MemoryStorage();
  const key = workoutDraftKey(identity);
  storage.setItem(key, JSON.stringify({ version: 99, savedAt: 1_000, context: identity }));

  const inspection = inspectWorkoutDraft(storage, identity, 2_000);
  assert.equal(inspection.status, 'unsupported');
  assert.match(inspection.reason ?? '', /newer/i);
  assert.ok(storage.getItem(key));
});

test('a metadata-free legacy draft cannot restore over an existing workout', () => {
  const storage = new MemoryStorage();
  const key = 'workout-draft:user-a:2026-09-29';
  storage.setItem(key, JSON.stringify({
    workoutTitle: 'Old edit', selectedPlanId: 'custom', existingLogId: 'log-a', savedAt: 1_000,
    exercises: [{ id: 'old-id', name: 'Squat', sets: [{ reps: '8', weight: '60', rpe: '' }] }],
  }));

  const inspection = inspectLegacyWorkoutDraft(storage, 'user-a', '2026-09-29', 2_000);
  const resolution = resolveLegacyWorkoutDraft(inspection, { ...identity, original: source });
  assert.equal(resolution.status, 'blocked');
  assert.match(resolution.reason ?? '', /source context/i);
  assert.ok(storage.getItem(key));
});

test('a legacy draft for a new workout can migrate without retaining unsafe row identity', () => {
  const storage = new MemoryStorage();
  storage.setItem('workout-draft:user-a:2026-09-29', JSON.stringify({
    workoutTitle: 'New session', selectedPlanId: 'plan-a', existingLogId: null, savedAt: 1_000,
    exercises: [{ id: 'random-old-id', name: 'Row', sets: [{ reps: '10', weight: '40.5', rpe: '7' }] }],
  }));

  const inspection = inspectLegacyWorkoutDraft(storage, 'user-a', '2026-09-29', 2_000);
  const resolution = resolveLegacyWorkoutDraft(inspection, {
    userId: 'user-a', dateKey: '2026-09-29', logId: null, original: null,
  });
  assert.equal(resolution.status, 'restore');
  if (resolution.status !== 'restore') return;
  assert.equal(resolution.draft.recordFormat, 'legacy');
  assert.equal(resolution.draft.context.logId, null);
  assert.deepEqual(resolution.draft.context.original, [{ exercise: 'Row', sets: [{ setNumber: 1, reps: '10', weight: '40.5', rpe: '7' }] }]);
  assert.equal(resolution.draft.exercises[0].id, 'exercise-1');
  assert.equal(resolution.draft.exercises[0].sets[0].weight, '40.5');
});

test('a scoped new-workout draft verifies against its saved pre-edit baseline', () => {
  const storage = new MemoryStorage();
  const newIdentity: WorkoutDraftIdentity = { userId: 'user-a', dateKey: '2026-09-29', logId: null };
  const baseline = newLegacyWorkout([{ name: 'Row', sets: [{ reps: '', weight: '', rpe: '' }] }]);
  const edited = structuredClone(baseline.exercises);
  edited[0].sets[0].reps = '10';
  edited[0].sets[0].weight = '40.5';
  writeWorkoutDraft(storage, newIdentity, {
    workoutTitle: 'Pull', selectedPlanId: 'plan-a', exercises: edited,
    context: { ...newIdentity, original: baseline.original }, recordFormat: 'legacy',
  }, 1_000);

  const resolution = resolveNewWorkoutDraft(inspectWorkoutDraft(storage, newIdentity, 2_000), newIdentity);
  assert.equal(resolution.status, 'restore');
  if (resolution.status !== 'restore') return;
  assert.deepEqual(resolution.document.original, baseline.original);
  assert.equal(resolution.draft.exercises[0].sets[0].weight, '40.5');
});

test('a new-workout key refuses a draft carrying an existing or non-legacy record format', () => {
  const storage = new MemoryStorage();
  const newIdentity: WorkoutDraftIdentity = { userId: 'user-a', dateKey: '2026-09-29', logId: null };
  const document = readWorkoutRecord(source);
  writeWorkoutDraft(storage, newIdentity, {
    workoutTitle: 'Copied mobile row', selectedPlanId: 'custom', exercises: document.exercises,
    context: { ...newIdentity, original: source }, recordFormat: 'v2',
  }, 1_000);
  const resolution = resolveNewWorkoutDraft(inspectWorkoutDraft(storage, newIdentity, 2_000), newIdentity);
  assert.equal(resolution.status, 'blocked');
  assert.match(resolution.reason ?? '', /new workout/i);
});

test('fast successful save cancels a pending draft write before clearing its exact key', () => {
  const storage = new MemoryStorage();
  const callbacks = new Map<number, () => void>();
  let nextTimer = 1;
  const queue = new WorkoutDraftWriteQueue({
    set(callback) { const id = nextTimer++; callbacks.set(id, callback); return id; },
    clear(id) { callbacks.delete(id); },
  });
  const newIdentity: WorkoutDraftIdentity = { userId: 'user-a', dateKey: '2026-09-29', logId: null };
  const document = newLegacyWorkout([{ name: 'Row', sets: [{ reps: '', weight: '', rpe: '' }] }]);
  queue.schedule(storage, newIdentity, {
    workoutTitle: 'Pull', selectedPlanId: 'plan-a', exercises: document.exercises,
    context: { ...newIdentity, original: document.original }, recordFormat: 'legacy',
  });
  const staleCallback = callbacks.values().next().value as (() => void) | undefined;

  queue.cancelAndRemove(storage, newIdentity);
  staleCallback?.();
  assert.equal(storage.getItem(workoutDraftKey(newIdentity)), null);
});

test('an intermediate invalid value restores when source and structure match, then can be corrected', () => {
  for (const edit of [
    { exercise: 0, set: 0, field: 'duration' as const, value: '', corrected: '75' },
    { exercise: 0, set: 0, field: 'duration' as const, value: 'later', corrected: '75.5' },
    { exercise: 0, set: 0, field: 'rpe' as const, value: 'hard', corrected: '8' },
  ]) {
    const storage = new MemoryStorage();
    const document = readWorkoutRecord(source);
    const exercises = structuredClone(document.exercises);
    exercises[edit.exercise].sets[edit.set][edit.field] = edit.value;
    writeWorkoutDraft(storage, identity, {
      workoutTitle: 'Core', selectedPlanId: 'custom', exercises,
      context: { ...identity, original: source }, recordFormat: 'v2',
    }, 1_000);
    const resolution = resolveWorkoutDraft(inspectWorkoutDraft(storage, identity, 2_000), { ...identity, original: source }, document);
    assert.equal(resolution.status, 'restore');
    if (resolution.status !== 'restore') continue;
    assert.throws(() => serializeWorkoutRecord(document, resolution.draft.exercises), /valid|completed/i);
    resolution.draft.exercises[edit.exercise].sets[edit.set][edit.field] = edit.corrected;
    assert.doesNotThrow(() => serializeWorkoutRecord(document, resolution.draft.exercises));
  }
});

test('draft restore still blocks changed exercise and set identities', () => {
  const storage = new MemoryStorage();
  const document = readWorkoutRecord(source);
  const exercises = structuredClone(document.exercises);
  exercises[0].sets[0].id = 'different-set';
  writeWorkoutDraft(storage, identity, {
    workoutTitle: 'Core', selectedPlanId: 'custom', exercises,
    context: { ...identity, original: source }, recordFormat: 'v2',
  }, 1_000);
  const resolution = resolveWorkoutDraft(inspectWorkoutDraft(storage, identity, 2_000), { ...identity, original: source }, document);
  assert.equal(resolution.status, 'blocked');
  assert.match(resolution.reason ?? '', /structure/i);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareWorkoutLogSave, workoutSaveSnapshotMatches } from '../client/src/lib/workout-log-save';
import { newLegacyWorkout, readWorkoutRecord } from '../client/src/lib/workout-record';

const mobile = {
  version: 2,
  planDayNumber: 2,
  metadata: { source: 'ios', keep: true },
  exercises: [
    { name: 'Plank', tracking: 'duration', sets: [{ setNumber: 1, duration: '60', reps: '', weight: '', rpe: '7', kind: 'work', completed: true }] },
    { name: 'Squat', tracking: 'weight-reps', sets: [{ setNumber: 1, duration: '', reps: '8', weight: '60.25', rpe: '8', kind: 'work', completed: true, note: 'keep' }] },
  ],
};

test('dialog update preparation preserves mobile metadata and returns an exact scoped content guard', () => {
  const sourceContent = JSON.stringify(mobile);
  const document = readWorkoutRecord(sourceContent);
  const exercises = structuredClone(document.exercises);
  exercises[1].sets[0].weight = '62.75';
  const prepared = prepareWorkoutLogSave({
    active: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a' },
    context: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a', original: sourceContent },
    sourceContent,
    document,
    exercises,
    workoutTitle: 'Lower body',
    revision: 7,
  });

  assert.equal(prepared.mode, 'update');
  if (prepared.mode !== 'update') return;
  assert.deepEqual(prepared.where, { id: 'log-a', userId: 'user-a', dateKey: '2026-09-29', originalContent: sourceContent });
  const saved = JSON.parse(prepared.values.content);
  assert.equal(saved.exercises[1].sets[0].weight, '62.75');
  assert.equal(saved.exercises[0].sets[0].duration, '60');
  assert.deepEqual(saved.metadata, mobile.metadata);
  assert.equal(saved.exercises[1].sets[0].note, 'keep');
});

test('dialog save preparation refuses account, day, row and source switches', () => {
  const sourceContent = JSON.stringify(mobile);
  const document = readWorkoutRecord(sourceContent);
  const base = {
    active: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a' },
    context: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a', original: sourceContent },
    sourceContent,
    document,
    exercises: document.exercises,
    workoutTitle: 'Session',
    revision: 7,
  };
  for (const changed of [
    { active: { ...base.active, userId: 'user-b' } },
    { active: { ...base.active, dateKey: '2026-09-30' } },
    { active: { ...base.active, logId: 'log-b' } },
    { sourceContent: JSON.stringify({ ...mobile, planDayNumber: 4 }) },
  ]) {
    assert.throws(() => prepareWorkoutLogSave({ ...base, ...changed }), /changed|reload/i);
  }
});

test('dialog insert preparation retains the legacy new-workout writer contract', () => {
  const document = newLegacyWorkout([{ name: 'Row', sets: [{ reps: '', weight: '', rpe: '' }] }]);
  const exercises = structuredClone(document.exercises);
  exercises[0].sets[0].reps = '10';
  exercises[0].sets[0].weight = '40.5';
  const prepared = prepareWorkoutLogSave({
    active: { userId: 'user-a', dateKey: '2026-09-29', logId: null },
    context: { userId: 'user-a', dateKey: '2026-09-29', logId: null, original: document.original },
    sourceContent: null,
    document,
    exercises,
    workoutTitle: 'Pull',
    revision: 3,
  });
  assert.equal(prepared.mode, 'insert');
  assert.deepEqual(JSON.parse(prepared.values.content), [{ exercise: 'Row', sets: [{ setNumber: 1, reps: '10', weight: '40.5', rpe: '' }] }]);
});

test('dialog save preparation rejects read-only future records', () => {
  const document = readWorkoutRecord({ version: 99, exercises: mobile.exercises });
  assert.throws(() => prepareWorkoutLogSave({
    active: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a' },
    context: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a', original: document.original },
    sourceContent: document.original,
    document,
    exercises: document.exercises,
    workoutTitle: 'Future',
    revision: 1,
  }), /read-only/i);
});

test('save success cleanup is allowed only for the unchanged active editor generation', () => {
  const sourceContent = JSON.stringify(mobile);
  const document = readWorkoutRecord(sourceContent);
  const prepared = prepareWorkoutLogSave({
    active: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a' },
    context: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a', original: sourceContent },
    sourceContent,
    document,
    exercises: document.exercises,
    workoutTitle: 'Session',
    revision: 12,
  });
  const same = {
    active: { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-a' },
    context: prepared.snapshot.context,
    revision: 12,
  };
  assert.equal(workoutSaveSnapshotMatches(prepared.snapshot, same), true);
  for (const current of [
    { ...same, revision: 13 },
    { ...same, active: { ...same.active, userId: 'user-b' } },
    { ...same, active: { ...same.active, dateKey: '2026-09-30' } },
    { ...same, active: { ...same.active, logId: 'log-b' } },
    { ...same, context: { ...same.context, original: JSON.stringify({ ...mobile, planDayNumber: 4 }) } },
  ]) assert.equal(workoutSaveSnapshotMatches(prepared.snapshot, current), false);
});

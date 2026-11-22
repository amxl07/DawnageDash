import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newLegacyWorkout, readWorkoutRecord, serializeWorkoutRecord, workoutContextMatches, workoutHistoryValues } from '../client/src/lib/workout-record';

const mobile = {
  version: 2, planDayNumber: 4, sessionMeta: { effort: 'comfortable' },
  exercises: [
    { name: 'Plank', tracking: 'duration', custom: { keep: true }, sets: [
      { setNumber: 1, duration: '60', reps: '', weight: '', rpe: '7', kind: 'work', completed: true, tempo: 'steady' },
    ] },
    { name: 'Squat', tracking: 'weight-reps', sets: [
      { setNumber: 1, reps: '5', weight: '20', rpe: '', duration: '', kind: 'warmup', completed: false, note: 'Not done' },
      { setNumber: 2, reps: '8', weight: 62.25, rpe: '', duration: '', kind: 'work', completed: true },
    ] },
  ],
};

test('mobile duration, warm-up, incomplete and plan-day facts are visible', () => {
  const doc = readWorkoutRecord(JSON.stringify(mobile));
  assert.equal(doc.editable, true);
  assert.equal(doc.format, 'v2');
  assert.equal(doc.planDayNumber, 4);
  assert.equal(doc.exercises[0].tracking, 'duration');
  assert.equal(doc.exercises[0].sets[0].duration, '60');
  assert.equal(doc.exercises[0].sets[0].completed, true);
  assert.equal(doc.exercises[1].sets[0].kind, 'warmup');
  assert.equal(doc.exercises[1].sets[0].completed, false);
});

test('an unrelated decimal weight edit preserves every duration, completion and metadata field', () => {
  const source = structuredClone(mobile);
  const doc = readWorkoutRecord(source);
  doc.exercises[1].sets[1].weight = '64.75';
  const expected = structuredClone(mobile) as any;
  expected.exercises[1].sets[1].weight = '64.75';
  assert.deepEqual(JSON.parse(serializeWorkoutRecord(doc, doc.exercises)), expected);
  assert.deepEqual(source, mobile, 'Projection editing must not mutate the source');
});

test('an unchanged save retains original scalar types and absent fields', () => {
  const doc = readWorkoutRecord(mobile);
  assert.deepEqual(JSON.parse(serializeWorkoutRecord(doc, doc.exercises)), mobile);
});

test('duration edits use seconds without converting tracking or changing other sets', () => {
  const doc = readWorkoutRecord(mobile);
  doc.exercises[0].sets[0].duration = '90.5';
  const saved = JSON.parse(serializeWorkoutRecord(doc, doc.exercises));
  assert.equal(saved.exercises[0].sets[0].duration, '90.5');
  assert.deepEqual(saved.exercises[1], mobile.exercises[1]);
});

test('unknown future records and malformed structures stay visible and read-only', () => {
  for (const raw of [
    { ...mobile, version: 3 },
    { ...mobile, exercises: [{ name: 'Bike', tracking: 'distance', sets: [] }] },
    { ...mobile, exercises: [{ name: 'Squat', tracking: 'weight-reps', sets: [{ reps: { value: 5 } }] }] },
    { version: 2, exercises: null },
  ]) {
    const doc = readWorkoutRecord(raw);
    assert.equal(doc.editable, false);
    assert.ok(doc.exercises.length || doc.text);
    assert.throws(() => serializeWorkoutRecord(doc, doc.exercises), /read-only/);
    assert.deepEqual(doc.original, raw);
  }
});

test('legacy arrays retain their original container, numeric zeros and metadata', () => {
  const raw = [{ exercise: 'Push-up', note: 'Keep', sets: [{ setNumber: 1, reps: 10, weight: 0, rpe: '', completed: false }] }];
  const doc = readWorkoutRecord(JSON.stringify(raw));
  assert.equal(doc.exercises[0].sets[0].weight, '0');
  assert.equal(doc.exercises[0].sets[0].completed, false);
  assert.deepEqual(JSON.parse(serializeWorkoutRecord(doc, doc.exercises)), raw);
});

test('legacy sets without a completion field do not invent a completion status', () => {
  const raw = [{ exercise: 'Row', sets: [{ setNumber: 1, reps: '10', weight: '40', rpe: '' }] }];
  const doc = readWorkoutRecord(raw);
  assert.equal(doc.exercises[0].sets[0].completed, null);
  assert.equal(workoutHistoryValues([{ content: raw }]).row.sets[0].weight, '40');
});

test('legacy objects, strings, nulls and mixed lists render safely without destructive editing', () => {
  for (const raw of ['A relaxed walk.', { Exercise: 'Plank', Sets: 2, Duration: '1 min' }, ['Walking', null, { Exercise: 'Plank', Duration: '30 sec' }], null]) {
    const doc = readWorkoutRecord(raw);
    assert.equal(doc.editable, false);
    assert.throws(() => serializeWorkoutRecord(doc, doc.exercises));
  }
  assert.match(readWorkoutRecord({ Exercise: 'Plank', Sets: 2, Duration: '1 min' }).exercises[0].summary!, /Duration: 1 min/);
});

test('reordering, removing or changing set identity is rejected instead of moving metadata', () => {
  const reorder = readWorkoutRecord(mobile);
  reorder.exercises.reverse();
  assert.throws(() => serializeWorkoutRecord(reorder, reorder.exercises), /structure/);
  const remove = readWorkoutRecord(mobile);
  remove.exercises[1].sets.pop();
  assert.throws(() => serializeWorkoutRecord(remove, remove.exercises), /structure/);
  const completion = readWorkoutRecord(mobile);
  completion.exercises[1].sets[0].completed = true;
  assert.throws(() => serializeWorkoutRecord(completion, completion.exercises), /completion/);
});

test('invalid new numeric input is rejected without normalizing untouched data', () => {
  for (const weight of ['heavy', '-5', 'Infinity']) {
    const doc = readWorkoutRecord(mobile);
    doc.exercises[1].sets[1].weight = weight;
    assert.throws(() => serializeWorkoutRecord(doc, doc.exercises), /valid weight/);
  }
  const doc = readWorkoutRecord(mobile);
  doc.exercises[1].sets[1].reps = '8.5';
  assert.throws(() => serializeWorkoutRecord(doc, doc.exercises), /valid reps/);
});

test('editing a completed set cannot remove the value that makes it complete', () => {
  for (const duration of ['', '0']) {
    const doc = readWorkoutRecord(mobile);
    doc.exercises[0].sets[0].duration = duration;
    assert.throws(() => serializeWorkoutRecord(doc, doc.exercises), /completed set/);
  }
  const doc = readWorkoutRecord(mobile);
  doc.exercises[1].sets[1].reps = '';
  assert.throws(() => serializeWorkoutRecord(doc, doc.exercises), /completed set/);
});

test('draft context requires the same account, local day, row and original contents', () => {
  const current = { userId: 'user-a', dateKey: '2026-09-29', logId: 'log-1', original: mobile };
  assert.equal(workoutContextMatches(structuredClone(current), current), true);
  assert.equal(workoutContextMatches({ ...current, original: JSON.stringify(mobile) }, current), true);
  for (const draft of [undefined, {}, { ...current, userId: 'user-b' }, { ...current, dateKey: '2026-09-28' }, { ...current, logId: 'log-2' }, { ...current, original: [] }]) {
    assert.equal(workoutContextMatches(draft, current), false);
  }
});

test('history reads mobile v2 and legacy work sets without shifting incomplete ordinals', () => {
  const content = { ...mobile, exercises: [
    mobile.exercises[0],
    { name: 'Squat', tracking: 'weight-reps', sets: [
      { kind: 'warmup', completed: true, reps: '5', weight: '20' },
      { kind: 'work', completed: false, reps: '8', weight: '60' },
      { kind: 'work', completed: true, reps: '8', weight: '62.5' },
    ] },
  ] };
  const history = workoutHistoryValues([{ content }, { content: [{ exercise: '__proto__', sets: [{ reps: '10', weight: '20', rpe: '' }] }] }]);
  assert.equal(history.squat.sets.length, 2);
  assert.equal(history.squat.sets[0].weight, '');
  assert.equal(history.squat.sets[1].weight, '62.5');
  assert.equal(history.plank, undefined, 'Timed sets must not become strength suggestions');
  assert.equal(history.__proto__.sets[0].weight, '20');
});

test('new legacy workouts preserve the established writer shape', () => {
  const doc = newLegacyWorkout([{ name: 'Row', sets: [{ reps: '10', weight: '40', rpe: '' }] }]);
  assert.deepEqual(JSON.parse(serializeWorkoutRecord(doc, doc.exercises)), [{ exercise: 'Row', sets: [{ setNumber: 1, reps: '10', weight: '40', rpe: '' }] }]);
});

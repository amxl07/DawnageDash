import {
  countSets,
  maxWeightFor,
  parseWorkoutContent,
  serializeWorkoutContent,
  totalVolume,
} from './workout-content';

describe('workout log content', () => {
  it('continues parsing the current array format', () => {
    const parsed = parseWorkoutContent(
      '[{"exercise":"Squat","sets":[{"setNumber":1,"reps":"5","weight":"80","rpe":"8"}]}]',
    );

    expect(parsed).toMatchObject({
      kind: 'exercises',
      exercises: [
        {
          name: 'Squat',
          sets: [{ setNumber: 1, reps: '5', weight: '80', rpe: '8', completed: true }],
        },
      ],
    });
  });

  it('round-trips version two metadata and explicit completion', () => {
    const content = serializeWorkoutContent({
      planDayNumber: 2,
      exercises: [
        {
          name: 'Squat',
          sets: [{ setNumber: 1, reps: '5', weight: '80', rpe: '8', completed: true }],
        },
      ],
    });

    expect(parseWorkoutContent(content)).toEqual({
      kind: 'exercises',
      version: 2,
      planDayNumber: 2,
      exercises: [
        {
          name: 'Squat',
          sets: [{ setNumber: 1, reps: '5', weight: '80', rpe: '8', completed: true }],
        },
      ],
    });
  });

  it('keeps explicit false completion in version two content', () => {
    const parsed = parseWorkoutContent(
      JSON.stringify({
        version: 2,
        planDayNumber: null,
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ setNumber: 1, reps: '5', weight: '80', rpe: '8', completed: false }],
          },
        ],
      }),
    );

    expect(parsed).toMatchObject({
      kind: 'exercises',
      version: 2,
      planDayNumber: null,
      exercises: [{ sets: [{ completed: false }] }],
    });
  });

  it('infers completion only for historical rows with reps and weight or explicit true', () => {
    const parsed = parseWorkoutContent(
      JSON.stringify([
        {
          exercise: 'Squat',
          sets: [
            { reps: '5', weight: '80' },
            { reps: '5', weight: '' },
            { reps: '', weight: '80' },
            { reps: '', weight: '', completed: true },
          ],
        },
      ]),
    );

    expect(parsed).toMatchObject({
      kind: 'exercises',
      exercises: [{ sets: [{ completed: true }, { completed: false }, { completed: false }, { completed: true }] }],
    });
  });

  it('retains legacy objects and non-JSON strings without crashing', () => {
    expect(parseWorkoutContent('[{"Exercise":"Row","Sets":"3","Reps":"10","Weight":"50"}]')).toMatchObject({
      kind: 'exercises',
      exercises: [{ name: 'Row', sets: [], legacy: { sets: '3', reps: '10', weight: '50' } }],
    });
    expect(parseWorkoutContent('old handwritten workout')).toEqual({ kind: 'text', text: 'old handwritten workout' });
  });

  it('keeps malformed JSON values renderable as text instead of throwing', () => {
    expect(parseWorkoutContent('{"version":2,"exercises":"not-an-array"}')).toEqual({
      kind: 'text',
      text: '{"version":2,"exercises":"not-an-array"}',
    });
  });

  it('derives set count, volume, and max weight from completed finite numeric sets only', () => {
    const exercises = parseWorkoutContent(
      JSON.stringify({
        version: 2,
        planDayNumber: 1,
        exercises: [
          {
            name: 'Deadlift',
            sets: [
              { reps: '5', weight: '100', completed: true },
              { reps: '3', weight: '120', completed: false },
              { reps: '5x', weight: '90', completed: true },
              { reps: '2', weight: 'Infinity', completed: true },
              { reps: '1', weight: '140', completed: true },
            ],
          },
        ],
      }),
    );

    if (exercises.kind !== 'exercises') throw new Error('expected exercises');

    expect(countSets(exercises.exercises)).toBe(4);
    expect(totalVolume(exercises.exercises)).toBe(640);
    expect(maxWeightFor(exercises.exercises[0].sets)).toBe(140);
  });
});

import { Pressable, Text as NativeText, View } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CheckInForm, EMPTY_FORM, toPayload, type FormState } from './CheckInForm';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/theme', () => ({
  iconSize: { sm: 12, md: 20 },
  spacing: { xs: 4, sm: 8, base: 16 },
  useTheme: () => ({ colors: { mutedForeground: '#666', primary: '#00f', elevated: '#fff', borderStrong: '#aaa' } }),
}));
jest.mock('@/components/ui', () => ({
  ...(() => {
    const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
    return {
      Card: ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>,
      Input: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) => (
        <MockPressable testID={`input-${label}`} onPress={() => onChangeText('updated note')}>
          <MockText>{value}</MockText>
        </MockPressable>
      ),
      RatingRow: () => <MockView />,
      SegmentedControl: ({ label, onChange }: { label: string; onChange: (value: string) => void }) => (
        <MockPressable testID={`segment-${label}`} onPress={() => onChange(label === 'Workout' ? 'rest_day' : 'none')} />
      ),
      Stepper: () => <MockView />,
      Text: ({ children }: { children: React.ReactNode }) => <MockText>{children}</MockText>,
    };
  })(),
}));

const COMPLETE_FORM: FormState = {
  ...EMPTY_FORM,
  morningWeight: 74.2,
  energyLevel: 7,
  stressLevel: 3,
  sleepHours: 8,
  hungerLevel: 5,
  digestion: 'none',
  workoutStatus: 'done',
  workoutPerformance: 8,
  nutritionScore: 9,
  calorieIntake: 2200,
  waterLiters: 2.5,
  dailySteps: 9000,
  protein: 160,
  carbs: 220,
  fats: 60,
  notes: 'Slept well',
};

describe('CheckInForm', () => {
  it('clears performance when a workout becomes a rest day and normalizes its payload', () => {
    let current = COMPLETE_FORM;
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CheckInForm
          form={current}
          setForm={(updater) => { current = updater(current); }}
          previous={null}
          step="adherence"
          errors={{}}
        />,
      );
    });

    act(() => renderer.root.findByProps({ testID: 'segment-Workout' }).props.onPress());

    expect(current.workoutStatus).toBe('rest_day');
    expect(current.workoutPerformance).toBeNull();
    expect(toPayload({ ...COMPLETE_FORM, workoutStatus: 'rest_day', workoutPerformance: 8 }, '2026-08-30').workout_performance)
      .toBeNull();
  });

  it('keeps notes editable on Finish and confirms every persisted measurement', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CheckInForm form={COMPLETE_FORM} setForm={() => {}} previous={null} step="finish" errors={{}} />,
      );
    });
    const text = JSON.stringify(renderer.toJSON());

    expect(text).toContain('input-Notes (optional)');
    [
      'Weight', 'Energy', 'Stress', 'Sleep', 'Hunger', 'Digestion', 'Workout',
      'Workout performance', 'Nutrition', 'Calories', 'Water', 'Steps', 'Protein',
      'Carbs', 'Fats', 'Notes',
    ].forEach((label) => expect(text).toContain(label));
  });
});

import { Text as MockNativeText, View as MockView } from 'react-native';
// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { FormState } from '@/components/checkin/CheckInForm';
import { CheckInPanel } from './CheckInPanel';

jest.mock('@/components/checkin/CheckInForm', () => {
  return {
    CheckInForm: ({ step, hideFinishSummary }: { step: string; hideFinishSummary?: boolean }) => (
      <MockView testID={`panel-section-${step}`}>
        <MockNativeText>{step}</MockNativeText>
        {hideFinishSummary ? <MockNativeText>notes-only</MockNativeText> : null}
      </MockView>
    ),
  };
});
jest.mock('@/theme', () => ({ spacing: { lg: 24 } }));

const emptyForm: FormState = {
  morningWeight: null, sleepHours: null, workoutStatus: null, workoutPerformance: null,
  nutritionScore: null, calorieIntake: null, waterLiters: null, dailySteps: null,
  protein: null, carbs: null, fats: null, energyLevel: null, hungerLevel: null,
  stressLevel: null, digestion: null, notes: '',
};

it('renders the established sections together and keeps finish notes compact', () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <CheckInPanel
        form={emptyForm}
        setForm={() => {}}
        previous={null}
        errors={{}}
        history={{}}
      />,
    );
  });

  expect(JSON.stringify(renderer.toJSON())).toContain('checkin-single-scroll-panel');
  expect(['readiness', 'recovery', 'adherence', 'finish'].map((step) =>
    renderer.root.findByProps({ testID: `panel-section-${step}` }).props.testID,
  )).toEqual([
    'panel-section-readiness',
    'panel-section-recovery',
    'panel-section-adherence',
    'panel-section-finish',
  ]);
  expect(JSON.stringify(renderer.toJSON())).toContain('notes-only');
});

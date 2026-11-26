import {
  AlertCircle,
  Check,
  CircleDot,
  Dumbbell,
  Footprints,
  MinusCircle,
  Moon,
  X,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
} from 'react-native-reanimated';

import {
  Button,
  Card,
  Input,
  SegmentedControl,
  Text,
  type Segment,
} from '@/components/ui';
import { HistoryCaption } from '@/features/checkin/components/HistoryCaption';
import { NumericEntry } from '@/features/checkin/components/NumericEntry';
import { PreviousValueButton } from '@/features/checkin/components/PreviousValueButton';
import type { CheckInHistory } from '@/features/checkin/history';
import { fromRow, type FormState, type CheckInStep } from '@/features/checkin/model';
import { requiresWorkoutPerformance } from '@/lib/checkin-validation';
import type { DailyCheckIn, Digestion, WorkoutStatus } from '@/types/db';
import { spacing, useMotion } from '@/theme';
import { CheckInFieldBlock } from './CheckInFieldBlock';
import { CheckInRatingScale } from './CheckInRatingScale';
import { CheckInSummarySection } from './CheckInSummarySection';

export { EMPTY_FORM, fromRow, prefillFrom, toPayload } from '@/features/checkin/model';
export type { FormState, CheckInStep } from '@/features/checkin/model';

// Lucide glyphs + text labels — never emoji for controls (§02.8).
const WORKOUT_SEGMENTS: Segment<WorkoutStatus>[] = [
  { value: 'done', label: 'Done', icon: Dumbbell },
  { value: 'no', label: 'No', icon: X },
  { value: 'cardio_day', label: 'Cardio', icon: Footprints },
  { value: 'rest_day', label: 'Rest', icon: Moon },
];

const DIGESTION_SEGMENTS: Segment<Digestion>[] = [
  { value: 'none', label: 'Normal', icon: Check },
  { value: 'bloated', label: 'Bloated', icon: CircleDot },
  { value: 'constipated', label: 'Constipated', icon: MinusCircle },
  { value: 'diarrhea', label: 'Diarrhea', icon: AlertCircle },
];

type Props = {
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  previous: DailyCheckIn | null;
  step: CheckInStep;
  errors: Partial<Record<keyof FormState, string>>;
  history?: CheckInHistory;
  showCarryForward?: boolean;
  hideFinishSummary?: boolean;
  focusField?: keyof FormState | null;
  focusRequest?: number;
  registerField?: (field: keyof FormState, node: View | TextInput | null) => void;
  onEditSection?: (step: CheckInStep) => void;
};


export function CheckInForm({
  form,
  setForm,
  previous,
  step,
  errors,
  history,
  showCarryForward = false,
  hideFinishSummary = false,
  registerField,
  onEditSection,
}: Props) {
  const motion = useMotion();
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const previousForm = useMemo(() => previous ? fromRow(previous) : null, [previous]);
  const prevHint = useMemo(() => {
    if (!previous) return {} as Record<string, string>;
    const p = fromRow(previous);
    const h = (v: number | null, unit: string) => (v === null ? '' : `last: ${v}${unit}`);
    return {
      weight: h(p.morningWeight, ' kg'),
      sleep: h(p.sleepHours, ' h'),
      water: h(p.waterLiters, ' L'),
      steps: h(p.dailySteps, ''),
      calories: h(p.calorieIntake, ' kcal'),
    };
  }, [previous]);

  const showPerformance = requiresWorkoutPerformance(form.workoutStatus);
  const setWorkoutStatus = (value: WorkoutStatus) =>
    setForm((prev) => ({
      ...prev,
      workoutStatus: value,
      workoutPerformance: requiresWorkoutPerformance(value) ? prev.workoutPerformance : null,
    }));

  if (step === 'readiness') {
    return (
      <Card style={{ gap: spacing.base }}>
        <NumericEntry
          label="Morning weight"
          focusTarget={(node) => registerField?.('morningWeight', node)}
          value={form.morningWeight}
          onChange={(value) => set('morningWeight', value)}
          precision={1}
          min={20}
          max={400}
          unit="kg"
          hint={showCarryForward ? undefined : prevHint.weight}
          error={errors.morningWeight}
          history={history?.morningWeight}
        >
          {showCarryForward ? (
            <PreviousValueButton
              label="Morning weight"
              date={previous?.date}
              currentValue={form.morningWeight}
              onRestore={(value) => set('morningWeight', value)}
              value={previousForm?.morningWeight ?? null}
              unit="kg"
              onApply={(value) => set('morningWeight', value)}
            />
          ) : null}
        </NumericEntry>
        <NumericEntry
          label="Sleep"
          focusTarget={(node) => registerField?.('sleepHours', node)}
          value={form.sleepHours}
          onChange={(value) => set('sleepHours', value)}
          precision={1}
          min={0}
          max={24}
          unit="h"
          quickValues={[6, 7, 8, 9]}
          hint={showCarryForward ? undefined : prevHint.sleep}
          error={errors.sleepHours}
          history={history?.sleepHours}
        >
          <Text variant="bodySm" tone="muted">Sleep during the night before this reporting date.</Text>
          {showCarryForward ? (
            <PreviousValueButton
              label="Sleep"
              date={previous?.date}
              currentValue={form.sleepHours}
              onRestore={(value) => set('sleepHours', value)}
              value={previousForm?.sleepHours ?? null}
              unit="h"
              onApply={(value) => set('sleepHours', value)}
            />
          ) : null}
        </NumericEntry>
        <CheckInFieldBlock
          label="Energy"
          description="How much energy did you have today?"
          focusTarget={(node) => registerField?.('energyLevel', node)}
          complete={form.energyLevel !== null}
          error={errors.energyLevel}
          testID="checkin-field-energy"
        >
          <CheckInRatingScale
            label="Energy out of 10"
            lowLabel="Exhausted"
            highLabel="Very energetic"
            value={form.energyLevel}
            onChange={(value) => set('energyLevel', value)}
            accessibilityMode="options"
            optionTestIDPrefix="checkin-energy-rating"
          />
          <HistoryCaption value={form.energyLevel} history={history?.energyLevel} precision={0} />
        </CheckInFieldBlock>
      </Card>
    );
  }

  if (step === 'recovery') {
    return (
      <Card style={{ gap: spacing.base }}>
        <CheckInFieldBlock
          label="Stress"
          description="How much stress did you feel today?"
          focusTarget={(node) => registerField?.('stressLevel', node)}
          complete={form.stressLevel !== null}
          error={errors.stressLevel}
          testID="checkin-field-stress"
        >
          <CheckInRatingScale
            label="Stress out of 10"
            lowLabel="Relaxed"
            highLabel="Very stressed"
            value={form.stressLevel}
            onChange={(value) => set('stressLevel', value)}
            accessibilityMode="options"
            optionTestIDPrefix="checkin-stress-rating"
          />
          <HistoryCaption value={form.stressLevel} history={history?.stressLevel} precision={0} />
        </CheckInFieldBlock>

        <CheckInFieldBlock
          label="Hunger"
          description="Think about your appetite across the day."
          focusTarget={(node) => registerField?.('hungerLevel', node)}
          complete={form.hungerLevel !== null}
          error={errors.hungerLevel}
          testID="checkin-field-hunger"
        >
          <CheckInRatingScale
            label="Hunger out of 10"
            lowLabel="No appetite"
            highLabel="Very hungry"
            value={form.hungerLevel}
            onChange={(v) => set('hungerLevel', v)}
            accessibilityMode="options"
            optionTestIDPrefix="checkin-hunger-rating"
          />
          <HistoryCaption value={form.hungerLevel} history={history?.hungerLevel} precision={0} />
        </CheckInFieldBlock>
        <CheckInFieldBlock
          label="Digestion"
          focusTarget={(node) => registerField?.('digestion', node)}
          complete={form.digestion !== null}
          error={errors.digestion}
          testID="checkin-field-digestion"
        >
          <SegmentedControl
            label="Digestion"
            showLabel={false}
            large
            segments={DIGESTION_SEGMENTS}
            value={form.digestion}
            onChange={(v) => set('digestion', v)}
          />
        </CheckInFieldBlock>
      </Card>
    );
  }

  if (step === 'adherence') {
    return (
      <Card style={{ gap: spacing.base }}>
        <CheckInFieldBlock
          label="Workout"
          description="Choose Rest for a planned rest day, or No if you didn’t train. Individual sets belong in your workout log."
          focusTarget={(node) => registerField?.('workoutStatus', node)}
          complete={form.workoutStatus !== null}
          error={errors.workoutStatus}
          testID="checkin-field-workout"
        >
          <SegmentedControl
            label="Workout"
            showLabel={false}
            large
            segments={WORKOUT_SEGMENTS}
            value={form.workoutStatus}
            onChange={setWorkoutStatus}
          />
        </CheckInFieldBlock>
        {showPerformance ? (
          <Animated.View
            testID="checkin-workout-performance-reveal"
            entering={
              motion.enabled
                ? FadeInDown
                    .duration(motion.duration.enter)
                    .easing(Easing.bezier(...motion.easing.standard))
                    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
                : undefined
            }
          >
            <CheckInFieldBlock
              label="How did it go?"
              focusTarget={(node) => registerField?.('workoutPerformance', node)}
              complete={form.workoutPerformance !== null}
              error={errors.workoutPerformance}
              testID="checkin-field-workout-performance"
            >
              <CheckInRatingScale
                label="Workout performance out of 10"
                lowLabel="Struggled"
                highLabel="Felt strong"
                value={form.workoutPerformance}
                onChange={(v) => set('workoutPerformance', v)}
                accessibilityMode="options"
                optionTestIDPrefix="checkin-workout-performance-rating"
              />
              <HistoryCaption
                value={form.workoutPerformance}
                history={history?.workoutPerformance}
                precision={0}
              />
            </CheckInFieldBlock>
          </Animated.View>
        ) : null}
        <CheckInFieldBlock
          label="Nutrition score"
          description="How closely did your eating match your goals today? If your meal plan hasn’t arrived, use your current eating goals."
          focusTarget={(node) => registerField?.('nutritionScore', node)}
          complete={form.nutritionScore !== null}
          error={errors.nutritionScore}
          testID="checkin-field-nutrition"
        >
          <CheckInRatingScale
            label="Nutrition score out of 10"
            lowLabel="Far from my goals"
            highLabel="Matched my goals"
            value={form.nutritionScore}
            onChange={(v) => set('nutritionScore', v)}
            accessibilityMode="options"
            optionTestIDPrefix="checkin-nutrition-rating"
          />
          <HistoryCaption value={form.nutritionScore} history={history?.nutritionScore} precision={0} />
        </CheckInFieldBlock>
        <NumericEntry
          label="Calories"
          focusTarget={(node) => registerField?.('calorieIntake', node)}
          value={form.calorieIntake}
          onChange={(value) => set('calorieIntake', value)}
          precision={0}
          min={0}
          max={20000}
          unit="kcal"
          hint={showCarryForward ? undefined : prevHint.calories}
          error={errors.calorieIntake}
          history={history?.calorieIntake}
        >
          {showCarryForward ? (
            <PreviousValueButton label="Calories" date={previous?.date} currentValue={form.calorieIntake} onRestore={(value) => set('calorieIntake', value)} value={previousForm?.calorieIntake ?? null} unit="kcal" onApply={(value) => set('calorieIntake', value)} />
          ) : null}
        </NumericEntry>
        <NumericEntry
          label="Water"
          focusTarget={(node) => registerField?.('waterLiters', node)}
          value={form.waterLiters}
          onChange={(value) => set('waterLiters', value)}
          precision={2}
          min={0}
          max={20}
          unit="L"
          quickValues={[1, 1.5, 2, 2.5, 3]}
          hint={showCarryForward ? undefined : prevHint.water}
          error={errors.waterLiters}
          history={history?.waterLiters}
        >
          {showCarryForward ? (
            <PreviousValueButton label="Water" date={previous?.date} currentValue={form.waterLiters} onRestore={(value) => set('waterLiters', value)} value={previousForm?.waterLiters ?? null} unit="L" onApply={(value) => set('waterLiters', value)} />
          ) : null}
        </NumericEntry>
        <NumericEntry
          label="Steps"
          focusTarget={(node) => registerField?.('dailySteps', node)}
          value={form.dailySteps}
          onChange={(value) => set('dailySteps', value)}
          precision={0}
          min={0}
          max={200000}
          unit="steps"
          hint={showCarryForward ? undefined : prevHint.steps}
          error={errors.dailySteps}
          history={history?.dailySteps}
        >
          {showCarryForward ? (
            <PreviousValueButton label="Steps" date={previous?.date} currentValue={form.dailySteps} onRestore={(value) => set('dailySteps', value)} value={previousForm?.dailySteps ?? null} unit="steps" onApply={(value) => set('dailySteps', value)} />
          ) : null}
        </NumericEntry>
        <View style={{ gap: spacing.base }}>
          {(
            [
              ['Protein', 'protein'],
              ['Carbs', 'carbs'],
              ['Fats', 'fats'],
            ] as const
          ).map(([label, key]) => (
            <NumericEntry
              key={key}
              label={label}
              focusTarget={(node) => registerField?.(key, node)}
              error={errors[key]}
              value={form[key]}
              onChange={(value) => set(key, value)}
              min={0}
              precision={0}
              unit="g"
              history={history?.[key]}
            >
              {showCarryForward ? (
                <PreviousValueButton
                  label={label}
                  date={previous?.date}
                  currentValue={form[key]}
                  onRestore={(value) => set(key, value)}
                  value={previousForm?.[key] ?? null}
                  unit="g"
                  onApply={(value) => set(key, value)}
                />
              ) : null}
            </NumericEntry>
          ))}
        </View>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.base }}>
      {!hideFinishSummary ? <View style={{ gap: spacing.sm }}>
        <View style={{ gap: spacing.xs }}>
          <CheckInSummarySection
            title="Morning"
            rows={[
              ['Weight', form.morningWeight === null ? 'Not recorded' : `${form.morningWeight} kg`],
              ['Sleep', form.sleepHours === null ? 'Not recorded' : `${form.sleepHours} h`],
              ['Energy', form.energyLevel === null ? 'Not recorded' : `${form.energyLevel}/10`],
            ]}
          />
          {onEditSection ? <Button testID="checkin-edit-readiness" label="Edit morning" variant="ghost" onPress={() => onEditSection('readiness')} /> : null}
        </View>
        <View style={{ gap: spacing.xs }}>
          <CheckInSummarySection
            title="Your day"
            rows={[
              ['Stress', form.stressLevel === null ? 'Not recorded' : `${form.stressLevel}/10`],
              ['Hunger', form.hungerLevel === null ? 'Not recorded' : `${form.hungerLevel}/10`],
              ['Digestion', DIGESTION_SEGMENTS.find(({ value }) => value === form.digestion)?.label ?? 'Not recorded'],
            ]}
          />
          {onEditSection ? <Button testID="checkin-edit-recovery" label="Edit your day" variant="ghost" onPress={() => onEditSection('recovery')} /> : null}
        </View>
        <View style={{ gap: spacing.xs }}>
          <CheckInSummarySection
            title="Nutrition and adherence"
            rows={[
              ['Workout', WORKOUT_SEGMENTS.find(({ value }) => value === form.workoutStatus)?.label ?? 'Not recorded'],
              ...(showPerformance
                ? [[
                    'Workout performance',
                    form.workoutPerformance === null
                      ? 'Not recorded'
                      : `${form.workoutPerformance}/10`,
                  ] as const]
                : []),
              ['Nutrition', form.nutritionScore === null ? 'Not recorded' : `${form.nutritionScore}/10`],
              ['Calories', form.calorieIntake === null ? 'Not recorded' : `${form.calorieIntake} kcal`],
              ['Water', form.waterLiters === null ? 'Not recorded' : `${form.waterLiters} L`],
              ['Steps', form.dailySteps === null ? 'Not recorded' : String(form.dailySteps)],
              ['Protein', form.protein === null ? 'Not recorded' : `${form.protein} g`],
              ['Carbs', form.carbs === null ? 'Not recorded' : `${form.carbs} g`],
              ['Fats', form.fats === null ? 'Not recorded' : `${form.fats} g`],
            ]}
          />
          {onEditSection ? <Button testID="checkin-edit-adherence" label="Edit adherence" variant="ghost" onPress={() => onEditSection('adherence')} /> : null}
        </View>
      </View> : null}
      <Input
        ref={(node) => registerField?.('notes', node)}
        label="Notes"
        error={errors.notes}
        value={form.notes}
        onChangeText={(t) => set('notes', t)}
        multiline
        numberOfLines={3}
        inputStyle={{ minHeight: 72, textAlignVertical: 'top' }}
        placeholder="Briefly describe your day for your coach."
      />

    </Card>
  );
}

import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleDot,
  Dumbbell,
  Footprints,
  MinusCircle,
  Moon,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  Card,
  Input,
  SegmentedControl,
  Stepper,
  Text,
  type Segment,
} from '@/components/ui';
import type { CheckInPayload } from '@/hooks/useCheckInMutation';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { parseLocalDate } from '@/lib/dates';
import { requiresWorkoutPerformance } from '@/lib/checkin-validation';
import { num, type DailyCheckIn, type Digestion, type WorkoutStatus } from '@/types/db';
import { iconSize, spacing, useMotion, useTheme } from '@/theme';
import { CheckInFieldBlock } from './CheckInFieldBlock';
import { CheckInRatingScale } from './CheckInRatingScale';
import { CheckInSummarySection } from './CheckInSummarySection';

export type FormState = {
  morningWeight: number | null;
  sleepHours: number | null;
  workoutStatus: WorkoutStatus | null;
  workoutPerformance: number | null;
  nutritionScore: number | null;
  calorieIntake: number | null;
  waterLiters: number | null;
  dailySteps: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  energyLevel: number | null;
  hungerLevel: number | null;
  stressLevel: number | null;
  digestion: Digestion | null;
  notes: string;
};

export const EMPTY_FORM: FormState = {
  morningWeight: null,
  sleepHours: null,
  workoutStatus: null,
  workoutPerformance: null,
  nutritionScore: null,
  calorieIntake: null,
  waterLiters: null,
  dailySteps: null,
  protein: null,
  carbs: null,
  fats: null,
  energyLevel: null,
  hungerLevel: null,
  stressLevel: null,
  digestion: null,
  notes: '',
};

export function fromRow(row: DailyCheckIn): FormState {
  return {
    morningWeight: row.morning_weight === null ? null : num(row.morning_weight),
    sleepHours: row.sleep_hours === null ? null : num(row.sleep_hours),
    workoutStatus: (row.workout_status as WorkoutStatus) ?? null,
    workoutPerformance: row.workout_performance,
    nutritionScore: row.nutrition_score,
    calorieIntake: row.calorie_intake,
    waterLiters: row.water_liters === null ? null : num(row.water_liters),
    dailySteps: row.daily_steps,
    protein: row.protein === null ? null : num(row.protein),
    carbs: row.carbs === null ? null : num(row.carbs),
    fats: row.fats === null ? null : num(row.fats),
    energyLevel: row.energy_level,
    hungerLevel: row.hunger_level,
    stressLevel: row.stress_level,
    digestion: (row.digestion as Digestion) ?? null,
    notes: row.notes ?? '',
  };
}

/**
 * Only objective measurements are reusable. Subjective scores describe today
 * and must always be answered again instead of being silently copied.
 */
export function prefillFrom(row: DailyCheckIn): Partial<FormState> {
  const f = fromRow(row);
  return {
    morningWeight: f.morningWeight,
    sleepHours: f.sleepHours,
    calorieIntake: f.calorieIntake,
    waterLiters: f.waterLiters,
    dailySteps: f.dailySteps,
    protein: f.protein,
    carbs: f.carbs,
    fats: f.fats,
  };
}

export function toPayload(form: FormState, date: string): CheckInPayload {
  return {
    date,
    morning_weight: form.morningWeight,
    sleep_hours: form.sleepHours,
    workout_status: form.workoutStatus,
    workout_performance: requiresWorkoutPerformance(form.workoutStatus)
      ? form.workoutPerformance
      : null,
    nutrition_score: form.nutritionScore,
    calorie_intake: form.calorieIntake,
    water_liters: form.waterLiters,
    daily_steps: form.dailySteps,
    protein: form.protein,
    carbs: form.carbs,
    fats: form.fats,
    energy_level: form.energyLevel,
    hunger_level: form.hungerLevel,
    stress_level: form.stressLevel,
    digestion: form.digestion,
    notes: form.notes.trim() ? form.notes.trim() : null,
  };
}

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
};

export type CheckInStep = 'readiness' | 'recovery' | 'adherence' | 'finish';

export function CheckInForm({ form, setForm, previous, step, errors }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const { isCompact } = useResponsiveLayout();
  const [showMore, setShowMore] = useState(false);
  const macroChevronRotation = useSharedValue(0);
  const macroChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${macroChevronRotation.get()}deg` }],
  }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
        <Text variant="label" tone="muted">
          Readiness and energy
        </Text>
        <Stepper
          label="Morning weight"
          value={form.morningWeight}
          onChange={(v) => set('morningWeight', v)}
          step={0.1}
          precision={1}
          min={20}
          max={400}
          suffix="kg"
          hint={prevHint.weight}
          error={errors.morningWeight}
        />
        {(
          [
            ['Energy', 'energyLevel', 'checkin-energy-rating', 'checkin-field-energy'],
            ['Stress', 'stressLevel', 'checkin-stress-rating', 'checkin-field-stress'],
          ] as const
        ).map(([label, key, optionTestIDPrefix, testID]) => (
          <CheckInFieldBlock
            key={key}
            label={label}
            complete={form[key] !== null}
            error={errors[key]}
            testID={testID}
          >
            <CheckInRatingScale
              label={`${label} out of 10`}
              value={form[key]}
              onChange={(v) => set(key, v)}
              accessibilityMode="options"
              optionTestIDPrefix={optionTestIDPrefix}
            />
          </CheckInFieldBlock>
        ))}
      </Card>
    );
  }

  if (step === 'recovery') {
    return (
      <Card style={{ gap: spacing.base }}>
        <Text variant="label" tone="muted">
          Sleep and recovery
        </Text>
        <Stepper
          label="Sleep"
          value={form.sleepHours}
          onChange={(v) => set('sleepHours', v)}
          step={0.5}
          precision={1}
          min={0}
          max={24}
          suffix="h"
          hint={prevHint.sleep}
          error={errors.sleepHours}
        />
        <CheckInFieldBlock
          label="Hunger"
          complete={form.hungerLevel !== null}
          error={errors.hungerLevel}
          testID="checkin-field-hunger"
        >
          <CheckInRatingScale
            label="Hunger out of 10"
            value={form.hungerLevel}
            onChange={(v) => set('hungerLevel', v)}
          />
        </CheckInFieldBlock>
        <CheckInFieldBlock
          label="Digestion"
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
        <Text variant="bodySm" tone="muted">
          A quick recovery snapshot helps us spot patterns.
        </Text>
      </Card>
    );
  }

  if (step === 'adherence') {
    return (
      <Card style={{ gap: spacing.base }}>
        <Text variant="label" tone="muted">
          Nutrition and adherence
        </Text>
        <CheckInFieldBlock
          label="Workout"
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
              complete={form.workoutPerformance !== null}
              error={errors.workoutPerformance}
              testID="checkin-field-workout-performance"
            >
              <CheckInRatingScale
                label="Workout performance out of 10"
                value={form.workoutPerformance}
                onChange={(v) => set('workoutPerformance', v)}
              />
            </CheckInFieldBlock>
          </Animated.View>
        ) : null}
        <CheckInFieldBlock
          label="Nutrition score"
          complete={form.nutritionScore !== null}
          error={errors.nutritionScore}
          testID="checkin-field-nutrition"
        >
          <CheckInRatingScale
            label="Nutrition score out of 10"
            value={form.nutritionScore}
            onChange={(v) => set('nutritionScore', v)}
          />
        </CheckInFieldBlock>
        <Stepper
          label="Calories"
          value={form.calorieIntake}
          onChange={(v) => set('calorieIntake', v === null ? null : Math.round(v))}
          step={50}
          precision={0}
          min={0}
          max={20000}
          suffix="kcal"
          hint={prevHint.calories}
          error={errors.calorieIntake}
        />
        <Stepper
          label="Water"
          value={form.waterLiters}
          onChange={(v) => set('waterLiters', v)}
          step={0.25}
          precision={2}
          min={0}
          max={20}
          suffix="L"
          hint={prevHint.water}
          error={errors.waterLiters}
        />
        <Stepper
          label="Steps"
          value={form.dailySteps}
          onChange={(v) => set('dailySteps', v === null ? null : Math.round(v))}
          step={500}
          precision={0}
          min={0}
          max={200000}
          hint={prevHint.steps}
          error={errors.dailySteps}
        />
        <Pressable
          onPress={() => {
            const next = !showMore;
            setShowMore(next);
            macroChevronRotation.set(
              motion.enabled
                ? withTiming(next ? 180 : 0, {
                    duration: motion.duration.enter,
                    easing: Easing.bezier(...motion.easing.standard),
                  })
                : next
                  ? 180
                  : 0,
            );
            void Haptics.selectionAsync();
          }}
          accessibilityRole="button"
          accessibilityLabel="More detail: macros"
          accessibilityState={{ expanded: showMore }}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}
        >
          <Text variant="label" tone="muted" style={{ flex: 1 }}>
            More detail (optional)
          </Text>
          <Animated.View
            testID="checkin-macros-chevron"
            style={macroChevronStyle}
            accessible={false}
          >
            <ChevronDown
              size={iconSize.md}
              color={colors.mutedForeground}
              strokeWidth={2}
              accessible={false}
            />
          </Animated.View>
        </Pressable>
        {showMore ? (
          <Animated.View
            testID="checkin-macros-content"
            entering={motion.enabled ? FadeIn.duration(motion.duration.enter) : undefined}
            style={{ flexDirection: isCompact ? 'column' : 'row', gap: spacing.sm }}
          >
            {(
              [
                ['Protein', 'protein'],
                ['Carbs', 'carbs'],
                ['Fats', 'fats'],
              ] as const
            ).map(([label, key]) => (
              <Input
                key={key}
                containerStyle={isCompact ? undefined : { flex: 1 }}
                label={label}
                value={form[key] === null ? '' : String(form[key])}
                onChangeText={(t) => {
                  const n = parseFloat(t);
                  set(key, t.trim() === '' || !Number.isFinite(n) ? null : n);
                }}
                keyboardType="number-pad"
                placeholder="g"
              />
            ))}
          </Animated.View>
        ) : null}
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.base }}>
      <Text variant="label" tone="muted">
        Notes and confirmation
      </Text>
      <Input
        label="Notes (optional)"
        value={form.notes}
        onChangeText={(t) => set('notes', t)}
        multiline
        numberOfLines={3}
        inputStyle={{ minHeight: 72, textAlignVertical: 'top' }}
        placeholder="Anything your coach should know?"
      />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="muted">
          Ready to save
        </Text>
        <CheckInSummarySection
          title="Readiness and energy"
          rows={[
            ['Weight', form.morningWeight === null ? 'Not recorded' : `${form.morningWeight} kg`],
            ['Energy', form.energyLevel === null ? 'Not recorded' : `${form.energyLevel}/10`],
            ['Stress', form.stressLevel === null ? 'Not recorded' : `${form.stressLevel}/10`],
          ]}
        />
        <CheckInSummarySection
          title="Sleep and recovery"
          rows={[
            ['Sleep', form.sleepHours === null ? 'Not recorded' : `${form.sleepHours} h`],
            ['Hunger', form.hungerLevel === null ? 'Not recorded' : `${form.hungerLevel}/10`],
            ['Digestion', form.digestion ?? 'Not recorded'],
          ]}
        />
        <CheckInSummarySection
          title="Nutrition and adherence"
          rows={[
            ['Workout', form.workoutStatus ?? 'Not recorded'],
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
        <CheckInSummarySection
          title="Coach note"
          rows={[[
            'Notes',
            form.notes.trim() || 'Not recorded',
          ]]}
        />
      </View>

    </Card>
  );
}

export function SameAsYesterdayChip({
  previous,
  onApply,
}: {
  previous: DailyCheckIn;
  onApply: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        onApply();
        void Haptics.selectionAsync();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Reuse measurements from ${format(parseLocalDate(previous.date), 'EEEE d MMMM')}`}
      accessibilityHint="Copies objective measurements only. Today's ratings stay empty."
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 44,
        paddingHorizontal: spacing.base,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: pressed ? colors.elevated : 'transparent',
        alignSelf: 'flex-start',
      })}
    >
      <Sparkles size={iconSize.sm} color={colors.primary} strokeWidth={2} accessible={false} />
      <Text variant="bodySm" tone="primary">
        Reuse measurements from {format(parseLocalDate(previous.date), 'EEE d MMM')}
      </Text>
    </Pressable>
  );
}

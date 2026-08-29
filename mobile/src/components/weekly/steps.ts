/** Weekly check-in field spec — values must match the web byte-for-byte. */
export type FieldType = 'textarea' | 'text' | 'number' | 'radio' | 'scale';

export type WeeklyField = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  /** Prefill key from this week's daily check-in averages (mobile upgrade). */
  prefill?: 'steps' | 'water' | 'stress';
};

export type WeeklyStep = { title: string; description: string; fields: WeeklyField[] };

export const WEEKLY_STEPS: WeeklyStep[] = [
  {
    title: 'Weekly Overview',
    description: 'How did the week go overall?',
    fields: [
      { key: 'overall_feeling', label: 'How are you feeling overall this week?', type: 'textarea' },
      { key: 'weekly_wins', label: 'What were your wins this week?', type: 'textarea' },
    ],
  },
  {
    title: 'Nutrition',
    description: 'How did eating go?',
    fields: [
      { key: 'nutrition_adherence', label: 'Did you stick to your nutrition plan?', type: 'radio', options: ['Yes', 'No', 'Mostly'] },
      { key: 'digestion', label: 'How was your digestion?', type: 'text' },
      { key: 'enjoying_meals', label: 'Are you enjoying your meals?', type: 'radio', options: ['Yes', 'No'] },
      { key: 'hunger_levels', label: 'How were your hunger levels?', type: 'radio', options: ['No hunger', 'Mild hunger', 'High hunger', 'Cravings'] },
      { key: 'nutrition_questions', label: 'Any nutrition questions?', type: 'textarea' },
    ],
  },
  {
    title: 'Training',
    description: 'How did training go?',
    fields: [
      { key: 'training_progress', label: 'Are you progressing in your training?', type: 'radio', options: ['Yes', 'No', 'Stalled'] },
      { key: 'enjoying_training', label: 'Are you enjoying your training?', type: 'radio', options: ['Yes', 'No'] },
      { key: 'missed_sessions', label: 'Did you miss any sessions?', type: 'radio', options: ['Yes', 'No'] },
      { key: 'joint_pain', label: 'Any joint pain?', type: 'radio', options: ['Yes', 'No'] },
      { key: 'step_count', label: "What's your average step count this week?", type: 'number', prefill: 'steps' },
      { key: 'training_questions', label: 'Any training questions?', type: 'textarea' },
    ],
  },
  {
    title: 'Wellbeing',
    description: 'Recovery, hydration and stress.',
    fields: [
      { key: 'recovery_issues', label: 'Any recovery issues?', type: 'radio', options: ['Yes', 'No'] },
      { key: 'water_intake', label: 'Average daily water intake (litres)?', type: 'number', prefill: 'water' },
      { key: 'stress_level', label: 'Stress level this week', type: 'scale', prefill: 'stress' },
      { key: 'overall_experience', label: 'How has your overall experience been?', type: 'textarea' },
    ],
  },
  {
    title: 'Feedback',
    description: 'Optional — it helps us improve.',
    fields: [
      { key: 'feedback', label: 'Anything else you want to share?', type: 'textarea' },
    ],
  },
];

export const WEEKLY_KEYS = WEEKLY_STEPS.flatMap((s) => s.fields.map((f) => f.key));

/** All columns are TEXT — every value is written as a string. */
export function emptyWeekly(): Record<string, string> {
  return Object.fromEntries(WEEKLY_KEYS.map((k) => [k, '']));
}

export const WEEKLY_SECTIONS: { title: string; keys: string[] }[] = WEEKLY_STEPS.map((s) => ({
  title: s.title,
  keys: s.fields.map((f) => f.key),
}));

// Types for hierarchical structure
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type WorkoutType = string;
export type SubCategory = string | null;
export type DietType = 'Vegetarian' | 'Eggetarian' | 'Non-Vegetarian';

export const CALORIE_OPTIONS = [1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800];
export const DIET_OPTIONS: DietType[] = ['Vegetarian', 'Eggetarian', 'Non-Vegetarian'];

// Hierarchy configuration type
export type WorkoutConfig = { subCategories: SubCategory[] | null; daysOptions: number[] };

// Hierarchy configuration
export const WORKOUT_HIERARCHY: Record<Level, Partial<Record<WorkoutType, WorkoutConfig>>> = {
  Beginner: {
    GYM_WORKOUT: {
      subCategories: ['0_EXPERIENCE', '6_MONTH_EXPERIENCE'],
      daysOptions: [], // Days depend on sub-category
    },
    HOME_WORKOUT: {
      subCategories: ['JUST_BODYWEIGHT', 'JUST_DBS', 'JUST_RINGS', 'DBS_RINGS'],
      daysOptions: [3, 4],
    },
    ASSESSMENT: {
      subCategories: ['5_DAY_PLAN'],
      daysOptions: [5],
    },
  },
  Intermediate: {
    GYM_WORKOUT: {
      subCategories: null,
      daysOptions: [3, 4, 5],
    },
    HOME_WORKOUT: {
      subCategories: ['JUST_BODYWEIGHT', 'JUST_DBS', 'JUST_RINGS', 'DBS_RINGS'],
      daysOptions: [4, 5],
    },
  },
  Advanced: {
    ADVANCE_CALISTHENICS: {
      subCategories: ['JUST_RINGS', 'DBS_RINGS'],
      daysOptions: [4, 5],
    },
    POWERBUILDING: {
      subCategories: null,
      daysOptions: [3, 4, 5, 6],
    },
    CALIS_COMPOUND_LIFTS: {
      subCategories: ['PHASE_1', 'PHASE_2'],
      daysOptions: [5, 6],
    },
  },
};

// Beginner GYM sub-category specific days
export const BEGINNER_GYM_DAYS: Record<string, number[]> = {
  '0_EXPERIENCE': [3, 4],
  '6_MONTH_EXPERIENCE': [4, 5],
};

// Utility: format a raw type/sub-category key into a display label
export function formatTypeLabel(raw: string): string {
  // Check known labels first
  if (WORKOUT_TYPE_LABELS[raw]) return WORKOUT_TYPE_LABELS[raw];
  if (SUB_CATEGORY_LABELS[raw]) return SUB_CATEGORY_LABELS[raw];
  // Convert SNAKE_CASE or raw string to Title Case
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(\d+)\s/g, '$1 '); // keep numbers clean
}

// Display names for nice UI
export const WORKOUT_TYPE_LABELS: Record<string, string> = {
  GYM_WORKOUT: 'Gym Workout',
  HOME_WORKOUT: 'Home Workout',
  ADVANCE_CALISTHENICS: 'Advanced Calisthenics',
  POWERBUILDING: 'Powerbuilding',
  CALIS_COMPOUND_LIFTS: 'Calisthenics + Compound Lifts',
  ASSESSMENT: 'Assessment Plan',
};

export const SUB_CATEGORY_LABELS: Record<string, string> = {
  '0_EXPERIENCE': '0 Experience',
  '6_MONTH_EXPERIENCE': '6-Month Experience',
  'JUST_BODYWEIGHT': 'Just Bodyweight',
  'JUST_DBS': 'Just Dumbbells',
  'JUST_RINGS': 'Just Rings',
  'DBS_RINGS': 'Dumbbells + Rings',
  'PHASE_1': 'Phase 1',
  'PHASE_2': 'Phase 2',
  '5_DAY_PLAN': '5-Day Plan',
};

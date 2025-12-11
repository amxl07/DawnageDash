-- ============================================================================
-- BEGINNER HOME WORKOUT TEMPLATES
-- ============================================================================
-- Run this after the main hierarchical_workout_plans_migration.sql
-- ============================================================================

-- ============================================================================
-- JUST_BODYWEIGHT - 3-day
-- ============================================================================

-- Day 1: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  3,
  1,
  'Full',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Bed Sheet Rows", "sets": 3, "reps": "12-15"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- Day 2: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  3,
  2,
  'Full',
  '[
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Bed Sheet Wide Rows", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 3: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  3,
  3,
  'Full',
  '[
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "12-15"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_BODYWEIGHT - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  1,
  'Push',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  3,
  'Pull',
  '[
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Wide Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Bicep Hammer Curls", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  4,
  'Full',
  '[
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "12-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "12-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_DBS - 3-day
-- ============================================================================

-- Day 1: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  3,
  1,
  'Full',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Bent Over Dumbbell Rows", "sets": 3, "reps": "12-15"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- Day 2: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  3,
  2,
  'Full',
  '[
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "DB Floor Chest Press", "sets": 3, "reps": "10-15"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Bent Over Dumbbell Rows", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 3: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  3,
  3,
  'Full',
  '[
    {"name": "Single Arm DB Rows", "sets": 3, "reps": "12-15"},
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Floor Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_DBS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  1,
  'Push',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Dumbbell Floor Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  3,
  'Pull',
  '[
    {"name": "Single Arm Dumbbell Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bent Over Dumbbell Rows", "sets": 3, "reps": "10-12"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  4,
  'Full',
  '[
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Bent Over Dumbbell Rows", "sets": 3, "reps": "12-15"},
    {"name": "Dumbbell Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Floor Skullcrushers", "sets": 3, "reps": "10-15"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_RINGS - 3-day
-- ============================================================================

-- Day 1: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  3,
  1,
  'Full',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- Day 2: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  3,
  2,
  'Full',
  '[
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"}
  ]'::TEXT
);

-- Day 3: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  3,
  3,
  'Full',
  '[
    {"name": "Leg Supported Pullups", "sets": 3, "reps": "8-10"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_RINGS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  1,
  'Push',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  3,
  'Pull',
  '[
    {"name": "Leg Supported Pullups", "sets": 3, "reps": "8-10"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  4,
  'Full',
  '[
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "12-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- DBS_RINGS - 3-day
-- ============================================================================

-- Day 1: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  3,
  1,
  'Full',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Dumbbell Floor Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  3,
  2,
  'Full',
  '[
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  3,
  3,
  'Full',
  '[
    {"name": "Leg Supported Pullups", "sets": 3, "reps": "8-10"},
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "10-15"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- DBS_RINGS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  1,
  'Push',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  3,
  'Pull',
  '[
    {"name": "Leg Supported Pullups", "sets": 3, "reps": "8-10"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  4,
  'Full',
  '[
    {"name": "Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Dumbbell Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Floor Skullcrushers", "sets": 3, "reps": "10-15"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

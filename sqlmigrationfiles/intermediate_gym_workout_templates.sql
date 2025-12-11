-- ============================================================================
-- INTERMEDIATE GYM WORKOUT TEMPLATES
-- ============================================================================
-- Run this after the main hierarchical_workout_plans_migration.sql
-- ============================================================================

-- ============================================================================
-- GYM_WORKOUT - 3-day
-- ============================================================================

-- Day 1: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  3,
  1,
  'Full Body',
  '[
    {"name": "Bench Press", "sets": 3, "reps": "8-10"},
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Hack Squats", "sets": 3, "reps": "8-12"},
    {"name": "Deep Push Ups", "sets": 3, "reps": "8-12"},
    {"name": "DB Lateral Raises", "sets": 3, "reps": "15-20"},
    {"name": "Preacher Curls", "sets": 2, "reps": "12-15"}
  ]'::TEXT
);

-- Day 2: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  3,
  2,
  'Full Body',
  '[
    {"name": "Chinups", "sets": 3, "reps": "MAX"},
    {"name": "Incline DB Chest Press", "sets": 3, "reps": "8-12"},
    {"name": "RDL", "sets": 3, "reps": "8-12"},
    {"name": "Aus Pulls", "sets": 3, "reps": "15"},
    {"name": "Shrugs BB", "sets": 3, "reps": "8-12"},
    {"name": "BB Skull Crushers", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 3: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  3,
  3,
  'Full Body',
  '[
    {"name": "BB Squats", "sets": 4, "reps": "8-10"},
    {"name": "Dips", "sets": 3, "reps": "MAX"},
    {"name": "Chest Supported Machine Rows", "sets": 3, "reps": "8-12"},
    {"name": "DB Shoulder Press", "sets": 2, "reps": "8-12"},
    {"name": "Hamstring Curls", "sets": 2, "reps": "12-15"},
    {"name": "Leg Extension Machine", "sets": 2, "reps": "12-15"}
  ]'::TEXT
);

-- ============================================================================
-- GYM_WORKOUT - 4-day
-- ============================================================================

-- Day 1: Upper Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  4,
  1,
  'Upper Body',
  '[
    {"name": "Bench Press", "sets": 3, "reps": "8-10"},
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Pec Dec Fly", "sets": 3, "reps": "15"},
    {"name": "Chest Supported Machine Rows", "sets": 3, "reps": "8-12"},
    {"name": "DB Shoulder Press", "sets": 3, "reps": "12-15"},
    {"name": "Lateral Raises (Optional)", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 2: Lower Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  4,
  2,
  'Lower Body',
  '[
    {"name": "BB Squats", "sets": 4, "reps": "8 MAX"},
    {"name": "Bulgarian Splits", "sets": 3, "reps": "8-12"},
    {"name": "Hamstring Curls Seated or Lying", "sets": 3, "reps": "15-20"},
    {"name": "Seated Inclined Curls", "sets": 3, "reps": "12-15"},
    {"name": "Calves Raises", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 3: Upper Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  4,
  3,
  'Upper Body',
  '[
    {"name": "Military Press", "sets": 3, "reps": "8-12"},
    {"name": "Chinups", "sets": 3, "reps": "MAX"},
    {"name": "Dips", "sets": 3, "reps": "MAX"},
    {"name": "Bentover Row", "sets": "3-4", "reps": "8-12"},
    {"name": "Shrugs BB", "sets": 3, "reps": "8-12"},
    {"name": "Facepulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Lower Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  4,
  4,
  'Lower Body',
  '[
    {"name": "RDL", "sets": 3, "reps": "8-12"},
    {"name": "Hack Squats or Leg Press", "sets": 3, "reps": "12-15"},
    {"name": "Leg Extension", "sets": 3, "reps": "8-12"},
    {"name": "BB Skull Crushers", "sets": 3, "reps": "12-15"},
    {"name": "Calves Raises", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- ============================================================================
-- GYM_WORKOUT - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  5,
  1,
  'Push',
  '[
    {"name": "Bench Press", "sets": 3, "reps": "8-10"},
    {"name": "Deep Push Ups", "sets": 3, "reps": "8-12"},
    {"name": "DB Shoulder Press", "sets": 3, "reps": "8-12"},
    {"name": "Dips", "sets": 3, "reps": "MAX"},
    {"name": "Cable Overhead Tricep Extension", "sets": "3-4", "reps": "12-15"},
    {"name": "Lateral Raises (Optional)", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  5,
  2,
  'Pull',
  '[
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Close Grip Lat Pull / Reverse", "sets": 2, "reps": "8-12"},
    {"name": "Chest Supported Machine Rows", "sets": 3, "reps": "8-12"},
    {"name": "Preacher Curls", "sets": 3, "reps": "12-15"},
    {"name": "BB Reverse Curls", "sets": 3, "reps": "12-15"},
    {"name": "Facepulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  5,
  3,
  'Leg',
  '[
    {"name": "BB Squats", "sets": 4, "reps": "8 MAX"},
    {"name": "Bulgarian Splits", "sets": 3, "reps": "8-12"},
    {"name": "Hamstring Curls Seated or Lying", "sets": 3, "reps": "15-20"},
    {"name": "Calves Raises", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  5,
  4,
  'Upper',
  '[
    {"name": "Military Press", "sets": 3, "reps": "8-12"},
    {"name": "Bentover Row", "sets": 3, "reps": "10-12"},
    {"name": "Chest Press Incline Machine", "sets": 3, "reps": "8-10"},
    {"name": "Rope Straight Arm Lat Pulldowns", "sets": 3, "reps": "15"},
    {"name": "Pec Dec Fly", "sets": 3, "reps": "15"},
    {"name": "Shrugs BB", "sets": 3, "reps": "10-12"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'GYM_WORKOUT',
  NULL,
  5,
  5,
  'Lower',
  '[
    {"name": "RDL", "sets": 3, "reps": "8-12"},
    {"name": "Hack Squats or Leg Press", "sets": 3, "reps": "12-15"},
    {"name": "Leg Extension", "sets": 3, "reps": "8-12"},
    {"name": "BB Skull Crushers", "sets": 3, "reps": "12-15"},
    {"name": "Seated Inclined Curls", "sets": 3, "reps": "12-15"},
    {"name": "Calves Raises", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

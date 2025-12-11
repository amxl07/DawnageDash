-- ============================================================================
-- ADVANCED POWERLIFTING WORKOUT TEMPLATES
-- ============================================================================
-- Run this after the main hierarchical_workout_plans_migration.sql
-- ============================================================================

-- ============================================================================
-- POWERLIFTING - 3-day
-- ============================================================================

-- Day 1: Legs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  3,
  1,
  'Legs',
  '[
    {"name": "Deadlift", "sets": 3, "reps": "5-6"},
    {"name": "Squats", "sets": 3, "reps": "5-6"},
    {"name": "Standing Calf Raises", "sets": 3, "reps": "5-6"},
    {"name": "Seated Leg Curls", "sets": 3, "reps": "5-6"}
  ]'::TEXT
);

-- Day 2: Pull (Maps to Day 3 in user request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  3,
  2,
  'Pull',
  '[
    {"name": "Bent Over Rows", "sets": 3, "reps": "5-6"},
    {"name": "Weighted Chin Ups", "sets": 3, "reps": "5-6"},
    {"name": "Standing Cable Curls", "sets": 3, "reps": "5-6"}
  ]'::TEXT
);

-- Day 3: Push (Maps to Day 5 in user request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  3,
  3,
  'Push',
  '[
    {"name": "BB Bench Press", "sets": 3, "reps": "5-6"},
    {"name": "Standing Military Press", "sets": 3, "reps": "5-6"},
    {"name": "Weighted Dips", "sets": 3, "reps": "5-6"},
    {"name": "Decline Close Grip B Press", "sets": 3, "reps": "5-6"}
  ]'::TEXT
);

-- ============================================================================
-- POWERLIFTING - 4-day
-- ============================================================================

-- Day 1: Glutes + Quads
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  4,
  1,
  'Glutes + Quads',
  '[
    {"name": "BB Hip Thrust", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Squats", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Seated Leg Extension", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Walking Lunges", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 2: Pull (Maps to Day 3 in request, skipping cardio day)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  4,
  2,
  'Pull',
  '[
    {"name": "Weighted Pull Ups", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Bent Over Rows", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Chin Ups", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Standing Cable Curls", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 3: Posterior (Maps to Day 4 in request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  4,
  3,
  'Posterior',
  '[
    {"name": "Dead Lift", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Shrugs BB", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Good Mornings", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Leg Curls", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 4: Push (Maps to Day 5 in request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  4,
  4,
  'Push',
  '[
    {"name": "BB Bench Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Military Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Dips", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Decline Close Grip B Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- ============================================================================
-- POWERLIFTING - 5-day
-- ============================================================================

-- Day 1: Glutes + Quads
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  5,
  1,
  'Glutes + Quads',
  '[
    {"name": "BB Hip Thrust", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Squats", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Seated Leg Extension", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Walking Lunges", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 2: Posterior (Maps to Day 3 in request, skipping cardio)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  5,
  2,
  'Posterior',
  '[
    {"name": "Dead Lift", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Shrugs", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Good Mornings", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Leg Curls", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 3: Chest + Abs (Maps to Day 5 in request, skipping Day 4 Cardio)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  5,
  3,
  'Chest + Abs',
  '[
    {"name": "BB Bench Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Miliitry Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Push Ups", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Semi Incline DB Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 4: Back + Biceps (Maps to Day 6 in request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  5,
  4,
  'Back + Biceps',
  '[
    {"name": "Rear Delt Flys", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Bent Over Rows", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Chin Ups", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Standing Cable Curls", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 5: Shoulder + Triceps (Maps to Day 7 in request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  5,
  5,
  'Shoulder + Triceps',
  '[
    {"name": "Miliary Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Dips", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Decline Close Grip B Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Cable Lateral Raises", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);


-- ============================================================================
-- POWERLIFTING - 6-day
-- ============================================================================

-- Day 1: Glutes + Quads
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  6,
  1,
  'Glutes + Quads',
  '[
    {"name": "BB Hip Thrust", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Squats", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Seated Leg Extension", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Walking Lunges", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 2: Cardio + Calve (Includes explicit mention in request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  6,
  2,
  'Cardio + Calve',
  '[
    {"name": "Standing Calves", "sets": 3, "reps": "MAX"}
  ]'::TEXT
);

-- Day 3: Posterior (Maps to Day 3 in request)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  6,
  3,
  'Posterior',
  '[
    {"name": "Dead Lift", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Shrugs", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Good Mornings", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Leg Curls", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

-- Day 4: Chest + Abs (Maps to Day 5 in request, skipping Day 4 Cardio which is rest/cardio only)
-- NOTE: User's 6-day plan has Day 4 Cardio. I will map user DAY 5 to DB Day 4, DAY 6 to DB Day 5, DAY 7 to DB Day 6.
-- Wait, if it's a 6-day plan, we should probably have 6 workout days. The user request has Day 2 Cardio+Calve (which I added), Day 4 Cardio (pure cardio), Day 5, 6, 7.
-- That's 7 days total in the week.
-- If I skip pure Cardio days (Day 4), I have: D1(Lift), D2(Calve), D3(Lift), D5(Lift), D6(Lift), D7(Lift). That is 6 lifting/workout days.
-- I will map them as follows:
-- User Day 1 -> DB Day 1
-- User Day 2 -> DB Day 2 (Cardio + Calve)
-- User Day 3 -> DB Day 3 (Posterior)
-- User Day 5 -> DB Day 4 (Chest + Abs)
-- User Day 6 -> DB Day 5 (Back + Biceps)
-- User Day 7 -> DB Day 6 (Shoulder + Triceps)

INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  6,
  4,
  'Chest + Abs',
  '[
    {"name": "BB Bench Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Miliitry Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Dips", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Decline Close Grip B Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  6,
  5,
  'Back + Biceps',
  '[
    {"name": "Weighted Pull Ups", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Bent Over Rows", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Chin Ups", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Standing Cable Curls", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'POWERBUILDING',
  NULL,
  6,
  6,
  'Shoulder + Triceps',
  '[
    {"name": "Miliary Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Weighted Dips", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Close Grip B Press", "sets": 3, "reps": "5-6", "tempo": "1-1-1"},
    {"name": "Cable Lateral Raises", "sets": 3, "reps": "5-6", "tempo": "1-1-1"}
  ]'::TEXT
);

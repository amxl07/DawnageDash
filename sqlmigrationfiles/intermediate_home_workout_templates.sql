-- ============================================================================
-- INTERMEDIATE HOME WORKOUT TEMPLATES
-- ============================================================================
-- Run this after the main hierarchical_workout_plans_migration.sql
-- ============================================================================

-- ============================================================================
-- JUST_BODYWEIGHT - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Diamond Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
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
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  4,
  4,
  'Full',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "15-20"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_BODYWEIGHT - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  5,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Diamond Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  5,
  2,
  'Pull',
  '[
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Wide Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Bicep Hammer Curls", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  5,
  3,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  5,
  4,
  'Upper',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "15-20"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Paused Tempo Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  5,
  5,
  'Lower',
  '[
    {"name": "Box Pistol Squats", "sets": 3, "reps": "10-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Side Step Up", "sets": 3, "reps": "10-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_RINGS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  3,
  'Pull',
  '[
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  4,
  4,
  'Full',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Chinups", "sets": 3, "reps": "MAX"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_RINGS - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  5,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  5,
  2,
  'Pull',
  '[
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  5,
  3,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  5,
  4,
  'Upper',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Chinups", "sets": 3, "reps": "MAX"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_RINGS',
  5,
  5,
  'Lower',
  '[
    {"name": "Box Pistol Squats", "sets": 3, "reps": "10-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Side Step Up", "sets": 3, "reps": "10-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_DBS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "DB Floor Chest Flys", "sets": 3, "reps": "10-15"},
    {"name": "DB Lateral Raise", "sets": 3, "reps": "15-20"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  3,
  'Pull',
  '[
    {"name": "Single Arm Dumbbell Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Wide Rows", "sets": 3, "reps": "12-15"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "10-15"},
    {"name": "DB Bent Over Rear Delt Flys", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  4,
  4,
  'Full',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bent Over Dumbbell Rows", "sets": 3, "reps": "10-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "DB Reverse Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_DBS - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  5,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "DB Floor Chest Flys", "sets": 3, "reps": "10-15"},
    {"name": "DB Lateral Raise", "sets": 3, "reps": "15-20"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  5,
  2,
  'Pull',
  '[
    {"name": "Single Arm Dumbbell Rows", "sets": 3, "reps": "12-15"},
    {"name": "Bed Sheet Wide Rows", "sets": 3, "reps": "12-15"},
    {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "10-15"},
    {"name": "DB Bent Over Rear Delt Flys", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  5,
  3,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  5,
  4,
  'Upper',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "DB Bent Over Rows", "sets": 3, "reps": "15"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "DB Floor Chest Press", "sets": 3, "reps": "10-15"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "DB Reverse Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'JUST_DBS',
  5,
  5,
  'Lower',
  '[
    {"name": "Box Pistol Squats", "sets": 3, "reps": "10-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Side Step Up", "sets": 3, "reps": "10-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- DBS_RINGS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Diamond Pushups", "sets": 3, "reps": "MAX"},
    {"name": "DB Lateral Raise", "sets": 3, "reps": "15-20"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  2,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  3,
  'Pull',
  '[
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  4,
  4,
  'Full',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Chinups", "sets": 3, "reps": "MAX"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "DB Reverse Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- DBS_RINGS - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  5,
  1,
  'Push',
  '[
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Diamond Pushups", "sets": 3, "reps": "MAX"},
    {"name": "DB Lateral Raise", "sets": 3, "reps": "15-20"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  5,
  2,
  'Pull',
  '[
    {"name": "Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  5,
  3,
  'Leg',
  '[
    {"name": "Squat Jumps", "sets": 3, "reps": "15-20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Reverse Hyperextension", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  5,
  4,
  'Upper',
  '[
    {"name": "Clap Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Chinups", "sets": 3, "reps": "MAX"},
    {"name": "Elevated Pike Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "DB Reverse Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Intermediate',
  'HOME_WORKOUT',
  'DBS_RINGS',
  5,
  5,
  'Lower',
  '[
    {"name": "Box Pistol Squats", "sets": 3, "reps": "10-15"},
    {"name": "Jumping Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Side Step Up", "sets": 3, "reps": "10-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

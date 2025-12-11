-- ============================================================================
-- ADVANCED CALISTHENICS WORKOUT TEMPLATES
-- ============================================================================
-- Run this after the main hierarchical_workout_plans_migration.sql
-- ============================================================================

-- ============================================================================
-- JUST_RINGS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  4,
  1,
  'Push',
  '[
    {"name": "Aztec / Superman Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups [EMOM-10mins]", "sets": 10, "reps": "10"},
    {"name": "Elevated Deep Pike Pushups", "sets": 3, "reps": "8-10"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  4,
  2,
  'Pull',
  '[
    {"name": "Dead Stop L-Sit Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Pullups [EMOM-10mins]", "sets": 10, "reps": "8"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Pelican Bicep Curls", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  4,
  3,
  'Leg',
  '[
    {"name": "Assisted Full ROM Pistol Squat", "sets": 3, "reps": "10-12"},
    {"name": "Paused Squat Jumps", "sets": 3, "reps": "20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Single Leg Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Assisted Sissy Squats", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  4,
  4,
  'Full',
  '[
    {"name": "Chest To Wall Handstand Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Arched Back Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- JUST_RINGS - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  5,
  1,
  'Push',
  '[
    {"name": "Aztec / Superman Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups [EMOM-10mins]", "sets": 10, "reps": "10"},
    {"name": "Elevated Deep Pike Pushups", "sets": 3, "reps": "8-10"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  5,
  2,
  'Pull',
  '[
    {"name": "Dead Stop L-Sit Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Pullups [EMOM-10mins]", "sets": 10, "reps": "8"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Pelican Bicep Curls", "sets": 3, "reps": "10-12"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  5,
  3,
  'Leg',
  '[
    {"name": "Assisted Full ROM Pistol Squat", "sets": 3, "reps": "10-12"},
    {"name": "Paused Squat Jumps", "sets": 3, "reps": "20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Assisted Sissy Squats", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  5,
  4,
  'Upper',
  '[
    {"name": "Chest To Wall Handstand Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Arched Back Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Single Arm Ring Bicep Curls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'JUST_RINGS',
  5,
  5,
  'Lower',
  '[
    {"name": "Assisted Full ROM Pistol Squat", "sets": 3, "reps": "10-12"},
    {"name": "Single Leg Explosives", "sets": 3, "reps": "15-20"},
    {"name": "Weighted Single Leg Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- DBS_RINGS - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  4,
  1,
  'Push',
  '[
    {"name": "Aztec / Superman Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups [EMOM-10mins]", "sets": 10, "reps": "10"},
    {"name": "Elevated Deep Pike Pushups", "sets": 3, "reps": "8-10"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  4,
  2,
  'Pull',
  '[
    {"name": "Dead Stop L-Sit Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Pullups [EMOM-10mins]", "sets": 10, "reps": "8"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Pelican Bicep Curls", "sets": 3, "reps": "10-12"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  4,
  3,
  'Leg',
  '[
    {"name": "Assisted Full ROM Pistol Squat", "sets": 3, "reps": "10-12"},
    {"name": "Weighted Squat Jumps", "sets": 3, "reps": "20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Single Leg Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Assisted Sissy Squats", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  4,
  4,
  'Full',
  '[
    {"name": "Chest To Wall Handstand Pushups", "sets": 3, "reps": "MAX"},
    {"name": "DB Walking Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Arched Back Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Ring Bicep Curls", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- ============================================================================
-- DBS_RINGS - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  5,
  1,
  'Push',
  '[
    {"name": "Aztec / Superman Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Deep Pushups [EMOM-10mins]", "sets": 10, "reps": "10"},
    {"name": "Elevated Deep Pike Pushups", "sets": 3, "reps": "8-10"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "MAX"},
    {"name": "Ring Flys", "sets": 3, "reps": "12-15"},
    {"name": "Ring Bodyweight Skullcrushers", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  5,
  2,
  'Pull',
  '[
    {"name": "Dead Stop L-Sit Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Pullups [EMOM-10mins]", "sets": 10, "reps": "8"},
    {"name": "Single Arm Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Pelican Bicep Curls", "sets": 3, "reps": "10-12"},
    {"name": "Dumbbell Bicep Hammer Curls", "sets": 3, "reps": "15-20"},
    {"name": "Ring Face Pulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  5,
  3,
  'Leg',
  '[
    {"name": "Assisted Full ROM Pistol Squat", "sets": 3, "reps": "10-12"},
    {"name": "Weighted Squat Jumps", "sets": 3, "reps": "20"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-15"},
    {"name": "Assisted Sissy Squats", "sets": 3, "reps": "10-15"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 4: Upper
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  5,
  4,
  'Upper',
  '[
    {"name": "Chest To Wall Handstand Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Arched Back Pullups", "sets": 3, "reps": "MAX"},
    {"name": "Ring Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Floor Tricep Extensions", "sets": 3, "reps": "10-15"},
    {"name": "Single Arm Ring Bicep Curls", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 5: Lower
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'DBS_RINGS',
  5,
  5,
  'Lower',
  '[
    {"name": "Assisted Full ROM Pistol Squat", "sets": 3, "reps": "10-12"},
    {"name": "Single Leg Explosives", "sets": 3, "reps": "15-20"},
    {"name": "Weighted Single Leg Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Single Leg RDLs", "sets": 3, "reps": "15-20"},
    {"name": "Single Calf Raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

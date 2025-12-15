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

-- ============================================================================
-- CALIS_COMPOUND - 6-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  6,
  1,
  'Push',
  '[
    {"name": "Clap Push ups", "sets": 3, "reps": "15"},
    {"name": "Barbell Bench press", "sets": 3, "reps": "10"},
    {"name": "Pike Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Body weight Dips", "sets": 3, "reps": "MAX"},
    {"name": "DB Lateral raises", "sets": 3, "reps": "15-20"},
    {"name": "EZ bar Skull crushers", "sets": 3, "reps": "12-15"},
    {"name": "Hanging leg raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  6,
  2,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "Pullups", "sets": 4, "reps": "MAX"},
    {"name": "Single arm Db rows", "sets": 3, "reps": "10-12"},
    {"name": "Chin up", "sets": 3, "reps": "MAX"},
    {"name": "Seated Dumbbell Incline Curls", "sets": 3, "reps": "12-15"},
    {"name": "Facepulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  6,
  3,
  'Leg',
  '[
    {"name": "Box jumps", "sets": 2, "reps": "8-10"},
    {"name": "Back Squat", "sets": 2, "reps": "8-10"},
    {"name": "Side Step ups", "sets": 4, "reps": "10"},
    {"name": "Hamstring machine curls", "sets": 3, "reps": "15-20"},
    {"name": "Calf raises", "sets": 3, "reps": "15"},
    {"name": "Cable crunch", "sets": 3, "reps": "20"}
  ]'::TEXT
);

-- Day 4: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  6,
  4,
  'Push',
  '[
    {"name": "Pike Pushups", "sets": 3, "reps": "15"},
    {"name": "DB Incline Chest Press", "sets": 3, "reps": "10"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "12-15"},
    {"name": "Deep Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Overhead rope extension", "sets": 3, "reps": "15-20"},
    {"name": "V-Ups", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 5: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  6,
  5,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "Pullups", "sets": 4, "reps": "MAX"},
    {"name": "Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Lat Pulldown", "sets": 4, "reps": "10-12"},
    {"name": "EZ bar preacher curls", "sets": 3, "reps": "12-15"},
    {"name": "Ab wheel rollout", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 6: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  6,
  6,
  'Leg',
  '[
    {"name": "Assisted Pistol Squats", "sets": 2, "reps": "30-60s"},
    {"name": "DB Romanian Deadlift", "sets": 2, "reps": "10-12"},
    {"name": "Leg Extensions", "sets": 4, "reps": "15-20"},
    {"name": "Calf raises", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- ============================================================================
-- CALIS_COMPOUND - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  5,
  1,
  'Push',
  '[
    {"name": "Clap Push ups", "sets": 3, "reps": "15"},
    {"name": "Barbell Bench press", "sets": 3, "reps": "10"},
    {"name": "Pike Pushups", "sets": 3, "reps": "12-15"},
    {"name": "Body weight Dips", "sets": 3, "reps": "MAX"},
    {"name": "DB Lateral raises", "sets": 3, "reps": "15-20"},
    {"name": "EZ bar Skull crushers", "sets": 3, "reps": "12-15"},
    {"name": "Hanging leg raises", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  5,
  2,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "Pullups", "sets": 4, "reps": "MAX"},
    {"name": "Single arm Db rows", "sets": 3, "reps": "10-12"},
    {"name": "Chin up", "sets": 3, "reps": "MAX"},
    {"name": "Seated Dumbbell Incline Curls", "sets": 3, "reps": "12-15"},
    {"name": "Facepulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg (Based on text: Assisted Pistol Squats, etc.)
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  5,
  3,
  'Leg',
  '[
    {"name": "Assisted Pistol Squats", "sets": 2, "reps": "30-60s"},
    {"name": "DB Romanian Deadlift", "sets": 2, "reps": "10-12"},
    {"name": "Leg Extensions", "sets": 4, "reps": "15-20"},
    {"name": "Calf raises", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- Day 4: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  5,
  4,
  'Push',
  '[
    {"name": "Pike Pushups", "sets": 3, "reps": "15"},
    {"name": "DB Incline Chest Press", "sets": 3, "reps": "10"},
    {"name": "Bodyweight Dips", "sets": 3, "reps": "12-15"},
    {"name": "Deep Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Overhead rope extension", "sets": 3, "reps": "15-20"},
    {"name": "V-Ups", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 5: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND',
  5,
  5,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "Pullups", "sets": 4, "reps": "MAX"},
    {"name": "Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Lat Pulldown", "sets": 4, "reps": "10-12"},
    {"name": "EZ bar preacher curls", "sets": 3, "reps": "12-15"},
    {"name": "Ab wheel rollout", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- ============================================================================
-- CALIS_COMPOUND_PHASE_2 - 6-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  6,
  1,
  'Push',
  '[
    {"name": "Barbell Bench press", "sets": 4, "reps": "5"},
    {"name": "Aztec / Superman Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Dips", "sets": 3, "reps": "8-10"},
    {"name": "DB Shoulder Press", "sets": 3, "reps": "10-12"},
    {"name": "Bodyweight Skull crushers", "sets": 3, "reps": "12-15"},
    {"name": "DB Lateral raises", "sets": 3, "reps": "15-20"},
    {"name": "Hanging Toes to bar", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  6,
  2,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "High Pulls", "sets": 4, "reps": "MAX"},
    {"name": "Weighted Pullups", "sets": 4, "reps": "5"},
    {"name": "Bent over BB rows", "sets": 3, "reps": "10-12"},
    {"name": "Weighted Chin up", "sets": 3, "reps": "10"},
    {"name": "Seated Dumbbell Incline Curls", "sets": 3, "reps": "12-15"},
    {"name": "Facepulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  6,
  3,
  'Leg',
  '[
    {"name": "Deadlift", "sets": 4, "reps": "5"},
    {"name": "Single leg explosives", "sets": 3, "reps": "8-10"},
    {"name": "Pistol squats", "sets": 3, "reps": "10"},
    {"name": "Hamstring machine curls", "sets": 3, "reps": "15-20"},
    {"name": "Calf raises", "sets": 3, "reps": "15"},
    {"name": "Cable crunch", "sets": 3, "reps": "20"}
  ]'::TEXT
);

-- Day 4: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  6,
  4,
  'Push',
  '[
    {"name": "Chest to wall Handstand pushups", "sets": 3, "reps": "15"},
    {"name": "Barbell Military Press", "sets": 3, "reps": "10"},
    {"name": "Ring Pushups", "sets": 3, "reps": "12-15"},
    {"name": "High to low Cable Flys", "sets": 3, "reps": "MAX"},
    {"name": "Straight bar Dips", "sets": 3, "reps": "15-20"},
    {"name": "Cable overhead Extensions", "sets": 3, "reps": "12-15"},
    {"name": "Dragon flags", "sets": 3, "reps": "MAX"}
  ]'::TEXT
);

-- Day 5: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  6,
  5,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "Ring- chest to ring pullups", "sets": 4, "reps": "15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Single arm Db rows", "sets": 3, "reps": "10-12"},
    {"name": "EZ bar preacher curls", "sets": 3, "reps": "12-15"},
    {"name": "Ab wheel rollout", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 6: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  6,
  6,
  'Leg',
  '[
    {"name": "Back Squat", "sets": 4, "reps": "5"},
    {"name": "DB Romanian Deadlift", "sets": 3, "reps": "10-12"},
    {"name": "Leg Extensions", "sets": 3, "reps": "15-20"},
    {"name": "Calf raises", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- ============================================================================
-- CALIS_COMPOUND_PHASE_2 - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  5,
  1,
  'Push',
  '[
    {"name": "Barbell Bench press", "sets": 4, "reps": "5"},
    {"name": "Aztec / Superman Pushups", "sets": 3, "reps": "10-15"},
    {"name": "Weighted Dips", "sets": 3, "reps": "8-10"},
    {"name": "DB Shoulder Press", "sets": 3, "reps": "10-12"},
    {"name": "Bodyweight Skull crushers", "sets": 3, "reps": "12-15"},
    {"name": "DB Lateral raises", "sets": 3, "reps": "15-20"},
    {"name": "Hanging Toes to bar", "sets": 3, "reps": "10-15"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  5,
  2,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "High Pulls", "sets": 4, "reps": "MAX"},
    {"name": "Weighted Pullups", "sets": 4, "reps": "5"},
    {"name": "Bent over BB rows", "sets": 3, "reps": "10-12"},
    {"name": "Weighted Chin up", "sets": 3, "reps": "10"},
    {"name": "Seated Dumbbell Incline Curls", "sets": 3, "reps": "12-15"},
    {"name": "Facepulls", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  5,
  3,
  'Leg',
  '[
    {"name": "Deadlift", "sets": 4, "reps": "5"},
    {"name": "Single leg explosives", "sets": 3, "reps": "8-10"},
    {"name": "Pistol squats", "sets": 3, "reps": "10"},
    {"name": "Hamstring machine curls", "sets": 3, "reps": "15-20"},
    {"name": "Calf raises", "sets": 3, "reps": "15"},
    {"name": "Cable crunch", "sets": 3, "reps": "20"}
  ]'::TEXT
);

-- Day 4: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  5,
  4,
  'Push',
  '[
    {"name": "Chest to wall Handstand pushups", "sets": 3, "reps": "15"},
    {"name": "Barbell Military Press", "sets": 3, "reps": "10"},
    {"name": "Ring Pushups", "sets": 3, "reps": "12-15"},
    {"name": "High to low Cable Flys", "sets": 3, "reps": "MAX"},
    {"name": "Straight bar Dips", "sets": 3, "reps": "15-20"},
    {"name": "Cable overhead Extensions", "sets": 3, "reps": "12-15"},
    {"name": "Dragon flags", "sets": 3, "reps": "MAX"}
  ]'::TEXT
);

-- Day 5: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'ADVANCE_CALISTHENICS',
  'CALIS_COMPOUND_PHASE_2',
  5,
  5,
  'Pull',
  '[
    {"name": "Deadhang", "sets": 2, "reps": "30-60s"},
    {"name": "Scapula Pullups", "sets": 2, "reps": "10"},
    {"name": "Ring- chest to ring pullups", "sets": 4, "reps": "15"},
    {"name": "Australian Pullups", "sets": 3, "reps": "12-15"},
    {"name": "Single arm Db rows", "sets": 3, "reps": "10-12"},
    {"name": "EZ bar preacher curls", "sets": 3, "reps": "12-15"},
    {"name": "Ab wheel rollout", "sets": 3, "reps": "15-20"}
  ]'::TEXT
);





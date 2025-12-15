
-- ============================================================================
-- Fix: Correctly Categorize Calisthenics Compound Templates
-- 
-- PREVIOUS ERROR: Templates were inserted under 'ADVANCE_CALISTHENICS' with 
-- subcategories 'CALIS_COMPOUND' and 'CALIS_COMPOUND_PHASE_2'.
--
-- CORRECTION: 
-- Workout Type: 'CALIS_COMPOUND_LIFTS'
-- Sub Categories: 'PHASE_1' and 'PHASE_2'
-- ============================================================================

-- 1. CLEANUP: Remove incorrectly categorized entries (if they exist)
DELETE FROM workout_templates 
WHERE level = 'Advanced' 
  AND workout_type = 'ADVANCE_CALISTHENICS' 
  AND sub_category IN ('CALIS_COMPOUND', 'CALIS_COMPOUND_PHASE_2');

-- 2. CLEANUP: Remove any existing target entries to avoid duplicates before simple insertion
DELETE FROM workout_templates 
WHERE level = 'Advanced' 
  AND workout_type = 'CALIS_COMPOUND_LIFTS' 
  AND sub_category IN ('PHASE_1', 'PHASE_2');


-- ============================================================================
-- PHASE 1 (Previously CALIS_COMPOUND)
-- ============================================================================

-- 6-Day Split
-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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

-- 5-Day Split
-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_1',
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
-- PHASE 2 (Previously CALIS_COMPOUND_PHASE_2)
-- ============================================================================

-- 6-Day Split
-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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

-- 5-Day Split
-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Advanced',
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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
  'CALIS_COMPOUND_LIFTS',
  'PHASE_2',
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

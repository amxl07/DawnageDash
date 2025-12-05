-- Migration to add 'level' field to workout_plans and meal_plans tables
-- Run this in your Supabase SQL Editor

-- Add level column to workout_plans
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'Beginner';

-- Add level column to meal_plans
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'Beginner';

-- Update existing records to have 'Beginner' level if NULL
UPDATE workout_plans SET level = 'Beginner' WHERE level IS NULL;
UPDATE meal_plans SET level = 'Beginner' WHERE level IS NULL;

-- Create index for faster queries by level
CREATE INDEX IF NOT EXISTS idx_workout_plans_level ON workout_plans(user_id, level);
CREATE INDEX IF NOT EXISTS idx_meal_plans_level ON meal_plans(user_id, level);

-- ============================================================================
-- TEMPLATE DATA FOR ALL USERS
-- ============================================================================
-- Replace 'YOUR_USER_ID' with your actual user ID
-- You can find it by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- ============================================================================
-- BEGINNER WORKOUT PLANS
-- ============================================================================
INSERT INTO workout_plans (user_id, level, day_of_week, focus, exercises) VALUES
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Monday', 'Full Body Basics',
 '[
   {"name": "Bodyweight Squats", "sets": 3, "reps": "12-15", "rest": "60s"},
   {"name": "Push-ups (Knee)", "sets": 3, "reps": "8-10", "rest": "60s"},
   {"name": "Dumbbell Rows", "sets": 3, "reps": "10-12", "rest": "60s"},
   {"name": "Plank", "sets": 3, "duration": "20-30s", "rest": "45s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Tuesday', 'Active Recovery',
 '[
   {"name": "Walking", "duration": "20-30 min"},
   {"name": "Stretching", "duration": "10-15 min"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Wednesday', 'Upper Body',
 '[
   {"name": "Dumbbell Chest Press", "sets": 3, "reps": "10-12", "rest": "60s"},
   {"name": "Seated Shoulder Press", "sets": 3, "reps": "8-10", "rest": "60s"},
   {"name": "Bicep Curls", "sets": 3, "reps": "12-15", "rest": "45s"},
   {"name": "Tricep Dips", "sets": 3, "reps": "8-10", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Thursday', 'Rest Day',
 '[
   {"name": "Rest and Recovery"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Friday', 'Lower Body',
 '[
   {"name": "Goblet Squats", "sets": 3, "reps": "10-12", "rest": "90s"},
   {"name": "Lunges", "sets": 3, "reps": "10 each leg", "rest": "60s"},
   {"name": "Leg Curls", "sets": 3, "reps": "12-15", "rest": "60s"},
   {"name": "Calf Raises", "sets": 3, "reps": "15-20", "rest": "45s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Saturday', 'Light Cardio',
 '[
   {"name": "Cycling or Swimming", "duration": "20-30 min"},
   {"name": "Core Work", "sets": 3, "reps": "10-12", "rest": "45s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Sunday', 'Rest Day',
 '[
   {"name": "Complete Rest"}
 ]'::TEXT
);

-- ============================================================================
-- INTERMEDIATE WORKOUT PLANS
-- ============================================================================
INSERT INTO workout_plans (user_id, level, day_of_week, focus, exercises) VALUES
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Monday', 'Upper Push',
 '[
   {"name": "Barbell Bench Press", "sets": 4, "reps": "8-10", "rest": "90s"},
   {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "rest": "90s"},
   {"name": "Overhead Press", "sets": 4, "reps": "8-10", "rest": "90s"},
   {"name": "Lateral Raises", "sets": 3, "reps": "12-15", "rest": "60s"},
   {"name": "Tricep Pushdowns", "sets": 3, "reps": "12-15", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Tuesday', 'Lower Power',
 '[
   {"name": "Back Squats", "sets": 4, "reps": "6-8", "rest": "3 min"},
   {"name": "Romanian Deadlifts", "sets": 4, "reps": "8-10", "rest": "2 min"},
   {"name": "Leg Press", "sets": 3, "reps": "12-15", "rest": "90s"},
   {"name": "Leg Curls", "sets": 3, "reps": "12-15", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Wednesday', 'Active Recovery',
 '[
   {"name": "Light Jog or Swim", "duration": "30 min"},
   {"name": "Mobility Work", "duration": "15 min"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Thursday', 'Upper Pull',
 '[
   {"name": "Pull-ups", "sets": 4, "reps": "8-12", "rest": "90s"},
   {"name": "Barbell Rows", "sets": 4, "reps": "8-10", "rest": "90s"},
   {"name": "Face Pulls", "sets": 3, "reps": "15-20", "rest": "60s"},
   {"name": "Barbell Curls", "sets": 3, "reps": "10-12", "rest": "60s"},
   {"name": "Hammer Curls", "sets": 3, "reps": "12-15", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Friday', 'Lower Hypertrophy',
 '[
   {"name": "Front Squats", "sets": 4, "reps": "10-12", "rest": "2 min"},
   {"name": "Bulgarian Split Squats", "sets": 3, "reps": "10-12 each", "rest": "90s"},
   {"name": "Leg Extensions", "sets": 3, "reps": "15-20", "rest": "60s"},
   {"name": "Seated Calf Raises", "sets": 4, "reps": "15-20", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Saturday', 'HIIT Cardio',
 '[
   {"name": "Sprint Intervals", "sets": 8, "duration": "30s", "rest": "90s"},
   {"name": "Core Circuit", "sets": 3, "duration": "45s each", "rest": "30s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Sunday', 'Rest',
 '[
   {"name": "Rest and Recovery"}
 ]'::TEXT
);

-- ============================================================================
-- PROFESSIONAL WORKOUT PLANS
-- ============================================================================
INSERT INTO workout_plans (user_id, level, day_of_week, focus, exercises) VALUES
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Monday', 'Heavy Upper Power',
 '[
   {"name": "Bench Press", "sets": 5, "reps": "5", "rest": "4 min"},
   {"name": "Weighted Dips", "sets": 4, "reps": "6-8", "rest": "3 min"},
   {"name": "Overhead Press", "sets": 5, "reps": "5", "rest": "3 min"},
   {"name": "Close-Grip Bench", "sets": 4, "reps": "6-8", "rest": "2 min"},
   {"name": "Cable Flyes", "sets": 3, "reps": "12-15", "rest": "90s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Tuesday', 'Heavy Lower Power',
 '[
   {"name": "Deadlifts", "sets": 5, "reps": "3-5", "rest": "5 min"},
   {"name": "Squats", "sets": 5, "reps": "5", "rest": "4 min"},
   {"name": "Pause Squats", "sets": 3, "reps": "6", "rest": "3 min"},
   {"name": "Nordic Curls", "sets": 4, "reps": "8-10", "rest": "2 min"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Wednesday', 'Upper Hypertrophy',
 '[
   {"name": "Incline Bench Press", "sets": 4, "reps": "8-10", "rest": "2 min"},
   {"name": "Weighted Pull-ups", "sets": 4, "reps": "8-10", "rest": "2 min"},
   {"name": "Dumbbell Rows", "sets": 4, "reps": "10-12", "rest": "90s"},
   {"name": "Lateral Raises", "sets": 4, "reps": "12-15", "rest": "60s"},
   {"name": "Preacher Curls", "sets": 3, "reps": "12-15", "rest": "60s"},
   {"name": "Overhead Extensions", "sets": 3, "reps": "12-15", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Thursday', 'Conditioning',
 '[
   {"name": "Assault Bike", "sets": 10, "duration": "30s", "rest": "60s"},
   {"name": "Heavy Farmer Walks", "sets": 4, "duration": "40m", "rest": "2 min"},
   {"name": "Sled Push", "sets": 6, "duration": "30s", "rest": "90s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Friday', 'Lower Hypertrophy',
 '[
   {"name": "Front Squats", "sets": 4, "reps": "8-10", "rest": "3 min"},
   {"name": "Romanian Deadlifts", "sets": 4, "reps": "10-12", "rest": "2 min"},
   {"name": "Walking Lunges", "sets": 4, "reps": "12 each", "rest": "90s"},
   {"name": "Leg Press", "sets": 4, "reps": "15-20", "rest": "90s"},
   {"name": "Standing Calf Raises", "sets": 5, "reps": "15-20", "rest": "60s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Saturday', 'Accessory & Core',
 '[
   {"name": "Abs Wheel Rollouts", "sets": 4, "reps": "12-15", "rest": "90s"},
   {"name": "Hanging Leg Raises", "sets": 4, "reps": "15-20", "rest": "60s"},
   {"name": "Band Pull-Aparts", "sets": 3, "reps": "20", "rest": "45s"},
   {"name": "Face Pulls", "sets": 3, "reps": "20", "rest": "45s"}
 ]'::TEXT
),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Sunday', 'Active Recovery',
 '[
   {"name": "Light Swimming", "duration": "30 min"},
   {"name": "Yoga or Stretching", "duration": "30 min"}
 ]'::TEXT
);

-- ============================================================================
-- BEGINNER MEAL PLANS
-- ============================================================================
INSERT INTO meal_plans (user_id, level, day_of_week, meal_type, description, calories, protein, carbs, fats) VALUES
-- Monday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Monday', 'Breakfast', 'Oatmeal with banana and honey', 350, 12, 65, 6),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Monday', 'Lunch', 'Grilled chicken breast with brown rice and vegetables', 450, 35, 50, 10),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Monday', 'Dinner', 'Baked salmon with sweet potato and broccoli', 500, 40, 45, 15),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Monday', 'Snacks', 'Greek yogurt with berries', 150, 15, 20, 3),
-- Tuesday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Tuesday', 'Breakfast', 'Scrambled eggs with whole wheat toast', 320, 20, 35, 12),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Tuesday', 'Lunch', 'Turkey sandwich with mixed greens salad', 400, 30, 45, 10),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Tuesday', 'Dinner', 'Lean beef stir-fry with quinoa', 480, 38, 48, 12),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Tuesday', 'Snacks', 'Apple with almond butter', 180, 5, 22, 9),
-- Wednesday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Wednesday', 'Breakfast', 'Protein smoothie with spinach', 300, 25, 35, 8),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Wednesday', 'Lunch', 'Tuna salad with whole grain crackers', 380, 32, 40, 9),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Wednesday', 'Dinner', 'Chicken fajitas with peppers', 460, 36, 50, 11),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Beginner', 'Wednesday', 'Snacks', 'Cottage cheese with pineapple', 140, 14, 18, 2);

-- ============================================================================
-- INTERMEDIATE MEAL PLANS
-- ============================================================================
INSERT INTO meal_plans (user_id, level, day_of_week, meal_type, description, calories, protein, carbs, fats) VALUES
-- Monday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Monday', 'Breakfast', 'Protein pancakes with berries', 450, 30, 55, 10),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Monday', 'Lunch', 'Grilled steak with jasmine rice and asparagus', 600, 45, 60, 15),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Monday', 'Dinner', 'Baked cod with pasta and vegetables', 550, 42, 58, 12),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Monday', 'Snacks', 'Protein shake with banana', 250, 25, 30, 5),
-- Tuesday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Tuesday', 'Breakfast', 'Egg white omelet with avocado toast', 420, 28, 45, 14),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Tuesday', 'Lunch', 'Chicken breast with couscous and mixed vegetables', 580, 48, 62, 12),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Tuesday', 'Dinner', 'Turkey meatballs with whole wheat spaghetti', 560, 44, 60, 13),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Tuesday', 'Snacks', 'Rice cakes with peanut butter', 220, 8, 28, 10),
-- Wednesday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Wednesday', 'Breakfast', 'Greek yogurt parfait with granola', 400, 25, 50, 10),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Wednesday', 'Lunch', 'Salmon bowl with quinoa and edamame', 620, 46, 58, 18),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Wednesday', 'Dinner', 'Lean pork chops with roasted potatoes', 540, 42, 54, 14),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Intermediate', 'Wednesday', 'Snacks', 'Trail mix with nuts and dried fruit', 240, 7, 25, 12);

-- ============================================================================
-- PROFESSIONAL MEAL PLANS
-- ============================================================================
INSERT INTO meal_plans (user_id, level, day_of_week, meal_type, description, calories, protein, carbs, fats) VALUES
-- Monday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Monday', 'Breakfast', 'Large protein shake with oats and berries', 600, 45, 70, 12),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Monday', 'Lunch', '8oz grilled chicken with rice and vegetables', 750, 60, 80, 15),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Monday', 'Dinner', 'Ribeye steak with sweet potato and spinach', 800, 55, 75, 25),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Monday', 'Snacks', 'Mass gainer shake', 400, 30, 50, 8),
-- Tuesday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Tuesday', 'Breakfast', '6 whole eggs with avocado and whole grain toast', 650, 40, 50, 28),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Tuesday', 'Lunch', 'Double chicken burrito bowl with brown rice', 780, 65, 85, 18),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Tuesday', 'Dinner', 'Grilled salmon with pasta and Caesar salad', 820, 58, 80, 24),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Tuesday', 'Snacks', 'Protein bars and banana', 380, 25, 45, 10),
-- Wednesday
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Wednesday', 'Breakfast', 'Protein pancakes stack with syrup', 720, 50, 85, 15),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Wednesday', 'Lunch', 'Beef and quinoa power bowl', 800, 62, 82, 20),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Wednesday', 'Dinner', 'Grilled chicken with basmati rice and curry', 760, 58, 78, 16),
('7fb9f278-2317-421d-a422-0daa7259615e', 'Professional', 'Wednesday', 'Snacks', 'Casein protein shake before bed', 350, 35, 30, 6);

-- Update Day 1: Push
UPDATE workout_templates
SET exercises = '[
    {"name": "Push Ups", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=WDIpL0pjun0"},
    {"name": "Incline DB Press", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=5Y3VZsLb1Ys"},
    {"name": "DB Shoulder Press", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/iyDflA1z44c"},
    {"name": "Close Grip Push Ups", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/7m-LqT4egpU"},
    {"name": "OH Single Arm DB", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/qgykFqqgaD8"}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 4 
  AND day_number = 1;

-- Update Day 2: Pull
UPDATE workout_templates
SET exercises = '[
    {"name": "Pull Ups (Assisted)", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=gx0RWT7WbmA"},
    {"name": "Lat Pull Down", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/LCxqAQfmo-8"},
    {"name": "Wide Grip Cable Row", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/vqPY3fDessY"},
    {"name": "Cable Bicep Curl", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/CrbTqNOlFgE"},
    {"name": "DB Reverse Curl", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/Pkuda371YAQ"}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 4 
  AND day_number = 2;

-- Update Day 3: Leg
UPDATE workout_templates
SET exercises = '[
    {"name": "BB Squat", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=-bJIpOq-LWk"},
    {"name": "Leg Extension", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=swZQC689o9U"},
    {"name": "Hamstring Curl Machine", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/lGNeJsdqJwg"},
    {"name": "Calf Raises", "sets": 1, "reps": "12", "videoLink": ""}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 4 
  AND day_number = 3;

-- Update Day 4: Full Body
UPDATE workout_templates
SET exercises = '[
    {"name": "Chest Press Machine", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=sqNwDkUU_Ps"},
    {"name": "Single-Arm DB Rows", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/riOQwg-Fua8"},
    {"name": "Stationary Lunges", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/rryKq3a_pe0"},
    {"name": "Smith Machine Squats", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=-eO_VydErV0"},
    {"name": "DB Lateral Raise", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/sJl5i2ixUd4"},
    {"name": "Preacher Curl", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/vutjyujxtOI"},
    {"name": "DB Skull Crush", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=jO2Jl9eZpXk"}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 4 
  AND day_number = 4;

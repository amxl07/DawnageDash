-- Update Day 1: Full Body
UPDATE workout_templates
SET exercises = '[
    {"name": "Push Ups", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=WDIpL0pjun0"},
    {"name": "Chest Press Machine", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=sqNwDkUU_Ps"},
    {"name": "Pull Ups (Assisted)", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=gx0RWT7WbmA"},
    {"name": "Leg Extension", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=swZQC689o9U"},
    {"name": "DB Lateral Raise", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/sJl5i2ixUd4"},
    {"name": "OH Single Arm DB", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/qgykFqqgaD8"},
    {"name": "Preacher Curl Machine", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/vutjyujxtOI"}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 3 
  AND day_number = 1;

-- Update Day 2: Full Body
UPDATE workout_templates
SET exercises = '[
    {"name": "Lat Pull Down", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/LCxqAQfmo-8"},
    {"name": "DB Chest Press", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=5Y3VZsLb1Ys"},
    {"name": "Wide Grip Cable Row", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/vqPY3fDessY"},
    {"name": "Smith Machine", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=-eO_VydErV0"},
    {"name": "Lunges", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/rryKq3a_pe0"},
    {"name": "Plank & Crunches", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=bien1r3-O7g"}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 3 
  AND day_number = 2;

-- Update Day 3: Full Body
UPDATE workout_templates
SET exercises = '[
    {"name": "Squat", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/watch?v=-bJIpOq-LWk"},
    {"name": "Single Arm DB Row", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/riOQwg-Fua8"},
    {"name": "Hamstring Curl Machine", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/lGNeJsdqJwg"},
    {"name": "Pec Fly", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/a9vQ_hwIksU"},
    {"name": "Shrugs", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/rFsSeClGnNA"},
    {"name": "Hammer Curl", "sets": 1, "reps": "12", "videoLink": "https://youtube.com/shorts/4wMhednB5Fw"},
    {"name": "Cable Push Down", "sets": 1, "reps": "12", "videoLink": "https://www.youtube.com/shorts/Rc7-euA8FDI"}
]'::jsonb
WHERE level = 'Beginner' 
  AND workout_type = 'GYM_WORKOUT' 
  AND sub_category = '0_EXPERIENCE' 
  AND days_per_week = 3 
  AND day_number = 3;

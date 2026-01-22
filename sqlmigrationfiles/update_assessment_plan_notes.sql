-- ============================================================================
-- UPDATE ASSESSMENT PLAN NOTES
-- ============================================================================
-- Updates the 5-Day Assessment Plan with "Alternatives / Notes" and "Alternate Workout Video Links".
-- ============================================================================

-- 1. Remove existing Assessment Plan templates to avoid duplicates during re-insertion
DELETE FROM workout_templates 
WHERE workout_type = 'ASSESSMENT' 
  AND sub_category = '5_DAY_PLAN';

-- 2. Insert Updated Templates

-- Day 1: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'ASSESSMENT',
  '5_DAY_PLAN',
  5,
  1,
  'Full',
  '[
    {
      "name": "High Knees",
      "sets": 3,
      "reps": "20–30 secs",
      "videoLink": "https://youtu.be/oDdkytliOqE?si=gWerAdS9jqK93Ol9"
    },
    {
      "name": "Pushups",
      "sets": 3,
      "reps": "Max reps",
      "videoLink": "https://www.instagram.com/reel/CXp3YSdvd0z/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
      "notes": "Alternative: Knee Pushups / Incline Pushups\nhttps://youtu.be/jWxvty2KROs?si=khLg-swfng8NMKmX"
    },
    {
      "name": "Australian Pullups",
      "sets": 3,
      "reps": "10–15 reps",
      "videoLink": "https://youtu.be/bHO0A4ZF_Zg?si=ThWNopoDm6iuN1uL",
      "notes": "Alternative: Smith machine hang"
    },
    {
      "name": "Bodyweight Squats",
      "sets": 3,
      "reps": "10–20 reps",
      "videoLink": "https://youtu.be/RClKKQqsvXA?si=3g--JEWSuy_QMo-R",
      "notes": "Alternative: Bodyweight Box Squat\nhttps://youtu.be/2dTvbgppTGs?si=7NajkKS_aKHbPLhQ"
    },
    {
      "name": "Planks",
      "sets": 3,
      "reps": "Max hold",
      "videoLink": "https://youtu.be/kL_NJAkCQBg?si=_7LXgNcr4sXbImTQ",
      "notes": "Alternative: Straight Arm Plank\nhttps://youtu.be/ASdvN_XEl_c?si=bgCua4Ovw9GswEwl"
    }
  ]'::TEXT
);

-- Day 2: Cardio
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'ASSESSMENT',
  '5_DAY_PLAN',
  5,
  2,
  'Cardio',
  '[
    {
      "name": "Warm-up",
      "sets": 1,
      "reps": "5–10 mins",
      "notes": "Dynamic warm-up"
    },
    {
      "name": "Cardio",
      "sets": 1,
      "reps": "30 mins",
      "notes": "Any machine, light-moderate"
    },
    {
      "name": "Downward Dog",
      "sets": 2,
      "reps": "20 sec",
      "videoLink": "https://youtu.be/wS2b5yld004?si=tjRbaT1bWIDcH3Ov",
      "notes": "Stretch"
    },
    {
      "name": "Cat Cow",
      "sets": 2,
      "reps": "20 sec",
      "videoLink": "https://youtu.be/jGR2LTqGI2Y?si=2dpGI6mZWjtA2MRm",
      "notes": "Stretch"
    },
    {
      "name": "Child’s Pose",
      "sets": 2,
      "reps": "20 sec",
      "videoLink": "https://youtu.be/qYvYsFrTI0U?si=8WKM5GlRV1FuAtzi",
      "notes": "Stretch"
    }
  ]'::TEXT
);

-- Day 3: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'ASSESSMENT',
  '5_DAY_PLAN',
  5,
  3,
  'Full',
  '[
    {
      "name": "Burpees",
      "sets": 3,
      "reps": "10–15 reps",
      "videoLink": "https://youtu.be/qLBImHhCXSw?si=eC7-2xB_nysGUCdA",
      "notes": "Alternative: Easier version\nhttps://youtu.be/mUYJqe_sJFE?si=lnLycNPXH4yl7Px5"
    },
    {
      "name": "Chinups",
      "sets": 3,
      "reps": "10–15 reps",
      "videoLink": "https://youtu.be/brhRXlOhsAM?si=oZv8wu8M2zMt0J_C",
      "notes": "Alternative: Machine Assisted\nhttps://youtu.be/bs02BThv4Lc?si=49v772JZ-Lk_a_1j"
    },
    {
      "name": "Dips",
      "sets": 3,
      "reps": "10–15 reps",
      "videoLink": "https://youtu.be/2z8JmcrW-As?si=9ZrXKline_V3ju0u",
      "notes": "Alternative: Bench Dips\nhttps://www.instagram.com/reel/CZhYeh2PimK/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ=="
    },
    {
      "name": "Dumbbell Deadlift",
      "sets": 3,
      "reps": "10–20 reps",
      "videoLink": "https://youtu.be/Ipi8_vz8_z0?si=pNstFkF6x_nE7WO8",
      "notes": "Alternative: Sumo Squat\nhttps://youtu.be/kjlfpqXnyL8?si=wf2Fg7dokdxT6_eh"
    },
    {
      "name": "Hollow Body Hold",
      "sets": 3,
      "reps": "Max hold",
      "videoLink": "https://youtu.be/hf00_b2sRdc?si=wspOTntzi-FfwDf_",
      "notes": "Alternative: Tucked version\nhttps://youtu.be/hf00_b2sRdc?si=wd_1LuPM0VbNtPLy"
    }
  ]'::TEXT
);

-- Day 4: Cardio
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'ASSESSMENT',
  '5_DAY_PLAN',
  5,
  4,
  'Cardio',
  '[
    {
      "name": "Warm-up",
      "sets": 1,
      "reps": "5–10 mins",
      "notes": "Dynamic warm-up"
    },
    {
      "name": "Cardio",
      "sets": 1,
      "reps": "30 mins",
      "notes": "Any machine, light-moderate"
    },
    {
      "name": "Standing Forward Fold",
      "sets": 2,
      "reps": "20 sec",
      "videoLink": "https://youtu.be/0KzyEgkq7zw?si=5pcyZVWXe8p9a2_L",
      "notes": "Stretch"
    },
    {
      "name": "Upward Dog",
      "sets": 2,
      "reps": "20 sec",
      "videoLink": "https://youtu.be/14BifQtJRrI?si=9nUy7WFTv7hW6x_W",
      "notes": "Stretch"
    },
    {
      "name": "Deep Squat Hold",
      "sets": 2,
      "reps": "20 sec",
      "videoLink": "https://youtu.be/0wzrgyAurT8?si=KcAL8OYK7KXZ9vKu",
      "notes": "Stretch"
    }
  ]'::TEXT
);

-- Day 5: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'ASSESSMENT',
  '5_DAY_PLAN',
  5,
  5,
  'Full',
  '[
    {
      "name": "Mountain Climbers",
      "sets": 3,
      "reps": "20–30 secs",
      "videoLink": "https://www.instagram.com/reel/CY1qUbkuqyT/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ=="
    },
    {
      "name": "DB Shoulder Press",
      "sets": 3,
      "reps": "Max reps",
      "videoLink": "https://www.instagram.com/reel/CY1qUbkuqyT/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
      "notes": "Alternative: Light DB / Machine"
    },
    {
      "name": "Pullups",
      "sets": 3,
      "reps": "10–15 reps",
      "videoLink": "https://youtu.be/eGo4IYlbE5g?si=TUEORLt6iVQgVlC6",
      "notes": "Alternative: Machine Assisted\nhttps://youtu.be/ogKeZ6vb1lo?si=WVpnpC6QyCnEzjjJ"
    },
    {
      "name": "Lunges",
      "sets": 3,
      "reps": "10–20 reps",
      "videoLink": "https://youtu.be/-_270H-3Wrc?si=P0-i7CSR-rPzWEc6",
      "notes": "Alternative: Assisted Lunges\nhttps://youtu.be/sVfxj1zFKbE?si=mC_NoPO8A5ZX4QRP"
    },
    {
      "name": "Leg Raises",
      "sets": 3,
      "reps": "10–15 reps",
      "videoLink": "https://youtu.be/JB2oyawG9KI?si=TGwIsxC1pB9ThQP-",
      "notes": "Alternative: Reverse Crunches\nhttps://youtu.be/yH-oSzE5_g0?si=V1UXFChJVnqWDuKB"
    }
  ]'::TEXT
);

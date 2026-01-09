-- Reset and populate workout_logs for user 27807160-f27e-407c-b186-21cc6d3b977f
-- 6 Weeks of history (Dec 1, 2025 - Jan 10, 2026)
-- Schedule: Mon (Push), Wed (Pull), Fri (Legs)

-- 1. clear existing logs
DELETE FROM workout_logs WHERE user_id = '27807160-f27e-407c-b186-21cc6d3b977f';

-- WEEK 1 (Dec 1 - Dec 7)
-- Day 1: Push
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-01', 'Push Day A',
    '[
        {"exercise": "Bench Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "60", "rpe": "7"}, {"setNumber": 2, "reps": "10", "weight": "65", "rpe": "8"}, {"setNumber": 3, "reps": "8", "weight": "70", "rpe": "9"}]},
        {"exercise": "Overhead Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "40", "rpe": "7"}, {"setNumber": 2, "reps": "10", "weight": "42.5", "rpe": "8"}]},
        {"exercise": "Incline DB Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "24", "rpe": "8"}, {"setNumber": 2, "reps": "12", "weight": "24", "rpe": "9"}]}
    ]'
);

-- Day 2: Pull
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-03', 'Pull Day A',
    '[
        {"exercise": "Pull Ups", "sets": [{"setNumber": 1, "reps": "8", "weight": "0", "rpe": "8"}, {"setNumber": 2, "reps": "7", "weight": "0", "rpe": "9"}, {"setNumber": 3, "reps": "6", "weight": "0", "rpe": "9.5"}]},
        {"exercise": "Barbell Row", "sets": [{"setNumber": 1, "reps": "12", "weight": "50", "rpe": "7"}, {"setNumber": 2, "reps": "10", "weight": "55", "rpe": "8"}]},
        {"exercise": "Face Pulls", "sets": [{"setNumber": 1, "reps": "15", "weight": "20", "rpe": "7"}, {"setNumber": 2, "reps": "15", "weight": "20", "rpe": "7"}]}
    ]'
);

-- Day 3: Legs
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-05', 'Leg Day A',
    '[
        {"exercise": "Squat", "sets": [{"setNumber": 1, "reps": "10", "weight": "80", "rpe": "7"}, {"setNumber": 2, "reps": "10", "weight": "80", "rpe": "8"}, {"setNumber": 3, "reps": "10", "weight": "80", "rpe": "8.5"}]},
        {"exercise": "RDL", "sets": [{"setNumber": 1, "reps": "12", "weight": "70", "rpe": "7"}, {"setNumber": 2, "reps": "12", "weight": "70", "rpe": "8"}]},
        {"exercise": "Leg Extension", "sets": [{"setNumber": 1, "reps": "15", "weight": "45", "rpe": "9"}, {"setNumber": 2, "reps": "15", "weight": "45", "rpe": "9.5"}]}
    ]'
);


-- WEEK 2 (Dec 8 - Dec 14)
-- Day 1: Push
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-08', 'Push Day A',
    '[
        {"exercise": "Bench Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "62.5", "rpe": "7.5"}, {"setNumber": 2, "reps": "10", "weight": "67.5", "rpe": "8.5"}, {"setNumber": 3, "reps": "8", "weight": "72.5", "rpe": "9.5"}]},
        {"exercise": "Overhead Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "40", "rpe": "7"}, {"setNumber": 2, "reps": "11", "weight": "42.5", "rpe": "8.5"}]},
        {"exercise": "Incline DB Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "26", "rpe": "8.5"}, {"setNumber": 2, "reps": "11", "weight": "26", "rpe": "9.5"}]}
    ]'
);

-- Day 2: Pull
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-10', 'Pull Day A',
    '[
        {"exercise": "Pull Ups", "sets": [{"setNumber": 1, "reps": "9", "weight": "0", "rpe": "8.5"}, {"setNumber": 2, "reps": "8", "weight": "0", "rpe": "9"}, {"setNumber": 3, "reps": "7", "weight": "0", "rpe": "9.5"}]},
        {"exercise": "Barbell Row", "sets": [{"setNumber": 1, "reps": "12", "weight": "52.5", "rpe": "7.5"}, {"setNumber": 2, "reps": "10", "weight": "57.5", "rpe": "8.5"}]},
        {"exercise": "Face Pulls", "sets": [{"setNumber": 1, "reps": "15", "weight": "20", "rpe": "7"}, {"setNumber": 2, "reps": "15", "weight": "22.5", "rpe": "8"}]}
    ]'
);

-- Day 3: Legs
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-12', 'Leg Day A',
    '[
        {"exercise": "Squat", "sets": [{"setNumber": 1, "reps": "10", "weight": "82.5", "rpe": "7.5"}, {"setNumber": 2, "reps": "10", "weight": "82.5", "rpe": "8.5"}, {"setNumber": 3, "reps": "10", "weight": "82.5", "rpe": "9"}]},
        {"exercise": "RDL", "sets": [{"setNumber": 1, "reps": "12", "weight": "72.5", "rpe": "7.5"}, {"setNumber": 2, "reps": "12", "weight": "72.5", "rpe": "8.5"}]},
        {"exercise": "Leg Extension", "sets": [{"setNumber": 1, "reps": "15", "weight": "47.5", "rpe": "9"}, {"setNumber": 2, "reps": "15", "weight": "47.5", "rpe": "9.5"}]}
    ]'
);


-- WEEK 3 (Dec 15 - Dec 21)
-- Day 1: Push
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-15', 'Push Day A',
    '[
        {"exercise": "Bench Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "65", "rpe": "8"}, {"setNumber": 2, "reps": "10", "weight": "70", "rpe": "9"}, {"setNumber": 3, "reps": "7", "weight": "75", "rpe": "10"}]},
        {"exercise": "Overhead Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "42.5", "rpe": "8"}, {"setNumber": 2, "reps": "10", "weight": "45", "rpe": "9"}]},
        {"exercise": "Incline DB Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "26", "rpe": "8"}, {"setNumber": 2, "reps": "12", "weight": "26", "rpe": "9"}]}
    ]'
);

-- Day 2: Pull
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-17', 'Pull Day A',
    '[
        {"exercise": "Pull Ups", "sets": [{"setNumber": 1, "reps": "10", "weight": "0", "rpe": "9"}, {"setNumber": 2, "reps": "8", "weight": "0", "rpe": "9"}, {"setNumber": 3, "reps": "7", "weight": "0", "rpe": "9.5"}]},
        {"exercise": "Barbell Row", "sets": [{"setNumber": 1, "reps": "12", "weight": "55", "rpe": "8"}, {"setNumber": 2, "reps": "10", "weight": "60", "rpe": "9"}]},
        {"exercise": "Face Pulls", "sets": [{"setNumber": 1, "reps": "15", "weight": "22.5", "rpe": "7.5"}, {"setNumber": 2, "reps": "15", "weight": "22.5", "rpe": "8"}]}
    ]'
);

-- Day 3: Legs
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-19', 'Leg Day A',
    '[
        {"exercise": "Squat", "sets": [{"setNumber": 1, "reps": "10", "weight": "85", "rpe": "8"}, {"setNumber": 2, "reps": "10", "weight": "85", "rpe": "8.5"}, {"setNumber": 3, "reps": "8", "weight": "85", "rpe": "9"}]},
        {"exercise": "RDL", "sets": [{"setNumber": 1, "reps": "12", "weight": "75", "rpe": "8"}, {"setNumber": 2, "reps": "12", "weight": "75", "rpe": "8.5"}]},
        {"exercise": "Leg Extension", "sets": [{"setNumber": 1, "reps": "15", "weight": "50", "rpe": "9"}, {"setNumber": 2, "reps": "14", "weight": "50", "rpe": "10"}]}
    ]'
);


-- WEEK 4 (Dec 22 - Dec 28) - Deload / Light Week
-- Day 1: Push
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-22', 'Push Day (Deload)',
    '[
        {"exercise": "Bench Press", "sets": [{"setNumber": 1, "reps": "10", "weight": "50", "rpe": "5"}, {"setNumber": 2, "reps": "10", "weight": "50", "rpe": "5"}]},
        {"exercise": "Overhead Press", "sets": [{"setNumber": 1, "reps": "10", "weight": "30", "rpe": "5"}, {"setNumber": 2, "reps": "10", "weight": "30", "rpe": "5"}]}
    ]'
);

-- Day 2: Pull
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-24', 'Pull Day (Deload)',
    '[
        {"exercise": "Pull Ups", "sets": [{"setNumber": 1, "reps": "5", "weight": "0", "rpe": "5"}, {"setNumber": 2, "reps": "5", "weight": "0", "rpe": "5"}]},
        {"exercise": "Barbell Row", "sets": [{"setNumber": 1, "reps": "10", "weight": "40", "rpe": "5"}, {"setNumber": 2, "reps": "10", "weight": "40", "rpe": "5"}]}
    ]'
);

-- Day 3: Legs
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-26', 'Leg Day (Deload)',
    '[
        {"exercise": "Squat", "sets": [{"setNumber": 1, "reps": "8", "weight": "60", "rpe": "5"}, {"setNumber": 2, "reps": "8", "weight": "60", "rpe": "5"}]},
        {"exercise": "RDL", "sets": [{"setNumber": 1, "reps": "8", "weight": "50", "rpe": "5"}]}
    ]'
);


-- WEEK 5 (Dec 29 - Jan 4) - Back at it
-- Day 1: Push
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-29', 'Push Day A',
    '[
        {"exercise": "Bench Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "67.5", "rpe": "8"}, {"setNumber": 2, "reps": "10", "weight": "72.5", "rpe": "9"}, {"setNumber": 3, "reps": "6", "weight": "77.5", "rpe": "9.5"}]},
        {"exercise": "Overhead Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "45", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "47.5", "rpe": "9.5"}]},
        {"exercise": "Incline DB Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "28", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "30", "rpe": "9.5"}]}
    ]'
);

-- Day 2: Pull
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2025-12-31', 'Pull Day A',
    '[
        {"exercise": "Pull Ups", "sets": [{"setNumber": 1, "reps": "11", "weight": "0", "rpe": "9"}, {"setNumber": 2, "reps": "9", "weight": "0", "rpe": "9.5"}, {"setNumber": 3, "reps": "8", "weight": "0", "rpe": "10"}]},
        {"exercise": "Barbell Row", "sets": [{"setNumber": 1, "reps": "12", "weight": "60", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "65", "rpe": "9"}]},
        {"exercise": "Face Pulls", "sets": [{"setNumber": 1, "reps": "15", "weight": "25", "rpe": "8"}, {"setNumber": 2, "reps": "15", "weight": "25", "rpe": "8.5"}]}
    ]'
);

-- Day 3: Legs
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2026-01-02', 'Leg Day A',
    '[
        {"exercise": "Squat", "sets": [{"setNumber": 1, "reps": "10", "weight": "87.5", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "87.5", "rpe": "9"}, {"setNumber": 3, "reps": "8", "weight": "87.5", "rpe": "9.5"}]},
        {"exercise": "RDL", "sets": [{"setNumber": 1, "reps": "12", "weight": "77.5", "rpe": "8.5"}, {"setNumber": 2, "reps": "12", "weight": "77.5", "rpe": "9"}]},
        {"exercise": "Leg Extension", "sets": [{"setNumber": 1, "reps": "15", "weight": "52.5", "rpe": "9"}, {"setNumber": 2, "reps": "15", "weight": "52.5", "rpe": "9.5"}]}
    ]'
);


-- WEEK 6 (Jan 5 - Jan 11) - Current Week
-- Day 1: Push
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2026-01-05', 'Push Day A',
    '[
        {"exercise": "Bench Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "70", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "75", "rpe": "9"}, {"setNumber": 3, "reps": "6", "weight": "80", "rpe": "9.5"}]},
        {"exercise": "Overhead Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "47.5", "rpe": "9"}, {"setNumber": 2, "reps": "9", "weight": "50", "rpe": "9.5"}]},
        {"exercise": "Incline DB Press", "sets": [{"setNumber": 1, "reps": "12", "weight": "30", "rpe": "9"}, {"setNumber": 2, "reps": "10", "weight": "32", "rpe": "9.5"}]}
    ]'
);

-- Day 2: Pull
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2026-01-07', 'Pull Day A',
    '[
        {"exercise": "Pull Ups", "sets": [{"setNumber": 1, "reps": "12", "weight": "0", "rpe": "9"}, {"setNumber": 2, "reps": "10", "weight": "0", "rpe": "9.5"}, {"setNumber": 3, "reps": "8", "weight": "5", "rpe": "9.5"}]},
        {"exercise": "Barbell Row", "sets": [{"setNumber": 1, "reps": "12", "weight": "62.5", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "67.5", "rpe": "9"}]},
        {"exercise": "Face Pulls", "sets": [{"setNumber": 1, "reps": "15", "weight": "27.5", "rpe": "8"}, {"setNumber": 2, "reps": "15", "weight": "27.5", "rpe": "8.5"}]}
    ]'
);

-- Day 3: Legs (Not happened yet or just happened) - Let's exclude to stimulate "in progress" week or include if today is Jan 10
-- Today is Jan 10, so Jan 9th workout is valid.
INSERT INTO workout_logs (user_id, date, title, content) VALUES (
    '27807160-f27e-407c-b186-21cc6d3b977f', '2026-01-09', 'Leg Day A',
    '[
        {"exercise": "Squat", "sets": [{"setNumber": 1, "reps": "10", "weight": "90", "rpe": "9"}, {"setNumber": 2, "reps": "10", "weight": "90", "rpe": "9.5"}, {"setNumber": 3, "reps": "6", "weight": "95", "rpe": "9.5"}]},
        {"exercise": "RDL", "sets": [{"setNumber": 1, "reps": "12", "weight": "80", "rpe": "8.5"}, {"setNumber": 2, "reps": "10", "weight": "85", "rpe": "9"}]},
        {"exercise": "Leg Extension", "sets": [{"setNumber": 1, "reps": "15", "weight": "55", "rpe": "9"}, {"setNumber": 2, "reps": "12", "weight": "60", "rpe": "10"}]}
    ]'
);

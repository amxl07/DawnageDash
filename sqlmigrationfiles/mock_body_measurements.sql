-- Reset and populate body_measurements for user 950030ed-fef7-46dc-9547-dcd994be27c4
-- Generated to reflect weight loss from 92kg to 88kg over ~6 weeks (Dec 1 2025 - Jan 10 2026)

-- 1. Remove existing measurements for this user
DELETE FROM body_measurements WHERE user_id = '950030ed-fef7-46dc-9547-dcd994be27c4';

-- 2. Insert new mock data
-- Week 1: Dec 1, 2025 (Baseline) - 92kg
INSERT INTO body_measurements (
    user_id, date, chest, waist, hips, thighs, arms
) VALUES (
    '950030ed-fef7-46dc-9547-dcd994be27c4', '2025-12-01', 
    108.0, -- Chest
    98.0,  -- Waist
    106.0, -- Hips
    62.0,  -- Thighs
    38.5   -- Arms
);

-- Week 2: Dec 8, 2025
INSERT INTO body_measurements (
    user_id, date, chest, waist, hips, thighs, arms
) VALUES (
    '950030ed-fef7-46dc-9547-dcd994be27c4', '2025-12-08', 
    107.5, 
    97.2, 
    105.5, 
    61.8, 
    38.4
);

-- Week 3: Dec 15, 2025
INSERT INTO body_measurements (
    user_id, date, chest, waist, hips, thighs, arms
) VALUES (
    '950030ed-fef7-46dc-9547-dcd994be27c4', '2025-12-15', 
    107.0, 
    96.4, 
    105.0, 
    61.5, 
    38.2
);

-- Week 4: Dec 22, 2025
INSERT INTO body_measurements (
    user_id, date, chest, waist, hips, thighs, arms
) VALUES (
    '950030ed-fef7-46dc-9547-dcd994be27c4', '2025-12-22', 
    106.5, 
    95.5, 
    104.4, 
    61.2, 
    38.0
);

-- Week 5: Dec 29, 2025
INSERT INTO body_measurements (
    user_id, date, chest, waist, hips, thighs, arms
) VALUES (
    '950030ed-fef7-46dc-9547-dcd994be27c4', '2025-12-29', 
    106.0, 
    94.6, 
    103.8, 
    60.8, 
    37.8
);

-- Week 6: Jan 5, 2026 (Current) - 88kg equivalent
INSERT INTO body_measurements (
    user_id, date, chest, waist, hips, thighs, arms
) VALUES (
    '950030ed-fef7-46dc-9547-dcd994be27c4', '2026-01-05', 
    105.2, -- Chest (-2.8cm)
    93.5,  -- Waist (-4.5cm)
    103.2, -- Hips (-2.8cm)
    60.5,  -- Thighs (-1.5cm)
    37.5   -- Arms (-1.0cm)
);

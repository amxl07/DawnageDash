-- Create weekly_check_ins table
CREATE TABLE IF NOT EXISTS weekly_check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    week_start_date DATE, -- Optional, to track which week this belongs to

    -- Step 1: Weekly Overview
    overall_feeling TEXT,
    weekly_wins TEXT,

    -- Step 2: Nutrition
    nutrition_adherence TEXT, -- Yes/No
    digestion TEXT, -- e.g., "Good", "Bloated"
    enjoying_meals TEXT, -- Yes/No
    hunger_levels TEXT,
    nutrition_questions TEXT,

    -- Step 3: Training
    training_progress TEXT, -- Yes/No
    enjoying_training TEXT, -- Yes/No
    missed_sessions TEXT, -- Yes/No
    joint_pain TEXT, -- Yes/No
    step_count TEXT, -- e.g., "2000"
    training_questions TEXT,

    -- Step 4: Wellbeing
    recovery_issues TEXT, -- Yes/No
    water_intake TEXT, -- e.g., "6"
    stress_level TEXT, -- e.g., "6" (1-10)

    -- Step 5: Summary & Feedback
    overall_experience TEXT, -- e.g., "Very good"
    feedback TEXT
);

-- RLS Policies
ALTER TABLE weekly_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly check-ins"
    ON weekly_check_ins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly check-ins"
    ON weekly_check_ins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly check-ins"
    ON weekly_check_ins FOR UPDATE
    USING (auth.uid() = user_id);

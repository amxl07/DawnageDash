-- Add RLS policy to allow coaches to view their clients' questionnaires

-- Drop existing policies if needed (optional, for clean slate)
-- DROP POLICY IF EXISTS "Coaches can view their clients questionnaires" ON onboarding_questionnaire;

-- Add policy for coaches to view their assigned clients' questionnaires
CREATE POLICY "Coaches can view their clients questionnaires"
  ON onboarding_questionnaire
  FOR SELECT
  USING (
    -- Original condition: users can view their own
    auth.uid() = user_id
    OR
    -- New condition: coaches can view their clients' questionnaires
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = onboarding_questionnaire.user_id
        AND users.coach_id = auth.uid()
    )
  );

-- Note: This replaces the original "Users can view their own questionnaire" policy
-- You may need to drop the old policy first if it conflicts:
-- DROP POLICY "Users can view their own questionnaire" ON onboarding_questionnaire;

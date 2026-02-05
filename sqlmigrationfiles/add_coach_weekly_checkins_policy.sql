-- Add RLS policy for coaches to view their assigned clients' weekly check-ins
CREATE POLICY "Coaches can view assigned clients weekly check-ins"
    ON weekly_check_ins FOR SELECT
    USING (
        auth.uid() IN (
            SELECT coach_id FROM users WHERE id = weekly_check_ins.user_id
        )
    );

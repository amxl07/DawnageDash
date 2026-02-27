-- Add coach_note column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coach_note TEXT;

-- RLS for weekly_progress_photos (coach can SELECT for their clients)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weekly_progress_photos'
      AND policyname = 'Coaches can view client progress photos'
  ) THEN
    CREATE POLICY "Coaches can view client progress photos"
      ON public.weekly_progress_photos
      FOR SELECT
      USING (public.is_coach_of(user_id));
  END IF;
END
$$;

-- ============================================================================
-- MIGRATION: ENABLE COACH ROLE & RLS (SIMPLIFIED)
-- ============================================================================

-- 1. Ensure columns exist using standard PostgreSQL syntax
-- This runs as top-level statements, ensuring they are committed/visible immediately
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'client';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.users(id);

-- 2. Update the 'handle_new_user' trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone_number, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- 4. Update Policies

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Coaches can view all clients" ON public.users;
DROP POLICY IF EXISTS "Coaches can update clients" ON public.users;

-- A. Allow users to read their own profile
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- B. Coaches can view clients
CREATE POLICY "Coaches can view all clients"
ON public.users FOR SELECT
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'coach' 
  AND role = 'client'
);

-- C. Coaches can update clients
CREATE POLICY "Coaches can update clients"
ON public.users FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'coach'
  AND role = 'client'
);

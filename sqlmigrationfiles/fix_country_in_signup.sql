-- ============================================================================
-- ADD COUNTRY TO HANDLE_NEW_USER TRIGGER
-- ============================================================================
-- The handle_new_user trigger was not extracting the 'country' field from
-- auth.users.raw_user_meta_data when creating the public.users record.
-- This migration adds country support to ensure it's saved during signup.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone_number, avatar_url, country)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'country'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    role = EXCLUDED.role,
    avatar_url = EXCLUDED.avatar_url,
    country = EXCLUDED.country,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

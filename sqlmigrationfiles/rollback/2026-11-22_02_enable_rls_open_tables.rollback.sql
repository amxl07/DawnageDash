-- Restores the pre-2026-11-22 state of 2026-11-22_02_enable_rls_open_tables.sql.
-- WARNING: this re-exposes all plans and photo records to the public key.
alter table public.weekly_progress_photos disable row level security;
alter table public.food_items disable row level security;
alter table public.workout_plans disable row level security;
alter table public.meal_plans disable row level security;
drop policy if exists "Users can manage own weekly progress photos" on public.weekly_progress_photos;
drop policy if exists "Signed-in users can read food items" on public.food_items;
drop policy if exists "Admins can manage all workout plans" on public.workout_plans;
drop policy if exists "Admins can manage all meal plans" on public.meal_plans;

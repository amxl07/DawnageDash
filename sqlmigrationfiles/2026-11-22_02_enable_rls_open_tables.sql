-- B3: four public tables had RLS switched off, so the public (anon) key
-- could read, edit and delete every client's plans and photo records.
-- Add the policies both apps need first, then switch RLS on.

-- Progress photo rows: until now only coach/admin SELECT policies existed.
-- Owners must keep read/write, or photo upload in the app and dashboard breaks.
create policy "Users can manage own weekly progress photos" on public.weekly_progress_photos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Food catalogue: read-only reference data for signed-in users. Writes stay service-role only.
create policy "Signed-in users can read food items" on public.food_items
  for select to authenticated
  using (true);

-- Plans: admins assign templates to any client (Template Builder → Assign).
create policy "Admins can manage all workout plans" on public.workout_plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "Admins can manage all meal plans" on public.meal_plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.weekly_progress_photos enable row level security;
alter table public.food_items enable row level security;
alter table public.workout_plans enable row level security;
alter table public.meal_plans enable row level security;

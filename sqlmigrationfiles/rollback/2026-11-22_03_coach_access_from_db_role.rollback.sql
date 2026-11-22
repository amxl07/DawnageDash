-- Restores the pre-2026-11-22 state of 2026-11-22_03_coach_access_from_db_role.sql.
-- WARNING: this lets any user who edits their metadata act as a coach over every client.
drop policy if exists "Coaches can view own and unassigned clients" on public.users;
drop policy if exists "Coaches can update own and unassigned clients" on public.users;
create policy "Coaches can view all clients" on public.users for select
  using ((((auth.jwt() -> 'user_metadata') ->> 'role') = 'coach') and (role = 'client'));
create policy "Coaches can update clients" on public.users for update
  using ((((auth.jwt() -> 'user_metadata') ->> 'role') = 'coach') and (role = 'client'));
drop function if exists public.is_coach();

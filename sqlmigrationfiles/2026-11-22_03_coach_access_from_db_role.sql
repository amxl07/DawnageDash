-- B2: coach access used auth.jwt() -> user_metadata ->> role, which any user
-- can edit with supabase.auth.updateUser(). A client could flag themselves
-- 'coach', read every client's profile, and re-point any client's coach_id
-- to themselves. Authorize from users.role instead, and limit coaches to
-- their own clients plus unassigned clients (the Claim page).

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('coach', 'admin')
  );
$$;
revoke execute on function public.is_coach() from public, anon;
grant execute on function public.is_coach() to authenticated;

drop policy if exists "Coaches can view all clients" on public.users;
create policy "Coaches can view own and unassigned clients" on public.users
  for select to authenticated
  using (
    role = 'client'
    and (coach_id = (select auth.uid()) or coach_id is null)
    and public.is_coach()
  );

-- USING picks rows a coach may touch. WITH CHECK allows only claim
-- (null -> me) and unassign (me -> null), never handing a client to another coach.
drop policy if exists "Coaches can update clients" on public.users;
create policy "Coaches can update own and unassigned clients" on public.users
  for update to authenticated
  using (
    role = 'client'
    and (coach_id = (select auth.uid()) or coach_id is null)
    and public.is_coach()
  )
  with check (
    role = 'client'
    and (coach_id = (select auth.uid()) or coach_id is null)
    and public.is_coach()
  );

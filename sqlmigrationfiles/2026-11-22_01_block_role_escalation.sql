-- B1: stop users from making themselves admin.
-- Before: sign-up copied any metadata role into users.role, and the
-- self-update policies had no WITH CHECK or column limits.

-- 1. Sign-up can create a client or a coach, never an admin.
--    A repeated auth insert never overwrites an existing role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, role, phone_number, avatar_url, country)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    case when new.raw_user_meta_data->>'role' = 'coach' then 'coach' else 'client' end,
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'country'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    avatar_url = excluded.avatar_url,
    country = excluded.country,
    updated_at = now();
  return new;
end;
$$;

-- 2. Only an admin can set role or template permission through the API.
--    Calls without an end-user JWT (service role, SQL editor, auth triggers) are trusted.
create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.role, 'client') <> 'client' or coalesce(new.can_edit_global_templates, false) then
      raise exception 'Only an admin can grant roles or template permissions' using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role
     or new.can_edit_global_templates is distinct from old.can_edit_global_templates then
    raise exception 'Only an admin can change roles or template permissions' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_users_privileged_columns on public.users;
create trigger guard_users_privileged_columns
  before insert or update on public.users
  for each row execute function public.guard_users_privileged_columns();

-- 3. A user cannot move their own row to another id.
alter policy "Users can update own profile" on public.users with check (auth.uid() = id);
alter policy "Users can update own data" on public.users with check (auth.uid() = id);

-- 3b. Admins can update any user. Before this, the Admin → Coaches
--     "template permission" toggle matched 0 rows and silently did nothing.
create policy "Admins can update all users" on public.users
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Pin search_path on the existing SECURITY DEFINER helpers (bodies are schema-qualified).
alter function public.is_admin() set search_path = '';
alter function public.is_coach_of(uuid) set search_path = '';
alter function public.auto_set_package_start_date() set search_path = '';

-- 5. Trigger functions are not API endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.auto_set_package_start_date() from public, anon, authenticated;
revoke execute on function public.guard_users_privileged_columns() from public, anon, authenticated;

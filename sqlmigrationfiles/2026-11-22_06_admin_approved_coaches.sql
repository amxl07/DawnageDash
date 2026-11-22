-- Coach sign-up was open: anyone could call the sign-up API with role 'coach'
-- (the web access key is only checked in the browser). Now every sign-up is a
-- client; a coach request is recorded in profile_data.requested_role and an admin
-- approves it on Admin -> Coaches. The apps route by user_metadata.role, so the
-- metadata is kept in step with users.role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wants_coach boolean := new.raw_user_meta_data->>'role' = 'coach';
begin
  insert into public.users (id, email, full_name, role, phone_number, avatar_url, country, profile_data)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'client',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'country',
    case when wants_coach then '{"requested_role":"coach"}'::jsonb else '{}'::jsonb end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    avatar_url = excluded.avatar_url,
    country = excluded.country,
    updated_at = now();

  -- Route the new account as a client in both apps until approved.
  if coalesce(new.raw_user_meta_data->>'role', '') <> 'client' then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"client"}'::jsonb
    where id = new.id;
  end if;
  return new;
end;
$$;

-- When an admin changes users.role, mirror it into the auth metadata the apps
-- read for routing. Authorization itself uses users.role.
create or replace function public.sync_role_to_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;
revoke execute on function public.sync_role_to_auth_metadata() from public, anon, authenticated;

drop trigger if exists sync_role_to_auth_metadata on public.users;
create trigger sync_role_to_auth_metadata
  after update of role on public.users
  for each row
  when (new.role is distinct from old.role)
  execute function public.sync_role_to_auth_metadata();

-- Restores the pre-2026-11-22 state of 2026-11-22_01_block_role_escalation.sql.
-- WARNING: this reopens the admin self-promotion hole. Use only to unblock an outage.
drop trigger if exists guard_users_privileged_columns on public.users;
drop function if exists public.guard_users_privileged_columns();
drop policy if exists "Admins can update all users" on public.users;
alter policy "Users can update own profile" on public.users with check (true);
alter policy "Users can update own data" on public.users with check (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $function$
begin
  insert into public.users (id, email, full_name, role, phone_number, avatar_url, country)
  values (
    new.id, new.email, new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'phone_number', new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'country'
  )
  on conflict (id) do update set
    email = excluded.email, full_name = excluded.full_name, phone_number = excluded.phone_number,
    role = excluded.role, avatar_url = excluded.avatar_url, country = excluded.country, updated_at = now();
  return new;
end;
$function$;
alter function public.handle_new_user() reset search_path;

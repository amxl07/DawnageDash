-- H1: the coach dashboard subscribes to these tables, but they were never published,
-- so app submissions only appeared after a manual refresh. RLS still filters realtime rows.
alter publication supabase_realtime add table public.weekly_check_ins, public.weekly_progress_photos, public.workout_logs;

-- B9 (data, applied once on 2026-11-22): clients with no metadata role were locked out by the app's role gate.
update auth.users a
set raw_user_meta_data = coalesce(a.raw_user_meta_data, '{}'::jsonb) || '{"role":"client"}'::jsonb
from public.users u
where u.id = a.id and u.role = 'client' and a.raw_user_meta_data->>'role' is null;

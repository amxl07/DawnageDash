-- B10: one row per client per day. Duplicate (user_id, date) rows made the app's
-- save fail on those days. Rule chosen by the owner: keep the newest row and back
-- up the rest. Refinement: a row with content beats an empty row, so a newer empty
-- photo set never hides an older full one. Every removed row is kept in the backup.

create table if not exists public.dedupe_backup_2026_11_22 (
  source_table text not null,
  kept_id uuid not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default now()
);
alter table public.dedupe_backup_2026_11_22 enable row level security;
revoke all on public.dedupe_backup_2026_11_22 from anon, authenticated;

with ranked as (
  select id,
         first_value(id) over w as kept,
         row_number() over w as rn
  from public.daily_check_ins
  window w as (partition by user_id, date order by
    num_nonnulls(morning_weight, sleep_hours, workout_status, calorie_intake, daily_steps, protein, energy_level) > 0 desc,
    coalesce(updated_at, created_at) desc nulls last, id desc)
), gone as (
  delete from public.daily_check_ins d using ranked r
  where d.id = r.id and r.rn > 1
  returning d.*, r.kept
)
insert into public.dedupe_backup_2026_11_22 (source_table, kept_id, row_data)
select 'daily_check_ins', kept, to_jsonb(gone) - 'kept' from gone;

with ranked as (
  select id,
         first_value(id) over w as kept,
         row_number() over w as rn
  from public.body_measurements
  window w as (partition by user_id, date order by created_at desc nulls last, id desc)
), gone as (
  delete from public.body_measurements d using ranked r
  where d.id = r.id and r.rn > 1
  returning d.*, r.kept
)
insert into public.dedupe_backup_2026_11_22 (source_table, kept_id, row_data)
select 'body_measurements', kept, to_jsonb(gone) - 'kept' from gone;

with ranked as (
  select id,
         first_value(id) over w as kept,
         row_number() over w as rn
  from public.weekly_progress_photos
  window w as (partition by user_id, date order by
    num_nonnulls(front_url, back_url, side_left_url, side_right_url) > 0 desc,
    created_at desc nulls last, id desc)
), gone as (
  delete from public.weekly_progress_photos d using ranked r
  where d.id = r.id and r.rn > 1
  returning d.*, r.kept
)
insert into public.dedupe_backup_2026_11_22 (source_table, kept_id, row_data)
select 'weekly_progress_photos', kept, to_jsonb(gone) - 'kept' from gone;

alter table public.daily_check_ins
  add constraint daily_check_ins_user_date_key unique (user_id, date);
alter table public.body_measurements
  add constraint body_measurements_user_date_key unique (user_id, date);
alter table public.weekly_progress_photos
  add constraint weekly_progress_photos_user_date_key unique (user_id, date);
-- Legacy weekly rows with no week_start_date are distinct submissions (NULLs never conflict).
alter table public.weekly_check_ins
  add constraint weekly_check_ins_user_week_key unique (user_id, week_start_date);

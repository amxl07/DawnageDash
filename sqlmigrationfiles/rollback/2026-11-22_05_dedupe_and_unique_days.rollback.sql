-- Restores the removed duplicate rows from the backup and drops the unique rules.
-- Run as postgres/service role (the backup table is not readable by clients).
alter table public.daily_check_ins drop constraint if exists daily_check_ins_user_date_key;
alter table public.body_measurements drop constraint if exists body_measurements_user_date_key;
alter table public.weekly_progress_photos drop constraint if exists weekly_progress_photos_user_date_key;
alter table public.weekly_check_ins drop constraint if exists weekly_check_ins_user_week_key;

insert into public.daily_check_ins
select (jsonb_populate_record(null::public.daily_check_ins, row_data)).*
from public.dedupe_backup_2026_11_22 where source_table = 'daily_check_ins';
insert into public.body_measurements
select (jsonb_populate_record(null::public.body_measurements, row_data)).*
from public.dedupe_backup_2026_11_22 where source_table = 'body_measurements';
insert into public.weekly_progress_photos
select (jsonb_populate_record(null::public.weekly_progress_photos, row_data)).*
from public.dedupe_backup_2026_11_22 where source_table = 'weekly_progress_photos';

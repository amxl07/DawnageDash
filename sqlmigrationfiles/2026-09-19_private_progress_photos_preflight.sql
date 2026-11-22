-- READ ONLY. Run through an authorized operator connection; do not paste project data into logs.
-- Set photo_privacy.project_url in the session to the exact HTTPS project origin first.
BEGIN READ ONLY;
SELECT id, public FROM storage.buckets WHERE id='progress_photos';
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE (schemaname='storage' AND tablename='objects')
 OR (schemaname='public' AND tablename IN ('weekly_progress_photos','users','progress_photo_coach_access'))
ORDER BY schemaname,tablename,policyname;
SELECT table_schema,table_name,column_name,data_type FROM information_schema.columns
WHERE (table_schema='public' AND table_name='users' AND column_name IN ('id','coach_id','role'))
 OR (table_schema='public' AND table_name='weekly_progress_photos')
 OR (table_schema='storage' AND table_name IN ('buckets','objects'));
WITH refs AS (
 SELECT p.user_id,p.date,r.reference FROM public.weekly_progress_photos p
 CROSS JOIN LATERAL (VALUES (p.front_url),(p.back_url),(p.side_left_url),(p.side_right_url)) r(reference)
 WHERE r.reference IS NOT NULL
), classified AS (
 SELECT CASE
   WHEN reference LIKE current_setting('photo_privacy.project_url') || '/storage/v1/object/public/progress_photos/%' THEN 'same-project legacy (full validation during migration)'
   WHEN reference ~* '^[0-9a-f-]{36}/[0-9]{4}-[0-9]{2}-[0-9]{2}/[a-z0-9_()-]+_[0-9]+[.](jpe?g|png)$' THEN 'path (full validation during migration)'
   ELSE 'UNKNOWN: operator review required' END AS category
 FROM refs
) SELECT category,count(*) FROM classified GROUP BY category;
SELECT count(*) AS photo_objects FROM storage.objects WHERE bucket_id='progress_photos';
SELECT count(*) AS current_coach_assignments_requiring_individual_approval
FROM public.users client JOIN public.users coach ON coach.id=client.coach_id WHERE coach.role='coach';
-- This is an inventory, NOT authorization or proof of full path validity.
ROLLBACK;

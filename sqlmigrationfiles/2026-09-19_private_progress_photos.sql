-- Review deployment instructions first. This file is NOT a deployment command.
-- Required per transaction/session: SET photo_privacy.project_url = 'https://YOUR_PROJECT.supabase.co';
BEGIN;
LOCK TABLE public.weekly_progress_photos, storage.objects IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION public.progress_photo_owner(object_name text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE parts text[]; day date;
BEGIN
  parts := string_to_array(object_name, '/');
  IF array_length(parts, 1) <> 3 OR parts[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR parts[2] !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR parts[3] !~ '^[a-z0-9_()-]+_[0-9]+[.]jpg$' THEN RETURN NULL; END IF;
  day := parts[2]::date;
  IF to_char(day, 'YYYY-MM-DD') <> parts[2] THEN RETURN NULL; END IF;
  RETURN parts[1]::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.progress_photo_reference_path(reference text, project_url text, owner_id uuid)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE path text := reference; prefix text; pos integer; octet integer;
BEGIN
  IF reference IS NULL THEN RETURN NULL; END IF;
  IF position('://' IN reference) > 0 THEN
    prefix := project_url || '/storage/v1/object/public/progress_photos/';
    IF left(reference, length(prefix)) <> prefix OR reference ~ '[?#\\[:space:]]' THEN RETURN NULL; END IF;
    path := substr(reference, length(prefix) + 1);
    -- Decode once, including legacy encoded parentheses; residual escapes fail the path grammar.
    pos := position('%' IN path);
    WHILE pos > 0 LOOP
      IF substr(path, pos + 1, 2) !~ '^[0-9a-fA-F]{2}$' THEN RETURN NULL; END IF;
      octet := get_byte(decode(substr(path, pos + 1, 2), 'hex'), 0);
      IF octet = 0 OR octet > 127 OR octet = 37 THEN RETURN NULL; END IF;
      path := overlay(path placing chr(octet) from pos for 3);
      pos := position('%' IN path);
    END LOOP;
  END IF;
  IF public.progress_photo_owner(path) IS DISTINCT FROM owner_id THEN RETURN NULL; END IF;
  RETURN path;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

DO $$
DECLARE project_url text := current_setting('photo_privacy.project_url', true); invalid_count bigint;
BEGIN
  IF project_url IS NULL OR project_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' THEN
    RAISE EXCEPTION 'Set photo_privacy.project_url to the exact HTTPS project origin before running migration';
  END IF;
  -- Assert the actual source schema; no invented coach table or JWT metadata authority.
  PERFORM id, coach_id, role FROM public.users LIMIT 0;
  SELECT count(*) INTO invalid_count
  FROM public.weekly_progress_photos p
  CROSS JOIN LATERAL (VALUES (p.front_url),(p.back_url),(p.side_left_url),(p.side_right_url)) r(reference)
  WHERE r.reference IS NOT NULL AND (
    public.progress_photo_reference_path(r.reference,project_url,p.user_id) IS NULL OR
    split_part(public.progress_photo_reference_path(r.reference,project_url,p.user_id),'/',2) <> p.date::text OR
    NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='progress_photos'
      AND o.name=public.progress_photo_reference_path(r.reference,project_url,p.user_id)));
  IF invalid_count > 0 THEN RAISE EXCEPTION 'Unrecognized or missing progress photo references: %. No changes committed; review preflight.', invalid_count; END IF;
  SELECT count(*) INTO invalid_count FROM storage.objects o WHERE o.bucket_id='progress_photos'
    AND (public.progress_photo_owner(o.name) IS NULL OR NOT EXISTS
      (SELECT 1 FROM public.users u WHERE u.id=public.progress_photo_owner(o.name)));
  IF invalid_count > 0 THEN RAISE EXCEPTION 'Unrecognized progress photo object paths: %. Review preflight.', invalid_count; END IF;
END $$;

UPDATE public.weekly_progress_photos SET
  front_url=public.progress_photo_reference_path(front_url,current_setting('photo_privacy.project_url'),user_id),
  back_url=public.progress_photo_reference_path(back_url,current_setting('photo_privacy.project_url'),user_id),
  side_left_url=public.progress_photo_reference_path(side_left_url,current_setting('photo_privacy.project_url'),user_id),
  side_right_url=public.progress_photo_reference_path(side_right_url,current_setting('photo_privacy.project_url'),user_id);

ALTER TABLE public.weekly_progress_photos DROP CONSTRAINT IF EXISTS progress_photo_references_canonical;
ALTER TABLE public.weekly_progress_photos ADD CONSTRAINT progress_photo_references_canonical CHECK (
  (front_url IS NULL OR (public.progress_photo_owner(front_url) IS NOT DISTINCT FROM user_id AND split_part(front_url,'/',2)=date::text)) AND
  (back_url IS NULL OR (public.progress_photo_owner(back_url) IS NOT DISTINCT FROM user_id AND split_part(back_url,'/',2)=date::text)) AND
  (side_left_url IS NULL OR (public.progress_photo_owner(side_left_url) IS NOT DISTINCT FROM user_id AND split_part(side_left_url,'/',2)=date::text)) AND
  (side_right_url IS NULL OR (public.progress_photo_owner(side_right_url) IS NOT DISTINCT FROM user_id AND split_part(side_right_url,'/',2)=date::text))
);

-- Explicit service/operator approval is the trust root. Never seed from mutable users.coach_id/role.
CREATE TABLE IF NOT EXISTS public.progress_photo_coach_access (
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, coach_id), CHECK (client_id <> coach_id)
);
ALTER TABLE public.progress_photo_coach_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.progress_photo_coach_access FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photo_coach_access TO service_role;

-- Mutable assignment/role changes can only revoke, never grant. Reverting a change cannot revive access.
CREATE OR REPLACE FUNCTION public.progress_photo_revoke_changed_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF OLD.coach_id IS DISTINCT FROM NEW.coach_id OR OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM public.progress_photo_coach_access WHERE client_id=NEW.id;
  END IF;
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM public.progress_photo_coach_access WHERE coach_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.progress_photo_revoke_changed_assignment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS progress_photo_assignment_changed ON public.users;
CREATE TRIGGER progress_photo_assignment_changed AFTER UPDATE OF coach_id,role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.progress_photo_revoke_changed_assignment();

CREATE OR REPLACE FUNCTION public.progress_photo_approved_coach(client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.progress_photo_coach_access a
    JOIN public.users client_user ON client_user.id=a.client_id AND client_user.coach_id=a.coach_id
    JOIN public.users coach_user ON coach_user.id=a.coach_id AND coach_user.role='coach'
    WHERE a.client_id=client AND a.coach_id=auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.progress_photo_approved_coach(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.progress_photo_approved_coach(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.progress_photo_can_read(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT auth.uid() IS NOT NULL AND public.progress_photo_owner(object_name) IS NOT NULL AND (
    public.progress_photo_owner(object_name)=auth.uid() OR (
      public.progress_photo_approved_coach(public.progress_photo_owner(object_name)) AND EXISTS (
        SELECT 1 FROM public.weekly_progress_photos p WHERE p.user_id=public.progress_photo_owner(object_name)
          AND object_name IN (p.front_url,p.back_url,p.side_left_url,p.side_right_url)
      )
    )
  )
$$;
REVOKE ALL ON FUNCTION public.progress_photo_can_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.progress_photo_can_read(text) TO anon, authenticated;

INSERT INTO storage.buckets(id,name,public) VALUES ('progress_photos','progress_photos',false)
ON CONFLICT (id) DO UPDATE SET public=false;

-- Restrictive guards bound even unknown permissive legacy policies, without affecting other buckets.
DROP POLICY IF EXISTS progress_photo_read_guard ON storage.objects;
CREATE POLICY progress_photo_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC
USING (bucket_id <> 'progress_photos' OR public.progress_photo_can_read(name));
DROP POLICY IF EXISTS progress_photo_read ON storage.objects;
CREATE POLICY progress_photo_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='progress_photos' AND public.progress_photo_can_read(name));
DROP POLICY IF EXISTS progress_photo_insert_guard ON storage.objects;
CREATE POLICY progress_photo_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
WITH CHECK (bucket_id <> 'progress_photos' OR public.progress_photo_owner(name)=auth.uid());
DROP POLICY IF EXISTS progress_photo_update_guard ON storage.objects;
CREATE POLICY progress_photo_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
USING (bucket_id <> 'progress_photos' OR public.progress_photo_owner(name)=auth.uid())
WITH CHECK (bucket_id <> 'progress_photos' OR public.progress_photo_owner(name)=auth.uid());
DROP POLICY IF EXISTS progress_photo_delete_guard ON storage.objects;
CREATE POLICY progress_photo_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
USING (bucket_id <> 'progress_photos' OR public.progress_photo_owner(name)=auth.uid());
DROP POLICY IF EXISTS progress_photo_owner_write ON storage.objects;
CREATE POLICY progress_photo_owner_write ON storage.objects FOR ALL TO authenticated
USING (bucket_id='progress_photos' AND public.progress_photo_owner(name)=auth.uid())
WITH CHECK (bucket_id='progress_photos' AND public.progress_photo_owner(name)=auth.uid());

ALTER TABLE public.weekly_progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS progress_photo_rows_read ON public.weekly_progress_photos;
CREATE POLICY progress_photo_rows_read ON public.weekly_progress_photos FOR SELECT TO authenticated
USING (user_id=auth.uid() OR public.progress_photo_approved_coach(user_id));
DROP POLICY IF EXISTS progress_photo_rows_owner ON public.weekly_progress_photos;
CREATE POLICY progress_photo_rows_owner ON public.weekly_progress_photos FOR ALL TO authenticated
USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS progress_photo_rows_insert_guard ON public.weekly_progress_photos;
CREATE POLICY progress_photo_rows_insert_guard ON public.weekly_progress_photos AS RESTRICTIVE FOR INSERT TO PUBLIC WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS progress_photo_rows_update_guard ON public.weekly_progress_photos;
CREATE POLICY progress_photo_rows_update_guard ON public.weekly_progress_photos AS RESTRICTIVE FOR UPDATE TO PUBLIC USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS progress_photo_rows_delete_guard ON public.weekly_progress_photos;
CREATE POLICY progress_photo_rows_delete_guard ON public.weekly_progress_photos AS RESTRICTIVE FOR DELETE TO PUBLIC USING (user_id=auth.uid());
-- Existing admin/coach row-metadata SELECT policies are retained for reporting; object bytes still require the trusted grant.
COMMIT;

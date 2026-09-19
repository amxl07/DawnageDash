// Local PostgreSQL (PGlite) policy checks. Never contacts a backend or uses real data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PHOTO_SQL_MODULE || '@electric-sql/pglite');
const migration = await readFile(new URL('../sqlmigrationfiles/2026-09-19_private_progress_photos.sql', import.meta.url), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const coach = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const path = `${owner}/2026-09-19/front_123.jpg`;
const legacy = `https://fixture.supabase.co/storage/v1/object/public/progress_photos/${path}`;
const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA storage;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE TABLE public.users(id uuid PRIMARY KEY, coach_id uuid REFERENCES public.users(id), role text);
  CREATE TABLE public.weekly_progress_photos(id uuid PRIMARY KEY, user_id uuid REFERENCES public.users(id), date date,
    front_url text, back_url text, side_left_url text, side_right_url text);
  CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);
  CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
  CREATE POLICY "Legacy overly broad writes" ON storage.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
  GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, storage TO anon, authenticated;
  INSERT INTO public.users VALUES ('${coach}',null,'coach'),('${other}',null,'coach'),('${owner}','${coach}','client');
  INSERT INTO storage.buckets VALUES ('progress_photos','progress_photos',true);
  INSERT INTO storage.objects(bucket_id,name,owner) VALUES ('progress_photos','${path}','${owner}');
  INSERT INTO public.weekly_progress_photos(id,user_id,date,front_url) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${owner}','2026-09-19','${legacy}');
  SELECT set_config('photo_privacy.project_url','https://fixture.supabase.co',false);
`);
await db.exec(migration);
await db.exec(migration); // idempotence, including constraints/policies.
assert.equal((await db.query('SELECT public FROM storage.buckets')).rows[0].public, false);
assert.equal((await db.query('SELECT front_url FROM weekly_progress_photos')).rows[0].front_url, path);
assert.equal((await db.query('SELECT count(*)::int AS n FROM progress_photo_coach_access')).rows[0].n, 0);
async function as(role, id, sql) {
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${id || ''}',false);`);
  try { return await db.query(sql); } finally { await db.exec('RESET ROLE'); }
}
const count = async (role,id) => (await as(role,id,"SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='progress_photos'")).rows[0].n;
assert.equal(await count('anon', null), 0);
assert.equal(await count('authenticated', owner), 1);
assert.equal(await count('authenticated', coach), 0); // assignment alone is not consent.
assert.equal(await count('authenticated', other), 0);
await db.exec(`INSERT INTO progress_photo_coach_access(client_id,coach_id) VALUES ('${owner}','${coach}')`);
assert.equal(await count('authenticated', coach), 1);
await assert.rejects(() => as('authenticated', other, `INSERT INTO progress_photo_coach_access(client_id,coach_id) VALUES ('${owner}','${other}')`));
await db.exec(`UPDATE users SET coach_id='${other}' WHERE id='${owner}'`);
assert.equal((await db.query('SELECT count(*)::int AS n FROM progress_photo_coach_access')).rows[0].n, 0);
assert.equal(await count('authenticated', coach), 0); // reassignment immediately removes old coach.
assert.equal(await count('authenticated', other), 0); // new assignment needs a trusted approval.
await db.exec(`UPDATE users SET coach_id='${coach}' WHERE id='${owner}';`);
assert.equal(await count('authenticated', coach), 0); // reverting a mutable assignment cannot revive a grant.
await db.exec(`INSERT INTO progress_photo_coach_access(client_id,coach_id) VALUES ('${owner}','${coach}'); DELETE FROM progress_photo_coach_access;`);
assert.equal(await count('authenticated', coach), 0);
await assert.rejects(() => as('authenticated', other, `INSERT INTO storage.objects(bucket_id,name) VALUES ('progress_photos','${owner}/2026-09-19/back_456.jpg')`));
await assert.rejects(() => as('authenticated', owner, `INSERT INTO storage.objects(bucket_id,name) VALUES ('progress_photos','${owner}/../back_456.jpg')`));
await as('authenticated', owner, `INSERT INTO storage.objects(bucket_id,name) VALUES ('progress_photos','${owner}/2026-09-19/back_456.jpg')`);
await db.exec(`INSERT INTO progress_photo_coach_access(client_id,coach_id) VALUES ('${owner}','${coach}')`);
assert.equal(await count('authenticated', coach), 1); // unreferenced back photo is not shared.
await assert.rejects(() => as('authenticated', coach, `INSERT INTO storage.objects(bucket_id,name) VALUES ('progress_photos','${owner}/2026-09-19/side_789.jpg')`));
assert.equal((await as('authenticated',coach,`DELETE FROM storage.objects WHERE name='${path}' RETURNING name`)).rows.length,0);
assert.equal((await as('authenticated',other,`DELETE FROM storage.objects WHERE name='${path}' RETURNING name`)).rows.length,0);
await assert.rejects(() => as('authenticated',owner,`UPDATE storage.objects SET name='${other}/2026-09-19/front_123.jpg' WHERE name='${path}'`));
await assert.rejects(() => as('authenticated',owner,`UPDATE weekly_progress_photos SET front_url='${legacy}' WHERE user_id='${owner}'`));
// Unknown legacy references abort the entire migration, preserving public state and raw data.
await db.exec(`ALTER TABLE weekly_progress_photos DROP CONSTRAINT progress_photo_references_canonical;
  UPDATE weekly_progress_photos SET front_url='https://foreign.invalid/photo.jpg';
  UPDATE storage.buckets SET public=true;`);
await assert.rejects(() => db.exec(migration), /Unrecognized or missing progress photo references/);
await db.exec('ROLLBACK');
assert.equal((await db.query('SELECT public FROM storage.buckets')).rows[0].public, true);
assert.equal((await db.query('SELECT front_url FROM weekly_progress_photos')).rows[0].front_url, 'https://foreign.invalid/photo.jpg');
await db.exec(`UPDATE weekly_progress_photos SET front_url='${owner}/2026-09-19/missing_789.jpg'`);
await assert.rejects(() => db.exec(migration), /Unrecognized or missing progress photo references/);
await db.exec('ROLLBACK');
assert.equal((await db.query('SELECT public FROM storage.buckets')).rows[0].public, true);
await db.close();
console.log('PASS: private bucket, canonical backfill, transactional failure, owner writes, anonymous/cross-account denial, trusted coach grant, reassignment/revocation, and broad-policy resistance (local PGlite only).');

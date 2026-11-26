// Deletes the calling client's account (App Store 5.1.1(v), Google Play account deletion).
// Order: photo files -> all sessions -> login. Deleting the login cascades to every
// client table; payment records stay for the business with the person unlinked
// (sqlmigrationfiles/2026-11-22_08_keep_payments_on_account_deletion.sql).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const BUCKET = 'progress_photos';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json(401, { error: 'Sign in again to delete your account.' });

  const { data: profile, error: profileError } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
  if (profileError) return json(500, { error: 'Could not delete the account. Try again.' });
  if (profile && profile.role !== 'client') {
    return json(403, { error: 'Coach and admin accounts are closed by an administrator.' });
  }

  // Photo files are not covered by the database cascade. Paths are <uid>/<date>/<file>.
  const bucket = admin.storage.from(BUCKET);
  const { data: entries, error: listError } = await bucket.list(user.id, { limit: 1000 });
  if (listError) return json(500, { error: 'Could not remove your photos. Try again.' });
  const paths: string[] = [];
  for (const entry of entries ?? []) {
    if (entry.id) { paths.push(`${user.id}/${entry.name}`); continue; } // a file, not a date folder
    const { data: files, error } = await bucket.list(`${user.id}/${entry.name}`, { limit: 1000 });
    if (error) return json(500, { error: 'Could not remove your photos. Try again.' });
    for (const file of files ?? []) paths.push(`${user.id}/${entry.name}/${file.name}`);
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100));
    if (error) return json(500, { error: 'Could not remove your photos. Try again.' });
  }

  await admin.auth.admin.signOut(token, 'global').catch(() => {});
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return json(500, { error: 'Could not delete the account. Try again.' });
  return json(200, { deleted: true, photosRemoved: paths.length });
});

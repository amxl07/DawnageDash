import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPhotoReference, photoReferencesForSave, signPhoto, photoUrlForSession } from './progress-photos.ts';

const owner = '11111111-1111-4111-8111-111111111111';
const project = 'https://fixture.supabase.co';
const path = `${owner}/2026-09-19/side_(left)_123.jpg`;
const legacy = `${project}/storage/v1/object/public/progress_photos/${path}`;

test('accepts existing mobile/web paths and converts only same-project legacy public URLs', () => {
  assert.equal(canonicalPhotoReference(path, project, owner), path);
  assert.equal(canonicalPhotoReference(legacy, project, owner), path);
  assert.equal(canonicalPhotoReference(legacy.replace('(left)', '%28left%29'), project, owner), path);
});

test('rejects foreign, signed, mismatched-owner, malformed and normalized-away traversal references', () => {
  for (const value of [legacy.replace('fixture.', 'other.'), legacy.replace('/public/', '/sign/'),
    legacy + '?token=secret', legacy + '#fragment', `//fixture.supabase.co/${path}`,
    legacy.replace('/2026-09-19/', '/x/../2026-09-19/'),
    legacy.replace('/2026-09-19/', '/%2e%2e/2026-09-19/'),
    path.replace('/2026', '/%252e%252e/2026'), path.replace('/2026', '\\2026'),
    path.replace('/2026-09-19/', '/2026-02-30/'), path.replace('/2026-09-19/', '/0000-01-01/'),
    path.replace(owner, '22222222-2222-4222-8222-222222222222'),
    'file:///private/photo.jpg', path + '/extra.jpg', '', ' ']) {
    assert.throws(() => canonicalPhotoReference(value, project, owner), undefined, value);
  }
});

test('save preserves canonical references and refuses signed display URLs', () => {
  const fields = { front_url: legacy, back_url: null, side_left_url: path, side_right_url: null };
  assert.deepEqual(photoReferencesForSave(fields, project, owner), { ...fields, front_url: path });
  assert.throws(() => photoReferencesForSave({ ...fields, front_url: legacy.replace('/public/', '/sign/') }, project, owner));
});

test('signs using the authorized storage boundary, short expiry and no public fallback', async () => {
  const calls: unknown[] = [];
  const signer = { createSignedUrl: async (...args: [string, number]) => {
    calls.push(args); return { data: { signedUrl: `${project}/storage/v1/object/sign/progress_photos/${path}?token=fake` }, error: null };
  } };
  const result = await signPhoto(signer, legacy, project, owner, 'viewer-a', () => 1000);
  assert.deepEqual(calls, [[path, 300]]);
  assert.equal(result.expiresAt, 301000);
  assert.equal(photoUrlForSession(result, 'viewer-a', 300999), result.url);
  assert.equal(photoUrlForSession(result, 'viewer-a', 301000), null);
  assert.equal(photoUrlForSession(result, 'viewer-b', 1001), null);
  assert.equal(photoUrlForSession(result, null, 1001), null);
  await assert.rejects(() => signPhoto({ createSignedUrl: async () => ({ data: null, error: { message: legacy } }) }, legacy, project, owner, 'viewer-a'),
    (error: Error) => error.message === 'Photo access unavailable. Try again.');
  await assert.rejects(() => signPhoto({ createSignedUrl: async () => ({ data: { signedUrl: legacy }, error: null }) }, path, project, owner, 'viewer-a'));
});

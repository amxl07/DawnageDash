# Private progress-photo rollout — prepared, not deployed

This change requires coordinated mobile, web and storage releases. No live backend, account or photo was accessed during implementation. Local PostgreSQL tests do not establish deployed Storage API behavior.

## Contract and authorization

- `weekly_progress_photos.front_url`, `back_url`, `side_left_url`, and `side_right_url` retain their names but now hold `user UUID/YYYY-MM-DD/label_timestamp.jpg` object paths. Existing same-project public URLs are accepted for reading and normalized on save. Signed URLs, other projects, invalid dates, traversal and mismatched owners are rejected.
- Both uploaders write paths. These upgraded clients request authenticated Supabase signed URLs with a five-minute lifetime, refresh after four minutes and on focus/resume, remove expired/failed URLs, and expose retry. Queries include the viewing account and target owner, have zero unused retention, and are never persisted. Native photos use no image cache. Forms and viewer state retain references, never bearer URLs.
- Source relationships are `public.users.id = auth.uid()` and `users.coach_id → users.id`; coach identity is `users.role = 'coach'`. Historical SQL trusts editable JWT metadata; the web supports coach self-signup and direct coach claims. Those fields alone cannot safely authorize private photo bytes.
- The migration creates `progress_photo_coach_access`, initially **empty**. Only the service/operator can approve a client/coach pair after reviewing authorization. Object reads require the grant, current assignment, coach role and a reference in that client's photo row. Owner access needs no coach grant. Changing assignment or role revokes the affected grants; changing it back never restores them. New/reassigned coaches require new approval. Browser/mobile clients cannot read or write this grant table.
- Existing coach/admin row-metadata SELECT policies remain for reporting counts. They cannot authorize object contents. Admin photo viewing is not implicitly granted; an admin using “view as” will see retry/unavailable for photos unless independently authorized by the owner/approved-coach contract. Coach claim and other profile workflows keep working, but claims cannot self-grant photo access. This is an explicit compatibility cost.
- Storage SELECT and write guards are restrictive, so a permissive legacy policy cannot bypass them. Unrelated buckets are outside those guards. Photo row writes are owner-only and enforce canonical owner/date references.

## Preflight and unknown references

1. Use an authorized database owner (`postgres`) or approved migration role with BYPASSRLS against a synthetic staging project first; the SECURITY DEFINER helpers must be owned by that trusted role. Inventory the actual schema, policies, bucket metadata and clients still in circulation. This repository's SQL history is not proof of deployed schema.
2. Set `photo_privacy.project_url` to the exact HTTPS Supabase project origin and run `sqlmigrationfiles/2026-09-19_private_progress_photos_preflight.sql`. It is read-only and returns counts/policy definitions, not photo URLs or identities. A custom Supabase domain must be the exact configured origin; cross-domain legacy URLs require explicit operator reconciliation.
3. Securely back up photo-row references, bucket configuration, object metadata and policy definitions. Never paste real references or credentials into CI/task logs. Inventory every object in the bucket, including unreferenced uploads.
4. The migration validates every non-null reference, owning UUID, calendar date, row date and matching storage object. It accepts canonical paths and exact-project legacy `/storage/v1/object/public/progress_photos/` URLs, decoding safe ASCII URL escapes once. Unknown origins, signed URLs, empty strings, malformed paths, missing objects, owner/date mismatches, unsupported object filenames or missing users abort the **whole transaction**. It does not erase, null or silently reassign a reference. Review flagged records through a restricted operator workflow; locate/restore the correct object or make an explicitly approved correction, then rerun. Backfill does not rename or move objects.
5. If preflight fails, no private-bucket claim may be made. Existing public storage remains public until an authorized privacy cutover succeeds. Treat unresolved exposure as an outstanding release blocker.

## Coordinated release order

1. Schedule a photo-write maintenance window. Before distributing path-writing clients, pause photo uploads and row mutations with restrictive Storage/row policies controlled by the operator. Preserve authenticated reads. Verify the pause with synthetic clients. Do not run mixed old/new writers against live photos.
2. Release the updated web reader/uploader and mobile build together. Require the new mobile version for photo use before resuming writes. This repository does not implement a global minimum-version gate; arranging upgrade/maintenance enforcement is a rollout prerequisite. Old clients expect public URLs and will break after cutover; do not promise a transparent old-client fallback.
3. Review and run `sqlmigrationfiles/2026-09-19_private_progress_photos.sql` with the exact project-origin setting. It locks photo rows/objects during conversion and commits canonical references, private bucket and policies together. It is idempotent; rerunning never automatically provisions coach access. Do not rerun historical public-bucket SQL afterward.
4. Approve current client/coach pairs individually with the service tool below. Test owner access, approved coach access and cross-account denial through real staging Storage APIs. Revoke old grants before reassignment; assignment changes also revoke automatically. Grant the new pair only after independently reviewing authorization.
5. Confirm upgraded clients on iOS, Android and web can read legacy-converted sets, upload all angles, reopen/edit without saving signed URLs, compare/view photos, refresh after expiry, and switch accounts. Remove the operator's temporary write pause only after these checks pass. Restrictive pause policies must be explicitly removed; this migration deliberately does not remove operator-created policies.

## Operator provisioning and revocation

The tool requires `PHOTO_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a protected operator environment. Never provide a service key to an app build, command argument, CI log or chat. The tool rejects redirects and redacts backend responses.

```sh
# These examples are instructions, not commands executed in this review.
node scripts/progress-photo-access.mjs grant --client CLIENT_UUID --coach COACH_UUID
node scripts/progress-photo-access.mjs grant --client CLIENT_UUID --coach COACH_UUID --apply --approved
node scripts/progress-photo-access.mjs revoke --client CLIENT_UUID --coach COACH_UUID
node scripts/progress-photo-access.mjs revoke --client CLIENT_UUID --coach COACH_UUID --apply --approved
```

Default operation is a preview. Grant preview checks the client role, coach role and current assignment; `--apply --approved` attests that an operator independently reviewed authorization. Assignment is a consistency check, not consent. Revocation supports stale pairs after reassignment. The tool provisions no batch grants and prints no IDs, references or credentials. It has not been run against a backend.

## Required staging and device evidence

Use only synthetic accounts A/B (clients), C/D (coaches) and synthetic image files. Record pass/fail and status codes, not tokens or photo URLs.

| Check | Required result |
| --- | --- |
| Anonymous public path, listing and signing | Denied after cutover |
| A reads/uploads/updates/deletes A's canonical object | Allowed |
| A attempts B path, foreign owner, invalid path, or moved owner on update | Denied |
| B tries A's object or row mutation | Denied |
| Assigned C without a service grant | Object signing denied |
| Approved C with matching current assignment and referenced object | Read/sign allowed; upload/update/delete denied |
| C tries orphan/unreferenced A object | Denied |
| Client changes JWT role or mutable assignment; attempts grant-table write | Cannot obtain photo access |
| Reassign A to D, then revert to C | Both need a new independent service approval; old C grant cannot revive |
| Revoke C grant or change C role | New signing denied immediately |
| Existing signed URL issued by the upgraded helper after revocation | The helper requests 300 seconds; bearer access can remain until that issued URL expires. Verify actual Storage behavior; never claim instant revocation |
| URL issued previously or by another authorized client | Lifetime follows that URL’s actual expiry and platform behavior. Test signing with a different requested duration; this migration does not enforce a universal five-minute ceiling |
| Focus/resume after five minutes with signing denied/offline | No old image displayed; retry available |
| Account switch during signing/upload/save | Old account image disappears; pending results cannot populate the new account or save its references |
| Edit one angle after refocus | Other raw references preserved; no `?token=` values stored |
| Saved object is missing or cannot be signed in the web editor | Owner can Retry, Replace or Remove; Download is absent, and different-account/saving/uploading controls cannot mutate the reference |
| Duplicate migration with no changes | Succeeds; bucket remains private; grants are unchanged |
| Unknown/foreign/missing legacy reference | Whole migration aborts; original references and bucket state remain intact |

The five-minute request is a client convention, not a server-enforced maximum. RLS authorizes signing but does not constrain the requested token lifetime. An authorized reader using another client may request a different lifetime, and older URLs may outlive five minutes. Verify the platform’s accepted durations and revocation behavior in staging before making any universal deadline claim. A server-controlled signing boundary and enforcement are additional work if the product requires such a ceiling.

The migration does not invalidate previously downloaded photos, screenshots, browser caches or old public/CDN copies. Storage/CDN behavior and any purge/invalidation need an authorized platform review. New upload cache-control is zero; native display avoids persistent image caching.

## Rollback

Prefer fixing forward while the bucket remains private. Reopening the bucket would restore public access to sensitive photos and requires explicit authorization; it is not a routine rollback. Old clients cannot use private paths. A rollback therefore needs a write pause, an approved compatible client release, validated reference backups and a deliberate privacy decision. Never silently regenerate public URLs, undo trusted grants into permissive rules or assume a database rollback revokes issued bearer URLs.

## Local reproduction

```sh
node --experimental-strip-types --test shared/progress-photos.test.ts
node --experimental-vm-modules --test scripts/mobile-photo-upload.test.mjs scripts/progress-photo-access.test.mjs
node --experimental-vm-modules --test scripts/web-photo-upload-card.test.mjs
npm install --prefix /tmp/dawnage-photo-sql --no-save --package-lock=false @electric-sql/pglite@0.5.8
PHOTO_SQL_MODULE=/tmp/dawnage-photo-sql/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-photo-privacy.mjs
# From mobile/:
node node_modules/jest/bin/jest.js --runInBand src/lib/photos.test.ts src/hooks/usePrivatePhotoUrl.test.tsx src/components/media/PhotoCaptureSheet.test.tsx src/components/media/PhotoSlot.test.tsx src/components/media/PhotoViewer.test.tsx src/screens/__tests__/media.test.tsx
```

PGlite executes actual PostgreSQL functions, constraints and RLS under synthetic roles, including intentionally broad legacy policies. It does not emulate Supabase's Storage HTTP service, JWT verification, CDN or device cache, so those staging/device checks remain separate.

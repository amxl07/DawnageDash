# Progress-photo privacy implementation — 2026-09-19

Prepared the coordinated mobile/web photo contract, migration and operator tooling. **No migration, grant provisioning, deployment, live backend reads or real photo/account tests were performed.** Source and local database checks are not evidence that the deployed bucket is private.

## Changed behavior

`shared/progress-photos.ts` is the single pure reference/signing contract. It validates owner UUIDs, real calendar dates and the existing mobile/web filename forms; accepts exact-project legacy public URLs; rejects foreign/signed URLs, query/fragment-bearing references, traversal, malformed escapes, invalid dates and mismatched owners. Both uploaders return/store canonical object paths. Existing `_url` column names remain compatible with the schema.

Mobile thumbnails, full-screen viewer, selected-photo slots and ghost overlays now resolve references through `PrivatePhoto` / `usePrivatePhotoUrl`. The web Media gallery and upload cards use the same signing contract. Signed URLs requested by the upgraded helper use a 300-second duration and refresh after four minutes and on focus/resume, disappear on signing failure or expiry, and have no public fallback. Viewer/account/owner/reference scope the query; unused signed-query retention is zero and native images use `cachePolicy="none"`. Signed URLs never enter the row query, viewer reference arrays, capture form or save payload. The capture sheet invalidates pending work on account changes, and the Media route remounts its private state per account. Web upload callbacks also guard account/date/unmount scope; uploads block save, and saves block new photo selection.

Web reader queries now include the viewing account as well as the target owner. Existing reference fetch failures block saving an empty overwrite. Both save paths normalize references before persistence; web writes verify the returned row ID. Downloads use only the current signed display URL.

## Producer/consumer and schema trace

- Byte producers: `mobile/src/lib/photos.ts` and `client/src/components/PhotoUploadCard.tsx`.
- Reference writers: `mobile/src/hooks/useProgressPhotos.ts` and `client/src/components/PhotosUploadDialog.tsx`.
- Image consumers: mobile Media route, PhotoSlot, PhotoViewer and PoseGuide; web Media and PhotoUploadCard. `client/src/components/PhotoUpload.tsx` has no reachable progress-storage writer. Coach/admin dashboards read photo rows only for reporting/counts.
- Source schema: `users.id` corresponds to `auth.uid()`, and `users.coach_id` references another `users.id`. `role='coach'` is a users-row field. The historical `enable_coach_view_access.sql` helper checks this assignment; the old bucket script sets `public=true` and has bucket-wide SELECT plus broad authenticated upload permission.
- Security finding: coach signup uses user-editable metadata, historical user policies trust metadata, and CoachClaimPage updates `users.coach_id` directly. Neither mutable assignment nor role is a sufficient trust root for photo access. The broader users-policy issue is not silently “fixed” by this photo change; assignment tampering can still affect non-photo workflows or revoke availability, but cannot grant photo-byte access.

## Migration and operational cost

`sqlmigrationfiles/2026-09-19_private_progress_photos.sql` is transactional and idempotent. It validates/backfills references, rejects unknown/missing/mismatched objects without deleting data, makes the bucket private, enforces owner-only writes and adds restrictive guards that survive permissive legacy storage policies. All SECURITY DEFINER helpers use a fixed `pg_catalog` search path and fully qualified tables.

The new `progress_photo_coach_access` table starts empty. Only an explicitly approved service/operator action can grant a client/coach pair. Coach object access additionally requires the current assignment, coach role and a row reference to that object. A trigger on assignment/role changes only revokes grants; reverting the changed assignment cannot revive old access. Existing admin/coach photo-row metadata SELECT policies remain for dashboards, but never authorize object contents. Admin “view as” does not imply private-photo access.

`scripts/progress-photo-access.mjs` supplies operational grant/revoke tooling. It previews by default, checks identities/roles/current assignment, requires `--apply --approved` for mutation, supports stale-pair revocation, refuses HTTP redirects and prints no credentials, IDs or backend response bodies. Tests inject its request boundary; the real tool was never run against a backend. New/reassigned coach photo access now needs independent service approval. This is deliberate, documented compatibility work, not automatic seeding from insecure mutable assignments.

The read-only inventory is `sqlmigrationfiles/2026-09-19_private_progress_photos_preflight.sql`. Full rollout, unknown-reference handling, write-maintenance/version prerequisites, provisioning commands, rollback implications and the staging/device acceptance matrix are in [photo-privacy-rollout.md](./photo-privacy-rollout.md).

## Verification evidence

| Check | Observed result |
| --- | --- |
| `node --experimental-strip-types --test shared/progress-photos.test.ts` | **4 passed**: normalization/rejection, save-reference separation, short signing lifetime, session/expiry filtering and sanitized signing failure. A self-review test first reproduced the JS/PostgreSQL year-zero mismatch, then passed after rejecting year zero. |
| `node --experimental-vm-modules --test scripts/mobile-photo-upload.test.mjs scripts/progress-photo-access.test.mjs` | **3 passed**. The upload test executes the actual native module with injected byte/storage dependencies; before implementation it failed because `objectPath` was absent and a public URL was returned. Operator tests prove preview causes no writes, explicit approval is required, wrong assignment/role fails and stale grants can be revoked. |
| Local PGlite 0.5.8: `PHOTO_SQL_MODULE=/tmp/dawnage-photo-sql/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-photo-privacy.mjs` | **Passed actual PostgreSQL execution**: migration twice; private bucket; safe legacy conversion; empty initial grants; anonymous/cross-account denial; owner writes; coach grant/revocation/reassignment; no revival on assignment revert; orphan and coach-write denial; traversal and ownership-change rejection; signed/public reference write rejection; full rollback for foreign/missing references; restrictive guards defeat an intentionally broad legacy policy. |
| Initial isolated mobile `photos.test.ts` | **2 passed**. |
| Initial isolated mobile `usePrivatePhotoUrl.test.tsx` | **1 passed**: expiry, refocus and account change with fake storage. Later strengthened to explicitly settle the old-account request after switching; root integration reruns it. |
| Focused six-suite mobile batch | PhotoSlot passed. Media exposed a test locator tied to the former viewer cache-key prefix; changed the locator to identify the actual full-screen image. The slow filesystem batch was stopped at the integration agent's request before remaining suites completed, so this is **not** recorded as a six-suite pass. Root's integrated run includes all six photo suites and the new capture regressions for account changes and reference preservation. |
| Root web TypeScript: `node node_modules/typescript/bin/tsc --noEmit --pretty false` | **Passed**, including a second run after final web control edits. |
| Root web `npm run build` | **Passed**, 3,873 modules, 2m13s. Existing Browserslist-age and PostCSS `from` warnings; no photo build error. Final subsequent changes only disabled photo-selection controls during a pending row save and passed TypeScript. |
| Mobile TypeScript at task level | No photo errors; only integration-owned `app-config.test.ts` fixture casting error, reported to root. Root owns final integrated typecheck/lint/Jest/export outcomes. |

PGlite was installed only under `/tmp/dawnage-photo-sql`; no package manifest or lockfile was changed by this task. The integration agent owns the shared-directory Metro watch configuration and CI command registration.

## Self-review and remaining validation

Reviewed the changes against `/tmp/dawnage-hardening-20260919/baseline.tar.gz`, preserving the dirty checkout. Existing source changes were confined to the ten photo producer/reader/form files plus their focused tests; new shared helpers, private-display components, SQL, operator/test scripts and these reports carry the new contract. No reset, stash, commit, unrelated feature edits or credential inspection occurred.

The available evidence does **not** cover Supabase Storage HTTP/JWT behavior, CDN/public-copy invalidation, physical-device caching/foreground behavior or real staging cross-account checks. The upgraded helper requests a five-minute expiry, but no server-enforced maximum lifetime has been established. Previously issued URLs and URLs requested by other authorized clients follow their actual expiry and platform behavior, which must be verified in staging before claiming a universal revocation deadline; old downloaded/public copies cannot be revoked by this code. The deployment must coordinate upgraded mobile/web clients, a photo-write pause, actual-schema preflight, the migration, individual coach approvals and the staging/device matrix. Old public-URL clients are incompatible after cutover; the rollout document explicitly requires upgrade/maintenance enforcement, since this task does not add a global minimum-version gate. Prefer a private fix-forward rollout; reopening the bucket is a separate explicit privacy decision.

## Task 3 review fixes, round 1

Addressed both findings from `.superpowers/sdd/2026-09-19-release-hardening/photos-review.md`:

- `client/src/components/PhotoUploadCard.tsx` now renders Replace/Remove from the durable saved reference even when signing fails. Download remains conditional on a current signed URL. Owner identity, saving/uploading disablement and the active account/date scope guard both edit handlers and file selection, so unavailable previews do not weaken write ownership. The failed-signing state keeps Retry alongside those owner edit controls.
- This report and the rollout document now state that 300 seconds is requested by the upgraded helper, not enforced as a universal maximum by Storage RLS. Other/previously issued URLs follow their actual expiry and platform behavior. The staging matrix requires checking other requested signing durations before asserting any platform-wide revocation bound; a server-controlled signing boundary would be additional work if a universal ceiling becomes a requirement.

The focused command `node --experimental-vm-modules --test scripts/web-photo-upload-card.test.mjs` **passed 2 tests**. The first failed before the fix because Replace was absent. The tests render the actual web card through React with injected UI/storage/signing boundaries, exercise Replace/Remove after signing failure, confirm Download stays absent, check replacement emits an object path, and prove disabled/different-account handlers do not choose, remove or upload. Root web TypeScript (`node node_modules/typescript/bin/tsc --noEmit --pretty false`) also passed after the fix. No test dependencies were installed and no mobile source, installed modules, migration or running mobile test suite was changed for this fix round. Root owns final integrated checks after SDK patch alignment.


## Final integration handoff

The final source passed TypeScript, lint and iOS/Android/web export. The full mobile suite passed before the final persistence corrections; the affected regressions and reopening amendment then passed. The [release verification report](../../release/evidence/2026-09-19/README.md) supersedes earlier pending integration statements here and records precise scope, overlapping counts and external gates. No live migration or native-device validation is implied.

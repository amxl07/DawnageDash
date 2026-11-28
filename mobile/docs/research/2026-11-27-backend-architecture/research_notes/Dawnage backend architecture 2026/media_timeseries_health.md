# Media pipeline (progress photos), time-series and health data storage: Dawnage, as of 2026-11-27

Scope: how progress photos and time-series data (check-ins, measurements, workout volume, HealthKit and Health Connect imports) are captured, stored, served and retained today. Includes ranked gaps, late-2026 options and a target design with a rollout.

Evidence conventions:
- `repo:` means a file:line in `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash`.
- `live SQL` means a read-only aggregate query against project `hzifwkebzhzlxvigbcup` run on 2026-11-27. No photo was opened and no personal values were read.
- `live logs` means a ClickHouse aggregate over the edge logs for the 24 hours before about 2026-11-27T08:30Z.
- Supabase docs are undated living pages, retrieved 2026-11-27 through the Supabase docs MCP or WebFetch.

Already covered elsewhere and not re-researched: private bucket (migration 07), the path-regex fix, L4 (re-signing on every focus) and the pending store privacy forms. See `mobile/docs/review/2026-11-22-release-readiness/README.md` and `mobile/docs/review/2026-11-27-status-review/README.md`.

---

## Q1. How does the photo pipeline work end to end today (capture → compress → upload → path → DB ref → sign → display)?

### Takeaway
Both clients re-encode photos on the device: 1200×1600 max, JPEG q0.75, about 200 KB. They upload once with a plain `upload()` (no TUS) to `progress_photos/<uid>/<YYYY-MM-DD>/<angle>_<ms>.jpg`. One object path per angle goes into `weekly_progress_photos`. Each photo is then signed individually with a 300 s token, re-signed every 240 s, and displayed full-size with caching disabled. There are no thumbnails and no server-side transforms; the project is on the Free plan, which lacks transforms anyway. Nothing ever deletes a replaced photo.

### Cited Findings

**Capture (mobile)**
- `expo-image-picker` runs with `mediaTypes: ['images'], quality: 1, allowsEditing: false` for both camera and library — repo: `mobile/src/components/media/PhotoCaptureSheet.tsx:171-179`.
- Sources over 10 MB are rejected using `asset.fileSize` — repo: `PhotoCaptureSheet.tsx:184-189`, `mobile/src/lib/photos.ts:10`.
- Angles upload in parallel (`Promise.all`) — repo: `PhotoCaptureSheet.tsx:308-311`.

**Compression (mobile)**
- The app calls `ImageManipulator.manipulateAsync(uri, [{resize}], {compress: 0.75, format: JPEG})` and resizes to fit 1200 wide or 1600 tall, without upscaling — repo: `mobile/src/lib/photos.ts:7-9, 27-47`.
- The compressed file is read twice: once to measure bytes (`photos.ts:44-46`) and again to build the upload ArrayBuffer (`photos.ts:65-66`).
- `manipulateAsync` is deprecated in SDK 57. Expo says "It has been replaced by the new, contextual and object-oriented API. Use `ImageManipulator.manipulate` or `useImageManipulator` instead." — [Expo ImageManipulator SDK 57 docs, retrieved 2026-11-27](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator.md)
- SDK 57 manipulator output formats are JPEG, PNG and WEBP only. AVIF and HEIC are not listed — [same](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator.md)

**Compression (web dashboard)**
- The dashboard uses canvas `drawImage` then `toBlob('image/jpeg', 0.75)` with the same 1200×1600 bounds — repo: `client/src/components/PhotoUploadCard.tsx:11-57`.
- It has a 10 MB pre-check (`:118`) and uploads with `upsert:false, cacheControl:'0', contentType:'image/jpeg'` (`:136-142`).

**HEIC**
- Mobile re-encodes every pick to JPEG through the manipulator, so HEIC from the iOS picker never reaches storage — repo: `photos.ts:39-42`.
- The web path decodes through `new Image()` (`PhotoUploadCard.tsx:17-55`). Expo's format table marks HEIC as unsupported on web ("not adopted yet") — [expo-image SDK 57 docs, retrieved 2026-11-27](https://docs.expo.dev/versions/v57.0.0/sdk/image.md)
- The bucket holds one legacy `.heic` object (1.6 MB) from before compression existed — live SQL (`by_mime image/heic n=1`).

**Upload**
- Uploads use `supabase.storage.from(BUCKET).upload(path, arrayBuffer, {upsert:false, contentType:'image/jpeg', cacheControl:'0'})` — repo: `mobile/src/lib/photos.ts:68-71`.
- There is no TUS client: `mobile/package.json` has no `tus-js-client` and no resumable call anywhere — repo grep.
- Supabase recommends resumable (TUS) uploads "when uploading large files that may exceed 6MB", when network stability is a concern, or for progress events. Chunk size is fixed at 6 MB and upload URLs last up to 24 h — [Supabase Resumable Uploads docs, retrieved 2026-11-27](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)

**Path layout**
- Paths are `photoStoragePath(ownerId, date, label)`, which gives `<uid>/<date>/<label>_<Date.now()>.jpg`.
- Validation checks three segments: a uuid, a strict date, and a filename matching `^[a-z0-9_()-]+_[0-9]+\.(jpe?g|png)$` — repo: `shared/progress-photos.ts:15-36`.
- In the live bucket all 1,691 objects have path depth 3 — live SQL.

**DB reference**
- `weekly_progress_photos(id, user_id, date, front_url, back_url, side_left_url, side_right_url, created_at timestamp WITHOUT time zone)` with `UNIQUE(user_id, date)` — live SQL (pg_attribute, pg_constraint).
- The mobile save is a select-then-update/insert with an acknowledgement check — repo: `mobile/src/hooks/useProgressPhotos.ts:51-72`.
- Old values are canonicalized to object paths on save — repo: `shared/progress-photos.ts:38-41`.
- Of 1,406 references, 1,394 are still stored as legacy full public URLs (`https://…/storage/v1/object/public/progress_photos/…`). Only 12 are bare paths. 0 references point to a missing object — live SQL.
- The legacy `progress_photos` table (`photo_url`, plus meal-ish columns) has 0 rows — repo: `shared/schema.ts:238-248`; live SQL.

**Bucket config**
- `progress_photos`: `public=false`, `file_size_limit=20971520` (20 MB), `allowed_mime_types=['image/*']`, created 2026-01-03 — live SQL; repo: `sqlmigrationfiles/2026-11-22_07_private_progress_photos.sql:25-27`.
- Storage RLS policies:
  - INSERT, UPDATE and DELETE require `split_part(name,'/',1) = auth.uid()`.
  - SELECT uses `progress_photo_can_read(name)`, which allows the owner, their coach and admins.
  - Source: live SQL (pg_policies); repo: migration 07 `:8-37`.

**Signing**
- `signPhoto()` calls `createSignedUrl(path, 300)` for one path at a time. It validates the returned origin, path and token, and caches per viewer. `PHOTO_URL_SECONDS=300`, `PHOTO_REFRESH_MS=240_000` — repo: `shared/progress-photos.ts:3-4, 51-70`.
- No `transform` option is passed anywhere — repo grep.
- Batch signing exists in the SDK (`createSignedUrls(paths[], expiresIn)`) but is unused — [supabase-js reference, retrieved 2026-11-27](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurls)

**Display (mobile)**
- The hook sets `staleTime:0, gcTime:0, refetchInterval:240s, refetchOnWindowFocus:'always'` and also refreshes on focus and AppState — repo: `mobile/src/hooks/usePrivatePhotoUrl.ts:16-37`.
- `<Image source={{uri: photo.url}} cachePolicy="none" recyclingKey={photo.url}/>` — repo: `mobile/src/components/media/PrivatePhoto.tsx:21`.
- `PhotoSlot` also uses `cachePolicy="none"` — repo: `mobile/src/components/media/PhotoSlot.tsx:101`.

**Display (dashboard)**
- The web hook has the same 240 s refetch and focus/visibility refetch — repo: `client/src/hooks/usePrivatePhotoUrl.ts:11-36`.
- The Media page renders 4 `PrivatePhotoThumbnail` per weekly record, each signing and downloading the full-size original — repo: `client/src/pages/Media.tsx:139-142`, `client/src/components/PrivatePhotoThumbnail.tsx:3-6`.

**Plan**
- Organization `DAWNAGE` is on plan `free` (`tier_free`). The project runs in `ap-southeast-2` on Postgres `17.6.1.037` and was created 2025-11-04 — Supabase MCP `get_organization` and `get_project`, 2026-11-27.
- Image Transformations are "currently enabled for Pro Plan and above". The Pro quota is 100 origin images per cycle, then $5 per 1,000. Limits are width/height 1-2500, source ≤25 MB and ≤50 MP. Output is auto-WebP: "We currently only support WebP. AVIF support will come in the near future." HEIC is source-only — [Supabase Storage Image Transformations docs, retrieved 2026-11-27](https://supabase.com/docs/guides/storage/serving/image-transformations); [Manage Image Transformations usage, retrieved 2026-11-27](https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations)
- Smart CDN is "automatically enabled for Pro Plan and above". The Free plan gets Basic CDN — [Supabase Smart CDN docs, retrieved 2026-11-27](https://supabase.com/docs/guides/storage/cdn/smart-cdn); [Supabase pricing, retrieved 2026-11-27](https://supabase.com/pricing.md)

**Live traffic, 24 h edge logs**
- Request counts:
  - 205 `POST /storage/v1/object/sign/progress_photos` (one sign call per photo).
  - 151 signed GETs.
  - 2 uploads.
  - 2 GETs to legacy `/object/public/progress_photos` URLs.
- Signed GETs by Cloudflare cache status:
  - 142 × `MISS`, 200, 31.26 MB.
  - 3 × `HIT`, 0.98 MB.
  - 6 × status 400.
- Signed traffic starts 2026-11-26T19:16Z, which is when migration 07 went live — live logs (`cf_cache_status`, `content_length`).
- Smart CDN caches signed URLs by full URL: "Smart CDN treats each unique token as a separate cache key… If you generate a new signed URL on every request, the cache will never be warm and every request hits the origin." Also: "Token expiry (`expiresIn`) and the object's response cache TTL (`cacheControl`) are independent… cached response can continue to be served for the same signed URL… even if the token in that URL has already expired." — [Supabase Smart CDN docs, retrieved 2026-11-27](https://supabase.com/docs/guides/storage/cdn/smart-cdn)

**Object Cache-Control metadata**
- 1,679 objects carry `max-age=3600`.
- Only the 12 newest carry `max-age=0` (after the `cacheControl:'0'` change).
- Source: live SQL (`metadata->>'cacheControl'`).

**EXIF/GPS**
- Neither client calls an explicit metadata strip. Both re-encode from decoded pixels: canvas `toBlob` on web, and the manipulator on mobile.
- Expo's SDK 57 manipulator docs say nothing about EXIF — [Expo docs, retrieved 2026-11-27](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator.md)
- A user report says manipulator output "get[s] all of that [EXIF] data stripped". This is SDK 49 (2023, older than 2025, possibly stale) — [Expo forums thread](https://forums.expo.io/t/image-manipulator-deletes-exif-data/74987)

### Inferences
- **EXIF on new uploads.** Uploads since about April 2026 very likely carry no EXIF/GPS. Canvas re-encode on the web cannot carry metadata, and the manipulator re-encodes a bitmap. Neither is guaranteed by documentation, so a fixture test should prove it (see Q3).
- **EXIF on legacy uploads.** The pre-April-2026 objects were probably raw camera files and may still contain EXIF, including GPS:
  - 384 objects totalling 624 MiB.
  - 243 of them are larger than 1 MB.
  - 199 use the `.jpeg` extension, which the current `photoStoragePath` never writes.
  - Average size was 1.4–2.2 MB per month bucket, against about 200 KB now.
- **Bypass risk.** The bucket accepts any `image/*` up to 20 MB from an authenticated owner. Anyone calling the Storage API directly can therefore store an unstripped original, or an `image/svg+xml` file. Client-side stripping is a convenience, not a control.
- **TUS is unnecessary.** Compressed photos are about 200 KB, p95 about 2.9 MB only because of legacy objects, which is well under the 6 MB threshold where Supabase recommends TUS.
- **Every view re-downloads the full-size original.**
  - Re-signing every 240 s produces a new token, and therefore a new URL.
  - On mobile, `cachePolicy="none"` plus `recyclingKey={url}` means each re-sign re-fetches the full image while a screen stays open.
  - In the browser, the cache is keyed by URL, so the same applies on web.
  - The measured 98% CDN MISS rate (142/145) is the expected result.
  - This is the cost side of the known L4 item.
- **Request volume.** Per-photo signing makes N sign requests per screen: 205 sign POSTs for 151 image GETs in one day.

### Gaps
- Whether legacy objects actually contain GPS EXIF was not checked. Checking means reading object bytes, which is forbidden in this audit. A server-side, metadata-only scan (an Edge Function reading the first 64 KB with an EXIF parser, emitting only counts) needs owner approval.
- Whether the Chrome or Edge dashboard fails on HEIC files was not tested. That conclusion rests on the `new Image()` decode path and the expo-image web support table.
- The 6 × 400 responses on signed GETs were not attributed. They could be expired tokens or the legacy-URL path; the logs were aggregated only.

---

## Q2. Storage hygiene: orphans, account deletion, bucket size and growth

### Takeaway
The bucket holds 0.928 GB (0.864 GiB) in 1,691 objects. The organization is on the **Free plan's 1 GB storage quota**, so the bucket is at about 86–93% of quota and will cross it in roughly 2–5 months at the current ~32 MiB/month. Of the bytes, 15.7% are orphans (285 objects, 139 MiB) and 67% are legacy uncompressed originals. No code path deletes a replaced or removed photo. Account deletion does remove a client's objects, with minor robustness gaps.

### Cited Findings

**Size and distribution**
- 1,691 objects, 927,962,420 bytes (0.928 GB decimal, 0.864 GiB), 91 owner folders — live SQL.
- Average 536 KB, p50 222 KB, p95 2,974 KB, max 5,005 KB. The bucket is the only one in the project — live SQL.
- Era split:
  - Pre-2026-04: 384 objects, 624 MiB, 243 over 1 MB.
  - Post-2026-04: 1,307 objects, 261 MiB, 6 over 1 MB.
  - Source: live SQL.

**Monthly adds** — live SQL:

| Month | Objects | Added | Notes |
|---|---|---|---|
| 2026-01 | 23 | 33 MB | |
| 2026-02 | 113 | 245 MB | p50 1.98 MB |
| 2026-03 | 248 | 347 MB | |
| 2026-04 | 192 | 46 MB | p50 160 KB, compression era begins |
| 2026-05 to 2026-11 | 105–273 per month | 21–47 MB per month | |

- The last 3 months average 31.7 MiB/month. The last 6 months average about 147 objects/month — live SQL.

**Users**
- 35 distinct uploaders in the last 90 days — live SQL.
- 90 users have photo sets, averaging 4.1 sets each (max 19) and 3.84 photos per set — live SQL.

**Quota**
- The Free plan storage quota is 1 GB. Pro is 100 GB, then $0.0213/GB-month.
- "When you are exceeding your quotas while being on a Free Plan… you will get a notification… and put under a grace period" (Fair Use Policy).
- Source: [Supabase Manage Storage size usage, retrieved 2026-11-27](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)

**Orphans**
- Method: canonicalize the 4 reference columns (strip the public/sign URL prefix, URL-decode) and anti-join with `storage.objects`.
- Result: 285 orphan objects, 139 MiB (16.9% of objects, 15.7% of bytes). 0 dangling DB references — live SQL.
- Orphans by month: 9–55 per month every month, including 20 in Nov 2026.
- 88% of orphans sit in a `<uid>/<date>/` folder whose `weekly_progress_photos` row exists, which means a replaced or removed angle rather than an abandoned session — live SQL.
- No app code deletes objects. Remove and replace only null or overwrite the DB column (`PhotoUploadCard.tsx:97,187`; `PhotoCaptureSheet.tsx:24,479`). The only `storage…remove(` in the repo is in `supabase/functions/delete-account/index.ts:45` — repo grep.
- Stale saves orphan fresh uploads. If the operation changed after `uploadPhoto` resolved, the result is `'stale'` and the uploaded object is left behind — repo: `PhotoCaptureSheet.tsx:239-251`. The same happens when upload succeeds but the DB save fails (`:312-320`).
- 1 object (251 kB) belongs to a uid not present in `public.users`, which is residue of an earlier user removal — live SQL.

**Account deletion** (`supabase/functions/delete-account`, repo: `supabase/functions/delete-account/index.ts:27-52`)
- Only role `client` may self-delete.
- The function lists `<uid>/` with `limit: 1000` and then each date folder with `limit: 1000`. There is no pagination (`:35-43`).
- It removes objects in batches of 100 (`:44-47`), then calls `signOut(global)` and `auth.admin.deleteUser` (`:49-51`).
- The DB cascade covers the table rows; payments are kept per migration 08 (`:1-4`).

**Cache-Control** — live SQL:
- Pre-change objects carry `max-age=3600`. Current code writes `cacheControl:'0'` (`photos.ts:70`, `PhotoUploadCard.tsx:140`).

### Inferences
- **Free-quota runway.** Headroom is 72 MB if Supabase meters decimal GB, or 160 MiB if binary. At about 32 MiB/month that is **≈2.3–5 months** before the Free quota is exceeded with no cleanup.
- **Cleanup alone buys ~21 months.**
  1. Delete the orphans: 139 MiB, of which 92 MiB is legacy.
  2. Re-encode the remaining 336 legacy non-orphans (532 MiB) to about 200 KB each (≈66 MiB).
  3. The bucket drops to **≈280 MiB (~0.29 GB)**, roughly 21 months of runway at today's rate.
- **Orphan rate.** About 17% of all uploads become orphans. That is a structural leak (replace without delete), not noise.
- **delete-account limits are safe for now.** The 1000-entry limit is only theoretical at today's maximum of 19 sets per user.
- **delete-account ordering.** It removes objects before `deleteUser`. If `deleteUser` fails, the user keeps an account with references to deleted files. This is low impact because the user retries the delete.
- **Admin-initiated deletion.** Coach and admin accounts, and any client removed by an admin through the Supabase dashboard rather than this function, leave their photos behind. The 1 residual object shows this has happened.

### Gaps
- Whether Supabase meters the Free 1 GB as 10^9 or 2^30 bytes was not confirmed. The docs' own sample SQL divides by 1,048,576.
- Free-plan backup and PITR coverage for this project was not checked; it is out of scope but matters for any destructive cleanup. Take an export before sweeping orphans.
- I did not fetch the body of Supabase's "Delete Objects" page ([link](https://supabase.com/docs/guides/storage/management/delete-objects)). It should be read to confirm guidance against deleting via SQL. Regardless, deletions should go through the Storage API so the underlying files are removed.

---

## Q3. What are the late-2026 options for the photo pipeline, and what target design should Dawnage adopt?

### Takeaway
Pre-generate two WebP renditions (≈1600 px full and ≈400 px thumbnail) on the device with the new `ImageManipulator.manipulate().renderAsync().saveAsync({format: WEBP})` API. Keep immutable, timestamped object names. Delete old objects on replace and run a reconciliation sweep. Sign once per screen with `createSignedUrls` and a TTL of about 1 h. Cache in memory with `cacheKey = object path` so re-signing never re-downloads. Lock the bucket to `image/jpeg,image/webp` and ≤2 MB. Server-side transformations are not needed: they are unavailable on Free and add per-image cost on Pro. AVIF is not available on either side yet.

### Cited Findings

**Client-side encoding**
- SDK 57's recommended API is `useImageManipulator` / `ImageManipulator.manipulate` → `renderAsync()` → `saveAsync({format, compress})`. Formats are JPEG, PNG and WEBP; there is no AVIF — [Expo ImageManipulator SDK 57, retrieved 2026-11-27](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator.md)
- expo-image displays WebP and AVIF on Android, iOS and web. HEIC is not supported on web — [expo-image SDK 57, retrieved 2026-11-27](https://docs.expo.dev/versions/v57.0.0/sdk/image.md)
- expo-image `cacheKey`: "The cache key used to query and store this specific image. If not provided, the `uri` is used also as the cache key."
- expo-image `cachePolicy` options: `'memory'` ("Image is cached in memory") and `'memory-disk'`. `blurRadius` is "the radius of the blur in points" — [expo-image SDK 57, retrieved 2026-11-27](https://docs.expo.dev/versions/v57.0.0/sdk/image.md)

**Server-side transforms (Supabase)**
- Pro and above only. 100 origin images per cycle, then $5 per 1,000 distinct origin images, billed "regardless of how many transformations each image undergoes".
- Output is WebP only today, with AVIF "in the near future".
- Supabase itself advises: "Optimize original image sizes – upload images in an optimized format and resolution to reduce the need for excessive transformations."
- Source: [Supabase Image Transformations docs](https://supabase.com/docs/guides/storage/serving/image-transformations); [Manage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations), both retrieved 2026-11-27.

**Signed URLs and CDN**
- Reuse the same signed URL to get cache hits.
- Revoking or expiring a token does not purge the CDN entry. Deleting the object invalidates all cached tokens within about 60 s.
- "If you need to cut off access to an asset, delete the object from the bucket rather than relying on token expiry alone."
- Source: [Supabase Smart CDN docs, retrieved 2026-11-27](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
- `createSignedUrls(paths[], expiresIn)` batches signing — [supabase-js reference, retrieved 2026-11-27](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurls)

**Egress pricing**
- Cached egress: $0.03/GB. Uncached egress: $0.09/GB.
- Pro includes 250 GB of each. Free includes 5 GB of each.
- Source: [Supabase pricing, retrieved 2026-11-27](https://supabase.com/pricing.md); [Changelog "3x cheaper egress for cache hits" (undated in search result)](https://supabase.com/changelog/38119-3x-cheaper-egress-for-cache-hits)

**On-device sensitive-content detection**
- Apple's SensitiveContentAnalysis (`SCSensitivityAnalyzer`, iOS 17+) detects nudity on-device.
- It needs the `com.apple.developer.sensitivecontentanalysis.client` entitlement.
- It only runs when the user's own `analysisPolicy` (the Sensitive Content Warning or Communication Safety setting) is on.
- Source: [Apple SensitiveContentAnalysis docs (search result, retrieved 2026-11-27)](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer.md)

**App Store data-use limit**
- App Store 5.1.2(vi): data from "Camera APIs, or Photo APIs" "may not be used for marketing, advertising or use-based data mining, including by third parties" — [Apple App Review Guidelines, retrieved 2026-11-27](https://developer.apple.com/app-store/review/guidelines/)

### Inferences

**Target photo design (each item is small)**

1. **Encode on device, two renditions, WebP.**
   - Use `manipulate(uri).resize({longEdge≈1600}).renderAsync()`, then `saveAsync({format: WEBP, compress: 0.8})` for the full image.
   - From the same rendered image, a second resize to about 400 px gives the thumbnail.
   - Expected sizes are roughly 120–200 KB full and 20–40 KB thumbnail. These estimates are unmeasured; confirm them on device.
   - Web: keep canvas JPEG for the full image and add a canvas thumbnail. Safari's `toBlob('image/webp')` support is unverified, so fall back to JPEG.
   - Do not wait for AVIF: neither the encoder (expo-image-manipulator) nor the Supabase transformer offers it.

2. **EXIF guarantee.**
   - Add one unit or device test: a GPS-tagged JPEG fixture goes through `uploadPhoto`'s encode step, and the test asserts there is no `Exif` APP1 segment in the output.
   - Server side, tighten the bucket to `allowed_mime_types = ['image/jpeg','image/webp']` and `file_size_limit = 2 MB`. Raw camera originals (2–5 MB, possibly with GPS) and SVG then cannot be stored by any path.

3. **Paths.** Keep immutable timestamped names. They are already deterministic per upload and cache-safe because a new name means a new URL.
   - Extend the shared regex to `.webp`.
   - Derive the thumbnail path from the full path (for example `front_<ts>.webp` ↔ `front_<ts>.thumb.webp`). The DB keeps one reference per angle, with no schema change.
   - Legacy JPEGs without a thumbnail fall back to the full image.
   - Avoid `upsert` onto fixed names. Overwrites need CDN invalidation (up to 60 s) and browser cache-busting.

4. **Thumbnails: pre-generated, not transformed.**
   - Pre-generated thumbnails cost about +15% storage and $0 compute, and they work on Free.
   - Transforms would need Pro plus about $5 per 1,000 distinct images per month beyond 100. At 10k users that is roughly $50–150/month (see Q7).
   - Revisit transforms only if more than two display sizes are ever needed.

5. **Signing and caching.**
   - Per screen, call `createSignedUrls(visiblePaths, 3600)` once.
   - Keep `{url, expiresAt}` in memory only (not persisted, as today) and refresh about 5 min before expiry, not every 240 s.
   - Render `source={{uri, cacheKey: objectPath}}` with `cachePolicy="memory"`. Re-signing then never triggers a re-download, and nothing lands on disk, which keeps the current "no persistence of body photos" intent.
   - On web, a URL that stays stable for 55 min lets the browser cache work. Object `cacheControl` of `3600` keeps the CDN or browser lifetime aligned with the token TTL.
   - Revocation, for example when a coach is unassigned, is enforced at sign time by RLS. Already-issued URLs stay valid for ≤1 h, plus any CDN TTL. This is an acceptable trade-off, and deletion is the hard kill switch.

6. **Lifecycle and orphans.**
   - After a DB save succeeds, the client `remove([oldFull, oldThumb])`. The owner DELETE policy already exists.
   - On `'stale'` or failed persistence, remove the just-uploaded objects.
   - Do a one-off sweep of the 285 orphans that are older than 7 days, using the Storage API with the service role, after an export.
   - Run a monthly reconciliation script for unreferenced objects older than 7 days. A script or manual run is enough; a cron job is optional.
   - Backfill the 1,394 legacy URL references to bare paths with one `UPDATE … regexp_replace(…)`, so reconciliation is a simple join.
   - Drop the empty `progress_photos` table.

7. **Legacy re-encode** (owner-approved server job). Re-encode the 336 legacy referenced originals to the new format. This strips any EXIF/GPS and saves about 466 MiB. Write the new path, update the reference, then delete the old object.

8. **Retention.**
   - Photos live while the account is active and are deleted on account deletion (done for clients).
   - Add a written post-churn rule, for example deleting X months after the last plan ends with an export offered first. That is a legal and business decision.
   - Admin removal of a client should call the same storage purge.

9. **Blur and consent.**
   - Blur thumbnails by default in coach list or grid views and on shared screens, with tap to reveal (expo-image `blurRadius`, CSS `filter: blur()`).
   - Show a one-time consent line at first upload: who can see the photos (coach and admins) and how to delete them.
   - SensitiveContentAnalysis cannot be a gate: it is iOS-only, entitlement-bound and depends on a user setting.

10. **Content moderation.** Not needed beyond admin delete. Photos are never published; they are visible only to owner, coach and admin under RLS.

11. **TUS.** Skip it. Objects are under 1 MB. Make retries idempotent instead: re-upload under the same new path on retry.

### Gaps
- WebP versus JPEG size at equal visual quality for these photos was not measured. Measure on about 20 sample uploads before choosing `compress`.
- Safari's canvas WebP encoding support was not verified this session.
- Whether `createSignedUrls` accepts `transform` options was not verified. The reference example shows only paths and `expiresIn`. This only matters if Dawnage moves to Pro with transforms.

---

## Q4. How is time-series data (check-ins, measurements, workout volume, health data) stored today? Does the app upload HealthKit or Health Connect data?

### Takeaway
All time-series data is stored as **one row per user per local calendar date** in wide tables:
- `daily_check_ins` (2,107 rows)
- `body_measurements` (259)
- `weekly_check_ins` (107, mostly free text)
- `workout_logs` (946, JSON text)

All carry `UNIQUE(user_id, date)` (workout_logs excepted). Units are implicit, and there are no CHECK constraints, no timezone column and no source provenance. HealthKit and Health Connect are **read-only and user-mediated**: the app reads one day's totals, the user picks values, and only the chosen numbers are saved into the check-in. No raw samples, sample IDs or source names are uploaded. Data volume is tiny (28 MB for the whole DB).

### Cited Findings

**`daily_check_ins` columns** — live SQL:
- `date date NOT NULL`
- `morning_weight numeric(5,2)`, `sleep_hours numeric(3,1)`, `daily_steps int`
- `calorie_intake int`, `water_liters numeric(3,1)`
- `protein/carbs/fats numeric(5,1)`
- ratings `int`, `digestion varchar(20)`, `notes text`
- `created_at/updated_at timestamptz`

**Constraints and indexes** — live SQL:
- `UNIQUE(user_id,date)` on `daily_check_ins`, `body_measurements` and `weekly_progress_photos`, and `UNIQUE(user_id, week_start_date)` on `weekly_check_ins`. No CHECK constraints on any of these tables.
- `workout_logs` has no unique constraint.
- Redundant single-column `user_id` indexes sit alongside composite indexes that lead with `user_id`: `idx_daily_check_ins_user_id`, `idx_body_measurements_user_id`, `idx_workout_logs_user_id`.

**`body_measurements`**
- `chest/waist/hips/thighs/arms numeric(5,2)` with no unit column — live SQL.
- The UI assumes cm — repo: `mobile/src/features/measurements/observations.ts:64-68`, `MeasurementProgress.tsx:42-51`.

**Units are client config only**
- weight `kg` 20–400, sleep `h` 0–24, `kcal` 0–20000, water `L` 0–20, steps 0–200000, macros `g` — repo: `mobile/src/features/checkin/config/fields.ts:29-59`.

**`weekly_check_ins`**
- Every answer column is `text`, including `step_count`, `water_intake` and `stress_level` — live SQL.

**Workout volume**
- Not stored. `workout_logs.content` is a JSON string (`text`) — live SQL; repo: `shared/schema.ts:297-306`.
- Volume is computed client-side as Σ weight×reps over completed strength sets — repo: `mobile/src/features/workout/workout-review.ts:2-15`.

**Dates**
- The client uses local calendar dates (`localDateString`, which avoids `toISOString()` day rollover) — repo: `mobile/src/lib/dates.ts:3-6`.
- `weekly_progress_photos.created_at` is `timestamp without time zone`, while the other tables use `timestamptz` — live SQL.

**Health import is read-only**
- iOS: `NSHealthUpdateUsageDescription: false`. Share text: "Chosen values enter your daily check-in and are shared with your coach when you submit." — repo: `mobile/app.config.ts:32-34`.
- Android: `READ_WEIGHT`, `READ_STEPS`, `READ_NUTRITION`, `READ_HYDRATION` only — repo: `mobile/app.config.ts:63-66`.

**Health import mechanics**
- `HEALTH_FIELDS` = weight, steps, calories, water, protein, carbs, fats. Sleep is not imported — repo: `mobile/src/features/health/health-model.ts:6`.
- The read window is the device-local day; the timezone comes from `Intl…timeZone` and is kept only in memory — repo: `health-model.ts:22-31`.
- Morning weight is the latest sample before noon — repo: `health-model.ts:39-46`.
- **HealthKit:**
  - `BodyMass` is queried in `kg` — repo: `mobile/src/features/health/healthkit-reader.ts:29-30`.
  - Totals use `queryStatisticsCollectionForQuantity(…cumulativeSum, {day:1})`. A code comment notes: "Combined native daily statistics handle overlapping devices. Never add per-source totals." — repo: `healthkit-reader.ts:35-42`.
- **Health Connect:**
  - `Weight` is read `inKilograms` — repo: `mobile/src/features/health/healthconnect-reader.ts:47-48`.
  - Source `dataOrigin` and source names are collected (`healthkit-reader.ts:14`, `healthconnect-reader.ts:37,48`) but only displayed in the review sheet (`health-review-sheet.tsx:50-52`). They are not persisted.
- Health import is disabled in Expo Go and the store client — repo: `mobile/src/features/health/health-service.ts:15-16`.

**Volumes** — live SQL:
- Whole DB: 28 MB.
- `daily_check_ins` 664 kB (≈315 B/row including indexes), `workout_logs` 1.46 MB, `body_measurements` 144 kB.
- Check-in span: 2025-12-01 to 2026-11-27, averaging 25.1 check-ins per user.
- Field fill counts across 2,107 rows: weight 1,932, sleep 1,894, steps 1,617, kcal 1,007.
- Only 8 users checked in during the last 30 days (68 check-ins).

### Inferences
- The current model, a per-user local-date aggregate with a user-confirmed value, is the right shape for a coaching product. Coaches reason in days and weeks, not samples.
- Missing provenance:
  - No record of whether a value was typed or imported, or which app or device produced it.
  - No IANA timezone of entry. Travelling users' "days" are ambiguous after the fact.
  - No DB-level unit or range guard. The ranges live only in `fields.ts`, so the web dashboard or a direct API write can store 4000 kg.
- `weekly_check_ins` text answers such as `step_count` and `stress_level` are not analyzable as time-series. That is acceptable if they are coach-reading prompts; do not chart them.

### Gaps
- Whether the web dashboard (`client/`) offers lb/in entry that could mix units into the same columns was not checked.
- HealthKit sample `uuid` exposure through `@kingstinct/react-native-healthkit@16` was not verified. It only matters if raw-sample sync is ever built.

---

## Q5. What is the right late-2026 design for health samples and time-series: dedupe, units, timezone, partitioning, TimescaleDB, rollups, retention?

### Takeaway
Do not upload raw HealthKit or Health Connect samples; keep server-side data at per-day aggregates. Add three cheap columns to `daily_check_ins`: `tz`, `sources jsonb` and range CHECKs. Only if passive or background sync is built, add a `health_daily(user_id, local_date, metric, platform)` upsert table. No partitioning, no TimescaleDB (unavailable on PG17 Supabase) and no pg_partman (not exposed on this project): at 10k users the daily tables stay in single-digit millions of rows per year.

### Cited Findings

**TimescaleDB**
- "The `timescaledb` extension is deprecated in projects using Postgres 17… If you are using hypertables, follow the migration guide to convert to native partitioning managed by `pg_partman`." — [Supabase timescaledb docs, retrieved 2026-11-27](https://supabase.com/docs/guides/database/extensions/timescaledb)
- "Starting from Postgres 17, Supabase projects do not have the `timescaledb` extension available." — [Supabase "Migrate from TimescaleDB to pg_partman", retrieved 2026-11-27](https://supabase.com/docs/guides/database/migrating-to-pg-partman)
- The Postgres 17 deprecation list is plcoffee, plls, plv8, timescaledb and pgjwt — [Supabase Upgrading docs, retrieved 2026-11-27](https://supabase.com/docs/guides/platform/upgrading)

**Extensions on this project**
- `pg_available_extensions` on Postgres 17.6.1.037 contains **no `timescaledb` and no `pg_partman`** — live SQL, 2026-11-27.
- Also present:
  - `pg_cron 1.6.4` (available, not installed)
  - `pgmq 1.5.1` (available)
  - `pgsodium 3.1.8` (available, not installed)
  - `supabase_vault 0.3.1` (installed)
  - `pg_stat_statements` (installed)
- This contradicts Supabase docs that document pg_partman as available — [Supabase pg_partman docs, retrieved 2026-11-27](https://supabase.com/docs/guides/database/extensions/pg_partman). The self-hosted PG17 image referenced in docs is `17.6.1.084`, newer than this project's `.037` — [Supabase PG17 self-hosting docs, retrieved 2026-11-27](https://supabase.com/docs/guides/self-hosting/postgres-upgrade-17)

**Partitioning advice**
- Supabase's guidance: "avoid partitions until you see performance degradation on non-partitioned tables… If you don't know how you should partition your data, then it's probably too early." — [Supabase Partitioning docs, retrieved 2026-11-27](https://supabase.com/docs/guides/database/partitions)

**Health Connect dedupe and sync** — [Android Health Connect "Sync data" guide, compatible with HC 1.1.0-alpha12+, retrieved 2026-11-27](https://developer.android.com/health-and-fitness/guides/health-connect/develop/sync-data)
- Store the Health Connect record `id`: "`DeletionChange` notifications only provide the record `id`."
- Changes tokens "expire within 30 days". The preferred recovery is "Read and dedupe all data… using identifiers".
- "Apps can only read data from Health Connect while they are in the foreground" unless the Background Read permission is granted.
- `clientRecordId`/`clientRecordVersion` are used for upserts by writers.

**HealthKit native dedupe**
- The app already relies on HealthKit statistics queries, which merge overlapping sources natively — repo: `healthkit-reader.ts:37-38`.

### Inferences

**Recommended schema changes (Phase 1, tiny)**
```sql
alter table public.daily_check_ins
  add column tz text,                       -- IANA zone at entry, e.g. 'Asia/Kolkata'
  add column sources jsonb,                 -- {"morning_weight":{"via":"healthkit","app":"com.withings…","observed_at":"…Z"},"daily_steps":{"via":"manual"}}
  add constraint dci_weight_kg  check (morning_weight between 20 and 400),
  add constraint dci_sleep_h    check (sleep_hours between 0 and 24),
  add constraint dci_steps      check (daily_steps between 0 and 200000),
  add constraint dci_water_l    check (water_liters between 0 and 20),
  add constraint dci_kcal       check (calorie_intake between 0 and 20000);
-- body_measurements: cm canonical; add range checks; comment the unit on each column.
-- drop redundant idx_*_user_id indexes (covered by UNIQUE(user_id, date)).
```
Add the constraints `NOT VALID` first, then `VALIDATE` after checking that existing rows comply.

**Design rules**
- **Units:** store SI only (kg, cm, L, kcal, g, count, hours). Convert at display. Both readers already request kg/kcal/L/g.
- **Time:**
  - `date` is the user's **local civil date** and remains the key for "a day".
  - Instants are `timestamptz`.
  - Persist `tz` so a day can be mapped back to a UTC window. Health Connect records carry `zoneOffset`.
  - Fix `weekly_progress_photos.created_at` to `timestamptz`.
- **Dedupe:**
  - Manual and imported daily values are deduped by the existing `UNIQUE(user_id, date)` upsert.
  - Cross-device step double-counting is already prevented on iOS by HealthKit statistics queries. The Health Connect reader also uses native `aggregateRecord` totals (`healthconnect-reader.ts:56-68`), and it treats HC 4.1.3's zero-for-missing nutrition as ambiguous (`:33-34`).

**Only if passive or background sync is built (Phase 4)**
```sql
create table public.health_daily (
  user_id uuid not null references public.users on delete cascade,
  local_date date not null,
  metric text not null check (metric in ('weight_kg','steps','energy_in_kcal','water_l','protein_g','carbs_g','fat_g','sleep_h')),
  platform text not null check (platform in ('healthkit','health_connect')),
  value numeric not null,
  source_apps text[],          -- provenance, not raw samples
  tz text, synced_at timestamptz not null default now(),
  primary key (user_id, local_date, metric, platform)
);
```
- The device keeps the HealthKit anchor or Health Connect changes token and upserts recomputed daily aggregates for touched days.
- Raw sample IDs are needed only for per-sample features such as HR series or workouts with routes. In that case, a samples table keyed `(user_id, platform, source_sample_id)` would need time partitioning and a BRIN index on `start_at`, and **that** is when pg_partman availability matters.

**Scale check**
- 10k users × 365 days ≈ 3.65 M `daily_check_ins` rows/yr, or about 1.15 GB/yr at ~315 B/row. A btree on `(user_id, date)` is sufficient, with no partitioning.
- Raw step samples at about 100–300 per user per day would be about 0.4–1.1 B rows/yr. That is the strongest argument against storing raw samples.

**Rollups**
- A plain SQL view for weekly averages (`date_trunc('week', date)`) is enough. Materialize only if dashboard queries become slow.
- Store `volume_kg` on `workout_logs` at write time only if cross-client dashboard aggregates are needed; client-side computation is fine today.

**Retention**
- Keep for the life of the account; it cascades on deletion (already in place).
- No time-based purge of metrics is needed for coaching. The privacy policy must state this (see Q6).

### Gaps
- Whether a Postgres image upgrade (Infrastructure settings) would expose `pg_partman` on this project was not tested. It is irrelevant at current scale.
- HealthKit's `HKMetadataKeyTimeZone` population rates across common source apps were not verified.

---

## Q6. Compliance of health data storage: encryption, column encryption, residency, Apple and Google rules, export-my-data

### Takeaway
At-rest encryption is the Supabase default and sufficient. Do not adopt pgsodium column encryption: it is pending deprecation and Supabase advises against it. Vault is for secrets only. The bigger compliance gaps are elsewhere:
- **No export-my-data (portability) path.**
- **No written retention rule** for photos after churn.
- **Cross-border storage.** All data sits in Sydney (ap-southeast-2) while most clients are in India, the UK and EU, Canada and the Gulf. The DPA and privacy policy must cover these transfers.

Apple and Google allow server-side storage of user-chosen health values for the user's own coaching, with disclosure and consent. They forbid advertising and data-broker use, and Apple forbids storing personal health information in iCloud.

### Cited Findings

**Encryption**
- "Supabase DOES NOT RECOMMEND any new usage of `pgsodium`… expected to go through a deprecation cycle." Supabase does not recommend Transparent Column Encryption "due to their high level of operational complexity and misconfiguration risk."
- "Supabase projects are encrypted at rest by default which likely is sufficient for your compliance needs e.g. SOC2 & HIPAA."
- Vault "won't be impacted"; its implementation is moving away from pgsodium.
- Source: [Supabase pgsodium docs, retrieved 2026-11-27](https://supabase.com/docs/guides/database/extensions/pgsodium)
- On this project, `supabase_vault 0.3.1` is installed and `pgsodium` is not — live SQL.

**Residency**
- "Each Supabase project is deployed to a single primary region." The Postgres database, Auth and Storage objects are hosted there.
- "Choosing a region is a data-location control and does not make your application GDPR compliant on its own." Supabase provides a DPA.
- Source: [Supabase GDPR compliance docs, retrieved 2026-11-27](https://supabase.com/docs/guides/security/gdpr-compliance)
- The project region is `ap-southeast-2` — `get_project`.

**Client countries** (`users.country`, role=client, aggregate) — live SQL:

| Country | Clients |
|---|---|
| India | 35 |
| United Kingdom | 24 |
| Canada | 23 |
| Australia | 21 |
| United States | 8 |
| UAE | 7 |
| EU/EEA (Ireland, Germany, Poland, Czech Republic, Slovenia) | 8 |
| Others | ~12 |
| Blank | 4 |

**Apple**
- 5.1.3(i): health and fitness data (HealthKit and others) may not be used or disclosed "for advertising, marketing, or other use-based data mining purposes other than improving health management…". "You must disclose the specific health data that you are collecting from the device."
- 5.1.3(ii): apps "may not store personal health information in iCloud."
- 5.1.2(vi): HealthKit and Camera/Photo API data may not be used for marketing, advertising or data mining.
- Source: [Apple App Review Guidelines, page retrieved 2026-11-27; the PDF edition in search results is dated Nov 2025](https://developer.apple.com/app-store/review/guidelines/)
- Apple's HealthKit page recommends end-to-end encryption "where possible" — [Apple HealthKit developer page (search snippet, retrieved 2026-11-27)](https://developer.apple.com/healthkit)

**Google (Health Connect)**
- Minimum security: "data encryption both at rest and in transit".
- A privacy policy covering "Your data retention and deletion policies".
- Prohibited: "Sharing health data with third parties without explicit, informed user consent", serving ads, and selling to data brokers. Access must be "directly tied to providing a clear benefit to the user".
- Source: [Google Play Health Connect policy FAQ, retrieved 2026-11-27](https://support.google.com/googleplay/android-developer/answer/12991134?hl=en)
- The March 2025 policy update tightened health-data sharing and consent rules — [Google Play policy announcement, March 5 2025](https://support.google.com/googleplay/android-developer/answer/15931464)
- Health apps declaration plus privacy policy were required as of **January 28, 2026**. This comes from a search summary only; the page was not fetched — [Google Play policy preview](https://support.google.com/googleplay/android-developer/answer/16555673)

**Current consent copy and export**
- iOS consent already names coach sharing — repo: `mobile/app.config.ts:33`.
- There is no export or download-my-data feature in `client/`, `mobile/` or `supabase/` — repo grep.

### Inferences

**Column-level encryption**
- None. Threats come from RLS mistakes and over-broad roles, which were audited separately; disk theft is not the issue.
- Encrypting columns would break coach dashboards and sorting for no gain under Supabase's at-rest model.
- Vault stays for secrets only.

**Photos as health-adjacent data**
- Treat body photos as sensitive under the same policy as health data: private bucket (done), RLS (done), EXIF strip (Q3), retention rule, and deletion on account deletion (done).

**Residency**
- Keep one region; moving a live project is a migration, not a setting.
- Document in the privacy policy that data is stored in Australia.
- Rely on Supabase's DPA, which includes SCCs or the UK addendum per its terms (not verified this session), for UK and EU users.
- India's DPDP regime and Gulf regimes need a legal check; not researched here.

**Export-my-data (portability) design**
- An Edge Function `export-my-data` is called with the user's JWT and uses a **user-scoped client**, so RLS limits it to the user's own rows.
- It returns one JSON document containing `users` (own row), `daily_check_ins`, `weekly_check_ins`, `body_measurements`, `workout_logs` (parsed), `weekly_progress_photos` and `onboarding_questionnaire`.
- It adds a `photos` array from one `createSignedUrls(paths, 86400)` call.
- No zip and no export bucket: per-user payloads are about 10 MB of photos plus kilobytes of rows.
- Offer it in Profile next to "Delete account", and offer it before deletion.

**Health Connect sharing consent**
- On Android, sharing imported values with a coach needs explicit, informed consent in-app. The import review sheet, where the user picks values, plus a one-line disclosure satisfies "explicit". Verify that the Android rationale screen text matches the iOS string.

### Gaps
- The exact Supabase at-rest cipher and key management (AES-256, KMS) was not fetched this session.
- Free-plan backup coverage and whether backups stay in-region were not verified.
- Whether Supabase's DPA includes SCCs or the UK IDTA was not verified.
- The legal status of AU→EU/UK transfers and of India's DPDP Rules timing was not researched. Legal review is needed.

---

## Q7. Scale and cost at 150, 1,000 and 10,000 users (measured per-user averages)

### Takeaway
The marginal cost of photos and time-series data is trivial on Pro even at 10k users: storage and egress stay inside the included quotas, with at most single-digit dollars of overage under heavy engagement. The real near-term constraint is the **Free plan**. Storage hits 1 GB within months, and photo egress alone would exceed Free's 5 GB uncached egress at roughly 400 users. If Image Transformations were adopted, they would be the only line item that scales meaningfully ($50–150/month at 10k users), which is why thumbnails should be pre-generated.

### Cited Findings

**Measured per-user averages** (live SQL and logs, 2026-11-27; 152 users, 142 clients)

| Metric | Value |
|---|---|
| Photo stock | 0.928 GB = **6.1 MB per registered user**, or 10.2 MB per photo-uploading user (91) |
| Steady-state photo growth (last 3 months) | 31.7 MiB/month ≈ **0.22 MB per user-month**, or ≈0.94 MB per active uploader-month (35 active in 90 days) |
| Average object since April | ≈200 KB; ≈34 sets/month; 3.84 photos/set |
| Photo egress | 32.2 MB in ~12.6 h ≈ 61 MB/day ≈ **1.85 GB/month ≈ 12 MB per user-month**, ~98% uncached (MISS). First private-bucket day only; one sample. |
| DB | 28 MB total; time-series tables ≈2.4 MB after one year (≈16 KB per user-year at today's low engagement; ≈115 KB per user-year at daily check-ins) |

**Prices**
- Free: 1 GB storage, 5 GB cached plus 5 GB uncached egress, 500 MB DB, no Smart CDN, no transforms.
- Pro: $25/month; 100 GB storage then $0.0213/GB; 250 GB uncached egress at $0.09/GB overage and 250 GB cached at $0.03/GB; 8 GB disk; transforms at 100 included then $5 per 1k.
- Source: [Supabase pricing, retrieved 2026-11-27](https://supabase.com/pricing.md); [Storage size usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)

### Inferences

These are linear extrapolations at today's engagement. Today's engagement is low: 8 check-in users in 30 days and 35 photo uploaders in 90 days.

| | 152 users (now) | 1,000 users | 10,000 users |
|---|---|---|---|
| Photo storage added per year | ≈0.40 GB | ≈2.6 GB | ≈26 GB |
| Bucket after 12 months, current pipeline, no cleanup | ≈1.33 GB (**over Free 1 GB**) | ≈3–9 GB* | ≈27–60 GB* |
| Same with cleanup plus legacy re-encode | ≈0.67 GB | n/a | n/a |
| Photo egress per month, current pipeline | ≈1.85 GB (37% of Free uncached) | ≈12 GB (**over Free 5 GB**) | ≈122 GB (within Pro 250 GB) |
| Egress per month, target pipeline (thumbnails in grids, stable URLs, memory cache) | ≈0.3–0.6 GB† | ≈2–4 GB† | ≈20–40 GB† |
| Time-series DB growth per year | <1 MB at today's engagement (≈17 MB if every client checks in daily) | ≈16–115 MB | ≈0.16–1.15 GB (fits Pro 8 GB; would exceed Free 500 MB at daily engagement) |
| Image Transformations, if used instead of thumbnails | Not available on Free; ≈$0–8/month on Pro | ≈$5–10/month | ≈$50–150/month (≈10–30k distinct origin images/month) |
| Plan cost | Free (breaching) or Pro $25 | Pro $25, $0 overage | Pro $25, ≈$0 overage at today's engagement |

\* The range depends on whether new users bring today's per-user photo stock or only steady-state growth.
† This is an inference: it assumes grid views load ~30 KB thumbnails instead of ≈200 KB to 5 MB originals, and that 240 s re-download loops are removed. It is unmeasured.

**High-engagement stress case:** every client uploads 4 photos per week at about 200 KB.
- 10k clients add ≈35 GB/month, about 420 GB/year. That means ≈$6.8/month storage overage at the end of year 1, rising ≈$7/month each further year.
- Egress for 3 full views per photo is ≈100 GB/month. Both stay within Pro quotas except storage beyond 100 GB.

**Decision:** cleanup alone keeps Free viable for photo storage for about 21 months. Egress (≈400 users), the DB (500 MB) and the lack of Smart CDN and transforms make Pro the realistic plan at about 300–500 users or more.

### Gaps
- Egress per user is based on less than one day of private-bucket traffic. Re-measure over 7 days with the same log query: `cf_cache_status` and `content_length` for `/object/sign/progress_photos` GETs.
- Pre-migration public-URL egress, which used a different CDN behavior, was not measured.
- Org-level total egress (DB, Auth, Realtime) was not measured. The Free 5 GB quotas are shared across all services.

---

## Q8. Ranked gaps and rollout

### Takeaway
The most urgent item is the Free-plan storage ceiling. Pair it with the two cleanups (orphans and legacy originals), which also remove the main privacy risk (possible GPS EXIF in 384 legacy originals). Next come the structural leak (replace without delete), the egress and caching pattern, and bucket hardening. Data export and time-series provenance follow; raw health-sample storage should not be built.

### Cited Findings
Evidence for each gap is cited in Q1–Q7. Key numbers:
- 0.928 GB used of 1 GB Free.
- 624 MiB of legacy originals.
- 285 orphans totalling 139 MiB.
- 98% CDN MISS.
- Bucket accepts `image/*` up to 20 MB.
- No export path.
- No `tz`, `sources` or CHECK columns.
- 1,394 legacy URL references.
- Deprecated `manipulateAsync`.

### Inferences

**Ranked gaps**

| # | Severity | Gap | Fix size |
|---|---|---|---|
| 1 | Critical | Free plan storage: 86–93% of 1 GB, ≈2–5 months of runway; Free also lacks Smart CDN and transforms. Owner decision: upgrade to Pro or clean up first. | Decision plus #2 and #3 |
| 2 | High (privacy and cost) | 384 legacy pre-April originals (624 MiB, 67% of bytes), likely unstripped camera files that may contain GPS EXIF (unverified). | Owner-approved re-encode job |
| 3 | High | No orphan cleanup: 285 objects, 139 MiB, about 17% of uploads leak; replace and remove never delete; stale or failed saves leave objects; admin deletes leave files. | Client `remove()` on replace/stale, one sweep, monthly script |
| 4 | High (cost) | Full-size originals used as thumbnails; `cachePolicy="none"`; 300 s TTL with a 240 s re-sign means re-download loops; ~98% CDN MISS; one sign POST per photo. Extends known L4. | `createSignedUrls`, 1 h TTL, `cacheKey`, thumbnails |
| 5 | Medium (privacy) | Bucket allows `image/*` (including SVG and HEIC) up to 20 MB, so the client EXIF strip can be bypassed. | One `UPDATE storage.buckets` |
| 6 | Medium (compliance) | No export-my-data (portability); no written photo retention rule after churn; transfers out of Australia not documented. | One Edge Function plus privacy-policy text |
| 7 | Medium | Time-series provenance missing (`tz`, imported vs manual, source app); units implicit; no DB range CHECKs. | One migration plus a client payload change |
| 8 | Low | 1,394 legacy public-URL references; empty `progress_photos` table; `weekly_progress_photos.created_at` without time zone; redundant `user_id` indexes. | One migration |
| 9 | Low | `manipulateAsync` deprecated in SDK 57; double file read in `compressImage`. | Bundle with #4 |
| 10 | Low | delete-account: no pagination past 1000 entries; storage removed before `deleteUser` without compensation. | Small loop |
| 11 | Low | Web HEIC from non-Safari browsers likely fails to decode (unverified). | Error copy, or rely on the mobile app |

**Rollout**

- **Phase 0, this week, no app release.**
  - Owner decides Free or Pro.
  - Export or back up, then sweep the 285 orphans older than 7 days via the Storage API (service role) to reclaim 139 MiB.
  - Backfill the 1,394 references to bare paths.
  - Tighten the bucket to `['image/jpeg','image/webp']` and 2 MB.
  - Check that current clients only send `image/jpeg` under 2 MB. The rare raw `.jpeg` uploads after April (6 objects over 1 MB) suggest an old web client; confirm before tightening.
- **Phase 1, next app release.**
  - Migrate to `ImageManipulator.manipulate().renderAsync().saveAsync({format: WEBP})` and write full plus thumbnail renditions.
  - Extend the regex to `.webp` with a `.thumb` sibling.
  - Add the EXIF fixture test.
  - Client deletes the old object on replace and on stale or failed saves.
  - Ship the `daily_check_ins.tz` and `sources` columns, plus CHECKs (`NOT VALID` then `VALIDATE`).
- **Phase 2.**
  - Display layer: per-screen `createSignedUrls(…, 3600)`, refresh about 5 min before expiry, `cacheKey = path` with `cachePolicy="memory"`, and thumbnails in all grids including the dashboard Media page.
  - Blur-by-default on coach grids.
  - Re-measure egress for 7 days.
- **Phase 3.**
  - Owner-approved legacy re-encode job (strips EXIF, ≈−466 MiB).
  - `export-my-data` Edge Function.
  - Privacy-policy additions: retention, Australia storage, coach sharing, Health Connect consent.
  - Admin-side purge for removed clients.
  - Monthly orphan reconciliation script.
- **Phase 4, only if building passive or background health sync.**
  - `health_daily` aggregate table.
  - Keep raw samples on the device.
  - Revisit pg_partman availability only if per-sample storage is ever required.

**Explicitly not recommended:** TUS, server-side Image Transformations, AVIF (no encoder or transformer support yet), TimescaleDB (gone on PG17), pg_partman or partitioning (no scale need), pgsodium column encryption (pending deprecation), and storing raw HealthKit or Health Connect samples.

### Gaps
- Owner approval is required before any job that reads or rewrites user photo bytes (the legacy re-encode or an EXIF scan), and before deleting orphans.
- Final privacy-policy wording and cross-border transfer mechanisms need legal review.

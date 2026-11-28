# Compressing existing progress photos and retiring inactive users' photos (Dawnage, as of 2026-11-28)

Scope: two procedures for the private `progress_photos` bucket on Supabase project `hzifwkebzhzlxvigbcup` (Free plan):
1. A one-time re-encode of the oversized legacy photos, plus compression for future uploads.
2. A retention policy that warns, then deletes, inactive users' photos, with legal basis and user-facing wording.

This builds on `research_notes/Dawnage backend architecture 2026/media_timeseries_health.md` (the "media note") and `research_notes/free_plan_alternatives.md` (the "backup note"). Facts already established there are referenced, not re-researched:
- Bucket: 1,691 objects, 0.928 GB.
- 384 pre-April-2026 originals (624 MiB).
- 285 orphans (139 MiB).
- 336 referenced legacy originals (532 MiB).
- Current pipeline: about 200 KB JPEG at q0.75 within 1200×1600.
- The B2 + rclone-crypt photo mirror, with a 30-day lifecycle for noncurrent versions.

Conventions:
- `repo:` means a path in `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash`.
- Web sources were retrieved on 2026-11-28 unless a date is given.
- Sources older than 2025 are flagged **[pre-2025, possibly stale]**.
- No database, photo or script was touched.
- **Not legal advice.** Items marked **[lawyer]** need confirmation.

---

## Q1. Which format and size should body-progress photos use in late 2026?

### Takeaway
- **One-time batch:** keep **JPEG** (mozjpeg through sharp) and overwrite each file at the same path. Use a 1600 px long edge at q80.
  - Almost all of the saving (≈1.6 MB → ≈0.2 MB) comes from downscaling and re-quantizing, not from the codec.
  - At equal quality, WebP saves only 6–22% over mozjpeg and AVIF 18–37% (SSIM, one vendor study).
  - Changing the extension would force changes to the path regex, the DB references and every installed client.
- **Future mobile uploads:** **WebP** (q≈0.8) through the SDK 57 `manipulate().renderAsync().saveAsync()` API is the only modern format the manipulator can encode. It is a modest gain, so bundle it with the required migration off the deprecated API.
- **Web uploads:** stay JPEG.
- **AVIF and JPEG XL: no.** The manipulator can't encode AVIF, and JPEG XL lacks decode support in Edge and in expo-image's format table.
- **Sizes:**
  - Full image: keep the current 1200×1600 portrait box (1600 px long edge).
  - Thumbnail: about **512 px long edge** rather than 400 px, so 2× and 3× screens stay sharp.

### Cited Findings

**Size at equal quality (2025–2026 studies)**
- **Cleanor Labs technical report, 2026-07-04.** Method:
  - 24 Kodak images (768×512).
  - JPEG baseline: sharp/libvips with mozjpeg ("a deliberately tough baseline"). WebP and AVIF from sharp at effort 4. JPEG XL from cjxl 0.11 at effort 7.
  - Metric: SSIM only. No SSIMULACRA2 or Butteraugli.

  Size versus mozjpeg at equal SSIM:

  | Format | SSIM 0.95 | SSIM 0.98 |
  |---|---|---|
  | WebP | 22% smaller | 6% smaller |
  | JPEG XL | 18% smaller | 7% smaller |
  | AVIF | 37% smaller | 18% smaller |

  - The publisher sells image tools.
  - The report itself says SSIM "slightly favours codecs tuned to it", so its JPEG XL figures are "a floor".
  - Source: [Cleanor blog, 2026-07-04](https://cleanor.app/blog/next-gen-image-formats-2026-avif-webp-jpeg-xl-benchmark) (vendor source, SSIM-only).
- **Jake Archibald, 2026-10-15.** Method: SSIMULACRA2 plus ColorVideoVDP, avifenc 1.4.2, libjxl 0.12.0, jixel 0.4.2 and cwebp 1.6.0, with most images at 1598 px wide.
  - Lossy photos: AVIF is usually smaller than JPEG XL.
    - "People" photo: JPEG XL 17–24% larger at default effort, and libjxl 30–50% larger.
    - F1 photo: 14–17% larger.
    - Weasel: the one image where JPEG XL won, by 4–11%.
  - On faces: "at lower qualities, you can see the smoothing on the face, but it's the same for both AVIF and JPEG XL."
  - Decoding: "AVIF is faster to decode"; JPEG XL took 2–3× as long at medium quality.
  - Recommendation: "default to AVIF 4:4:4".
  - Not tested: mozjpeg, and lossy WebP.
  - Source: [JakeArchibald.com, 2026-10-15](https://jakearchibald.com/2026/jpeg-xl-vs-avif/).
- **PCS 2025 benchmark (Fukushima lab).** It covers JPEG, MozJPEG, Jpegli, JPEG XL, WebP, HEIC and AVIF, and found the AOM AVIF implementation "achieves the highest coding efficiency" when tuned for SSIMULACRA2. Per-format numbers were not extracted (search snippet only) — [PCS 2025 paper PDF](https://fukushimalab.github.io/spcp/PCS2025_fukushima.pdf).

**Decode support in the app (expo-image, SDK 57)**
- The expo-image format table lists WebP, AVIF and JPEG as ✓ on Android, iOS and Web, and HEIC as ✓ on Android and iOS but ✗ on Web ("not adopted yet").
- **JPEG XL is not listed at all.**
- The page states no minimum iOS or Android version for decoding.
- Source: [expo-image SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/sdk/image/).
- The app uses expo-image (`~57.0.5`) and expo-image-manipulator (`~57.0.19`) on Expo `~57.0.24` — repo: `mobile/package.json:18,25-26`.

**Decode support in dashboard browsers (caniuse)**
- AVIF:
  - Safari macOS: partial 16.1–16.3, full from 16.4.
  - Safari iOS: from 16.0.
  - Chrome: from 85. Edge: from 121. Firefox: from 93.
  - Global usage: 96.71%.
  - Source: [caniuse AVIF](https://caniuse.com/avif).
- JPEG XL:
  - Safari 17.0+ (macOS and iOS): partial.
  - Chrome: on by default from 155; behind a flag in 148–154.
  - Edge: **not supported** up to 158.
  - Chrome for Android: from 158.
  - Source: [caniuse JPEG XL](https://caniuse.com/jpegxl).
- Google announced JPEG XL decoding by default in Chrome 155, using the Rust `jxl-rs` decoder — [Chrome for Developers, 2026-10-06](https://developer.chrome.com/blog/jpeg-xl-in-chrome).
- WebP decode is universal in current browsers (expo-image Web ✓ above). A WebP caniuse page was not fetched this session.

**Encode support for future uploads**
- **expo-image-manipulator SDK 57:**
  - `SaveFormat` is `JPEG | PNG | WEBP`. `compress` is in 0.0–1.0, and `format` "Defaults to `SaveFormat.JPEG`".
  - The flow is `useImageManipulator(uri)` / `ImageManipulator.manipulate(uri)` → `.resize()` → `renderAsync()` → `ImageRef.saveAsync(options)`.
  - The page says **nothing about EXIF or orientation**.
  - Source: [Expo ImageManipulator SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/).
- **Browser canvas WebP encoding is unreliable in Safari.**
  - WebKit bug 226950 says canvas export to `image/webp` returns a PNG — [WebKit Bugzilla 226950, 2021](https://bugs.webkit.org/show_bug.cgi?id=226950) **[pre-2025, possibly stale]**.
  - caniuse lists the OffscreenCanvas `convertToBlob` WebP option as unsupported on Safari iOS through 26.4 — [caniuse](https://caniuse.com/mdn-api_offscreencanvas_converttoblob_option_type_parameter_webp).
  - `toBlob` "falls back to PNG and calls your callback as if nothing went wrong" — [DEV Community post (undated)](https://dev.to/dailytechid/canvastoblob-can-silently-hand-you-back-a-png-when-it-cant-encode-what-you-asked-for-4blo).
- **Cross-platform `compress` differences.** One report found the same `compress: 0` JPEG save about 35× larger on iOS than on Android — [Expo forums thread, c. 2019–2020](https://forums.expo.io/t/significantly-different-imagemanipulator-compression-results-on-ios-vs-android/31953) **[pre-2025, possibly stale]**.

**Server-side encoder (sharp)**
- sharp docs cover the 0.35.x line.
- `webp()` defaults: quality 80, effort 4, smartSubsample false.
- `jpeg()` defaults: quality 80, 4:2:0, `mozjpeg: false`. `mozjpeg: true` enables trellis quantisation, overshoot deringing, optimised scans and quantisation table 3.
- `avif()` defaults: quality 50, effort 4, 4:4:4.
- Source: [sharp output API](https://sharp.pixelplumbing.com/api-output/).

### Inferences
- **Why JPEG for the batch.** The 336 referenced legacy originals (532 MiB, about 1.6 MB each) shrink to about 200–250 KB each at a 1600 px long edge and mozjpeg q80, roughly 66–82 MiB in total. That size is inferred from today's pipeline output and is unmeasured.
  - WebP would save a further 6–22%, about 5–18 MiB in total. AVIF would save 18–37%, about 12–30 MiB.
  - Getting that extra saving needs a new extension, a regex change shipped to every client first, and a DB reference migration over 1,394 legacy URL-form references. That is not worth 5–30 MiB.
- **WebP for future mobile uploads: marginal but cheap.**
  - At about 32 MiB/month of growth, a 6–22% saving is roughly 2–7 MiB/month.
  - Worth doing only because `manipulateAsync` must be replaced anyway (deprecated in SDK 57, per the media note).
  - Gate it on a device measurement: on about 20 real photos, if WebP at `compress: 0.8` isn't at least about 15% smaller than JPEG at 0.75 at similar visual quality on **both** iOS and Android, stay on JPEG.
- **AVIF for the batch is technically possible but not chosen.** sharp can encode it, and expo-image, Safari 16.4+ and Chrome 85+ can decode it. It still needs the extension change; see the JPEG reasoning above.
- **Dimensions.** Keep the current fit-inside 1200×1600 box, which is 1600 px on the long edge for portrait body shots.
  - Two photos side by side on a 393-pt-wide iPhone screen get about 190 pt (≈570 px at 3×) each, so 1200 px width leaves room for 2× pinch-zoom.
  - Coaches have used this resolution since April 2026. Whether they ever found it insufficient is not documented.
- **Thumbnail size.** A 400 px long edge (300×400 portrait) is soft in a two-column phone grid (≈570 px needed) and borderline in a three-column grid (≈375 px at 3×).
  - Recommend a **512 px long edge (384×512)** at WebP q≈0.7, roughly 20–40 KB (unmeasured).
  - Thumbnails are a separate feature (media note, Q3 item 4) and are not part of this batch.
- **Quality.**
  - Batch: mozjpeg q80, sharp's default quality.
  - Device: keep JPEG 0.75, or use WebP 0.8.
  - Avoid going below about q70. Skin texture and muscle definition are exactly what coaches compare, and Archibald saw face smoothing at low quality in both AVIF and JPEG XL.

### Gaps
- No 2024–2026 study found gives **Butteraugli** figures, or SSIMULACRA2 figures for **lossy WebP versus mozjpeg**. The only WebP-vs-mozjpeg numbers are the vendor's SSIM numbers.
- Real size and quality for *these* photos (skin, low light, bathroom mirrors) is unmeasured. Run the batch script's dry-run on 20 files and compare visually before applying.
- iOS and Android minimum versions for SDK 57, and whether React Native's core `Image` decodes WebP and AVIF on iOS 17 and Android 10, were not verified. The app uses expo-image for photos (media note), so this matters only if core `Image` is ever used.
- Whether the SDK 57 manipulator strips EXIF on WebP and JPEG output is undocumented. The only evidence is an SDK 49 forum report (media note), so a fixture test is still needed.

---

## Q2. Where and how should the one-time batch re-encode run, and with what script?

### Takeaway
Run it as a **manually triggered GitHub Actions job** using Node, sharp and supabase-js.
- It is free: about 10 runner-minutes of the $12/month included compute.
- The 2015 iMac and Docker are not involved.
- An Edge Function cannot do it: there is a 2 s CPU cap, and sharp/libvips is explicitly unsupported.

Order of work:
1. Sweep orphans.
2. Confirm the B2 encrypted mirror is complete. Its noncurrent versions are the rollback copy for 30 days; raise that to 45 days for this job.
3. Dry-run on 20 files.
4. Apply in small batches.

The job **overwrites each JPEG at the same path**: same `.jpg`/`.jpeg` name, `image/jpeg`, `cacheControl 3600`. This needs no DB change, no regex change and no client change. A stale CDN copy can last up to the object's existing 1 h max-age, and it is just the visually identical original. A handful of HEIC/PNG objects are handled by hand.

### Cited Findings

**Edge Functions**
- Limits:
  - "Maximum Memory: 256MB".
  - CPU time 2 s per worker, which "does not include async I/O".
  - Wall clock 150 s on Free (400 s paid).
  - Request idle timeout 150 s.
- "Node Libraries that require multithreading are not supported", with `libvips` and `sharp` given as examples. WebAssembly is not mentioned.
- Source: [Supabase Edge Function limits (undated living page)](https://supabase.com/docs/guides/functions/limits).

**GitHub Actions**
- GitHub Free, private repos: included compute is "$12 USD per month", expressed "as a monetary amount, not a fixed number of minutes".
- The standard 2-core Linux runner costs "$0.006 USD per minute", so $12 ≈ 2,000 minutes.
- Artifact storage: 500 MB. Standard runners are free in public repos.
- Source: [GitHub Actions billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
- Hosted-runner prices fell up to 39% on 2026-01-01 — [GitHub changelog, 2026-01-01](https://github.blog/changelog/2026-01-01-reduced-pricing-for-github-hosted-runners-usage/). A planned self-hosted-runner charge was postponed — [GitHub changelog, 2025-12-16](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/).

**sharp: metadata and orientation**
- "By default all metadata will be removed, which includes EXIF-based orientation." The default also strips "any ICC profile".
- `keepExif`, `keepIccProfile` and `withMetadata` opt back in.
- Source: [sharp output API, 0.35.x](https://sharp.pixelplumbing.com/api-output/).
- `autoOrient()`: "Auto-orient based on the EXIF `Orientation` tag, then remove the tag". `rotate()` with no angle calls `.autoOrient()`. XMP orientation is not handled — [sharp operation API](https://sharp.pixelplumbing.com/api-operation/).

**Supabase overwrite and CDN**
- Upload defaults to a "`400 Asset Already Exists` error". Overwriting needs `upsert: true`.
- Supabase advises against overwriting "when possible" because "our Content Delivery Network will take sometime to propagate the changes to all the edge nodes".
- "Uploading a file to a new path is the recommended way to avoid propagation delays and stale content."
- Content type is inferred from the extension unless `contentType` is passed.
- Source: [Supabase Standard Uploads (undated living page)](https://supabase.com/docs/guides/storage/uploads/standard-uploads).
- The Supabase "Purge CDN cache" page link returned 404 this session. The media note records that Smart CDN, which handles invalidation, is Pro-only, and that 1,679 objects carry `max-age=3600`.

**App path validation**
- `canonicalPhotoReference` requires `<uuid>/<YYYY-MM-DD>/<name>_<digits>.(jpe?g|png)`, case-insensitive. `photoStoragePath` always writes `.jpg` — repo: `shared/progress-photos.ts:26-35`.
- **A `.webp` or `.heic` reference throws "Unrecognized photo reference" in every shipped client**, so the photo would not display.

**Account-deletion listing pattern**
- `bucket.list(uid)` returns date folders with `id === null`. Files are listed per folder, and removal goes in batches of 100 — repo: `supabase/functions/delete-account/index.ts:34-47`.

**Existing backup design**
- The backup note specifies a nightly `rclone sync` from the Supabase S3 endpoint into an rclone-crypt remote on Backblaze B2. The B2 key has no `deleteFiles`.
- B2 lifecycle for `photos/`: `daysFromHidingToDeleting: 30`. "A deleted or replaced photo version disappears from backups 30 days after the next sync."
- "The pre-cleanup snapshot comes for free… Temporarily raise `photos/` to 45 days if verification needs longer."
- Source: repo `mobile/docs/research/2026-11-27-backend-architecture/research_notes/free_plan_alternatives.md:22,101,154,184-196`. B2 key capabilities there are cited to [B2 application keys, updated 2026-09-29](https://www.backblaze.com/docs/cloud-storage-application-keys).

### Inferences

**Where to run it**

| Option | Verdict |
|---|---|
| **GitHub Actions + sharp** | **Use this.** Native libvips with no Docker, about 10 min of runtime (≈$0.06 of the $12 credit), keys held only as repo secrets, and logs plus a manifest artifact. |
| Supabase Edge Function + WASM (`@jsquash`, imagescript, magick-wasm) | **No.** A 12 MP JPEG decodes to a ≈48 MB RGBA buffer, and resize plus encode in WASM very likely exceeds the 2 s CPU cap per invocation (unmeasured inference). The 256 MB memory cap is tight, and fanning out one invocation per image adds orchestration for no gain. |
| 2015 iMac (macOS 12), Node + sharp prebuilt | Fallback only. Whether sharp 0.35's darwin-x64 binaries and a current Node support macOS 12 was not verified, and it puts a full-access key on an old machine. |
| Reading originals from the B2 mirror instead of Supabase | Optional, only if Supabase egress is tight. It saves about 0.5 GB of Supabase egress but adds rclone-crypt to the job. |

**Overwrite in place versus new path**

| | Overwrite same path (chosen) | New `.webp` path plus DB update |
|---|---|---|
| DB references (1,394 legacy full URLs + 12 paths) | Unchanged | Must be rewritten in both URL and path shapes |
| Path regex and old app builds | Unchanged | Regex must accept `.webp` in **all installed** clients first |
| Content type | `image/jpeg`, unchanged | Changes to `image/webp` |
| Signed URLs already issued | Stay valid. The token is per path, so they serve the new bytes (inference) | Old URLs 404 once the old object is deleted |
| CDN staleness | Up to about 1 h (legacy `max-age=3600`). The stale copy is the visually identical original | None |
| Rollback | Re-upload originals to the same paths | Restore refs, then restore objects |

**Pre-flight checklist (owner)**
1. **Egress budget.** Expect about 1.6 GB of Supabase uncached egress in total, against a 5 GB Free quota shared by all services:
   - first full B2 mirror ≈0.93 GB;
   - apply downloads ≈0.53 GB;
   - verification re-downloads ≈0.08 GB;
   - dry-run samples are negligible.

   Normal app traffic is about 1.85 GB/month (media note), so check Usage first.
2. **Orphans first.** Run the orphan sweep (media note Q2/Q3 item 6) so orphans are not re-encoded.
3. **Backup.**
   - The B2 mirror has completed after the sweep.
   - Raise the `photos/` `daysFromHidingToDeleting` to 45.
   - Record the run's timestamp.
   - Run `rclone check` with source = Supabase S3 and destination = the crypt remote, and confirm 0 differences.
4. **Key.** Create a dedicated `sb_secret_…` key for this job and revoke it afterwards. Do not use the legacy `service_role` JWT; the backend notes say legacy keys are retired by 31 Dec.
5. **Visual sign-off.** Dry-run 20 files. Download the manifest and, for 5 files, compare the original (from B2) with a locally re-encoded copy, ideally a Display-P3 iPhone original.

**Script sketch: `scripts/reencode-photos.mjs`** (for review; not added to the repo)
```js
// One-off: re-encode oversized JPEGs in progress_photos in place.
// Dry-run unless APPLY=1. Idempotent: skips anything already < MIN_BYTES.
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const BUCKET = 'progress_photos', LONG_EDGE = 1600, QUALITY = 80;
const { SUPABASE_URL, SUPABASE_SECRET_KEY, APPLY = '0', LIMIT = '20',
        MIN_BYTES = '500000', BACKUP_VERIFIED, SELF_TEST } = process.env;
const sha = (b) => createHash('sha256').update(b).digest('hex');

// EXIF orientation is applied to the pixels, then every metadata block (EXIF/GPS/XMP/ICC) is dropped (sharp default).
const reencode = (buf) => sharp(buf).autoOrient()
  .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();

if (SELF_TEST) { // the one runnable check: rotated 4000x3000 fixture -> 1200x1600 portrait, no EXIF
  const fixture = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#888' } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const m = await sharp(await reencode(fixture)).metadata();
  assert.deepEqual([m.width, m.height, m.format, m.exif, m.orientation], [1200, 1600, 'jpeg', undefined, undefined]);
  console.log('self-test ok'); process.exit(0);
}
if (APPLY === '1' && BACKUP_VERIFIED !== 'true') throw new Error('Refusing to write: confirm the B2 backup first');

const bucket = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } }).storage.from(BUCKET);
async function list(prefix) { // paginated; folders have id === null
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const todo = [];
for (const owner of await list('')) for (const day of await list(owner.name)) {
  for (const f of await list(`${owner.name}/${day.name}`)) {
    const path = `${owner.name}/${day.name}/${f.name}`, size = f.metadata?.size ?? 0;
    if (size < +MIN_BYTES) continue;                                  // already small
    if (f.metadata?.mimetype !== 'image/jpeg') { console.log('MANUAL', path, f.metadata?.mimetype, size); continue; }
    todo.push({ path, size });
  }
}
console.log(`${todo.length} candidates; processing ${Math.min(todo.length, +LIMIT)}; apply=${APPLY}`);

for (const { path, size } of todo.slice(0, +LIMIT)) {
  const { data, error } = await bucket.download(path);
  if (error) throw error;
  const input = Buffer.from(await data.arrayBuffer());
  if ((await sharp(input).metadata()).format !== 'jpeg') { console.log('MANUAL (not jpeg bytes)', path); continue; }
  const output = await reencode(input);
  const m = await sharp(output).metadata();
  const ok = output.length <= size * 0.7 && Math.max(m.width, m.height) <= LONG_EDGE && !m.exif && !m.orientation;
  const row = { path, before: size, after: output.length, w: m.width, h: m.height,
                shaBefore: sha(input), shaAfter: sha(output), applied: false, ok };
  if (ok && APPLY === '1') {
    const { error: e } = await bucket.upload(path, output, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (e) throw e;
    const { data: back, error: e2 } = await bucket.download(path);  // verify the stored bytes
    if (e2 || sha(Buffer.from(await back.arrayBuffer())) !== row.shaAfter) throw new Error(`verify failed: ${path}`);
    row.applied = true;
  }
  appendFileSync('manifest.jsonl', JSON.stringify(row) + '\n');  // contains uid paths: personal data, short-lived artifact
}
// ponytail: sequential on purpose (≈336 files ≈ 5-10 min); add a small pool only if runs exceed 30 min.
```

**Workflow sketch: `.github/workflows/photo-reencode.yml`**
```yaml
name: Photo re-encode (one-off)
on:
  workflow_dispatch:
    inputs:
      apply:           { type: boolean, default: false, description: 'Write changes (default: dry run)' }
      limit:           { type: string,  default: '20',  description: 'Max files this run' }
      backup_verified: { type: boolean, default: false, description: 'B2 mirror checked with rclone check after the orphan sweep' }
permissions: { contents: read }
concurrency: { group: photo-reencode, cancel-in-progress: false }
jobs:
  reencode:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SECRET_KEY: ${{ secrets.PHOTO_JOB_SECRET_KEY }}   # dedicated sb_secret_ key, revoke after
      APPLY: ${{ inputs.apply && '1' || '0' }}
      LIMIT: ${{ inputs.limit }}
      BACKUP_VERIFIED: ${{ inputs.backup_verified }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - name: Install (isolated from the app's lockfile)
        run: |
          mkdir -p "$RUNNER_TEMP/job" && cp scripts/reencode-photos.mjs "$RUNNER_TEMP/job/"
          cd "$RUNNER_TEMP/job" && npm init -y >/dev/null && npm i --no-audit --no-fund sharp@0.35 @supabase/supabase-js@2  # pin exact versions when committing
      - name: Self-test
        working-directory: ${{ runner.temp }}/job
        run: SELF_TEST=1 node reencode-photos.mjs
      - name: Re-encode
        working-directory: ${{ runner.temp }}/job
        run: node reencode-photos.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: reencode-manifest-${{ github.run_id }}, path: '${{ runner.temp }}/job/manifest.jsonl', retention-days: 30, if-no-files-found: ignore }
```

**Run plan**
1. Dry-run with limit 20. Review the manifest's before/after sizes.
2. Apply with limit 5. Open those 5 in the app and the dashboard on iOS, Android and Safari.
3. Apply with limit 100, then run again with "all" (e.g. `100000`).
4. A re-run is a no-op because everything is below `MIN_BYTES`. Expected result: bucket ≈ 0.93 − 0.14 (orphans) − ≈0.45 = **≈0.33 GB**.

**Manual leftovers**
- The script prints `MANUAL` lines for non-JPEG objects: 1 known `image/heic` (1.6 MB), plus any PNGs.
- If the object is an orphan, the sweep already removed it.
- If it is referenced, the `.heic` reference already fails the regex and is invisible today. Convert it by hand, upload it as `<stem>_<ts>.jpg` through the same `reencode`, update that single column, and delete the old object.

**Verification**
- Per file, the script checks four things:
  - output ≤70% of input;
  - long edge ≤1600;
  - no EXIF or orientation tag;
  - a byte-exact round trip (sha256).
- Afterwards, a read-only SQL aggregate checks two things:
  - `count(*) filter (where (metadata->>'size')::int > 500000)` on the bucket is about 0;
  - 0 dangling references (same query as the media note).

**Rollback**
- While B2 still holds the noncurrent versions (45 days), restore the affected paths, listed in `manifest.jsonl` where `applied=true`.
- Restore with `rclone copy` from the crypt remote, using version-at-time selection, into a temp folder. Then upload each file with `upsert: true` to the same path.

**CDN and signed URLs**
- No purge API is available on Free.
- Overwritten objects may be served stale for at most their existing `max-age=3600`.
- Already-issued signed URLs (300 s TTL) keep working.
- The mobile app uses `cachePolicy="none"`, so it re-fetches anyway.

### Gaps
- Not verified:
  - whether rclone's B2 version-at-time selection works through a crypt remote;
  - whether a service-key `upsert` changes `storage.objects.owner_id`.

  Storage RLS here is path-based (media note), so the owner change should not matter, but confirm on the first 5-file apply.
- Not verified: whether sharp converts Display-P3 or other ICC inputs to sRGB before stripping the profile. Check one iPhone original visually in the dry-run. If colours shift, test `keepIccProfile()`.
- WASM encoder CPU time inside Edge Functions was not benchmarked; the "no" verdict is an inference from the 2 s cap.
- GitHub's job-timeout and scheduled-workflow auto-disable rules were not re-checked this session.

---

## Q3. What is the minimal change for future uploads, and what bucket limits should be set?

### Takeaway
1. **Now, with no app release:** run one SQL statement to lock the bucket to `['image/jpeg','image/webp']` and **2 MB**. Raw camera originals, HEIC and SVG can then never be stored, whichever client or API is used.
2. **Next mobile release:**
   - Move `compressImage` to `ImageManipulator.manipulate(uri).resize(…).renderAsync()` then `saveAsync({format: SaveFormat.WEBP, compress: 0.8})`, only if the device measurement in Q1 justifies WebP; otherwise use `SaveFormat.JPEG, 0.75`.
   - Teach the shared regex and `photoStoragePath` about `.webp`.
   - Ship read support before write support.
3. **Web:** keep canvas JPEG.

### Cited Findings
- **Mobile.**
  - `compressImage` calls the deprecated `ImageManipulator.manipulateAsync(uri, [{resize}], {compress: 0.75, format: JPEG})` and then reads the file to measure its bytes.
  - `uploadPhoto` reads it again into an ArrayBuffer and uploads with `contentType: 'image/jpeg', cacheControl: '0', upsert: false`.
  - Source: repo `mobile/src/lib/photos.ts:27-47, 54-73`.
- The capture sheet calls `uploadPhoto` at `PhotoCaptureSheet.tsx:239`, uses picker `quality: 1` (`:173`) and a 10 MB pre-check (`:184`) — repo `mobile/src/components/media/PhotoCaptureSheet.tsx`.
- The unit test mocks `manipulateAsync` — repo `mobile/src/lib/photos.test.ts:9`.
- **Web.** `compressImage` uses canvas `toBlob(…, 'image/jpeg', 0.75)` within 1200×1600 and uploads with `contentType: 'image/jpeg'` — repo `client/src/components/PhotoUploadCard.tsx:11-57, 131-142`.
- **Paths.** `photoStoragePath` hard-codes `.jpg`, and the regex allows only `jpe?g|png` — repo `shared/progress-photos.ts:27,35`.
- **Bucket today:** `file_size_limit` 20 MB, `allowed_mime_types ['image/*']` — media note, from live SQL on 2026-11-27.
- **SDK 57 API:** `manipulate`/`useImageManipulator` → `renderAsync` → `saveAsync({format, compress})`, with formats JPEG, PNG and WEBP — [Expo SDK 57 ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/).
- **Safari:** canvas WebP may silently produce PNG — see the Q1 sources.

### Inferences

**Bucket limits (one statement, owner-run)**
```sql
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/webp'],
       file_size_limit    = 2097152            -- 2 MB; compressed uploads are ~0.2 MB
 where id = 'progress_photos';
```
- Before running it, confirm that no current client still sends raw files. The 6 post-April objects over 1 MB suggest an old web build (media note).
- Allowing `image/webp` before the clients write it is harmless.

**Shared change (release N, read support only)**
```ts
// shared/progress-photos.ts
!/^[a-z0-9_()-]+_[0-9]+\.(jpe?g|png|webp)$/i.test(parts[2])
export function photoStoragePath(ownerId: string, date: string, label: string,
                                 timestamp = Date.now(), ext: 'jpg' | 'webp' = 'jpg'): string { … `${name}_${timestamp}.${ext}` … }
```

**Mobile change (release N+1, once N is on the testers' devices)**
```ts
// mobile/src/lib/photos.ts (replaces manipulateAsync + the double read)
const image = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
const { uri: out } = await image.saveAsync({ format: ImageManipulator.SaveFormat.WEBP, compress: 0.8 });
const body = await (await fetch(out)).arrayBuffer();
// upload(path /* ext 'webp' */, body, { upsert: false, contentType: 'image/webp', cacheControl: '0' }); bytes = body.byteLength
```
- Update the `photos.test.ts` mock to the new API.
- Add the EXIF fixture test proposed in the media note: GPS-tagged input, then assert no `Exif` APP1 or RIFF `EXIF` chunk in the output.

**Web: no change.** Keep JPEG, because Safari's canvas WebP output is unreliable. If WebP is ever wanted on the web, check `blob.type === 'image/webp'` and fall back to JPEG.

**Pre-launch timing.** The app is not launched, so releases N and N+1 can merge if every tester updates. Once in the stores, keep the two-step order: an old build that sees a `.webp` reference will throw and show no photo.

### Gaps
- iOS WebP `compress` behaviour in SDK 57, and file sizes on device, are unmeasured (see Q1).
- Whether a 2 MB limit rejects any legitimate edge case, such as huge-resolution Android camera output after compression, is unmeasured. Check the max object size since April with a read-only aggregate first.

---

## Q4. What do Australian, UK/EU, Indian and Canadian law require for deleting data that is no longer needed, including notice?

### Takeaway
All four regimes require some variant of "**keep personal data only as long as needed for the purpose, then delete or anonymise it**".
- **None of the sources found requires a fixed period or pre-deletion notice for an app of Dawnage's size.**
- **GDPR** requires telling people the retention period *or the criteria* up front (Art. 13(2)(a)), and the ICO expects deletion from backups too.
- **India's** DPDP Rules prescribe a 3-year inactivity erasure period and a 48-hour warning only for very large e-commerce, gaming and social platforms. A separate Rule 8(3) sets a **one-year minimum** log or data retention for all fiduciaries from May 2027, so a **≥12-month inactivity window** sits comfortably with both directions.
- **Australia's** APPs very likely apply despite the small-business exemption, because Dawnage holds health information **[lawyer]**.

### Cited Findings

**Australia (Privacy Act 1988, APPs)**
- **APP 11.2:** entities "must also take reasonable steps to destroy or de-identify the personal information they hold once it is no longer needed for any purpose for which it may be used or disclosed under the APPs".
  - The duty does not apply where an Australian law or a court or tribunal order requires retention.
  - Reasonable steps "include technical and organisational measures".
  - Source: [OAIC APP Guidelines ch. 11 (live page; the page says OAIC is "progressively updating" it)](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information). The last full PDF is [v1.2, July 2019](https://www.oaic.gov.au/__data/assets/pdf_file/0018/1287/app-guidelines-chapter-11-v1.2.pdf) **[pre-2025, possibly stale]**.
- **2024 reforms.** The Privacy and Other Legislation Amendment Act 2024 received assent on 10 Dec 2024. It inserted APP 11.3, under which reasonable steps include technical and organisational measures, in force from about 11 Dec 2024.
  - Privacy policies must disclose automated decision-making by **10/11 Dec 2026**.
  - Sources: [Act as made, 2024-12-10](https://legislation.gov.au/C2024A00128/asmade/2024-12-10/text/original/epub/OEBPS/document_1/document_1.html); [Clyde & Co, 2024-10](https://www.clydeco.com/en/insights/2024/10/key-privacy-reforms-the-new-app-11-3-and-toms) **[pre-2025, possibly stale]**; [Clyde & Co, 2025-10](https://www.clydeco.com/en/insights/2025/10/cyber-and-privacy-law-update-accountability-gets-r).
  - No source found on the status of the "tranche 2" reforms in late 2026.
- **Who is covered.** Businesses with turnover ≤ A$3M are generally exempt. However, "all organisations that provide a health service and hold health information… are covered by the Privacy Act, whether or not they are a small business". A health service includes assessing, maintaining or improving physical health.
  - OAIC lists "a gym or a weight loss clinic" as a health service provider "where they collect your health information".
  - Sources: [OAIC small business (undated)](https://www.oaic.gov.au/privacy/privacy-for-organisations/small-business); [OAIC "What is a health service provider" (archived `_old` page)](https://www.oaic.gov.au/_old/privacy/health-information/what-is-a-health-service-provider) **[possibly stale]**.

**UK / EU (GDPR Art. 5(1)(e))**
- The ICO says you "must not keep personal data for longer than you need it", and "The UK GDPR does not set specific time limits for different types of data".
  - A documented retention policy is expected "wherever possible". Small, low-risk organisations "may not need a documented retention policy" but must still review and delete.
  - "Periodically review the data you hold". At the end, erase or anonymise, which "put[s] the data beyond use".
  - If data is deleted from live systems you "should also delete it from any back-up".
  - The page carries a notice that, because of the **Data (Use and Access) Act 2025**, the guidance "is under review and may change".
  - Source: [ICO storage limitation (undated living page)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/).
- **Art. 13(2)(a):** controllers must give "the period for which the personal data will be stored, or if that is not possible, the criteria used to determine that period" — [GDPR Art. 13 (gdpr-info.eu)](https://gdpr-info.eu/art-13-gdpr/). The Regulation dates from 2016 and is still in force.
- **Photos and special category data.** "Processing digital photographs of people doesn't automatically count as processing biometric data". However, inferring "health status" counts as special category data, and "data concerning health" means data that "reveal information about his or her health status" — [ICO "What is special category data?" (undated)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/).
- No EDPB-specific retention guidance was fetched this session.

**India (DPDP Act 2023 and DPDP Rules 2025)**
- **Section 8(7)** requires erasure when consent is withdrawn or "as soon as it is reasonable to assume that the specified purpose is no longer being served", unless retention is needed for compliance with law.
- **Section 8(8)** deems the purpose no longer served if the Data Principal does not approach the fiduciary or exercise her rights "for such period as may be prescribed".
- Sources (secondary summaries; statute text not fetched): [Taxmann analysis](https://www.taxmann.com/post/blog/data-retention-erasure-dpdp-act); [DSCI FAQ on data retention (2025)](https://www.dsci.in/files/content/documents/2025/faq-on-data-retention-and-data-erasure-v2.pdf).
- **Notification of the Rules.** The DPDP Rules 2025 were notified on 13–14 Nov 2025; sources differ on the exact day.
  - Rules 3, 5–16, 22 and 23, including **Rule 8**, start 18 months after publication, about **13 May 2027**.
  - The government reportedly discussed shortening this.
  - Sources: [PIB explainer PDF, 2025-11-17](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf) (binary; date from its metadata); [Bar & Bench, 2025-11](https://www.barandbench.com/news/centre-notifies-digital-personal-data-protection-rules-2025-how-different-are-they-from-the-draft-rules); [Business Today, 2025-11-19](https://www.businesstoday.in/tech-today/news/story/final-dpdp-rules-2025-notified-global-tech-platforms-to-face-stricter-obligations-higher-penalties-502827-2025-11-19).
- **Rule 8(1) and the Third Schedule.**
  - Scope: only e-commerce entities with ≥2 crore registered users, online gaming intermediaries with ≥50 lakh, and social media intermediaries with ≥2 crore.
  - Duty: erase after **3 years** "from the date on which the Data Principal last approached the Data Fiduciary… or the commencement of the… Rules… whichever is latest".
- **Rule 8(2):** inform the Data Principal "at least forty-eight hours before completion of the time period" that the data "shall be erased… unless she logs into her user account".
- **Rule 8(3):** "a Data Fiduciary shall retain such personal data, associated traffic data and other logs of the processing for a minimum period of one year". The commentator reads this as applying to **all** fiduciaries.
- Sources for Rule 8: [DPDP Untangled, Rule 8 (secondary, quotes the Rules)](https://dpdpuntangled.com/dpdp-rules/rule-8/); [dpdpr.in Third Schedule](https://dpdpr.in/rules/schedule-3/).
- A NALSAR analysis argues that Rule 8(3) "fundamentally undermines the storage limitation guarantee under section 8(7)" — [NALSAR Tech Law Forum (2025–26)](https://techlawforum.nalsar.ac.in/privacy-with-a-footnote-data-retention-under-the-dpdp-framework/).
- A firm outside the listed classes "cannot assume that it may retain personal data for three years simply because the Rules contain a three-year requirement" — [Taxmann](https://www.taxmann.com/post/blog/data-retention-erasure-dpdp-act).

**Canada (PIPEDA Principle 4.5)**
- PIPEDA's retention principle, as the OPC summarizes it:
  - "Keep personal information only as long as it is needed to serve those purposes".
  - "Institute maximum and minimum retention periods that take into account any legal requirements".
  - "Put guidelines and procedures in place for retaining and destroying personal information".
  - "Establish a retention schedule"; "Conduct regular reviews".
  - Dispose of information "in a way that prevents a privacy breach".
  - Source: [OPC, PIPEDA Principle 5 page (modified 2020-08-13)](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_use/) **[pre-2025, possibly stale]**.
- **Reform.** Bill C-36, the Protecting Privacy and Consumer Data Act, was tabled on **15 June 2026** to replace PIPEDA Part 1. It creates a new regulator with order-making powers and a private right of action. Its parliamentary status in Nov 2026 is unknown — [DLA Piper, 2026-06-17](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act); [Baker McKenzie, 2026-06](https://www.bakermckenzie.com/en/insight/publications/2026/06/canada-private-sector-privacy-reform-returns).

### Inferences
- **No regime found mandates pre-deletion notice for Dawnage.**
  - DPDP Rule 8(2)'s 48-hour notice applies only to the Third Schedule classes; Dawnage is nowhere near 2 crore users.
  - Sending 30-day and 7-day warnings is therefore a product and goodwill choice. It also mirrors the DPDP "unless she logs in" pattern.
- **The binding obligations are:**
  1. have a criterion for when photos are no longer needed (all four regimes);
  2. tell users that criterion at collection (GDPR Art. 13(2)(a); Apple 5.1.1(i); Google; see Q5);
  3. actually delete, including from backups within a stated window (ICO; APP 11.2's "reasonable steps"; PIPEDA "retention schedule").
- **A 12-month inactivity criterion is defensible across all four** **[lawyer]**:
  - It is long enough for seasonal coaching clients who pause and return.
  - It satisfies DPDP Rule 8(3)'s 1-year floor even under the broad reading, from May 2027.
  - It is short enough to show that photos are not hoarded.
- **Treat body photos as sensitive or health-adjacent data.** They can reveal health status, such as body composition or visible conditions. That argues for the shortest reasonable retention and for deletion-from-backup windows.
- **Australian coverage.** Dawnage collects onboarding health answers, weight and measurements for the purpose of improving physical health, which fits OAIC's gym and weight-loss example. The APPs therefore apply even below A$3M turnover **[lawyer]**.
- **Australian ADM disclosure.** If Dawnage's AI features make decisions that significantly affect clients, the privacy policy needs the ADM disclosure by 10 Dec 2026. That is outside this note's scope but due in 12 days **[lawyer]**.

### Gaps
- The official gazette text of DPDP Rule 8 and Act s.8(8) was not read; the PIB PDF was binary. The scope of Rule 8(3), whether it covers "such personal data" for all fiduciaries and whether it limits user-requested erasure, is contested **[lawyer]**.
- PIPEDA Schedule 1 clauses 4.5.2 and 4.5.3 were not fetched verbatim.
- No EDPB guidance was retrieved. No AU "tranche 2" status was found.
- CASL (Canada) and PECR (UK) treatment of retention-warning emails was not researched. They are likely transactional or service messages **[lawyer]**.

---

## Q5. Do Apple App Store and Google Play rules on deletion and retention disclosure apply?

### Takeaway
Yes, but only to **disclosure and account deletion**. Neither store requires inactivity deletion.
- **Apple 5.1.1(i):** the privacy policy must "explain its data retention/deletion policies".
- **Apple 5.1.1(v):** in-app account deletion, which Dawnage already has, with users told what is retained and how long deletion takes.
- **Google Play:** an in-app deletion path **plus a web link resource**, and users must be clearly informed about any retention.

The inactive-photo policy therefore has to appear in the privacy policy. Backups that keep deleted data for 30 days must be stated.

### Cited Findings

**Apple**
- Guideline 5.1.1(i): the privacy policy must "Explain its data retention/deletion policies and describe how a user can revoke consent and/or request deletion of the user's data."
- Guideline 5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app."
- Source: [Apple App Review Guidelines (live page, undated)](https://developer.apple.com/app-store/review/guidelines/).
- Apple's account-deletion support page:
  - "Deleting an account removes the account from the developer's records, along with any data associated with the account that the developer isn't legally required to maintain."
  - "Only offering to temporarily deactivate or disable an account is insufficient."
  - "If you're legally required to retain some user information, let people know what information will and won't be retained."
  - If deletion "takes a reasonable amount of time to complete… Inform the person how long it will take".
  - Support flows such as email are not acceptable as the only path for apps outside highly regulated industries.
  - Source: [Apple "Offering account deletion in your app" (undated, ©2026)](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

**Google Play**
- Developers must "provide users with an in-app path to delete their app accounts and associated data" and "a web link resource where users can request app account deletion and associated data deletion".
- Associated data must be deleted, though some may be retained "for legitimate reasons such as security, fraud prevention or regulatory compliance". If data is retained, "you must clearly inform users about your data retention practices", for example in the privacy policy.
- Deadlines: Data deletion questions by 7 Dec 2023, with extensions to 31 May 2024.
- Source: [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) (policy dates 2023–2024 **[pre-2025, possibly stale]**, but the page was live on 2026-11-28).
- Health Connect apps need a privacy policy covering "Your data retention and deletion policies" — media note Q6, citing the [Play Health Connect policy FAQ](https://support.google.com/googleplay/android-developer/answer/12991134?hl=en).

### Inferences
- The current `/privacy` page meets 5.1.1(i) only partly. It says "We keep your data while your account is active", with no backup window and no inactivity rule. Q6 gives exact text.
- Google's "web link resource" may be satisfied by the `/privacy` page's email route, but a dedicated `/delete-account` page naming the app is safer. Verify what is entered in the Play Console Data safety "Data deletion" section.
- Apple's rule about telling people what is retained applies to account deletion too. Kept payment records are already disclosed; add the 30-day backup window.

### Gaps
- The exact current Play Console Data safety questions about retention were not fetched.

---

## Q6. What should the inactive-photo retention policy be, and what wording should go in the privacy policy and emails?

### Takeaway
**Policy:**
- **12 months of inactivity** (no sign-in and nothing logged) **and** no active package **and** no hold → photos are deleted.
- Warnings go out by email at **T-30 and T-7 days**. Signing in at any point cancels the deletion.
- An **export** option is offered through sign-in, and email never carries photo links.
- The only "archive" is the existing **encrypted B2 backup, which keeps deleted photos for 30 days**. That gives a restore-on-return window with no new storage or code.
- **Only photos are retired.** Check-ins and measurements stay with the account; they are tiny and are what coaches need when a client returns.
- Run it as a weekly GitHub Actions job alongside the backups.

### Cited Findings
- The current policy text says:
  - "We keep your data while your account is active."
  - Account deletion "permanently deletes your profile, check-ins, measurements, workouts, weekly feedback and progress photos. Payment records are kept for accounting, without being linked to you."
  - Users can email to access, correct or delete.
  - Source: repo `client/src/pages/Privacy.tsx:40-46`, `UPDATED = "22 November 2026"` (`:4`).
- **Package data.** `users.package_type`, `package_duration` (3 or 6 months) and `package_start_date` ("Set on first check-in") — repo `shared/schema.ts:22-24` (at HEAD; the file is deleted in the working tree). Payment rows survive account deletion (`client_payments`, migration 08) — repo `sqlmigrationfiles/2026-11-22_08_keep_payments_on_account_deletion.sql:4-7`.
- **Existing purge logic** for one user's photos (list, then remove in batches of 100) — repo `supabase/functions/delete-account/index.ts:34-47`.
- **Backup retention.** B2 `photos/` lifecycle `daysFromHidingToDeleting: 30`; the nightly sync hides deleted files — repo `research_notes/free_plan_alternatives.md:184-196`.
- **DPDP pattern:** erased "unless she logs into her user account" — [DPDP Untangled, Rule 8](https://dpdpuntangled.com/dpdp-rules/rule-8/).
- **ICO** on backups — see Q4.
- **pg_cron** is supported on the hosted platform and can call Edge Functions via `pg_net` with Vault-stored keys. The docs warn that "Any role that can log in to your database can read the secret key while the request waits" — [Supabase "Scheduling Edge Functions" (undated)](https://supabase.com/docs/guides/functions/schedule-functions). On this project `pg_cron` is available but not installed (media note).

### Inferences

**Policy parameters (owner decision; defaults proposed)**

| Item | Proposal | Why |
|---|---|---|
| Inactive | No sign-in **and** no check-in, workout log, weekly check-in or photo for **12 months** | Seasonal returners. Meets DPDP 8(3)'s 1-year floor. Defensible under APP 11.2, Art 5(1)(e) and PIPEDA 4.5 **[lawyer]**. |
| Activity signal | `greatest(auth.users.last_sign_in_at, max(created_at) over daily_check_ins, workout_logs, weekly_check_ins, weekly_progress_photos)` | `last_sign_in_at` alone may miss long-lived sessions; verify whether token refresh updates it. |
| Scope | Progress photos only (Storage objects plus `weekly_progress_photos` rows) | Photos are the most sensitive and largest. Metrics are KB per user. |
| Exceptions | (a) an active package: `package_start_date + package_duration months > today`; (b) a legal hold (dispute, chargeback, complaint, authority request); (c) the user asked to keep photos (re-ask yearly) | Matches Google's "legitimate reasons" and APP 11.2's law/order exception. |
| Warnings | Email at T-30 and T-7, plus an in-app banner if they open the app | Exceeds every notice rule found (only DPDP has one: 48 h, for large platforms). |
| Cancel | Any sign-in or log resets the clock. The job clears the warnings when `last_activity > warned_at`. | Same as the DPDP "unless she logs in". |
| Export | "You → Download my photos" in the app (the `export-my-data` design in media note Q6). Email links to sign-in only, never to photos. | Signed photo URLs in email are forwardable. |
| Delete | Storage API `remove()` of `<uid>/**`, then `delete from weekly_progress_photos where user_id = …` | Deleting through the API removes the files; same pattern as delete-account. |
| Archive | None beyond backups. Deleted photos stay in the encrypted B2 mirror for **30 days** (≈31 with the nightly sync), then they are erased. | Avoids a second store. Meets the ICO "delete from backups" expectation within a stated window. |
| Restore on return | Within that 30 days, on request: admin runs `rclone copy` of `<uid>/` from the version before the purge, then re-inserts the rows from the DB backup. Best effort, and stated as such. | Rare. A manual runbook beats code. |
| After deletion | A confirmation email ("deleted; backups erased by {date+30}") | Apple-style confirmation. |
| Admin-removed clients | Same purge immediately (media note gap #3) | Avoids orphaned photos of departed users. |

**State and job (sketch)**
```sql
create table public.photo_retention (
  user_id uuid primary key references public.users(id) on delete cascade,
  warned_30_at timestamptz, warned_7_at timestamptz, purged_at timestamptz,
  hold boolean not null default false, hold_reason text
);
alter table public.photo_retention enable row level security;  -- no policies: service role only
```
The weekly GitHub Actions job (Node, supabase-js with the secret key, and `fetch` to the email API, so no new dependency) does the following:
1. Compute `last_activity` for clients who have photos, excluding active packages and holds.
2. If `last_activity` is newer than `warned_30_at`, reset the row.
3. If `last_activity` is older than 335 days and `warned_30_at` is null, send the T-30 email and set `warned_30_at`.
4. If `last_activity` is older than 358 days, `warned_30_at` is at least 21 days old and `warned_7_at` is null, send the T-7 email.
5. If `last_activity` is older than 365 days and `warned_7_at` is at least 7 days old, purge, set `purged_at`, and send the confirmation.
6. Log only counts; never log emails or paths.
7. Run with `DRY_RUN=1` for the first month.

- `pg_cron` + `pg_net` → Edge Function is the in-database alternative. It needs the extension installed, a secret key in Vault, and a Deno port of the logic. The GitHub job is simpler and sits next to the backups.
- Column names (`created_at` on each table, `users.role`) must be checked against the live schema before use. `weekly_progress_photos.created_at` is `timestamp without time zone` (media note).

**Privacy policy: exact changes to `client/src/pages/Privacy.tsx`**

`UPDATED` becomes the publish date, for example `"<publish date> 2026"`.

Section **"Who can see it"**: append, only once the batch re-encode and the EXIF test have shipped:
> "When you add a photo, we resize it and remove hidden camera details, such as location."

Section **"How long we keep it, and deleting it"**: replace the `body` array with:
```ts
body: [
  "We keep your data while your account is active, and only as long as we need it to coach you.",
  "Progress photos: if your account has had no activity for 12 months (you haven't signed in or logged anything) and you have no active coaching package, we delete your progress photos. We email you 30 days and 7 days before. Signing in before that date keeps them. Your check-ins, measurements and workouts are not affected.",
  "You can download your progress photos at any time in the app: You → Download my photos.",
  "You can delete your account at any time in the app: You → Delete account. This permanently deletes your profile, check-ins, measurements, workouts, weekly feedback and progress photos. Payment records are kept for accounting, without being linked to you.",
  "Backups: deleted data, including photos, stays in our encrypted backups for up to 30 days and is then erased. If you come back within that time and ask us, we can try to restore deleted photos.",
  "We keep data for longer only when the law requires it or to resolve a dispute (for example about a payment), and only for as long as that takes.",
  `You can also ask us to access, correct, download or delete your data by emailing ${CONTACT_EMAIL}.`,
],
```
- The "Download my photos" line ships only with the export feature. Until then, use "…or ask us for a copy by emailing us."
- Optional, if the owner also retires whole dormant accounts: "If your account has had no activity for 24 months, we will email you and then delete the account." **[owner decision]**
- Backups sit in B2's US, EU or Canadian regions as client-side ciphertext (backup note). The "Who can see it" storage-location sentence may need "Encrypted backups are stored with Backblaze in <region>." **[lawyer: cross-border transfer wording]**

**Email wording (plain text; no photos and no photo links)**
- **T-30 subject:** "Your Dawnage progress photos will be deleted on {date}"

  > Hi {first_name},
  >
  > You haven't used Dawnage for almost a year, so to protect your privacy we'll delete your progress photos on {date}. Your account, check-ins and measurements will stay.
  >
  > • To keep your photos, just sign in to the Dawnage app before {date}.
  > • To save a copy, sign in and go to You → Download my photos.
  > • If you're finished with Dawnage, you don't need to do anything. You can also delete your whole account in the app (You → Delete account).
  >
  > Questions? Reply to this email.
  > Dawnage

- **T-7 subject:** "Reminder: your Dawnage progress photos will be deleted on {date}". The body is the same, with "in 7 days" added to the first line.
- **After subject:** "Your Dawnage progress photos have been deleted"

  > As we told you on {t30_date}, we deleted your progress photos today because your account had been inactive for 12 months. Copies in our encrypted backups will be erased by {date+30}. If you'd like us to try to restore them before then, reply to this email.

- **In-app banner** (if they open the app inside the window): "Welcome back. Your progress photos are kept."

**Pre-launch rollout**
1. Publish the policy text first.
2. Email existing clients once about the new rule. Only Art 13(3)-style transparency is relevant; it is good practice, not a cited requirement **[lawyer]**.
3. Run the job in dry-run mode for 1 month.
4. The first real deletions can't happen before T+30 days of the first warning.

### Gaps
- How many bytes the policy would free today (photos owned by users inactive for 12 months or more) needs a read-only aggregate, which this note was not allowed to run. Only 35 of 91 photo owners uploaded in the last 90 days (media note), so it could be substantial.
- Whether `auth.users.last_sign_in_at` updates on token refresh was not verified; the activity union covers that.
- The restore runbook (rclone version-at through crypt) was not tested.

---

## Q7. What is the cheapest way to send the warning emails on the Free plan?

### Takeaway
Use **Resend's free tier** (3,000 emails/month, 100/day) or **Brevo's free tier** (300/day), called with `fetch` from the weekly GitHub Actions job.
- Volume is tiny: under 100 candidates × 3 emails per year.
- Either tier needs a **verified sending domain**. The repo shows only a Gmail contact address and no Dawnage domain, so getting a domain, or confirming the one Vercel serves, is the real prerequisite.
- Supabase Auth email is for auth flows and is not the place for these messages.

### Cited Findings
- **Resend.** The free tier is 3,000 emails per month, and "The Free plan is limited to 100 emails per day". On the free plan, sending pauses at the limit. Sources disagree on 1 versus 3 domains — [Resend pricing (live page)](https://resend.com/pricing.md); [Resend new free tier post](https://resend.com/blog/new-free-tier).
- **Brevo.** "The Free plan includes 300 email sends per day", resetting daily with no rollover. Third parties quote ≈9,000/month — [Brevo help: Free plan limits (live page)](https://help.brevo.com/hc/en-us/articles/208580669).
- **SendGrid.** One 2026 post says SendGrid ended its free tier — [DEV Community, 2026](https://dev.to/thiago_alvarez_a7561753aa/resend-vs-sendgrid-2026-sendgrid-killed-its-free-tier-now-what-2gh4) (single secondary source).
- **Sending address.** The contact is `dawnageofficial@gmail.com`, and no `dawnage` domain appears in the client, mobile config or `vercel.json` — repo `client/src/pages/Privacy.tsx:3`; repo grep.
- **Scheduler options.** pg_cron and pg_net are supported on hosted Supabase ([Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)). GitHub Actions costs $0.006/min against the $12 credit (Q2 sources).

### Inferences
- **Cost.**
  - The weekly job runs in about 1 min, about 4 min/month, so about $0.02 of the $12 Actions credit.
  - Email volume stays far below both free tiers.
  - Total: **$0** plus a domain (≈$10–15/year, not sourced).
- **Pick Resend** if the owner wants the simplest REST call: one `POST` with `from`, `to`, `subject`, `text`. **Pick Brevo** if more daily headroom matters. Either way, keep the messages purely transactional, with no marketing, so they stay outside marketing-consent rules **[lawyer: CASL/PECR]**.
- **No email automation in Supabase is needed.** Auth's SMTP and templates serve sign-up and reset only. Pointing Auth at the same Resend or Brevo SMTP is a separate improvement and is not required here.

### Gaps
- Resend's API request shape and domain-verification steps were not fetched; check the Resend API reference when implementing.
- Whether Brevo allows sending from a single verified mailbox without a domain was not verified.
- Whether a Dawnage domain already exists outside the repo (Vercel project settings) was not checked.

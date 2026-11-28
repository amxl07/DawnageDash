# Live photo storage (`progress_photos`): byte breakdown, cleanup scenarios and Free-plan quota mechanics, as of 2026-11-28

**Conventions**
- **Live SQL Qn** is a read-only aggregate query against project `hzifwkebzhzlxvigbcup`, run on 2026-11-28 between about 08:40 and 09:30 UTC.
  - Each query is listed under "Queries used" in its section.
  - No photo was downloaded or opened, and no DML or DDL was run.
  - Only counts and sums are reported.
- **Units**:
  - B is bytes. MiB = 1,048,576 B, GB = 10^9 B, GiB = 2^30 B.
  - Size bands use KiB/MiB (1,024-based).
  - Re-encode targets ("150–250 KB", "25–40 KB") are modelled as decimal KB (1,000 B).
- **Supabase docs**: the pages are undated living pages, retrieved 2026-11-28 through the Supabase docs MCP or WebFetch. A page's own date is given where one is shown.
- **Builds on prior notes**: `research_notes/Dawnage backend architecture 2026/media_timeseries_health.md` (Q2) and `research_notes/free_plan_alternatives.md` (§1 and §5). Their figures are re-verified here, not repeated. Differences are flagged.

---

## 1. Where are the bytes? (month, mimetype, size band, referenced vs orphan, owner existence)

### Takeaway
The bucket now holds **1,695 objects, 929,589,507 B (886.5 MiB = 0.930 GB = 0.866 GiB)**. That is 93.0% of a 10^9-byte quota, or 86.6% of a 2^30-byte quota.

Two-thirds of the bytes (**616,968,033 B, 66.4%**) sit in just **249 objects larger than 1 MiB** (14.7% of objects). These are almost all pre-April-2026 camera originals.

- **Orphans**: 285 objects, **145,902,240 B (139.1 MiB, 15.7%)**.
- **Referenced by `weekly_progress_photos`**: 1,410 objects, 783,687,267 B (747.4 MiB).
- **No other table** holds live photo references.
- **No dangling DB references.**
- **Owners**: only 1 object (256,730 B, an orphan) belongs to a uid that no longer exists in `auth.users`.

### Cited Findings

**Totals and integrity**
- 1,695 rows, 929,589,507 B, all in bucket `progress_photos`. It is the only bucket. — live SQL Q2
- Change since 2026-11-27: +4 objects and +1,627,087 B (from 1,691 objects and 927,962,420 B).
- `metadata->>'size'` = `metadata->>'contentLength'` for every row (sum mismatch 0). No row has a null size. — live SQL Q2, Q10
- Object names are unique per bucket (0 duplicates). 0 rows have `updated_at` more than 1 minute after `created_at`, so no object has ever been overwritten in place. — live SQL Q2
- Upload span: first object 2026-01-03T17:22Z, last 2026-11-28T08:39Z. — live SQL Q2
- `storage.s3_multipart_uploads` holds 0 rows, and parts hold 0 B. No in-progress upload bytes are hidden. — live SQL Q2

**References**

How the reference columns store values:
- `weekly_progress_photos` has 367 rows × 4 columns (`front_url`, `back_url`, `side_left_url`, `side_right_url`), giving **1,410 non-empty references**.
- 1,394 are full legacy public URLs (`…/storage/v1/object/public/progress_photos/…`).
- **16 are bare paths**, up from 12 on 2026-11-27; the 4 new uploads all use bare paths.
- 0 are `sign` or `authenticated` URLs, 0 contain `?`, and 0 contain `%`. No object name contains `%` or characters outside `[A-Za-z0-9_./()-]`.
- So normalising means stripping one prefix; URL-decoding is not needed. — live SQL Q3

Orphans:
- After normalising there are 1,410 distinct referenced paths and **0 dangling references**.
- Referenced objects: 1,410, totalling 783,687,267 B.
- **Orphans: 285, totalling 145,902,240 B**. — live SQL Q4

Other tables were scanned for photo references:
- Every text, varchar, json, jsonb and array column in `public` was searched with the regex `progress_photos|<uuid>/<YYYY-MM-DD>/`.
- Matches were found only in the 4 `weekly_progress_photos` columns, and in the backup table `dedupe_backup_2026_11_22`: 8 `row_data` rows holding 24 photo paths, all of which still exist.
- 0 matches in `users.avatar_url`, `users.profile_data`, `onboarding_questionnaire.answers`, the legacy `progress_photos.photo_url` (0 rows), workout and meal tables, and the rest. — live SQL Q3b

Orphans needing care before a sweep:
- **16 of the 285 orphans (2,763,592 B) are referenced only by `dedupe_backup_2026_11_22`**. They are photos from rows removed by the 2026-11-22 dedupe. — live SQL Q4
- **1 orphan (254,829 B) is less than 7 days old.** A sweep with a 7-day grace period skips it. — live SQL Q4

**Owner existence**
- 91 owner folders. 90 exist in both `auth.users` and `public.users`.
- **1 folder exists in neither**: 1 object, 256,730 B, and it is an orphan.
- `storage.objects.owner_id` equals the path's first segment for all 1,695 rows. — live SQL Q4

**By upload month** (UTC; November is partial, up to the 28th) — live SQL Q5

| Month | Objects | Bytes | Avg B | p50 B | Orphans (n) | Orphan bytes |
|---|---|---|---|---|---|---|
| 2026-01 | 23 | 34,177,575 | 1,485,982 | 1,026,494 | 9 | 13,752,303 |
| 2026-02 | 113 | 256,419,747 | 2,269,201 | 2,029,071 | 18 | 48,533,394 |
| 2026-03 | 248 | 363,675,452 | 1,466,433 | 1,134,173 | 21 | 34,902,340 |
| 2026-04 | 192 | 47,994,854 | 249,973 | 163,227 | 42 | 10,850,580 |
| 2026-05 | 273 | 49,058,078 | 179,700 | 123,006 | 55 | 9,344,425 |
| 2026-06 | 152 | 28,876,968 | 189,980 | 115,893 | 22 | 2,238,436 |
| 2026-07 | 105 | 21,952,212 | 209,069 | 160,776 | 29 | 4,358,516 |
| 2026-08 | 143 | 29,541,861 | 206,586 | 193,769 | 32 | 7,342,608 |
| 2026-09 | 133 | 26,264,448 | 197,477 | 177,357 | 17 | 2,655,367 |
| 2026-10 | 164 | 36,193,886 | 220,694 | 225,287 | 20 | 5,989,505 |
| 2026-11 | 149 | 35,434,426 | 237,815 | 276,497 | 20 | 5,934,766 |

- Pre-April-2026 (Jan–Mar):
  - All objects: **384 objects, 654,272,774 B (624.0 MiB)**.
  - Referenced: 336 objects, 557,084,737 B (531.3 MiB).
  - Orphans: 48 objects, 97,188,037 B (92.7 MiB).
- Since 2026-04-01: 1,311 objects, 275,316,733 B (262.6 MiB). — live SQL Q10
- The prior notes' monthly table labelled the Jan/Feb/Mar adds as "33/245/347 MB". The live bytes are 34.2/256.4/363.7 MB decimal, which is 32.6/244.5/346.8 MiB. The old labels were MiB.

**By mimetype** (`metadata->>'mimetype'`) — live SQL Q5

| Mimetype | Objects | Bytes | Orphans (n / B) |
|---|---|---|---|
| image/jpeg | 1,688 | 917,932,300 | 280 / 135,339,247 |
| image/png | 6 | 10,011,119 | 4 / 8,916,905 |
| image/heic | 1 | 1,646,088 | 1 / 1,646,088 |

**By file extension** (a proxy for the client era) — live SQL Q5

| Extension | Objects | Bytes | Avg B | p50 B | Orphans (n / B) |
|---|---|---|---|---|---|
| .jpg (current `photoStoragePath`) | 1,483 | 442,436,400 | 298,339 | 188,269 | 262 / 92,205,810 |
| .jpeg (legacy raw uploads) | 205 | 475,495,900 | 2,319,492 | 2,225,444 | 18 / 43,133,437 |
| .png | 6 | 10,011,119 | 1,668,520 | 297,171 | 4 / 8,916,905 |
| .heic | 1 | 1,646,088 | — | — | 1 / 1,646,088 |

**By size band** — live SQL Q5

| Band | Objects | Bytes | Share of bytes | Avg B | Orphans (n / B) |
|---|---|---|---|---|---|
| <150 KiB | 605 | 63,936,368 | 6.9% | 105,680 | 119 / 11,973,231 |
| 150–300 KiB | 512 | 117,560,567 | 12.6% | 229,610 | 83 / 19,015,907 |
| 300 KiB–1 MiB | 329 | 131,124,539 | 14.1% | 398,555 | 48 / 18,383,876 |
| 1–3 MiB | 176 | 341,348,953 | 36.7% | 1,939,483 | 22 / 42,993,178 |
| >3 MiB | 73 | 275,619,080 | 29.6% | 3,775,604 | 13 / 53,536,048 |

### Inferences
- **The legacy era dominates.** Jan–Mar 2026 objects are 22.7% of objects but **70.4% of bytes**: 654.3 MB of 929.6 MB.
- **Re-encoding beats any deletion rule.** The bytes are concentrated in few objects: 249 objects over 1 MiB hold 66.4%. Re-encoding them gives the biggest saving with no data loss.
- **The orphan leak is steady.** 17–55 orphans appear every month since April. From June to November, orphans are **16.0% of uploaded bytes** (28,519,198 / 178,263,801), so fixing replace-without-delete cuts growth by about 16% (see §4).
- **Average upload size is creeping up.** It went from about 180 KB in May to about 238 KB in November, with p50 rising from 123 KB to 276 KB. Likely causes are higher-detail images at 1200×1600 q0.75, or a web-client path; the cause was not investigated (no object bytes read).
- **The dedupe backup table holds live photo paths.** `dedupe_backup_2026_11_22` should either be dropped together with its 16 orphan files, or those 16 should be excluded from the sweep until the backup table is retired.

### Gaps
- Pixel dimensions of objects are unknown. `storage.objects.metadata` has no width or height, and reading bytes is forbidden. The re-encode savings in §3 therefore assume every object over 300 KiB can reach the target size.
- Whether the rise in average size since August comes from web or mobile uploads cannot be told from metadata alone. `user_metadata` was not inspected.

### Queries used
Shared CTEs, reused in Q4–Q11:
```sql
-- ref: normalised referenced paths
with ref as (select distinct regexp_replace(u,'^https?://[^/]+/storage/v1/object/(public|sign|authenticated)/progress_photos/','') p
  from weekly_progress_photos, unnest(array[front_url,back_url,side_left_url,side_right_url]) u where u is not null and u<>''),
-- o: one row per object with size, owner folder, and referenced flag
o as (select split_part(o.name,'/',1) uid, (o.metadata->>'size')::bigint sz, o.metadata->>'mimetype' mt, o.created_at, r.p is not null referenced
  from storage.objects o left join ref r on r.p=o.name where o.bucket_id='progress_photos')
```
- **Q1**: `information_schema.columns` for `storage.objects`, `storage.buckets`, the multipart tables, `weekly_progress_photos` and `users`.
- **Q2**: `select count(*), sum(size), count(*) filter (where archived_at is not null), … is_delete_marker, is_versioned, count(distinct version), dup names, min/max(created_at), count(updated_at > created_at+1 min) from storage.objects`. Also `storage.buckets` (`versioning_status`, `lifecycle_configuration`, limits), multipart sums, and `storage.migrations`.
- **Q3**: reference shape counts on the unnested 4 columns: `~ '^https?://'`, `~ '/object/public/progress_photos/'`, `~ '\?'`, `~ '%'`, bare.
- **Q3b**: for every text-like column in `public`, `count(*) where col::text ~ '(progress_photos|<uuid>/<date>/)'`, run via `query_to_xml(format(…))`.
- **Q4**: on `ref` ⋈ objects: counts and sums for referenced, orphan, orphan-in-backup (paths regex-extracted from `dedupe_backup_2026_11_22.row_data`), owner not in `auth.users` / `public.users`, `owner_id ≠ folder`, and orphans under 7 days old.
- **Q5**: `group by grouping sets ((month),(mimetype),(size band),(extension))`, with count, sum, avg, `percentile_disc(0.5)`, and orphan count and bytes.
- **Q10**: size versus `contentLength`; rolling 90/180-day adds; full-month windows; pre-April and since-April totals; DB relation sizes.

---

## 2. Activity segments: who owns the bytes? (inactivity thresholds, expired packages, no coach)

### Takeaway
**The 12- and 18-month thresholds remove nothing today.** Every one of the 153 users with any activity record was active on or after 2025-12-25, so nobody qualifies. The only bytes caught are the 1 deleted-owner orphan (256,730 B). The platform's data starts in December 2025.

Shorter thresholds do catch bytes, but the result depends heavily on how "activity" is defined:

| Threshold | Users | Referenced bytes | Activity definition |
|---|---|---|---|
| Inactive >6 months | 20 | 102.1 MB | A1 (sign-in plus data rows) |
| Inactive >6 months | 14 | 58.5 MB | A3 (A1 plus uploads and session refreshes) |
| Inactive >3 months | 43 | 444.2 MB | A1 |
| Inactive >3 months | 35 | 374.6 MB | A3 |

**Package expiry is not a reliable churn signal in this data.**
- 7 of the 12 clients whose package "ended >6 months ago" were active in the last 6 months.
- No package can have ended more than 12 months ago; the earliest end is 2026-03-01.

### Cited Findings

**Users** — live SQL Q6
- 153 users: 3 admins, 143 clients, 7 coaches. All 153 exist in `auth.users`.
- 2 clients have never signed in and have no activity rows; neither owns photos.
- 90 clients own photos, plus the 1 deleted-owner folder.
- Earliest "latest activity" across users is 2025-12-25.
- `package_start_date` ranges from 2025-12-01 to 2026-11-25. Package durations: 125 clients have 3 months, 4 have 6 months, and 14 have none. — live SQL Q8

**Activity definitions**
- **A1 (as specified)** is the latest of:
  - `auth.users.last_sign_in_at`
  - `max(daily_check_ins.date)`
  - `max(workout_logs.date)`
  - `max(weekly_check_ins.week_start_date)`
  - `max(body_measurements.date)`

  Dates later than today are ignored. — live SQL Q6/Q7
- **A2** = A1 plus the user's latest photo upload. 19 users uploaded a photo after their A1 date. — live SQL Q6
- **A3** = A2 plus `max(auth.sessions.refreshed_at / updated_at)` and `max(auth.refresh_tokens.updated_at)`. This catches app opens on a persisted session, which never update `last_sign_in_at`. — live SQL Q11

**All users inactive** (photo owners or not) — live SQL Q6, Q11

| Inactive for more than | A1 users | A3 users |
|---|---|---|
| 3 months | 78 | 64 |
| 6 months | 37 | 28 |
| 9 months | — | 5 |
| 12 months | 2 | 2 |
| 18 months | 2 | 2 |

The 2 users inactive for more than 12 months are the never-active ones.

**Photo bytes of inactive owners** — live SQL Q7 (A1, A2), Q11 (A3)

| Inactive for more than | Def. | Owners | Objects | Bytes | Referenced (n / B) | Orphan B | Legacy referenced B |
|---|---|---|---|---|---|---|---|
| 3 months | A1 | 43 | 742 | 553,154,213 | 586 / 444,186,003 | 108,968,210 | 372,474,633 |
| 3 months | A2 | 42 | 721 | 549,597,926 | 570 / 441,490,008 | 108,107,918 | 372,474,633 |
| 3 months | A3 | 35 | 565 | 478,666,872 | 436 / 374,638,385 | 104,028,487 | n/m |
| 6 months | A1 = A2 | 20 | 189 | 155,975,384 | 142 / 102,111,927 | 53,863,457 | 89,010,910 |
| 6 months | A3 | 14 | 114 | 96,368,347 | 86 / 58,539,344 | 37,829,003 | n/m |
| 9 months | A1 = A2 = A3 | 3 | 11 | 23,936,083 | 4 / 11,496,525 | 12,439,558 | 11,496,525 |
| 12 months | all | 1 (deleted owner) | 1 | 256,730 | 0 / 0 | 256,730 | 0 |
| 18 months | all | 1 (deleted owner) | 1 | 256,730 | 0 / 0 | 256,730 | 0 |

n/m = not measured. A3 orphan bytes are bytes minus referenced bytes.

**Expired packages** (clients; end = `package_start_date + package_duration` months) — live SQL Q7, Q8

| Segment | Clients | Photo owners | Objects | Bytes | Referenced (n / B) | Active ≤3 months (A1) | Active ≤6 months (A1) |
|---|---|---|---|---|---|---|---|
| Ended >6 months ago (before 2026-05-28) | 12 | 11 | 284 | 498,111,537 | 244 / 414,454,597 | 2 | 7 |
| Ended >12 months ago | 0 | 0 | 0 | 0 | — | — | — |
| Ended at all (before today) | 67 | 59 | 1,344 | 817,118,854 | 1,116 / 689,139,020 | 26 | 50 |
| No computable end | 62 | 22 | 214 | 90,882,785 | 168 / 75,127,785 | — | — |

The last row covers clients where `package_start_date` or `package_duration` is null.

Evidence that the package fields are stale:
- 30 clients have a `coach_client_history` event dated after their computed package end. 8 of them are in the ">6 months" segment.
- 0 clients have a `payment_transactions.payment_date` after their package end. — live SQL Q8

**Clients with no coach** (`users.coach_id is null`) — live SQL Q7, Q8
- 56 clients, 32 of them photo owners.
- 719 objects, 552,153,890 B. Referenced: 586 objects, 468,983,796 B. Orphans: 83,170,094 B.
- Of the 32 photo owners, 5 were active in the last 3 months and 20 in the last 6 months (A1).
- No coach **and** inactive >3 months (A1): 27 owners, 551 objects, 377,639,833 B. Referenced: 418 objects, 294,469,739 B.

### Inferences
- **12- and 18-month rules only start to bite from about December 2026 to mid-2027.** The first users can cross 12 months of inactivity around 2026-12-25, and 18 months around mid-2027. Writing the rule now costs nothing and frees nothing.
- **Use A3, not A1.** `last_sign_in_at` is not refreshed when the app reuses a stored session, so A1 overstates inactivity. A3 drops 8 owners from the ">3 months" set and 6 from the ">6 months" set. Any retention job should use A3, or better, an explicit `last_seen_at`.
- **Inactive owners hold mostly legacy originals.** 84% of the referenced bytes of A1 >3-month inactive owners are pre-April originals: 372.5 of 444.2 MB. They were the early cohort. Re-encoding shrinks those bytes anyway, which is why deleting them adds little on top of re-encoding (§4).
- **Package-expiry and no-coach segments catch active clients.** Expired >6 months: 7 of 12 were active within 6 months. No coach: 20 of 32 were active within 6 months. These segments cannot drive deletion without a human review or a better churn field, such as an explicit `ended_at` or `status`.

### Gaps
- How n8n service-role writes into `daily_check_ins` were made (608 inserts noted in the prior notes) is unknown. If they are imports rather than client submissions, A1 overstates activity for those users.
- No `last_seen_at` or app-open telemetry exists. A3's session-refresh signal is the best available proxy.

### Queries used
- **Q6**: per `public.users` row, compute A1 (correlated `max()` sub-selects with `date <= current_date`) and the latest upload. Then `group by rollup(role)` with counts of active users at 3, 6 and 12 months, never signed in, no coach, no package, and upload after A1.
- **Q7**: `ox` = objects ⋈ per-user A1, A2, package end and coach. A `union all` of segment filters (for example `a1 is null or a1 < current_date - interval '6 months'`, `role='client' and pkg_end < current_date - interval '6 months'`, `coach_id is null`). Then, per segment: distinct owners, objects, bytes, referenced bytes, orphan bytes, pre-April referenced bytes, and the re-encode sums from §3.
- **Q8**: per client, package start, duration and end, A1, `max(payment_transactions.payment_date)` through `client_payments`, `max(coach_client_history.created_at)` and a has-photos flag. Then aggregated for all clients and for the expired >6 months, expired-any, no-coach and no-coach-photo-owner segments.
- **Q11**: like Q7 with A3 = `greatest(A1, latest upload, max(auth.sessions.refreshed_at/updated_at), max(auth.refresh_tokens.updated_at))`, for thresholds 3, 6, 9, 12 and 18 months.

---

## 3. Re-encode savings (oversized originals become a ~1600 px full image of 150–250 KB plus a ~400 px thumbnail of 25–40 KB)

### Takeaway
Re-encoding the **495 referenced objects over 300 KiB** (633,179,470 B) to the new format saves **489.6–546.6 MB**. After re-encoding, those objects total 86.6–143.6 MB including thumbnails.

Re-encoding only the **214 referenced objects over 1 MiB** (520,438,807 B) captures **458.4–483.0 MB**, about 88–94% of that saving, with 43% of the jobs.

Re-encoding the orphans is pointless; they should be deleted.

### Cited Findings

**Cost model**
- Each re-encoded object becomes full plus thumbnail = **175,000 B (optimistic: 150 KB + 25 KB)** to **290,000 B (pessimistic: 250 KB + 40 KB)**.
- Saving per object = `greatest(size − new, 0)`, summed over referenced objects only. — live SQL Q7

**Results** — live SQL Q7 (`ALL` row), Q10

| Re-encode set (referenced only) | Objects | Current bytes | Saving (pessimistic, 290 KB) | Saving (optimistic, 175 KB) | Bytes after |
|---|---|---|---|---|---|
| >300 KiB | 495 | 633,179,470 | 489,629,470 | 546,554,470 | 143,550,000 / 86,625,000 |
| >1 MiB | 214 | 520,438,807 | 458,378,807 | 482,988,807 | 62,060,000 / 37,450,000 |
| 300 KiB–1 MiB only (difference) | 281 | 112,740,663 | 31,250,663 | 63,565,663 | — |

- Current bytes are derived as saving + n × new size; the two bounds agree.
- **Thumbnail backfill** for referenced objects *not* re-encoded, which the target design needs for grids:
  - with the >300 KiB rule: 915 objects ≤300 KiB × 25–40 KB = **+22,875,000 to +36,600,000 B**;
  - with the >1 MiB rule: 1,196 objects × 25–40 KB = +29,900,000 to +47,840,000 B. — live SQL Q10

  These are not included in the scenario table in §4. Add them if thumbnails are back-filled.
- The legacy referenced originals (pre-April, 336 objects, 557,084,737 B) are a subset of the re-encode set. All re-encode savings come from referenced objects; orphans are excluded. — live SQL Q10

### Inferences
- **The >1 MiB rule is the efficient cut.**
  - The 281 objects between 300 KiB and 1 MiB average about 401 KB. They are mostly already 1200×1600 compressed JPEGs, so re-encoding them to WebP at the same size would save closer to 25–35% than the 175–290 KB target assumes.
  - The optimistic 63.6 MB saving for that band is likely overstated. The 31.3 MB pessimistic figure is safer.
- **Re-encoding also removes EXIF.** Re-encoding the over-1 MiB legacy originals also removes any GPS EXIF, which was unverified in the prior notes. That is a privacy gain on top of the bytes.
- **Do it early in a billing cycle.** The quota is a cycle average (§5), so re-encoding should run early in a billing cycle, as with deletions.
- **Write the new object before deleting the old one.** Re-encoding means writing a new object, updating the DB reference, then deleting the old object through the Storage API. During that window the bucket briefly holds both. At the cycle-average level the peak is negligible: an extra 86–144 MB for hours, not days.

### Gaps
- No measurement of actual WebP or JPEG output size at 1600 px for these photos (bytes cannot be read). The 150–250 KB target is the assignment's assumption, consistent with the observed post-April average of 180–238 KB for 1200×1600 JPEG q0.75 (§1 month table).
- Whether any legacy original is smaller than 1600 px on its long edge, which would make re-encoding produce little or no saving, is unknown without reading dimensions.

### Queries used
- **Q7** (`ALL` segment): `sum(case when referenced and sz>307200 then greatest(sz-290000,0) end)` and the same with 175000, plus the >1048576 variants and counts.
- **Q10**: `count(*) filter (where referenced and sz<=307200)` (915), `<=1048576` (1,196), and the pre-April referenced totals.

---

## 4. Combined scenarios: resulting bucket size and runway

### Takeaway
- **Orphans only (a)**: 783.7 MB, which buys about **6.5 months** against a 10^9 quota at today's growth.
- **Orphans plus re-encoding the >300 KiB originals (b)**: **0.24–0.29 GB**, about **21–23 months**.
- **12- and 18-month inactivity archiving (c and d at 12m or 18m)**: adds **nothing** today; the result is identical to (a) and (b).
- **6-month inactivity archiving**: on top of (b) it adds only about **1 month** of runway, 0.21–0.26 GB with A1, while deleting photos of 14–20 users, some of whom were active within 6 months on other signals.
- **Conclusion**: re-encoding is the lever. Inactivity deletion is a policy and privacy decision, not a storage one, at this scale.

### Cited Findings

**Growth, re-measured** (gross adds; the app never deletes except on account deletion) — live SQL Q10

| Window | Objects | Bytes | Per month (30.44 days) |
|---|---|---|---|
| **Rolling 90 days** | 450 | 98,839,973 | **33,427,130 B = 31.88 MiB** |
| Rolling 180 days | 842 | 176,758,727 | 29,889,410 B = 28.50 MiB |
| Aug–Oct (3 full months) | 440 | 92,000,195 | 30,666,732 B = 29.25 MiB |
| May–Oct (6 full months) | 970 | 191,887,453 | 31,981,242 B = 30.50 MiB |

- The base used below is **31.88 MiB per month**, matching the prior 31.7 MiB within 0.6%.
- With the orphan leak fixed, growth is about **26.8 MiB per month** (×0.840). — live SQL Q5

**Scenario table**
- "Inactive" means archive then delete the *referenced* photos of inactive owners; their orphans are already gone in (a).
- In (d), re-encoding applies only to the remaining (active) owners' objects over 300 KiB.
- Ranges are the optimistic (175 KB) and pessimistic (290 KB) re-encode targets.
- Runway = (quota − bucket) ÷ 33,427,130 B per month.
- Computed from live SQL Q4, Q7, Q10 and Q11 with `scratchpad/calc.py`, which asserts that band sums = total and that referenced + orphan = total.

| Scenario | Removed (B) | Bucket after (B) | MiB | % of 10^9 / 2^30 | Runway to 10^9 (months) | Runway to 2^30 (months) | Runway at 2× growth (10^9) |
|---|---|---|---|---|---|---|---|
| Today | 0 | 929,589,507 | 886.5 | 93.0% / 86.6% | **2.1** | 4.3 | 1.1 |
| **(a)** orphans | 145,902,240 | 783,687,267 | 747.4 | 78.4% / 73.0% | **6.5** | 8.7 | 3.2 |
| **(b)** a + re-encode >300 KiB | 635.5–692.5 M | 237,132,797 – 294,057,797 | 226.1–280.4 | 23.7–29.4% / 22.1–27.4% | **21.1–22.8** | 23.3–25.0 | 10.6–11.4 |
| (b′) a + re-encode >1 MiB only | 604.3–628.9 M | 300,698,460 – 325,308,460 | 286.8–310.2 | 30.1–32.5% / 28.0–30.3% | 20.2–20.9 | 22.4–23.1 | 10.1–10.5 |
| **(c, 12 months)** a + archive inactive >12 months (A1 or A3) | 145,902,240 | 783,687,267 | 747.4 | 78.4% / 73.0% | 6.5 | 8.7 | 3.2 |
| **(d, 12 months)** a + b + c | = (b) | 237,132,797 – 294,057,797 | 226.1–280.4 | 23.7–29.4% | 21.1–22.8 | 23.3–25.0 | 10.6–11.4 |
| **(e) c, 18 months** | = (a) | 783,687,267 | 747.4 | 78.4% | 6.5 | 8.7 | 3.2 |
| **(e) d, 18 months** | = (b) | 237,132,797 – 294,057,797 | 226.1–280.4 | 23.7–29.4% | 21.1–22.8 | 23.3–25.0 | 10.6–11.4 |
| **(e) c, 6 months, A1** | 248,014,167 | 681,575,340 | 650.0 | 68.2% / 63.5% | 9.5 | 11.7 | 4.8 |
| (e) c, 6 months, A3 | 204,441,584 | 725,147,923 | 691.6 | 72.5% / 67.5% | 8.2 | 10.4 | 4.1 |
| **(e) d, 6 months, A1** | 667.8–716.8 M | 212,750,199 – 261,740,199 | 202.9–249.6 | 21.3–26.2% / 19.8–24.4% | 22.1–23.6 | 24.3–25.8 | 11.0–11.8 |
| (e) d, 6 months, A3 | 654.4–706.8 M | 222,772,731 – 275,212,731 | 212.5–262.5 | 22.3–27.5% / 20.7–25.6% | 21.7–23.3 | 23.9–25.5 | 10.8–11.6 |
| (extra) c, 9 months | 157,398,765 | 772,190,742 | 736.4 | 77.2% | 6.8 | 9.0 | 3.4 |
| (extra) d, 9 months | 636.7–693.2 M | 236,432,797 – 292,897,797 | 225.5–279.3 | 23.6–29.3% | 21.2–22.8 | 23.4–25.0 | 10.6–11.4 |
| (extra) c, 3 months, A1 | 590,088,243 | 339,501,264 | 323.8 | 34.0% | 19.8 | 22.0 | 9.9 |
| (extra) c, 3 months, A3 | 520,540,625 | 409,048,882 | 390.1 | 40.9% | 17.7 | 19.9 | 8.8 |
| (extra) d, 3 months, A1 | 756.8–787.0 M | 142,591,566 – 172,836,566 | 136.0–164.8 | 14.3–17.3% | 24.7–25.7 | 27.0–27.9 | 12.4–12.8 |
| (extra) d, 3 months, A3 | 729.5–763.4 M | 166,160,114 – 200,085,114 | 158.5–190.8 | 16.6–20.0% | 23.9–24.9 | 26.1–27.2 | 12.0–12.5 |
| (extra) c, package expired >6 months | 560,356,837 | 369,232,670 | 352.1 | 36.9% | 18.9 | 21.1 | 9.4 |
| (extra) d, package expired >6 months | 703.6–736.8 M | 192,776,952 – 226,011,952 | 183.8–215.5 | 19.3–22.6% | 23.2–24.1 | 25.4–26.4 | 11.6–12.1 |
| (extra) c, no coach | 614,886,036 | 314,703,471 | 300.1 | 31.5% | 20.5 | 22.7 | 10.3 |
| (extra) d, no coach | 758.3–782.8 M | 146,767,159 – 171,262,159 | 140.0–163.3 | 14.7–17.1% | 24.8–25.5 | 27.0–27.7 | 12.4–12.8 |

**Other levers, measured; not additive to (b) because they overlap it** — live SQL Q10
- **Keep each user's first set plus their latest 3 sets** (delete the middle sets): 117 of 359 referenced photo sets, **464 objects, 327,164,729 B**.
- **Age-based retention** (delete referenced photos older than N): >6 months **627,779,071 B**; >9 months 212,990,550 B. Both are mostly the same legacy originals that re-encoding already shrinks.

### Inferences
- **(b) is the decision.**
  - (d) at 6 months improves on (b) by only 24.4–32.3 MB with A1: the 6-month inactive owners' referenced bytes after re-encoding (102.1 MB − 69.8/77.7 MB). That is about 0.7–1.0 month of growth.
  - At 3 months (A1) the gain is 94.5–121.2 MB, about 2.8–3.6 months, but it deletes photos of 43 users, 35 on A3.
  - Archiving inactive users is therefore a retention and privacy policy, not a storage fix.
- **Realistic runway after (b) is about 21–25 months at today's rate.**
  - It is about 25–27 months with the orphan leak fixed (26.8 MiB per month).
  - It is about **11 months if uploads double** after launch.
  - Today's rate comes from about 35 active uploaders. At launch, the governing number is uploads per active client, not the stock.
- **Thumbnails cost runway.** Adding thumbnails for new uploads (+25–40 KB per 200–240 KB photo) raises growth about 10–20% unless the full rendition shrinks to match. Back-filling thumbnails costs another 22.9–36.6 MB, about 0.7–1.1 months.
- **Live-size runway overstates the quota runway by under a month.** The quota is cycle-averaged (§5): an organisation crosses 744 GB-hours a little after the live size first crosses 1 GB. In the other direction, a cleanup's benefit lands fully only in the next full cycle.

### Gaps
- The organisation's billing-cycle anchor date is unknown, so calendar dates cannot be given for "early in a cycle" or for the first breach.
- Post-launch upload rate is unknown. The 2× column is illustrative only.

### Queries used
- Inputs: Q4 (orphans), Q7/Q11 (segment referenced bytes and re-encode sums), Q10 (growth windows, set retention, age retention).
- **Q10** set lever: `dense_rank()` over distinct `(uid, date-folder)` of referenced objects ascending and descending. Deletable = `asc_rk > 1 and desc_rk > 3`.
- Arithmetic: `/private/tmp/claude-501/-Users-manojthomas-Documents-DAWNAGE-DawnageAIDash-mobile/026aa9d0-54a1-46ae-a9e5-48edb75c7485/scratchpad/calc.py`. It contains only aggregate constants and has asserts for band total and referenced plus orphan.

---

## 5. Supabase storage mechanics on Free: units, averaging, what a delete frees, versioning, DB-size overlap, exceeding the quota

### Takeaway
- **The units are not defined.** The Free storage quota is "1 GB" = **744 GB-Hrs per billing cycle**, and quota usage is "effectively the **average across the billing period**, not the live size". The docs never say whether 1 GB is 10^9 or 2^30 bytes; their own SQL treats GB as 1,073,741,824.
- **A delete frees bucket bytes at once, but quota only gradually.** A Storage-API delete is permanent and drops the live bucket size immediately. The cycle average falls only gradually, so late-cycle cleanups may not lift a restriction before the next cycle.
- **Nothing is hidden in versioning.** Object versioning exists as a public-alpha feature, and noncurrent versions do count toward storage size. On this project versioning is `DISABLED`, and there are **0 archived rows, 0 delete markers and 0 versioned rows**.
- **The DB-size overlap is negligible.** `storage.objects` metadata does count toward the 500 MB database size, but it is only 3.4 MB.
- **Going over is org-wide.** Exceeding the quota brings an undocumented-length grace period once, then possible org-wide restrictions, including HTTP 402 on all API requests. These are lifted only at the next cycle or by upgrading.

### Cited Findings

**Quota units and measurement**
- The Free plan row is "Quota in GB: 1 … Quota in GB-Hrs: 744". "Storage size is charged by Gigabyte-Hours (GB-Hrs). 1 GB-Hr represents the use of 1 GB of storage for 1 hour." "You are charged for the total size of all assets in your buckets." — [Supabase: Manage Storage size usage (undated, retrieved 2026-11-28)](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)
- "your Storage size for quota and billing is effectively the average across the billing period, not the live size" and "reducing storage late in the cycle lowers the average only gradually, so it may not immediately clear a restriction until the next billing cycle begins." — [Storage size usage, Markdown edition (retrieved 2026-11-28)](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size.md)
- **GB vs GiB is not defined anywhere** in the storage-size page or the billing FAQ. The page's sample SQL labels `size / 1073741824.0` as "GB" and `/ 1048576.0` as "total_size_megabyte", i.e. binary units, but this is a display convention, not a billing definition. — [storage-size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size); [Billing FAQ (undated; mentions a tax roll-out "May 1, 2026 … June 30, 2026", retrieved 2026-11-28)](https://supabase.com/docs/guides/platform/billing-faq)
- The quota is organisation-level: "The organization's Storage size usage is within the quota". The usage page "shows the usage of all projects by default". — [storage-size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)

**What deletion actually frees**
- "Deleting an object removes it permanently." "Deleting objects should always be done via the Storage API and NOT via a SQL query." "Deleting objects via a SQL query will not remove the object from the bucket and will result in the object being orphaned." — [Supabase: Delete objects (undated, retrieved 2026-11-28)](https://supabase.com/docs/guides/storage/management/delete-objects)
- SQL deletes on `storage.objects` "does not remove the corresponding physical files", leaving "orphaned objects that continue to consume storage space". — [Supabase KB: Storage unexpectedly high usage / exceed_storage_size_quota (undated, retrieved 2026-11-28)](https://supabase.com/kb/troubleshooting/storage-unexpectedly-high-usage-or-exceed_storage_size_quota-errors-ae21a5)
- Since March 2026, "A new statement-level trigger now rejects `DELETE` on Storage schema tables… The Storage API sets this flag automatically… Direct SQL deletes are blocked by default." The stated reason: "Running `DELETE FROM storage.objects` directly in SQL was the most common cause of orphan objects". — [Supabase blog, "Storage: major performance, security, and reliability updates", 2026-03-05](https://supabase.com/blog/supabase-storage-performance-security-reliability-updates)
  - This project has that trigger: `protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete()`, plus `protect_buckets_delete`. — live SQL Q12
- For non-versioned buckets: "S3 versioning is not supported… Deleted objects are permanently removed and cannot be restored." — [Supabase: S3 Compatibility (undated, retrieved 2026-11-28)](https://supabase.com/docs/guides/storage/s3/compatibility)
  - This contradicts the newer object-versioning page below. It is probably stale with respect to the alpha feature.
- No Supabase page states how quickly the *usage meter* reflects a delete; only the averaging language above exists. — the same pages

**Versioning: do archived rows or delete markers count, and does this project have any?**
- "Object versioning is currently in public alpha." `storage.objects` versioning fields:
  - `version`
  - `archived_at`: "Null for the current version. A timestamp for a noncurrent version."
  - `is_delete_marker`
  - `is_versioned`
- Bucket status values are `DISABLED` ("Versioning has never been turned on. This is the default."), `ENABLED` and `SUSPENDED`. Plan availability is not stated. — [Supabase: Object versioning (undated, retrieved 2026-11-28)](https://supabase.com/docs/guides/storage/buckets/object-versioning)
- "noncurrent versions count toward your storage size". In a versioned bucket, "a delete adds a delete marker and keeps earlier versions", and `aws s3 sync --delete` "keeps every version, so storage usage stays the same." — [storage-size.md](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size.md); [Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects)
- Lifecycle policies are also "public alpha". They delete **noncurrent versions only** (`noncurrentDays`, `newerNoncurrentVersions`), and the filter must be `{}`; "Prefix, tag, and size filters aren't supported". There is no age-based expiry of current objects, so they cannot implement an "archive photos after N months" rule. — [Supabase: Lifecycle policies (undated, retrieved 2026-11-28)](https://supabase.com/docs/guides/storage/buckets/lifecycle-policies)
- **This project**:
  - `progress_photos.versioning_status = 'DISABLED'` and `lifecycle_configuration` is null.
  - Over all 1,695 rows: `archived_at is not null` = 0 rows / 0 B; `is_delete_marker` = 0; `is_versioned` = 0 true and 0 null; `version` is distinct per row (1,695).
  - The versioning machinery is installed but unused: triggers `enforce_versioning_status_transition` and `wake_lifecycle_on_versioning_enable`. The storage schema is at migration 82, `s3-multipart-uploads-parts-index`, applied 2026-11-25. — live SQL Q2, Q12

**Does the 500 MB database quota include `storage.objects` metadata?**
- "Free Plan projects enter read-only mode when your **database size** exceeds 500 MB… this is the *database size* limit (the size of your actual Postgres data), not the *disk size*." Deleted rows are not reclaimed until vacuum. — [Supabase: Understanding Database and Disk Size (undated, retrieved 2026-11-28)](https://supabase.com/docs/guides/platform/database-size)
- Live sizes:

  | Measure | Bytes |
  |---|---|
  | `pg_database_size` | 29,805,715 (28.4 MiB) |
  | `storage.objects` with indexes | 3,407,872 |
  | `storage.objects` heap only | 1,261,568 |
  | Whole `storage` schema | 3,694,592 |
  | `auth` schema | 7,176,192 |
  | `public` schema | 6,217,728 |

  — live SQL Q10

**Exceeding the quota**
- "When you are exceeding your quotas while being on a Free Plan… you will get a notification to your billing email address and put under a grace period." — [storage-size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)
- "When your organization exceeds plan limits, you receive a grace period before fair use policy applies." The grace period's length is not stated. Restrictions: "Pausing projects", "Switching databases to read-only mode", "Disabling new project launches/transfers", "Responding with a 402 status code for all API requests", "generally applied to all projects of the restricted organization". "Restrictions due to usage limits are lifted once your quota refills at the start of the next billing cycle", or immediately by upgrading or disabling the spend cap. — [Billing FAQ, Fair Use Policy (retrieved 2026-11-28)](https://supabase.com/docs/guides/platform/billing-faq)
- Already established in the prior notes and not re-researched: only one grace period ("you will not receive another grace period"); support cannot extend it; one community case saw about 3 weeks of grace. — [free_plan_alternatives.md §1](../free_plan_alternatives.md); [GitHub discussion #40081 (community, 2025-11)](https://github.com/orgs/supabase/discussions/40081)

### Inferences
- **Plan against 10^9 B.** If GB means 10^9 the bucket is at 93.0% with about 2.1 months left; if 2^30, 86.6% with about 4.3 months. The conservative reading is 10^9 until the dashboard Usage page shows the percentage. The Usage page's own "x / 1 GB (y%)" readout settles it: it should read about 0.93 if decimal, or about 0.87 if binary.
- **744 GB-Hrs is 1 GB × 31 days.** In a 30-day cycle (720 h) that allows an average of about 1.033 GB; in a 31-day cycle exactly 1 GB. This is a small but real cushion.
- **Delete orphans early in the cycle.** Deleting the 285 orphans (139.1 MiB) through the Storage API drops the live bucket by 145.9 MB at once. The cycle average falls linearly with the hours remaining, so a deletion on day 1 of a cycle gives about 100% of the saving for that cycle, and one on day 25 about 20%.
- **The table cannot be emptied by SQL anyway.** The `protect_objects_delete` trigger blocks a mistaken `DELETE FROM storage.objects`. Any cleanup or re-encode job must use the Storage API (`remove()`), or the S3 `DeleteObject(s)` call with service-role or S3 keys.
- **Do not enable versioning on Free.** Noncurrent versions would count toward the 1 GB, and the alpha lifecycle rules only clean noncurrent versions. Keep the bucket `DISABLED`, and keep backups off-platform (B2/R2, per `free_plan_alternatives.md`).
- **Storage cleanup barely moves DB size.** Removing 285 of 1,695 rows frees at most about 0.6 MB of `storage.objects`, and only after vacuum. The DB is at 28.4 MiB of 500 MB, so the overlap is irrelevant.

### Gaps
- No Supabase source defines GB as 10^9 or 2^30, or states the usage-meter sampling interval (hourly or daily). The dashboard Usage page is the only authority available.
- Plan availability (Free or Pro) for object versioning and lifecycle policies is not stated. It is irrelevant if versioning stays disabled.
- I found no Supabase changelog entry dating the object-versioning alpha. Search returned none; the docs pages are undated.
- Whether the paused `AuxiDesk` project in the same organisation holds storage objects was not checked; this session's MCP access was scoped to Dawnage. Because the quota is organisation-wide, any bytes there count against the same 1 GB.

### Queries used
- **Q2**: as in §1 (versioning columns, bucket `versioning_status` and `lifecycle_configuration`, multipart tables, `storage.migrations`).
- **Q10**: `pg_database_size(current_database())`, `pg_total_relation_size('storage.objects')`, `pg_relation_size('storage.objects')`, and per-schema `sum(pg_total_relation_size)` for `storage`, `auth` and `public`.
- **Q12**: `select relname, tgname, tgenabled, pg_get_triggerdef(oid) from pg_trigger join pg_class … where nspname='storage' and not tgisinternal`.

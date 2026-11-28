# Mobile data layer, offline behaviour and sync: current state vs the late-2026 local-first landscape (Expo SDK 57 + Supabase)

Scope: `mobile/` (Expo SDK 57 / RN 0.86.3 / React 19.2.3; `mobile/package.json`). Research date 2026-11-27. Repo links are relative to this file (`../../../../../` = `mobile/`). Live-DB facts come from read-only SQL run on 2026-11-27 against project `hzifwkebzhzlxvigbcup`; only aggregates are reported. This does not repeat the known items L1 (weekly 23505 shows "Couldn't submit"), L4 (photos re-signed on focus) or the unique-constraint work from `mobile/docs/review/2026-11-22-release-readiness` and `2026-11-27-status-review`.

Legend for dates: (npm, 2026-11-27) = version/"modified" timestamp read from the npm registry that day. **[STALE?]** = source older than 2025.

---

## 1. Current state: how the app reads and writes today

### Takeaway
The app uses direct supabase-js/PostgREST calls wrapped in TanStack Query v5 with an in-memory cache only: no persister, no `onlineManager`, no `focusManager`. Writes for **daily check-ins and workout logs** go through a hand-built, durable, account-scoped **AsyncStorage outbox**, which has revisions, per-target coalescing and at-least-once replay. Every other write (weekly check-in, measurements, photos, profile, onboarding) is a direct online-only call. There is no SQLite, MMKV or SecureStore. Writes are not idempotent at the server: they use select-then-insert/update instead of upserts, and IDs are server-generated.

### Cited Findings
**Stack and storage**
- Dependencies are `@tanstack/react-query ^5.102.8`, `@supabase/supabase-js ^2.112.4`, `@react-native-async-storage/async-storage 2.2.0` and `@react-native-community/netinfo 12.0.1`. There is no `expo-sqlite`, `op-sqlite`, MMKV, SecureStore or query persister package. — [mobile/package.json](../../../../../package.json)
- A grep for `SecureStore|MMKV|expo-sqlite|SQLite` across `src/` and `app/` returns nothing. — repo grep, 2026-11-27
- The Supabase auth session is persisted in AsyncStorage (`storage: AsyncStorage, persistSession: true`). — [src/lib/supabase.ts:7-21](../../../../../src/lib/supabase.ts)
- There is a single `QueryClient` with `retry: 1, staleTime: 30_000`. It has no `PersistQueryClientProvider` and no `onlineManager`/`focusManager` wiring; a grep for those finds no matches. — [app/_layout.tsx:28-30](../../../../../app/_layout.tsx)

**Generic outbox (`createAsyncOutbox`)** — [src/lib/asyncOutbox.ts](../../../../../src/lib/asyncOutbox.ts)
- The whole queue lives in one AsyncStorage key holding a JSON array, and every operation reads and rewrites the full array (L75-91). A separate `:revisions` key stores delivered-revision marks (L55, L93-123).
- An in-process promise chain (`serialize`, L125-132) serialises storage mutations. Network delivery runs outside that lock, and only one delivery per logical target runs at a time (`activeDeliveries`, L138-145).
- `save()` writes the intent durably **before** any network call (L305-314), then attempts delivery (L322-323). A newer intent for the same target supersedes the old one (L294-296) and bumps a monotonic revision (L110-114).
- On an `auth` failure it calls `refreshSession()` once and retries (L159-170). Results map to `synced` / `offline` (retryable) / `blocked` (non-retryable) (L147-152).
- `flush()` only picks items with no failure or a **retryable** failure (L395-397). Blocked items wait for explicit user action (`retry`, L360-387).
- There is no timer, backoff or scheduler inside the outbox. Delivery happens only when a caller invokes `save`/`flush`/`retry`.

**Error classification** — [src/lib/delivery-errors.ts](../../../../../src/lib/delivery-errors.ts)

| Signal | Kind | Retryable | Lines |
|---|---|---|---|
| 401, `jwt_expired`, PGRST301/302 | `auth` | no (but refreshed once by the outbox) | L90-100 |
| 403, `42501` | `permission` | no | L102-104 |
| **409, `23505`** | **`conflict`** | **no** | **L106-108** |
| 400, 422, `22xxx`, `23502`, `23514` | `validation` | no | L110-120 |
| "network request failed", "failed to fetch", "load failed" (TypeError), AbortError, ECONN*/ETIMEDOUT codes | `transport` | yes | L29-42, L122-143 |
| 429, 5xx, PGRST000-003 | `temporary-server` | yes | L144-149 |
| anything else | `unknown` | **no** | L151 |

**Workout logs** — [src/lib/outbox.ts](../../../../../src/lib/outbox.ts) and [src/lib/workoutPersistence.ts](../../../../../src/lib/workoutPersistence.ts)
- The outbox target key is `user_id:date[:log:<existingLogId>]` (outbox.ts L7-8, L45-46). The payload is the whole workout as one JSON text `content` blob (L9-23, L76).
- `persistWorkoutLog` follows this path:
  - With a known id, it does a blind `update … eq(id).eq(user_id)` with no version check (workoutPersistence.ts L27-34, L53-57).
  - Otherwise it runs `findAllByDate`. More than one row throws a 409 "Choose which workout to edit", which is classified as non-retryable conflict (L59-63). One row is updated (L64-69). Zero rows are inserted with a server-generated id (L71-74).
- Because there is no client-generated id, the outbox carries a large identity-recovery machine. This covers `validateInput`/`canFlush` guards against mixed null/explicit targets (outbox.ts L47-61), `attachDeliveredResult` canonicalisation (L62-66, asyncOutbox L196-219), `associateWorkoutOutbox` (L88-94) and `retryWorkoutRecovery`, a roughly 55-line predecessor-chain replay (L100-154).
- Flush triggers exist only in two screens:
  - `WorkoutHistory`, via AppState `active` and a NetInfo reconnect ([src/features/training/workout-history.tsx:250-269](../../../../../src/features/training/workout-history.tsx)). It is rendered only when the Plans tab is on the "History" segment ([training-screen.tsx:43-45](../../../../../src/features/training/training-screen.tsx)).
  - The logger screen, via NetInfo ([app/(app)/logger.tsx:110-119](../../../../../app/(app)/logger.tsx)).
- Local drafts are separate AsyncStorage keys `workout-draft:<user>:<date>[:log:<id>]`, debounced at 500 ms. — [src/hooks/useWorkoutDraft.ts:24, ~L165-168](../../../../../src/hooks/useWorkoutDraft.ts)

**Daily check-ins** — [src/features/checkin/persistence.ts](../../../../../src/features/checkin/persistence.ts) and [checkInOutbox.ts](../../../../../src/features/checkin/checkInOutbox.ts)
- `persistCheckIn` first selects the id by `(user_id, date)` (L25-31), then runs an update by id (L35-49) or an insert (L50-63).
- It then does an extra `users.select(package_start_date)` and possibly an `update`, as a "fallback for the DB trigger" (L65-76). A save therefore costs 3-4 round trips, even though the DB already has an `AFTER INSERT` trigger `trg_auto_set_start_date` on `daily_check_ins` ([live DB 2026-11-27](https://supabase.com/dashboard/project/hzifwkebzhzlxvigbcup)).
- The payload carries every field, with nulls, so an update overwrites the **entire row** (persistence.ts L3-21).
- The outbox id is `${userId}:${date}` (checkInOutbox.ts L47-51). `flushCheckInOutbox` is called **only** from a NetInfo listener inside `useCheckInMutation` ([src/hooks/useCheckInMutation.ts:31-45](../../../../../src/hooks/useCheckInMutation.ts)). That hook is used only by `useCheckInEditor` ([useCheckInEditor.ts:51](../../../../../src/features/checkin/useCheckInEditor.ts)), which is mounted only on the pushed `daily-check-in` route ([app/(app)/daily-check-in.tsx:1](../../../../../app/(app)/daily-check-in.tsx)). The Check-In tab renders `CheckInHub`, not the editor ([app/(app)/(tabs)/check-in.tsx](../../../../../app/(app)/(tabs)/check-in.tsx)).
- Home reads both outboxes for display (`useHomeLocal`, [src/features/home/useHomeLocal.ts:14-36](../../../../../src/features/home/useHomeLocal.ts)) but never flushes them.

**Weekly feedback** — [src/features/weekly/useWeeklyFeedbackController.ts:352-403](../../../../../src/features/weekly/useWeeklyFeedbackController.ts)
- This is a direct `insert` into `weekly_check_ins` with no outbox. Any error, including offline, shows the generic "Couldn't submit… check your connection" (L394-397). The draft survives in AsyncStorage (`useWeeklyFeedbackDraft`).

**Other writes (online-only, select-then-insert/update, no outbox)**
- Body measurements: [src/hooks/useMeasurements.ts:47-65](../../../../../src/hooks/useMeasurements.ts)
- Progress photos: [src/hooks/useProgressPhotos.ts:54-72](../../../../../src/hooks/useProgressPhotos.ts)
- Onboarding step: [src/hooks/useOnboarding.ts:26-39](../../../../../src/hooks/useOnboarding.ts)
- Setup profile (read-merge-write of `profile_data`): [src/features/onboarding/useSetupController.ts:45-50](../../../../../src/features/onboarding/useSetupController.ts)

**Live DB shape** (read-only, 2026-11-27) — [Supabase project](https://supabase.com/dashboard/project/hzifwkebzhzlxvigbcup)
- Unique keys: `daily_check_ins (user_id,date)`, `body_measurements (user_id,date)`, `weekly_progress_photos (user_id,date)` and `weekly_check_ins (user_id,week_start_date)`. **`workout_logs` has only its PK**, so several logs per day are allowed. There are 18 (user, date) pairs that already have more than one log.
- PKs are `uuid` with server defaults (`uuid_generate_v4()` / `gen_random_uuid()`), so client-supplied UUIDs, including v7, are accepted by type.
- `updated_at` exists on `workout_logs`, `daily_check_ins` and `workout_plans`, but **no trigger maintains it**. The only public triggers are `trg_auto_set_start_date`, `guard_users_privileged_columns` and `sync_role_to_auth_metadata`. 0 of 946 `workout_logs` rows have `updated_at > created_at + 1s`. `weekly_check_ins`, `body_measurements` and `weekly_progress_photos` have no `updated_at` column at all.
- RLS policies cover INSERT+UPDATE (+SELECT) on all five client-write tables; photos use an `ALL` policy. Upserts would therefore pass RLS shape-wise.
- Replication readiness: `wal_level=logical`, `max_replication_slots=5`, and the publications `supabase_realtime` (7 tables) and `supabase_realtime_messages_publication`.
- Data volume is tiny:

| Table | Rows | Users | Notes |
|---|---|---|---|
| `workout_logs` | 946 | 61 | avg `content` 1,108 chars, max 1,770; per-user max 67 logs / 79 KB, p90 42 KB |
| `daily_check_ins` | 2,107 | 84 | max 113 per user, p50 14 |
| `workout_plans` | 956 | — | avg `exercises` 840 chars |
| `users` | 152 | — | 25 columns |

- Activity in the last 30 days: 58 workout logs from 11 users, and check-ins from 8 users.

**Dashboard writes to the same tables**
- Workout logs use **compare-and-swap on `content`**: `update … .eq("content", originalContent)`, with "changed in another session" when 0 rows match ([client/src/components/WorkoutLogDialog.tsx:425-438](../../../../../../client/src/components/WorkoutLogDialog.tsx)).
- Check-ins use a plain update by id or insert ([client/src/components/CheckInDialog.tsx:150-163](../../../../../../client/src/components/CheckInDialog.tsx)).

### Inferences
- The custom outbox is unusually rigorous (revisions, durable-before-send, per-target single-flight, auth refresh, account scoping, at-least-once replay). Its complexity is mostly a workaround for the **missing server idempotency contract**: no client IDs, no upserts, no version column.
- The mobile and the dashboard use different concurrency models on the same `workout_logs` rows. The dashboard uses CAS and the mobile app uses blind last-writer-wins (LWW). The mobile app can silently overwrite a coach's edit, but not the reverse.
- "Is there an offline queue?" Yes for 2 of about 8 write paths (check-ins, workouts), and those 2 are the daily-use paths. The others fail when offline.

### Gaps
- I did not test on a device. Whether `expo-router/unstable-native-tabs` mounts all tabs eagerly (which would change which flush listeners are live) was not verified.

---

## 2. Failure modes, ranked by likelihood × impact

### Takeaway
The biggest real-world risks are not conflicts but **stuck queues**:
- A request timeout is classified as permanent.
- Flushes only happen while particular screens are open.

Next come **silent overwrites**, from whole-row LWW and blind updates with no version column, and **self-inflicted 23505s** from select-then-insert races. True multi-device concurrent editing is rare at this scale (11 active loggers in 30 days).

### Cited Findings (ranked)
1. **Timeouts become permanent `blocked` (high likelihood in gyms, high impact).**
   - RN's fetch polyfill rejects with `TypeError('Network request timed out')` on XHR timeout ([node_modules/whatwg-fetch/dist/fetch.umd.js:571-574](../../../../../node_modules/whatwg-fetch/dist/fetch.umd.js)).
   - postgrest-js wraps fetch failures as `{ error: { message: "<name>: <message>", code: "<code or ''>" }, status: 0 }` ([node_modules/@supabase/postgrest-js/dist/index.cjs:394-432](../../../../../node_modules/@supabase/postgrest-js/dist/index.cjs)).
   - `classifyDeliveryFailure` only recognises "network request failed / failed to fetch / load failed" as transport (delivery-errors.ts L29-33, L122-137). "network request timed out" with status 0 falls through to `unknown` → `retryable: false` (L151).
   - `flush()` skips non-retryable items (asyncOutbox.ts L396), so the record stays blocked until the user manually retries.
   - No test covers "timed out" (grep of `delivery-errors.test.ts`).
   - Any other unrecognised error (status 0 with another message, a JSON parse error) is also treated as permanent.
2. **Queued check-ins are not sent until the user reopens the check-in editor (high likelihood, medium-high impact).**
   - The only check-in flush is inside `useCheckInMutation` (L31-45), which is mounted only by the editor route (see §1).
   - Workout flushes need Training→History or the logger to be mounted (workout-history.tsx L250-269; logger.tsx L110-119).
   - There is no app-root flusher and no `expo-background-task`. A check-in saved offline is therefore invisible to the coach even after connectivity returns, while Home shows it as "queued" (`useHomeLocal`).
3. **Silent lost updates (medium likelihood, high impact for coach trust).**
   - Mobile workout updates are blind `update by id` (workoutPersistence.ts L27-34).
   - Check-in updates overwrite every column, including nulls (persistence.ts L35-42).
   - No `updated_at` is maintained (live DB), so neither side can detect staleness.
   - A queued offline edit, or a stale second device, therefore overwrites a coach's dashboard correction. This holds even though the dashboard itself uses CAS (WorkoutLogDialog.tsx L425-435).
   - **Two devices editing the same day:** the last flush wins the whole row or whole workout JSON. There is no field merge and no notice.
4. **Self-inflicted `23505` → non-retryable "conflict" (low-medium likelihood, medium impact).**
   - Check-ins, measurements and photos do select-then-insert (persistence.ts L25-63; useMeasurements L47-65; useProgressPhotos L54-72). If another writer inserts the same `(user_id,date)` between the select and the insert (second device, dashboard `CheckInDialog` insert, or a replay racing a live save), the insert hits the unique key → `23505` → `conflict`, non-retryable (delivery-errors L106-108) → blocked.
   - A plain re-run would succeed, because the select would now find the row. An `upsert … onConflict` makes this impossible.
5. **Duplicate workout rows → manual "choose which workout" recovery (low likelihood, medium impact, high code cost).**
   - `workout_logs` has no natural key, so two devices that both create a log for the same day each insert a row. 18 such days already exist in the live DB.
   - The next save for that date without an id gets the 409 "Choose which workout to edit" (workoutPersistence L61-63) and enters the retarget/annotate/retry recovery flow (outbox.ts L87-154; `useWorkoutSession` recovery). This failure class disappears if the client mints the row id.
6. **App killed mid-save (low impact for check-ins and workouts, high for the rest).**
   - Check-ins and workouts are durable before the network call (asyncOutbox L305-314). A kill after the server commit but before the dequeue replays at-least-once:
     - Check-in replay runs select→update again, which is idempotent.
     - Workout replay with a null id runs findAllByDate→update of the same row, which is idempotent unless a second row appeared meanwhile, in which case it becomes the 409 of item 5.
   - Weekly, measurements, photos and profile have no outbox, so an in-flight write that never got its acknowledgement is lost from the app's point of view. Weekly then hits L1 on retry (already known).
7. **Cold start while offline has no server data (medium likelihood, medium impact).**
   - The query cache is memory-only (app/_layout.tsx L28-30), so plan, profile, check-in history and coach data are unavailable after the process restarts offline.
   - Local outbox and draft data still render through `useHomeLocal`.
   - Starting a planned workout offline after a cold start cannot load the plan template, because `useWorkoutPlan` is network-only ([src/hooks/usePlans.ts:159-224](../../../../../src/hooks/usePlans.ts)).
8. **TanStack Query never pauses offline (low impact).**
   - TanStack's RN guide says online status and app focus must be wired via `onlineManager` (NetInfo/expo-network) and `focusManager` (AppState) ([TanStack Query RN docs, accessed 2026-11-27](https://tanstack.com/query/latest/docs/framework/react/react-native)). This app does neither.
   - Queries therefore fire and fail offline (`retry: 1`) instead of pausing.
   - `useHomeData`'s `fetchStatus === 'paused'` branch ([src/features/home/useHomeData.ts:19-22](../../../../../src/features/home/useHomeData.ts)) is effectively dead code.
9. **Minor.**
   - The whole-array AsyncStorage rewrite per operation is fine at current sizes (workout content ≤1.8 KB per item).
   - The session refresh token is stored unencrypted in AsyncStorage (supabase.ts L13-19).

### Inferences
- Items 1, 2, 4 and 5 can be fixed in a few dozen lines plus one migration. None of them needs a sync engine.
- Items 3 and 7 need a version column and a persisted read cache respectively. These are also small.

### Gaps
- Whether iOS's native networking surfaces captive-portal or slow-gym-Wi-Fi failures as the XHR `timeout` event vs `error` was not device-tested. The code path in item 1 is verified statically only.
- Postgres trigger semantics for `INSERT … ON CONFLICT DO UPDATE` versus the `AFTER INSERT` `trg_auto_set_start_date` were not verified against docs in this session. Check this before switching check-ins to upsert.

---

## 3. Health data and widgets / native surfaces

### Takeaway
Health data is **read on demand, reviewed, and copied into the check-in form**. It is never uploaded directly and never read in the background, and it reaches the server only as ordinary check-in fields through the check-in outbox. Widgets are **static deep-link launchers** with no data. The workout Live Activity is fed from **local logger state**, not the server.

### Cited Findings
- **Health review flow:** `createHealthReview` is an in-memory transaction of open → read → toggle → apply. `apply` merges the selected values into the editor form and nothing else. — [src/features/health/health-review.ts:16-70](../../../../../src/features/health/health-review.ts); [health-import.tsx:31-44](../../../../../src/features/health/health-import.tsx)
- **HealthKit reader:** it queries `HKQuantityTypeIdentifierBodyMass` samples and daily cumulative statistics for one reporting-day window. — [src/features/health/healthkit-reader.ts:29-38](../../../../../src/features/health/healthkit-reader.ts)
- Health Connect has a parallel reader in [healthconnect-reader.ts](../../../../../src/features/health/healthconnect-reader.ts).
- A grep for `supabase|from(|insert|upsert` in `src/features/health/*` finds no network calls.
- **Widgets:**
  - `DawnageCheckIn` and `DawnageTraining` get one `updateSnapshot({ url, palettes })` at bootstrap ([src/features/native-surfaces/widgets.ios.ts:13-17](../../../../../src/features/native-surfaces/widgets.ios.ts)).
  - Their layouts render fixed text ("Daily check-in / Open Dawnage", "Training") with a `widgetURL` ([layouts.ios.tsx:9-43](../../../../../src/features/native-surfaces/layouts.ios.tsx)).
- **Live Activity `DawnageWorkout`:**
  - Its props are exercise index/count, completed/total sets and rest timer, taken from the logger's in-memory state (`useWorkoutActivity({ exercises, exerciseIndex, … })`, [hooks.tsx:31](../../../../../src/features/native-surfaces/hooks.tsx); `WorkoutActivity` props in [layouts.ios.tsx:45-60](../../../../../src/features/native-surfaces/layouts.ios.tsx)).
  - It is gated on "not yet persisted and not server-sourced" (`workoutIsLive`, [model.ts:29-31](../../../../../src/features/native-surfaces/model.ts)).

### Inferences
- No sync design is needed for health or widgets today.
- If widgets later show data (for example "checked in today?" or the next session), they need a **shared App Group snapshot written by the app**. A widget can't call Supabase with the user session safely. That favours a local store (persisted cache or SQLite) that the app can project into the widget snapshot after each sync.

### Gaps
- Android has no widget implementation (`adapter.ts` comment), so there was nothing to trace there.

---

## 4. Server round trips on cold start; N+1 and over-fetching

### Takeaway
A cold start to Home makes about **8 PostgREST calls, up to 9 with the template fallback, in 3-4 sequential levels**. The `users` table is read twice. There is no N+1. Over-fetching (`select('*')`, unbounded history) exists but is a few KB to tens of KB per user, so latency is dominated by the **waterfall**, not by bytes.

### Cited Findings
- **Level 0:** `supabase.auth.getSession()` from AsyncStorage. This makes a network call only if the token needs refreshing ([src/contexts/AuthContext.tsx:57-77](../../../../../src/contexts/AuthContext.tsx)).
- **Level 1 (gate):** `useOnboarding` → `users.select('onboarding_step')` ([src/hooks/useOnboarding.ts:11-23](../../../../../src/hooks/useOnboarding.ts)). `(app)/_layout` blocks rendering until this resolves ([app/(app)/_layout.tsx](../../../../../app/(app)/_layout.tsx), `resolveAppGate`).
- **Level 2 (parallel, Home via `useHomeData`):**

| # | Query | Source |
|---|---|---|
| 2 | `users.select('*')`, 25 columns | [usePlans.ts:132-147](../../../../../src/hooks/usePlans.ts) |
| 3 | `daily_check_ins.select('*')`, full history, unbounded (max 113 rows per user) | [useDashboardData.ts:12-26](../../../../../src/hooks/useDashboardData.ts) |
| 4 | `rpc('get_my_coach')` | [useCoach.ts:44](../../../../../src/hooks/useCoach.ts) |
| 5 | `weekly_check_ins.select('*')`, full history | [useWeeklyFeedbackHistory.ts:14-15](../../../../../src/features/weekly/useWeeklyFeedbackHistory.ts) |
| 6 | `onboarding_questionnaire.select('answers, completed_sections')` | [useHomeData.ts:34-44](../../../../../src/features/home/useHomeData.ts) |
| 7 | `workout_logs.select('id,date,content')` for the current week | [useHomeData.ts:45-52](../../../../../src/features/home/useHomeData.ts) |

  - The tab badge's `useDailyCheckIns` shares query key 3, so it is deduped ([useCheckInTabStatus.ts:5](../../../../../src/components/navigation/useCheckInTabStatus.ts)).
- **Level 3:** `workout_plans.select('*')` depends on the profile's `active_workout_plan` pointer, so it runs after query 2 ([usePlans.ts:159-180](../../../../../src/hooks/usePlans.ts)).
- **Level 4:** `workout_templates.select('*')` runs only when the user has no plan rows ([usePlans.ts:206-219](../../../../../src/hooks/usePlans.ts)).
- **Other screens:**
  - Training History fetches **all** `workout_logs` with `content` (up to 79 KB per user) ([workout-history.tsx:211-221](../../../../../src/features/training/workout-history.tsx)).
  - The logger fetches the previous 10 logs ([logger.tsx:96-100](../../../../../app/(app)/logger.tsx)) plus that day's records ([useWorkoutSession.ts:79-88](../../../../../src/features/workout/useWorkoutSession.ts)).
  - Plan progress fetches the week's logs again under a different key ([usePlanProgress.ts:84-92](../../../../../src/hooks/usePlanProgress.ts)).
- **Write round trips:**
  - A check-in save costs 3-4: select, insert or update, `users` select, and maybe a `users` update (persistence.ts L25-76).
  - A new workout costs 2 (findAllByDate + insert); an edit of a known log costs 1.
- **No N+1:** no per-row queries inside loops were found. Plan dedupe and normalisation happen client-side (usePlans.ts L183-201).

### Inferences
- The cheapest latency wins, without any new dependency:
  1. Derive `onboarding_step` from the single `users` select, or select only the needed columns, which removes one sequential level.
  2. Bound the check-in history to the window Home actually uses.
  3. Drop the redundant `users` fallback in `persistCheckIn`, since the trigger already exists.
- A persisted cache (§7) hides the waterfall on warm starts entirely.
- A server "home bundle" RPC is possible, but it is YAGNI until measured.

### Gaps
- No network timing was measured. The counts are static, from code.

---

## 5. The 2026 options for Expo SDK 57 / RN 0.86 + Supabase

### Takeaway
For an existing Supabase schema that the dashboard also writes, only engines that **keep Postgres as the source of truth and route writes through your own API/PostgREST under RLS** fit:
- **PowerSync**: the most mature and Supabase-native.
- **TanStack DB**: query/Electric/PowerSync collections plus `@tanstack/offline-transactions`. Incremental, but core is still a 1.0 RC.
- **ElectricSQL**: read-path only, needs an auth proxy.
- **expo-sqlite + Drizzle + custom outbox.**

The rest are poor fits:
- Zero has no offline writes.
- LiveStore is event-sourced, with no Postgres-table sync and an expo-sqlite peer range from before SDK 55.
- Legend-State v3 is still pre-release and needs an `updated_at` + soft-delete schema.
- WatermelonDB has had no release since April 2025, with New Architecture support unconfirmed.
- Triplit's team folded into Supabase in October 2025, with no npm publishes since July 2025.
- Instant needs its own database.
- Supabase ships no first-party offline sync; its partner integration is PowerSync.

### Cited Findings: comparison table

| Option | Latest version / date | SDK 57 / RN 0.86 New Arch | Supabase/Postgres integration | Auth / RLS model | Conflict resolution | Offline writes | Maturity | Pricing / self-host | Migration effort from direct PostgREST |
|---|---|---|---|---|---|---|---|---|---|
| **PowerSync** | `@powersync/react-native` 2.4.1, 2026-11-09 ([changelog](https://releases.powersync.com/announcements/react-native-client-sdk)); v2.0.0 2026-07-21 made OP-SQLite the default and switched to `expo/fetch` streaming; Sync Streams alpha in v1.33.0, 2026-03-24 | Peer deps `react-native: *`, `@op-engineering/op-sqlite >=17.1 <19` (npm, 2026-11-27); latest op-sqlite is 19.0.6, so pin 18.x. New Arch not stated in docs ([PowerSync RN docs](https://docs.powersync.com/client-sdks/reference/react-native-and-expo)). Native module, so a dev build is needed (fine: EAS-only) | Logical replication from Supabase via a `powersync` publication and a `powersync_role` with REPLICATION + **BYPASSRLS** ([Supabase+PowerSync guide, accessed 2026-11-27](https://docs.powersync.com/integration-guides/supabase-+-powersync)). Listed as a Supabase partner ([Supabase partners](https://supabase.com/partners/integrations/powersync)) | Supabase Auth JWT/signing keys. Sync Streams filter with `auth.user_id()` and "usually mirror your RLS", so read rules are duplicated. Writes go through your `uploadData()` with supabase-js, so RLS applies (same guide) | Server-authoritative: whatever your `uploadData` write does (LWW by default). App-defined | Yes: local SQLite plus a CRUD upload queue | Production; most mature for Expo+Supabase | Free: 2 GB synced/mo, **50 peak concurrent**, 500 MB hosted, deactivated after inactivity. Pro from $49/mo. Open Edition self-host ([pricing, accessed 2026-11-27](https://www.powersync.com/pricing)) | **High**: local schema, Sync Streams, all reads rewritten to SQLite queries, a replication slot (DB has 5) |
| **ElectricSQL (sync service) + TanStack DB electric collection** | `@electric-sql/client` 1.5.28 (npm, modified 2026-09-09); `@tanstack/electric-db-collection` 1.0.0-rc.1.6 (npm, 2026-11-27) | JS client; the TanStack/db repo has a React Native example with SQLite persistence and an offline queue ([example](https://github.com/TanStack/db/tree/main/examples/react-native/shopping-list)) | Logical replication into the Electric service; HTTP "shapes" | **No RLS enforcement**: authorise shapes in your own proxy or gatekeeper ("no need to use database rules…") ([Electric auth guide, accessed 2026-11-27](https://electric.ax/docs/guides/auth)) | Read-path sync only. Writes are your API (4 documented patterns) ([search summary of Electric writes guide](https://electric-sql.com/docs/guides/writes)) | Via TanStack DB offline-transactions or your own outbox | Electric 1.x is production; the TanStack DB integration is RC | Cloud: $1 per 1M writes, $0.10/GB-month, PAYG / Pro $249 / Scale $1,999 ([pricing post 2026-04-02](https://electric-sql.com/blog/2026/04/02/electric-cloud-pricing)); self-host is OSS | **High**: plus an auth proxy that re-implements RLS |
| **TanStack DB** (+ `query-db-collection`, `powersync-db-collection`, `@tanstack/offline-transactions`) | `@tanstack/db` / `react-db` **1.0.0-rc.1.6** (npm, 2026-11-27); `query-db-collection` **1.5.3** stable (npm, 2026-11-27); npm listing still says "BETA" ([npm](https://www.npmjs.com/package/@tanstack/db)) | Pure JS. offline-transactions has a `/react-native` entry using NetInfo + AppState ([offline transactions guide](https://tanstack.com/db/latest/docs/guides/offline-transactions)) | Query collection wraps your existing PostgREST fetches, with no server component | Unchanged: PostgREST + RLS | Optimistic local transactions, rolled back on server rejection. `NonRetriableError` for permanent failures. Server must honour **idempotency keys** (same guide) | Yes: an outbox executor, sequential, retry when reachable. The RN storage adapter is copy-paste (AsyncStorage); the RN recipe uses OP-SQLite for rows | Core still RC; API churned between offline-transactions 1.0.x/1.1.x and the current `startOfflineExecutor` ([unpkg README 1.2.0](https://unpkg.com/@tanstack/offline-transactions@1.2.0/README.md)) | OSS, no service | **Low-medium**: sits on the existing TanStack Query keys |
| **Legend-State v3 + `syncedSupabase`** | Stable `@legendapp/state` is **2.1.15**. v3 is still `3.0.0-beta.48` (2026-07-12) / `3.0.0-next.1` (2026-11-17) (npm, 2026-11-27) | JS; persistence plugins (MMKV/AsyncStorage) | Direct supabase-js; optional realtime | RLS via supabase-js | Incremental `changesSince: 'last-sync'` needs created/updated timestamps **and a soft-delete column** ([Supabase blog, Legend-State, **[STALE?]** 2024](https://supabase.com/blog/local-first-expo-legend-state)). Row-level LWW | Yes (persisted pending changes) | v3 has been pre-release for over 2 years. API naming differs between sources ([migration guide](https://www.mintlify.com/LegendApp/legend-state/guides/migration-v3)) | OSS | **Medium-high**: state model rewrite plus a schema change (maintained `updated_at`, `deleted`) that the dashboard must respect |
| **Zero (Rocicorp)** | `@rocicorp/zero` 1.12.0, 2026-11-12. 1.0 published 2026-03-24 (npm); covered by [InfoQ, 2026-06](https://www.infoq.com/news/2026/06/zero-version-1/) | RN support since 0.23 ([release notes](https://zero.rocicorp.dev/docs/release-notes)) | "Full Supabase support" since 0.20 (same). Needs its `zero-cache` server | Zero permissions / custom mutators, separate from RLS | Server-authoritative custom mutators | **No.** "Zero does not support offline writes"; writes are rejected while disconnected ([Zero offline docs, accessed 2026-11-27](https://zero.rocicorp.dev/docs/offline)) | Stable 1.x for web | OSS / self-host. Hosting not verified | High, and it **fails the core requirement** (logging a workout offline) |
| **LiveStore** | `@livestore/livestore` and `@livestore/adapter-expo` 0.5.1 (npm, 2026-11-25). Docs: "still work in progress" ([docs](https://docs.livestore.dev/)) | Expo adapter exists, **but its peer dep is `expo-sqlite ^16.0.8`** (SDK 54-era numbering), which does not match SDK 57's `expo-sqlite 57.0.7` (npm, 2026-11-27) | Event-sourced. Sync providers: Cloudflare, Electric, S2; **no existing-Postgres-table sync documented** (docs) | Provider-specific | Event log, rebase/materialise | Yes | Pre-1.0 | OSS | **Very high**: replaces the data model and breaks dashboard coexistence |
| **expo-sqlite + Drizzle + custom outbox** | `expo-sqlite` sdk-57 tag **57.0.7** (latest 58.0.18 for SDK 58); `drizzle-orm` 0.45.4 stable, 1.0 still in beta tags (npm, 2026-11-27) | First-party Expo module, so SDK 57 is supported by definition | None built in: you write pull (PostgREST `updated_at > cursor`) and push (outbox) | Unchanged: PostgREST + RLS | Whatever you implement (LWW, CAS on version, field-merge) | Yes (you build it) | Building blocks are mature; the sync logic is yours | Free | **Medium**: you already own an outbox; the new work is the local schema plus an incremental pull that **needs a maintained `updated_at` and tombstones** (missing today) |
| **WatermelonDB** | 0.28.0, published 2025-04-07; registry last modified 2025-07-24 (npm, 2026-11-27). No 2026 release | 0.26/0.27 moved native code to ObjC/Java for JSI. Bridgeless / New Arch **unconfirmed** in any 2026 source ([CHANGELOG](https://www.github.com/Nozbe/WatermelonDB/blob/master/CHANGELOG.md); [dev.to SDK 54 guide](https://dev.to/fasthedeveloper/watermelondb-expo-sdk-54-the-complete-mobile-offline-first-setup-guide-that-actually-works-5he5)) | Custom pull/push RPCs ([Supabase WatermelonDB blog, **[STALE?]** 2023](https://supabase.com/blog/react-native-offline-first-watermelon-db)) | RPC (SECURITY DEFINER), so RLS is bypassed or reimplemented | Per-column client-wins merge (Watermelon sync protocol) | Yes | Stagnant | OSS | High, and the maintenance risk is high |
| **Triplit** | `@triplit/client` 1.0.50, 2025-07-31 (npm). The co-founder joined Supabase 2025-10-08; Supabase "does not plan to build Triplit into its platform" ([Supabase blog](https://supabase.com/blog/triplit-joins-supabase)) | — | Own DB/server | Own | CRDT-ish | Yes | Effectively discontinued as a product | OSS (AGPL claim unverified) | **Not viable** |
| **Supabase first-party offline** | No first-party offline or local-first sync product found as of 2026-11-27. Docs and blog point to partners (PowerSync, Legend-State, WatermelonDB) ([PowerSync partner page](https://supabase.com/partners/integrations/powersync); search, 2026-11-27) | — | — | — | — | — | — | — | — |
| **Instant** | `@instantdb/react-native` 1.0.67 (npm, modified 2026-09-26) | RN package + `@instantdb/expo-sqlite` | **Own hosted Postgres; cannot bring your own** (team statement, older and possibly stale, via [Product Hunt](https://www.producthunt.com/posts/instantdb)) | Instant permissions | Instant | Yes (cached) | 1.x | Hosted | **Not viable**: would split the source of truth away from the dashboard |

Context dates:
- Expo SDK 57 was released 2026-06-30, moving to RN 0.86 ([Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)).
- SDK 58 (RN 0.88) is already out ([SDK 58 upgrade post](https://expo.dev/blog/how-to-upgrade-to-sdk-58)), so all npm `latest` tags above already target SDK 58.
- On SDK 57, use the `sdk-57` dist-tags (`expo-sqlite 57.0.7`, `expo-background-task 57.0.24`).

### Inferences
- **Hard filter: dashboard coexistence.** Any engine that owns its own database or mutation server (Zero, LiveStore, Triplit, Instant) forces the Vite dashboard to migrate too, or splits the source of truth. Out.
- **Hard filter: offline workout logging.** This excludes Zero.
- **Legend-State v3** is still not GA after 2+ years and needs schema conventions (soft deletes, maintained `updated_at`) that the dashboard does not follow. It is risky.
- **PowerSync** is the only fully production-grade option for Expo + Supabase today. But it costs:
  - a replication slot (5 max on this DB),
  - a BYPASSRLS role,
  - Sync Streams that re-encode the existing RLS,
  - an OP-SQLite peer range that lags the latest major,
  - rewriting every read.

  That is disproportionate for ~150 users, about 11 of whom log workouts monthly, and under 100 KB of data per user.
- **TanStack DB** is the most natural future upgrade because it layers on the existing TanStack Query. Wait for `@tanstack/db` 1.0 GA (it was still RC on 2026-11-27).

### Gaps
- I found no official statement from PowerSync, Electric, LiveStore or Legend-State explicitly certifying RN 0.86 New Architecture. Compatibility above is inferred from peer dependencies and release activity.
- Zero's current hosting model and cost were not verified.
- LiveStore's peer range might be stale metadata rather than a real incompatibility. This was not tested.

---

## 6. Best practice for offline mutations (late 2026)

### Takeaway
The consensus pattern, which every engine above implements in some form, is:
- client-minted IDs,
- a durable FIFO outbox with idempotent server writes and exponential backoff, with permanent errors separated from transient ones,
- server-authoritative resolution, usually row-level LWW plus optimistic-concurrency checks where a second writer exists.

CRDTs are overkill for single-author workout logs. Background sync on mobile is opportunistic only.

### Cited Findings
- **Idempotency is a server obligation.** TanStack's outbox docs say the server must accept the same idempotency key on repeated requests, and that without keys, retries can create duplicates. Permanent failures should throw `NonRetriableError`. — [TanStack DB offline transactions guide (accessed 2026-11-27)](https://tanstack.com/db/latest/docs/guides/offline-transactions); [README 1.2.0](https://unpkg.com/@tanstack/offline-transactions@1.2.0/README.md)
- **Ordering.** The TanStack offline executor runs transactions one at a time in creation order and retries once the server is reachable (same sources). The app's outbox is per-target ordered (asyncOutbox.ts L134-145), which is sufficient because targets are independent rows.
- **UUIDv7.**
  - Postgres 18 (released Sept 2025) added a built-in `uuidv7()` following RFC 9562, monotonic within a session ([PG 18 docs](https://www.postgresql.org/docs/18/functions-uuid.html); [Neon PG18 note](https://neon.com/postgresql/postgresql-18/uuidv7-support)).
  - This project is on **Postgres 17**, so mint v7 IDs on the client (for example the `uuidv7` npm package 1.2.1, or `uuid` v7) or use the `pg_uuidv7` extension for PG13-18 ([pg_uuidv7](https://github.com/fboulnois/pg_uuidv7)).
  - The columns are `uuid`, so client-supplied v7 IDs need no schema change (live DB).
- **Persisted TanStack mutations are fragile across restarts.** "Only the state of mutations is persisted, as functions cannot be serialized." A default `mutationFn` via `setMutationDefaults` plus `resumePausedMutations` after restore is required. — [TanStack Query mutations guide](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- **RN plumbing.** Wire `onlineManager` to NetInfo or expo-network and `focusManager` to AppState. — [TanStack Query RN docs](https://tanstack.com/query/latest/docs/framework/react/react-native)
- **Upserts on natural keys.** supabase-js `.upsert(values, { onConflict: 'cols', ignoreDuplicates? })` maps to `INSERT … ON CONFLICT`. Supabase's own resumable-WebSocket example uses `upsert(…, { onConflict, ignoreDuplicates: true })` as its idempotency-key pattern. — [Supabase upsert reference](https://supabase.com/docs/reference/dart/upsert); [Supabase resumable WebSockets example](https://supabase.com/docs/guides/functions/examples/resumable-websockets)
- **RLS caveat.** UPDATE needs a matching SELECT policy. — [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Background sync limits** ([expo-background-task docs, accessed 2026-11-27](https://docs.expo.dev/versions/latest/sdk/background-task/)):
  - iOS uses BGTaskScheduler, and the system decides when to run, often in windows such as overnight.
  - The minimum interval is 15 minutes and the default is 12 hours.
  - It is unavailable on iOS simulators.
  - If the user swipes the app away on iOS, tasks stop until it is relaunched.
  - Android uses WorkManager with network and battery constraints and vendor-specific kill behaviour.
  - All JS tasks share one worker.
- **Conflict-policy evidence.** Zero's docs argue that no sync engine or CRDT can automatically resolve semantic conflicts, such as two people editing the same article offline. — [Zero offline docs](https://zero.rocicorp.dev/docs/offline)

### Inferences
- **Choice of conflict policy for this app:**

| Data | Writers | Recommended policy | Why |
|---|---|---|---|
| Daily check-ins | Client; rarely a coach via `CheckInDialog` | Row-level LWW **with a version check** (`updated_at` CAS) | Field-level merge needs per-field timestamps; the data is a single daily form; the main risk is a stale offline replay. |
| Workout logs | Client; coach edits via dashboard | CAS on `updated_at`, matching the dashboard's existing CAS on `content` | The content is one JSON document per session. Field-merging sets is error-prone, and CRDTs add a serialisation format the dashboard would have to understand. |
| Weekly / measurements / photos | Client | Upsert on the natural key | Single writer, so LWW is fine. |

- **Backoff.** Exponential backoff with jitter while foregrounded (for example 2 s to 5 min, capped) for `transport`/`temporary-server`, plus flushes on reconnect, app foreground and sign-in. Background tasks are a bonus, never the guarantee.

### Gaps
- No 2025-2026 production post-mortem specific to fitness or workout apps on Expo was found within the tool budget.

---

## 7. Concrete recommendation for Dawnage (~150 users)

### Takeaway
**Do not adopt a sync engine now.** The data is tiny, writes are single-author per row, and the existing outbox is already durable. What is missing is a **server idempotency/version contract** plus **app-level flush and caching plumbing**. Do these instead:
- client-minted UUIDv7 for workouts,
- upserts on natural keys,
- a maintained `updated_at` with CAS,
- a root-level flusher with backoff,
- a fixed timeout classification,
- TanStack Query persistence for reads.

All of this coexists unchanged with the dashboard. Revisit PowerSync or TanStack DB only when the specific triggers below occur.

### Cited Findings
(All evidence is in §1-§6. The key anchors: a blocked-on-timeout path (delivery-errors.ts L151 + asyncOutbox.ts L396); screen-scoped flushes (useCheckInMutation.ts L31-45, workout-history.tsx L250-269); select-then-insert (persistence.ts L25-63, workoutPersistence.ts L59-74); no `updated_at` triggers and 18 duplicate workout days (live DB); the dashboard's CAS (WorkoutLogDialog.tsx L425-435); PowerSync costs (pricing; Supabase guide); TanStack DB still RC (npm, 2026-11-27).)

### Inferences: target design and phased rollout

**Phase 0: stop stuck queues (about 1 day, app-only, no DB change)**
1. **Classifier.** Treat `TypeError: network request timed out` and any `status: 0` envelope as `transport`/retryable. Consider making `unknown` retryable with a capped attempt count instead of permanent ([delivery-errors.ts:29-33, 151](../../../../../src/lib/delivery-errors.ts)). Add the missing test.
2. **One root flusher.** Add one `useOutboxSync()` in `app/(app)/_layout.tsx` that flushes both outboxes on sign-in, AppState `active` and NetInfo reconnect, with in-memory exponential backoff and jitter for retryable failures while foregrounded. Then delete the per-screen NetInfo/AppState flush listeners (workout-history.tsx L250-269, logger.tsx L110-119, useCheckInMutation.ts L31-45). This is net deletion.
3. **TanStack RN plumbing.** Wire `onlineManager` to NetInfo and `focusManager` to AppState, per the TanStack docs.

**Phase 1: server idempotency contract (one migration plus small app diffs; dashboard-transparent)**
1. **Natural-key tables** (`daily_check_ins`, `body_measurements`, `weekly_progress_photos`): replace select-then-write with `upsert(row, { onConflict: 'user_id,date' }).select('id')`. This gives one round trip, safe replays, and no 23505 race.
   - Remove the redundant `users.package_start_date` fallback, which the trigger already covers. First verify the `AFTER INSERT` trigger still fires as intended under `ON CONFLICT` (open item in §2 Gaps).
2. **Weekly:** pick the product semantic.
   - If re-submission is allowed: upsert on `(user_id, week_start_date)`.
   - If not: on `23505`, fetch the existing row and show "already submitted" (this fixes L1).
   - Then move it onto the same `createAsyncOutbox` so offline submit queues.
3. **Workout logs:**
   - Mint a **UUIDv7 on the client at first draft save**, store it in the draft and outbox item, and write with `upsert({ id, user_id, date, title, content }, { onConflict: 'id' })`.
   - Multiple logs per day stay legal; there is no natural key to add.
   - New-record ambiguity disappears, so most of `retarget`/`annotate`/`retryWorkoutRecovery` and the mixed-target guards (outbox.ts L47-61, L87-154) can be **deleted** after a one-time drain of legacy null-id items through the old path.
4. **Version column:**
   - Add a `BEFORE UPDATE` trigger setting `updated_at = now()` on `workout_logs` and `daily_check_ins` (moddatetime or a 3-line plpgsql function).
   - The mobile app sends the base `updated_at` on updates (`.eq('updated_at', base)`). Zero rows affected means `conflict: review-required`, which reuses the existing blocked-record UI rather than silently overwriting.
   - The dashboard keeps working unchanged (its CAS on `content` still holds) and can later switch to the same column.

**Phase 2: offline reads and cold start (about 1 day)**
- Add `PersistQueryClientProvider` with an AsyncStorage persister (`@tanstack/react-query-persist-client` / `query-async-storage-persister` 5.108.4; npm, 2026-11-27):
  - the storage key scoped per user,
  - `buster` = app version,
  - `maxAge` around 7 days,
  - `dehydrateOptions` limited to profile, plan, check-in history, weekly history and coach,
  - the persisted cache cleared on sign-out next to `clearCorruptAuthData`.
- Keep the custom outbox for writes. Do **not** switch to persisted TanStack mutations, which lose `mutationFn` across restarts unless defaults are registered, and have no revisions or coalescing.
- Trim the cold-start waterfall: one `users` select for gate + profile, and bounded `daily_check_ins` columns and window (§4).

**Phase 3 (optional): background flush**
- Register an `expo-background-task` (sdk-57 tag 57.0.24) that runs `flushOutbox`/`flushCheckInOutbox` for the signed-in user. Treat it as opportunistic: at least 15 minutes, OS-scheduled, and not after an iOS swipe-kill.
- Later this can also refresh an App Group snapshot if widgets start showing data.

**Phase 4: only on triggers, adopt a sync engine**
- Adopt when any of these hold:
  - coaches edit plans or logs often enough that clients need live, offline-cached updates,
  - several tables need offline editing with relational reads,
  - the user count reaches thousands,
  - the read waterfall stays measurably painful after Phase 2.
- Then:
  - **TanStack DB** (query-db-collection + offline-transactions) once `@tanstack/db` is 1.0 GA. This is the smallest step from today's code and keeps PostgREST and RLS.
  - Or **PowerSync** if true SQLite-backed partial replication is needed. Plan for one replication slot, a BYPASSRLS role, Sync Streams that mirror RLS, OP-SQLite pinned to the supported peer range, and the Pro tier ($49/mo) once more than 50 clients are concurrently connected.
- Either way, the Phase 1 contract (client IDs, upserts, maintained `updated_at`) is exactly what these engines' upload handlers need, so none of Phases 0-3 is wasted.

**Coexistence with the dashboard (all phases)**
- Postgres plus RLS stays the single source of truth.
- Both clients write through PostgREST.
- The new guarantees live in the DB (unique keys, the `updated_at` trigger), so they protect dashboard writes too.
- Client-minted UUIDs and upserts are invisible to the dashboard.
- Optional follow-up: switch the dashboard's CAS from `content` equality to `updated_at`, to align both sides.

### Gaps
- Effort estimates are engineering judgement, not measured.
- The upsert/trigger interaction and device-level timeout behaviour need verification before Phase 1 and Phase 0 respectively ship.

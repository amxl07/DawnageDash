# Event-driven layer: realtime, jobs, notifications, derived data (Dawnage, as of 2026-11-27)

Scope: realtime, background and scheduled work, push, derived metrics, outbox/domain events, and the Edge Function pattern for project `hzifwkebzhzlxvigbcup` (Postgres 17, ap-southeast-2).
Evidence conventions:
- `repo:` means a file:line in `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash`.
- `live DB` means a read-only catalog or aggregate SELECT run 2026-11-27 through the Supabase MCP. No DDL or DML was run.
- Supabase docs pages were pulled live through the docs search on 2026-11-27, so they reflect the current docs. Pages with their own date carry it.
- Not re-researched (already covered in `mobile/docs/review/2026-11-22-release-readiness/README.md` and `2026-11-27-status-review/README.md`): migration 04 added `weekly_check_ins`, `weekly_progress_photos` and `workout_logs` to the publication, and delete-account was tested end to end.

Scale context:
- live DB: 152 users (142 client, 7 coach, 3 admin), 2,107 `daily_check_ins`, 946 `workout_logs`, 107 `weekly_check_ins`, 366 `weekly_progress_photos`, 1,691 storage objects.
- Daily check-ins averaged 2.3/day over the last 30 days.
- Realtime traffic is tiny: the last 24 h of logs show 3 websocket upgrades and "Tenant has no connected users, database connection will be terminated" (live logs, `query_logs`).

---

## Q1. Realtime today, why Broadcast-from-database, and the target channel topology

### Takeaway
There is exactly one realtime channel in the whole platform: the coach dashboard's public `coach-clients-realtime` channel, with 5 unfiltered `postgres_changes` listeners that only invalidate React Query caches. The mobile app has none.

Throughput is not the problem at this scale. The reasons to move to private Broadcast-from-database topics (`coach:{id}`, `user:{id}`) are correctness, security and alignment with Supabase's current recommendation:
- no refetch after reconnect while `staleTime: Infinity`;
- DELETE events bypass RLS;
- the channel is public and `realtime.messages` has 0 policies;
- the move also gives the platform a server-originated event bus for notifications.

### Cited Findings
**Current state (code)**
- The only realtime subscription in either app is `supabase.channel('coach-clients-realtime')` in `CoachClientsPage`. It has `postgres_changes` (`event: '*'`, no `filter`) on `daily_check_ins`, `users`, `weekly_check_ins`, `body_measurements` and `weekly_progress_photos`. Each handler just calls `queryClient.invalidateQueries` for its key. The channel is created only when `effectiveCoachId` is set and removed on unmount. — [repo: client/src/pages/CoachClientsPage.tsx:54-80]
- `.subscribe()` is called with no status callback, so nothing refetches after a disconnect or reconnect. — [repo: client/src/pages/CoachClientsPage.tsx:75]
- The global React Query defaults are `refetchInterval: false`, `refetchOnWindowFocus: false`, `staleTime: Infinity`. Realtime invalidation is therefore the only refresh path for the coach list besides a reload or the coach's own mutations. — [repo: client/src/lib/queryClient.ts:44-51]
- Mobile has 0 `supabase.channel` calls. The `commits?.subscribe(...)` hits are in-app emitters, not Realtime. — [repo: grep of mobile/src, mobile/app; mobile/src/features/checkin/useCheckInEditor.ts:64]

**Current state (live DB)**
- Publication `supabase_realtime` (insert, update and delete enabled; not all-tables) contains 7 tables: `body_measurements`, `daily_check_ins`, `users`, `weekly_check_ins`, `weekly_progress_photos`, `workout_logs`, `workout_templates`. `workout_logs` and `workout_templates` have no subscriber in either app. — [live DB: pg_publication_tables]
- A second publication, `supabase_realtime_messages_publication`, covers the daily partitions `realtime.messages_2026_11_24 … _30`. The Broadcast-from-DB plumbing already exists. Realtime logs show "Starting stream replication for slot supabase_realtime_messages_replication_slot_…" and "Janitor starting realtime.messages cleanup". — [live DB: pg_publication_tables; live logs: realtime_logs]
- `realtime.messages` has RLS enabled and **0 policies**. `realtime.subscription` had 0 rows at query time (no dashboard open). — [live DB: pg_class, pg_policies, realtime.subscription]
- All public tables use the default replica identity (PK only). — [live DB: pg_class.relreplident]
- RLS on the published tables:
  - Policy counts: users 9, daily_check_ins 8, workout_logs 9, body_measurements 6, workout_templates 6, weekly_check_ins 5, weekly_progress_photos 3.
  - The coach read path on `daily_check_ins` is `(auth.uid() = user_id) OR is_coach_of(user_id)`.
  - `is_coach_of` is a plpgsql `EXISTS (select 1 from public.users where id = target_user_id and coach_id = auth.uid())`.
  - — [live DB: pg_policies, pg_proc]

**How postgres_changes scales (current Supabase docs)**
- "every change event must be checked to see if the subscribed user has access… 100 users subscribed to a table where you make a single insert… will then trigger 100 'reads'". — [Supabase docs: Postgres Changes, Limitations (live docs, accessed 2026-11-27)](https://supabase.com/docs/guides/realtime/postgres-changes)
- "Database changes are processed on a single thread to maintain the change order… compute upgrades don't have a large effect on the performance of Postgres change subscriptions". — [Supabase docs: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- The docs' scale advice is to use a separate public table without RLS, or "use Realtime server-side only and then re-stream the changes to your clients using a Realtime Broadcast". — [Supabase docs: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- "RLS policies are not applied to `DELETE` statements… When RLS is enabled and replica identity is set to full… the old record contains only the primary key(s)". — [Supabase docs: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- The docs rank Broadcast first, "the recommended method for scalability and security", and say Postgres Changes "does not scale as well as Broadcast… We recommend using Broadcast for most use cases." — [Supabase docs: Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)

**Broadcast from database mechanics**
- `realtime.broadcast_changes(topic, event, operation, table, schema, NEW, OLD)` is meant to be called from an `AFTER INSERT OR UPDATE OR DELETE … FOR EACH ROW` trigger. "This function will use a private channel and needs broadcast authorization RLS policies to be met." — [Supabase docs: Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- `realtime.send(payload jsonb, event, topic, is_private)` "inserts a message into `realtime.messages` without a specific format". By default all database broadcasts are private. Public and private flags must match the client channel. — [Supabase docs: Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- Broadcast Replay lets **private** channels fetch earlier messages (`config.broadcast.replay: { since, limit }`). Only messages sent through Broadcast from the Database can be replayed. — [Supabase docs: Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- Authorization works through RLS on `realtime.messages`:
  - the `(select realtime.topic())` helper returns the topic being joined;
  - `realtime.messages.extension in ('broadcast')` scopes a policy to broadcast;
  - clients must create the channel with `config: { private: true }` and call `supabase.realtime.setAuth()`.
  - "To enforce private channels you need to disable the 'Allow public access' setting in Realtime Settings."
  - — [Supabase docs: Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- Authorization is checked at join time by inserting a message, reading it, and rolling back. — [Supabase docs: Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- Supabase benchmarks for `realtime.broadcast_changes`: 80,000 concurrent users, 10,000 inserts/s fanned out, median 46 ms and p95 132 ms latency. — [Supabase docs: Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)
- Broadcast from Database was announced 2025-04-02 (Launch Week 14). It stores messages in `realtime.messages`, read through a dedicated replication slot. — [Supabase blog, 2025-04-02](https://supabase.com/blog/realtime-broadcast-from-database)
- The feature page listed it as "Public Beta" (per search snippet, not re-verified). — [Supabase feature page (undated)](https://supabase.com/features/realtime-broadcast-from-database)
- Messages are retained ~3 days (per search snippet of the docs; consistent with the daily partitions and "Janitor" cleanup seen in live logs). — [Supabase docs: Broadcast](https://supabase.com/docs/guides/realtime/broadcast)

### Inferences
- **The problems today are correctness and security, not throughput.** At about 10 coach and admin sessions and about 2 check-ins/day, the single-thread RLS fan-out is irrelevant. The concrete defects:
  1. **Silent staleness.** There is no refetch on `SUBSCRIBED` or reconnect, and focus refetch is off with `staleTime: Infinity`. A laptop that sleeps through a check-in shows stale "attention" data until reload. This is the highest-value fix, and it is 3 lines.
  2. **DELETE fan-out.** Because DELETE bypasses RLS, every connected coach receives the PK and table of every deleted row platform-wide and invalidates caches for it. That leaks metadata (row ids) and over-invalidates.
  3. **Unfiltered `users` listener.** Admins receive every `users` change. Coaches receive changes for their clients' rows, which also arrive when a client edits their own profile. This is harmless but noisy.
  4. **Public channel.** The channel is public and `realtime.messages` has no policies. Nothing is broadcast today, so there is nothing to leak yet. Turning off "Allow public access" is a dashboard setting I cannot read through SQL.
  5. **Unused publication entries.** `workout_logs` and `workout_templates` are in the publication with no subscriber. Drop them, or keep `workout_logs` only if the dashboard is going to consume it.
- **Why move to Broadcast here.** It gives one per-coach topic that the database routes (the coach is resolved in the trigger). Clients need no filters, the join is authorized once by RLS on `realtime.messages`, and DELETEs can be routed correctly by reading `OLD`. The same topic can carry server-originated domain events such as "weekly check-in received" or "package expiring", which postgres_changes cannot. `realtime.send` is an INSERT into `realtime.messages`, so it commits or rolls back with the business transaction. That makes it a transactional outbox for UI signals at no extra cost.
- **Payload policy.** Send ids only (`{table, op, client_id, id}`), not full rows. Messages persist about 3 days in `realtime.messages`. Clients refetch through PostgREST under RLS, which keeps the existing "signal, then refetch" React Query design. Use `realtime.send` rather than `broadcast_changes`, because the latter embeds the full NEW and OLD records, including weekly-check-in free text.
- **Target topology** (minimal):

  | Topic | Who may join (RLS on `realtime.messages`) | Events | Producers |
  |---|---|---|---|
  | `coach:{coach_id}` | that coach; any admin (for "view as coach", `viewedCoachId`) | `client_changed` `{table, op, client_id, id}`, `notification` `{id, kind}` | row triggers on `daily_check_ins`, `weekly_check_ins`, `body_measurements`, `weekly_progress_photos`, `workout_logs` (optional), `users` (also old coach on reassignment); `notify()` |
  | `user:{user_id}` | that user only | `notification` `{id, kind}`, `plan_changed` | `notify()`; statement triggers on `workout_plans` and `meal_plans`; `users.coach_note` changes |
  | `admin` | admins | optional (new coach applications, payments) | YAGNI until an admin screen needs it |

  No INSERT policy is needed: clients never send on these topics, only database triggers do.
- **Mobile.** `user:{id}` is optional (Phase 3). A push notification plus refetch on foreground covers "coach changed my plan" for a client-only app. Add the channel only if an in-app live inbox is built.

### Gaps
- Whether "Allow public access" is still on in Realtime Settings is not visible through SQL. The owner must check it in the dashboard.
- I found no 2026 statement that postgres_changes is deprecated. Current docs only say "recommend Broadcast for most use cases". The "Public Beta" label for Broadcast-from-DB comes from a search snippet and was not re-verified for late 2026.

---

## Q2. Background and scheduled work: what exists, what should, and which mechanism

### Takeaway
Nothing asynchronous exists. `pg_cron`, `pg_net` and `pgmq` are available on the project but not installed. There are no cron jobs, no database webhooks, and only 4 business triggers, none of which reaches outside the database. One dashboard flow calls an Edge Function (`send-welcome-email`) that is not deployed.

The documented 2026 Supabase pattern (trigger → pgmq → pg_cron → `net.http_post` → Edge Function, with secrets in Vault) fits this project with no external scheduler.

### Cited Findings
**Current state (live DB and logs)**
- Installed extensions: `plpgsql`, `pg_stat_statements 1.11`, `uuid-ossp`, `pgcrypto`, `supabase_vault 0.3.1`. There is no `cron`, `net`, `pgmq` or `supabase_functions` schema. — [live DB: pg_extension, pg_namespace]
- Available but **not installed**: `pg_cron 1.6.4`, `pg_net 0.19.5`, `pgmq 1.5.1`, `wrappers 0.5.6`, `pg_jsonschema 0.3.3`. **`pg_ivm` is not offered** on this project. — [live DB: pg_available_extensions]
- Non-internal triggers in `public`, `auth` and `storage` (business ones):
  - `auth.users` AFTER INSERT → `handle_new_user` (security definer, inserts the profile);
  - `daily_check_ins` AFTER INSERT → `auto_set_package_start_date`, which runs `UPDATE public.users SET package_start_date = NEW.date WHERE id = NEW.user_id AND package_start_date IS NULL`;
  - `users` BEFORE INSERT/UPDATE → `guard_users_privileged_columns`;
  - `users` AFTER UPDATE → `sync_role_to_auth_metadata`.
  - None call HTTP or `net.*`. — [live DB: pg_trigger, pg_proc.prosrc]
- Deployed Edge Functions: only `delete-account` (v1, `verify_jwt: true`). — [Supabase MCP list_edge_functions, 2026-11-27]
- The dashboard nonetheless calls `supabase.functions.invoke("send-welcome-email", …)` after a coach claims a client. That function does not exist, so every claim ends in the "Email Error… welcome email failed to send" toast. — [repo: client/src/pages/CoachClaimPage.tsx:81-104]
- The repo's `supabase/` folder contains only `functions/delete-account/index.ts`. There is no `config.toml` and no `migrations/`; SQL lives in `sqlmigrationfiles/`. — [repo: ls supabase/]

**Signals that scheduled jobs are needed (live DB aggregates)**
- 81 of 142 clients have `package_start_date` and `package_duration` set. Of those, 67 are already past `start + duration months` and 7 end within 30 days. Nothing alerts anyone. — [live DB aggregate]
- 86 of the 88 coached clients have no `daily_check_ins` row in the last 5 days. The dashboard flags this ("No check-in in 5+ days") only when a coach opens the page. — [live DB aggregate; repo: client/src/lib/coach-utils.ts:311-315]
- Storage: 1,691 objects in `progress_photos` against 1,406 URL references in `weekly_progress_photos`. About 285 objects are unreferenced (a heuristic substring match, so it may over-count URL-encoded names). 1 object sits under a user-id folder whose user no longer exists. — [live DB aggregate]

**2026 Supabase mechanisms (current docs)**
- Supabase Cron is pg_cron with schedules from "every second to once a year". Jobs can run SQL or make HTTP calls to Edge Functions. "we recommend no more than 8 Jobs run concurrently. Each Job should run no more than 10 minutes." — [Supabase docs: Cron](https://supabase.com/docs/guides/cron)
- `cron.job_run_details` is not pruned automatically and can bloat and break in-place upgrades, so prune it. — [Supabase docs: Upgrading](https://supabase.com/docs/guides/platform/upgrading)
- To schedule an Edge Function, store `project_url` and a key in Vault, then `cron.schedule(... net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/…', headers := …))`. — [Supabase docs: Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- Queues is built on pgmq and advertises "Guaranteed Message Delivery", "Exactly Once Message Delivery… within a customizable visibility window", and archival. — [Supabase docs: Queues](https://supabase.com/docs/guides/queues)
- Edge Functions can consume queues through `supabase.schema('pgmq_public').rpc('read' | 'delete', …)`, triggered by Cron "every N number of minutes or seconds". — [Supabase docs: Consuming Queue Messages with Edge Functions](https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions)
- The reference pipeline is a trigger calling `pgmq.send`, plus `cron.schedule('…', '10 seconds', 'select util.process_jobs()')`, which batches `pgmq.read` and calls `util.invoke_edge_function()` (a `net.http_post` wrapper reading `project_url` from Vault). Failures are retried through visibility timeouts: "If the Edge Function fails… the message becomes visible again… retried by the next scheduled task." — [Supabase docs: Automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings)
- `EdgeRuntime.waitUntil(promise)` keeps the worker alive after the response is returned. "The maximum duration is capped based on the wall-clock, CPU, and memory limits." Local CLI kills the instance after the response, so background tasks do not finish locally. — [Supabase docs: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks)
- Edge Function limits:
  - wall clock 150 s (Free) / 400 s (paid);
  - **CPU 2 s per worker**;
  - 256 MB memory;
  - 150 s request idle timeout (504);
  - outbound ports 25 and 587 are blocked, so email must go through an HTTP API.
  - — [Supabase docs: Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)

### Inferences
- **Mechanism choice.**

  | Option | Fit for Dawnage now | Notes |
  |---|---|---|
  | pg_cron (SQL-only jobs) | **Yes**: expiry checks, missed check-in detection, pruning, summary refresh | No network hop; runs inside the same transaction model; 1 extension |
  | pg_cron → pg_net → Edge Function | **Yes**: push send, receipts, email digest | Documented path; Vault holds URL and key; fire-and-forget (pg_net is async) |
  | pgmq (Queues) | **Yes, for push only** | Retries through visibility timeout plus archive come free. A plain `status` column with `FOR UPDATE SKIP LOCKED` would also work at 152 users. pgmq is chosen because it is the documented Supabase primitive and costs 1 extension |
  | `EdgeRuntime.waitUntil` | Only to return 200 fast to cron and pg_net, then finish within the 400 s wall and 2 s CPU limits | Not a scheduler and not durable; work is lost if the worker dies, so the queue stays the source of truth |
  | Database Webhooks (Studio) | No | They are pg_net triggers without retry. Not version-controlled here: the repo has no `supabase/` migrations |
  | External scheduler (Vercel Cron, GitHub Actions, Trigger.dev, Inngest) | No | Adds a second runtime and secret store. Only worth it for long workflows with step retries or human waits, which Dawnage does not have |
- **Job catalogue to build** (the times below are per user's local time, which needs a timezone column; see Q3):
  1. `push-dispatch`, every 30 s: drain the `push` queue to the Expo Push API.
  2. `push-receipts`, every 15 min: fetch receipts and disable dead tokens. Expo says to check after ~15 min, and receipts expire after 24 h.
  3. `coach-alerts`, hourly: for coaches whose local hour is 08:00, write one daily "needs attention" notification with dedupe key `attention:{coach}:{date}` listing clients with no check-in for N or more days, weekly check-in overdue, or joint-pain flags.
  4. `package-expiry`, daily: notify the coach at 14 days and 3 days before `package_end_date`, plus once on expiry (dedupe `pkg:{client}:{end}:{d}`). The 67 already-expired packages argue for a one-off cleanup or reporting pass before the job is switched on.
  5. `weekly-coach-digest`, Monday 08:00 coach-local: email or in-app summary, sent through an HTTP email API because SMTP ports are blocked.
  6. `client-checkin-nudge` (later): push "you haven't checked in today" only if no row exists by the client's chosen time. Server-side, this beats the local reminder, which fires even after a check-in. Keep local reminders as the offline fallback.
  7. `storage-orphans`, weekly: list `progress_photos` objects with no DB reference that are older than 7 days, then delete them through the Storage API in an Edge Function. Never delete with SQL on `storage.objects`.
  8. `cron-prune`, daily: `delete from cron.job_run_details where end_time < now() - interval '14 days'`.
- **Fix now.** `send-welcome-email` is a dead call. Either deploy it (HTTP email provider; called from the claim flow, or better from a `users.coach_id` change trigger through `notify()`) or remove the call and toast. As things stand, every successful claim shows an error.

### Gaps
- I did not determine which email provider the project intends for `send-welcome-email`. No secrets or config for one exist in the repo.
- Exact pgmq_public RPC semantics: the docs example passes `sleep_seconds` to `read`. I did not verify whether that maps to the visibility timeout. The design below sidesteps the question by calling `pgmq.read` inside a security-definer SQL function.

---

## Q3. Push notifications: current state and target design (Expo, APNs, FCM, Live Activities, Android 16)

### Takeaway
The mobile app uses `expo-notifications` only for **on-device scheduled reminders**: daily and weekly, with settings in AsyncStorage. It registers no push token. The workout Live Activity is driven locally, with `expo-widgets` `enablePushNotifications: false`. The database has no token, preference or timezone columns.

The 2026 target is:
- tables `push_tokens`, `notification_prefs` (with an IANA timezone and quiet hours) and `notifications` (inbox plus outbox);
- a pgmq `push` queue;
- an Edge Function sending through the Expo Push API (chunks of 100, 600/s, receipts after ~15 min, `DeviceNotRegistered` disables the token).

Direct APNs is needed only if Live Activity remote updates become a feature.

### Cited Findings
**Current state (code)**
- `reminders.ts` header: "On-device reminders only. No push tokens, no server, no new tables. Kept behind this small interface so a future server-push module can sit beside it". — [repo: mobile/src/lib/reminders.ts:6-11]
- Reminders use `SchedulableTriggerInputTypes.DAILY` and `WEEKLY` ("fires in the device's local timezone") with deep links `data.url = '/check-in' | '/weekly-feedback'`. The Android channel is `reminders` at DEFAULT importance. Settings live in AsyncStorage key `reminder-settings`. — [repo: mobile/src/lib/reminders.ts:15-16, 39-46, 53-60, 86-126]
- Taps are routed on cold start and in the background, schedules are reconciled on foreground, and the foreground handler shows a banner. — [repo: mobile/src/hooks/useNotificationRouting.ts:12-19, 21-31, 59-76]
- `expo-notifications ~57.0.20` with a config plugin (`color`). There are no `getExpoPushTokenAsync` calls anywhere. — [repo: mobile/package.json:30; mobile/app.json:52-56; grep]
- Live Activity: `createLiveActivity('DawnageWorkout', …)` is started and updated locally. `expo-widgets` is configured with `enablePushNotifications: false`, and the config test asserts `NSSupportsLiveActivitiesFrequentUpdates: false`. — [repo: mobile/src/features/native-surfaces/widgets.ios.ts:9; controller.ts:134-139; mobile/app.config.ts:39-42; config.test.ts:36]
- No table matches push, notif, token, event, outbox or audit, and no column matches timezone. `users` holds only `created_at`, `updated_at`, `coach_id`, `package_*` and `coach_note` among the relevant fields. — [live DB: information_schema]

**Expo Push API (page updated 2026-11-16)**
- Up to 100 messages per request (`PUSH_TOO_MANY_NOTIFICATIONS`); **600 notifications/s per project** (`TOO_MANY_REQUESTS`); retry 429 and 5xx with exponential backoff, never malformed 4xx. — [Expo docs: Sending notifications (updated 2026-11-16)](https://docs.expo.dev/push-notifications/sending-notifications/)
- A ticket `ok` means only that Expo accepted the message. "Check receipts about 15 minutes after sending. Receipts are cleared after 24 hours." `getReceipts` takes ≤1,000 ids. On `DeviceNotRegistered`, stop sending to that token. Payload is capped at 4,096 bytes. — [Expo docs: Sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- "Enhanced security" requires an access token (`Authorization: Bearer`). The message fields include `ttl` (default 4 weeks), `priority`, iOS `interruptionLevel` (`active`/`passive`/`time-sensitive`/`critical`), `collapseId` (on iOS also replaces shown notifications) and Android `tag`. — [Expo docs: Sending notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- Supabase's own guide uses this shape: a `notifications` insert, then a Database Webhook, then a `push` Edge Function, then `https://exp.host/--/api/v2/push/send` with `EXPO_ACCESS_TOKEN`. It recommends turning on Expo "Enhanced Security for Push Notifications". — [Supabase docs: Sending Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications)

**Expo SDK 57 status**
- The SDK 57 release (React Native 0.85 → 0.86, React 19.2) lists no notification-specific changes. expo-notifications 57.0.3's changelog says "This version does not introduce any user-facing changes." — [Expo changelog: SDK 57 (2026; exact date not captured)](https://expo.dev/changelog/sdk-57); [unpkg: expo-notifications 57.0.3 CHANGELOG](https://app.unpkg.com/expo-notifications@57.0.3/files/CHANGELOG.md)
- An SDK 58 beta exists (search results reference `sdk-58-beta`). Its notification changes were not reviewed. — [Expo changelog: SDK 58 beta](https://expo.dev/changelog/sdk-58-beta)

**Live Activities (iOS)**
- `expo-widgets` (SDK 57) supports Live Activity push:
  - `enablePushNotifications: true` adds the `aps-environment` entitlement;
  - `addPushToStartTokenListener` (iOS 17.2+);
  - `instance.getPushToken()` and `addPushTokenListener`;
  - sends use the `liveactivity` push type with `apns-topic <bundle>.push-type.liveactivity`, priority 10 or 5;
  - the system throttles frequent updates unless `NSSupportsLiveActivitiesFrequentUpdates` is set;
  - development build only.
  - — [Expo docs: expo-widgets v57](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/)
- Broadcast (channel) Live Activity updates need iOS 18; push-to-start needs iOS 17.2. — [Ably docs: iOS Live Activities (undated)](https://ably.com/docs/push/live-activities); Apple's channel model: [WWDC24 "Broadcast updates to your Live Activities" (2024; older than 2025, so possibly stale)](https://developer.apple.com/videos/play/wwdc2024/10069/); [Apple: Starting and updating Live Activities with ActivityKit push notifications (undated living doc)](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)
- Developer forum reports from 2026 describe iOS 26.x problems: channel updates silently not delivered on some devices, and `pushToStartToken` staying nil on iOS 26.5. These are unconfirmed user reports. — [Apple Developer Forums #843643](https://developer.apple.com/forums/thread/843643); [#835188](https://developer.apple.com/forums/thread/835188)

**Android 16**
- Android 16 adds progress-centric notifications (`Notification.ProgressStyle`, with points and segments) that get "upgraded visibility on system surfaces and top ranking in the notification drawer" when they meet the promoted (Live Update) requirements. — [Android Developers: Progress-centric notifications (Android 16)](https://developer.android.com/about/versions/16/features/progress-centric-notifications)
- Promotion needs the `POST_PROMOTED_NOTIFICATIONS` permission and is shown as a status-bar chip. In 2025 it was only on QPR betas. — [Just Eat Takeaway tech blog (2025)](https://medium.com/justeattakeaway-tech/live-updates-and-progress-notifications-for-android-16-at-jet-b0c87eab17b4)
- The Android 16 behavior changes for all apps list no notification-delivery change. They do tighten **JobScheduler/WorkManager runtime quotas** by standby bucket, including for jobs started in the foreground. — [Android Developers: Android 16 behavior changes, all apps](https://developer.android.com/about/versions/16/behavior-changes-all)

### Inferences
- **Who gets what.** Coaches and admins use only the web dashboard, so mobile push targets clients only. Coach-facing events go to:
  - the dashboard's `coach:{id}` realtime topic (toast plus notification center);
  - a daily or weekly email digest.

  Web Push (VAPID) for coaches is YAGNI until coaches ask for alerts with the tab closed.
- **Expo Push API vs direct APNs/FCM.** Use Expo: one HTTP call covers both platforms, 600/s is far above need, and receipts handle token hygiene. Direct APNs (a `.p8` JWT from an Edge Function) is needed only for `liveactivity` pushes. I found no Expo Push API support for that push type (unverified). That is a coach-driven "live session" feature, not self-guided workouts, which already update locally. Skip it until such a feature exists.
- **Android "Live Updates"** for an active workout would need native `ProgressStyle`. I found no evidence that `expo-notifications` 57 exposes it, so it needs a custom module. Skip it. It is a UX nicety, not part of the event layer.
- **Timezone is the missing primitive.** Local reminders sidestep it (DAILY triggers are device-local), but every server job that is conditional or quiet-hours-aware needs `notification_prefs.timezone`, set from the device's `Intl` timezone on each app start. Coaches need one too (set from the browser) for digest timing.
- **Keep the local reminders.** They work offline and are tested. Add server pushes only for events the device cannot know about: coach replied, plan updated, nudge if you haven't checked in, package ending.

### Gaps
- I could not confirm whether the Expo Push API accepts the `liveactivity` push type in 2026.
- I could not confirm whether Android 16 enforces automatic grouping of ungrouped notifications for target-SDK-36 apps. The "targeting 16" behavior-changes page was not fetched.
- The Android 17 (2026) notification changes were not researched.
- Expo SDK 57's root changelog was not read in full; only the package-level changelog and the SDK summary were.

---

## Q4. Derived data and analytics

### Takeaway
All coach metrics (compliance, the "attention" score, weekly-review status, measurement and photo freshness, package progress and expiry) are computed in the browser over raw rows. The browser fetches 60 days of daily check-ins plus **all** weekly, measurement and photo rows for every client, with no date bound.

At 152 users that is fine for speed but wrong for architecture: the same facts are needed server-side for alerts. Postgres 17 alone is enough:
- one `security_invoker` view `coach_client_summary` with indexed `max()` and `count()` lateral joins;
- no materialized views (no RLS, need refresh);
- no pg_ivm (not offered on this project);
- no warehouse.

### Cited Findings
- Dashboard queries:
  - `daily_check_ins` limited to the last 60 days (`.in("user_id", clientIds).gte("date", …)`);
  - `weekly_check_ins`, `body_measurements` and `weekly_progress_photos` with **no date filter** ("so we always get the latest entry per client"), grouped per client in `useMemo`.
  - — [repo: client/src/pages/CoachClientsPage.tsx:103-176, 198-233]
- Metric logic is client-side TypeScript:
  - `calculateCompliance` (30-day check-ins ÷ active days);
  - `checkWeeklyReviewStatus` (≤7 days done, ≤10 pending);
  - `calculateAttentionScore`: no check-in in 5+ days +30, missed sessions +15, joint pain +20, recovery +10, compliance <50% +10, no measurement in 14 days +5, no photo in 30 days +10; level high at ≥40.
  - — [repo: client/src/lib/coach-utils.ts:69-90, 110-123, 301-366]
- The admin side repeats the fetch pattern and adds `countExpiringPackages` and `calculateRetentionFromHistory`. — [repo: client/src/lib/admin-utils.ts:33-71, 243, 267]
- The package end date is computed in JS with `Date.setMonth(+duration)`. — [repo: client/src/lib/coach-utils.ts:37-46]
- Supporting indexes exist: `daily_check_ins (user_id, date)`, `body_measurements (user_id, date)`, `weekly_progress_photos (user_id, date)`, `workout_logs (user_id, date desc)`, `weekly_check_ins (user_id, week_start_date)`. There are no views or materialized views. — [live DB: pg_indexes, pg_views, pg_matviews]
- `pg_ivm` is not in `pg_available_extensions`. `pg_stat_statements` is installed. — [live DB]
- Analytics Buckets (Apache Iceberg) are in **Private Alpha**: "API stability and backward compatibility are not guaranteed". "managed replication into Analytics Buckets through Supabase ETL is no longer supported. If you need managed replication today, use external replication… with BigQuery." — [Supabase docs: Creating Analytics Buckets (live docs, accessed 2026-11-27)](https://supabase.com/docs/guides/storage/analytics/creating-analytics-buckets)

### Inferences
- **Recommendation ladder.**
  1. **Plain view now.** One SQL definition serves both the dashboard and the cron alerts, so thresholds cannot drift.
  2. **Trigger-maintained summary table** (`client_stats(user_id pk, last_checkin_date, checkins_30d …)`) only if the view's p95 exceeds ~50 ms in `pg_stat_statements`. That is roughly thousands of clients per coach, far away.
  3. **Materialized view: no.** Postgres cannot put RLS on matviews, so one would need a security-definer RPC wrapper plus `REFRESH … CONCURRENTLY` from cron. That is strictly more moving parts than options 1 and 2. (This RLS limitation is from general Postgres knowledge; I did not fetch a source this session.)
  4. **pg_ivm: unavailable** on this project.
- **Keep scoring in TypeScript for now.** The view returns facts (`last_*`, counts, `package_end_date`), and the browser keeps presentation scoring. Move only the alert thresholds that cron uses into SQL, as constants in `enqueue_coach_alerts()`. Move the whole score into SQL only if mobile or admin need the identical number.
- **Month-arithmetic drift.** JS `setMonth` rolls Jan 31 + 1 month over into March, while Postgres `date + interval '1 month'` clamps to Feb 28/29. Computing `package_end_date` once in SQL (a stored generated column or the view) removes the mismatch between the dashboard and the expiry job.
- **Analytics at this scale is Postgres only.** Cohort and retention SQL can run on a read replica if needed. Revisit at more than ~1M rows or when BI tools are wanted, through BigQuery external replication. Avoid Analytics Buckets while they are alpha with no managed ingestion.

### Gaps
- The client-side render cost and network payload of the unbounded queries were not measured. Volumes are small today: 107 weekly check-ins total.
- I did not confirm that `make_interval(months => int)` and `date + interval` are IMMUTABLE for a stored generated column. If they are not, use the view, or a BEFORE trigger that sets `package_end_date`.

---

## Q5. Transactional outbox and domain events

### Takeaway
Yes, but minimal. There should be no generic event-sourcing table. A single `notifications` table serves as both the user-visible inbox and the durable outbox record. A security-definer `notify()` helper inserts the row, does `pgmq.send('push', …)` and calls `realtime.send` (to `user:` or `coach:`) **in the same transaction** as the business write, so either all side effects are recorded or none are. Domain triggers call `notify()`.

### Cited Findings
- `realtime.send()` "inserts a message into `realtime.messages`". — [Supabase docs: Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- pgmq messages are rows in Postgres with visibility-timeout redelivery and archival. — [Supabase docs: Queues](https://supabase.com/docs/guides/queues); [Supabase docs: Automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings)
- Supabase's push example inserts into a `notifications` table and lets a webhook fan out. — [Supabase docs: Sending Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications)
- Today's only side-effect trigger, `auto_set_package_start_date`, writes another table in the same transaction. That is a precedent for in-database side effects. — [live DB: pg_proc.prosrc]
- Coach plan writes are bulk inserts (`supabase.from('workout_plans').insert(rows)`), and edits come from several components. — [repo: client/src/hooks/useTemplates.ts:715; client/src/components/EditableWorkoutPlan.tsx, EditableMealPlan.tsx, client/src/pages/Plans.tsx]

### Inferences
- **Why not a separate `domain_events` table.** With one consumer type (notify) and no replay or audit requirement, a separate table duplicates `notifications`. Add `domain_events` only when a second, independent consumer appears, such as analytics export or webhooks to third parties.
- **Events worth emitting first**, with dedupe keys to make retries and multi-row writes idempotent:

  | Event | Trigger | Recipient and channel | Dedupe key |
  |---|---|---|---|
  | Weekly check-in submitted | AFTER INSERT `weekly_check_ins` | coach: `coach:` topic plus inbox (plus digest) | `wci:{id}` |
  | Plan updated by coach | AFTER INSERT/UPDATE **FOR EACH STATEMENT** on `workout_plans` and `meal_plans` (transition table → distinct user_id where `auth.uid() <> user_id`) | client: push plus `user:` topic | `plan:{user}:{date_trunc('hour', now())}` (coalesces a bulk edit session) |
  | Coach note changed | AFTER UPDATE OF `coach_note` on `users` | client: push | `note:{user}:{hour}` |
  | Client assigned to coach | AFTER UPDATE OF `coach_id` on `users` | client: push or email (replaces the missing `send-welcome-email`); coach: inbox | `assigned:{user}:{coach}` |
  | Package ending or ended | cron | coach inbox plus digest | `pkg:{user}:{end}:{14/3/0}` |
  | Client inactive N days | cron | coach daily "attention" inbox item | `attention:{coach}:{date}` |
- **Pitfall.** Triggers fire for service-role and admin writes too. Use `auth.uid()` checks to skip self-notifications, and statement-level triggers for bulk writes so a 30-row plan insert does not produce 30 pushes.

### Gaps
- I did not verify the column names of `workout_plans` and `meal_plans` (assumed `user_id`) or whether plan edits are UPDATEs or delete-and-reinsert. That needs checking before writing the statement triggers.

---

## Q6. The delete-account Edge Function as the pattern, and the 2026 standard

### Takeaway
`delete-account` is small and correct for its job. As a template it has six weak spots:
- it hand-rolls CORS with `*`;
- it verifies through `admin.auth.getUser(token)`, a network call to Auth on every request;
- it relies on the legacy `SUPABASE_SERVICE_ROLE_KEY`, which is deprecated by the end of 2026;
- it has no structured logging or request id;
- its error envelope has no machine-readable code;
- it is only partly idempotent, with a 1,000-entry listing cap.

The late-2026 standard is the `@supabase/server` `withSupabase({ auth })` wrapper, plus a tiny `_shared/http.ts`, plus `config.toml` per-function `verify_jwt`.

### Cited Findings
**delete-account review**
- Structure and CORS: single file; CORS is `Access-Control-Allow-Origin: *`; a `json(status, body)` helper; OPTIONS and 405 are handled. — [repo: supabase/functions/delete-account/index.ts:7-18]
- Auth: the function builds an admin client from `SUPABASE_SERVICE_ROLE_KEY`, strips `Bearer`, then calls `admin.auth.getUser(token)`, returning 401 if there is no user. It reads `users.role` and returns 403 unless `client`. The platform `verify_jwt: true` also runs. — [repo: index.ts:20-31; Supabase MCP list_edge_functions]
- Work: lists `progress_photos/<uid>` and each date folder with `{ limit: 1000 }` and no pagination, removes files in chunks of 100, then `admin.auth.admin.signOut(token,'global').catch(() => {})`, then `deleteUser`. It returns `{deleted, photosRemoved}`. — [repo: index.ts:33-52]
- Errors are `{ error: '<human sentence>' }` only. There are no `console.*` logs. — [repo: index.ts]
- The mobile caller is `supabase.functions.invoke('delete-account', { method: 'POST' })`. — [repo: mobile/src/features/account/deleteAccount.ts:12]

**2026 guidance**
- `getClaims()` verifies the JWT against the project JWKS (`/.well-known/jwks.json`, cached). It is preferred over `getUser`, "which always sends a request to the Auth server". With legacy symmetric keys it falls back to an Auth request. — [Supabase docs: auth.getClaims (live reference)](https://supabase.com/docs/reference/javascript/auth-getclaims)
- The recommended wrapper is `withSupabase({ auth: 'user' | 'secret' | 'publishable' | 'none' }, handler)` from `npm:@supabase/server@1`:
  - it provides `ctx.supabase` (RLS-scoped), `ctx.supabaseAdmin`, `ctx.userClaims` and `ctx.authMode`;
  - modes can be combined (`['user','secret']`);
  - `createSupabaseContext()` supports custom error responses.
  - Keep `verify_jwt` on for user functions. Set `verify_jwt = false` plus `auth: 'secret'` for cron and pg_net callers, which send the secret key in the `apikey` header. Use `'none'` plus signature verification for external webhooks.
  - Environment variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`.
  - The page does not cover CORS.
  - — [Supabase docs: Securing Edge Functions (live docs, accessed 2026-11-27)](https://supabase.com/docs/guides/functions/auth)
- The legacy `anon` and `service_role` keys are being deprecated by the end of 2026, with no exact shutdown date published. `verify_jwt` "only understands the legacy JWT-based keys". — [Supabase docs: API keys](https://supabase.com/docs/guides/api/api-keys); [Supabase changelog: Upcoming changes to API keys (2025)](https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys); [GitHub discussion #40300](https://github.com/orgs/supabase/discussions/40300) (search-summary level; date not captured)

### Inferences
- **Idempotency and failure modes**:
  1. A retry after a partial photo delete is safe, because it re-lists what remains.
  2. If `signOut` succeeds but `deleteUser` fails, refresh tokens are revoked. The client can retry only while its access JWT is still valid; otherwise it must sign in again. The 500 message ("Try again") does not say this.
  3. The 1,000-entry cap per listing silently leaves files if a user ever has more than 1,000 date folders or files per folder. That is unlikely (1,691 objects platform-wide) but it is a latent bug. The weekly orphan sweep (Q2 #7) is the backstop.
  4. There is no audit trail, so the operator cannot later evidence that a deletion happened. Minimum fix: one structured log line, `{"fn":"delete-account","user":"<hash>","photos":n,"ok":true}`. Store-review compliance favours that.
- **Standard to adopt** (deliberately small):

  ```
  supabase/
    config.toml                 # [functions.delete-account] verify_jwt = true
                                # [functions.push-dispatch]  verify_jwt = false  (auth:'secret')
                                # [functions.push-receipts]  verify_jwt = false
    functions/
      _shared/http.ts           # cors(origins from env), ok(body), fail(status, code, message, requestId), log(fields)
      delete-account/index.ts   # withSupabase({ auth: 'user' }, …)
      push-dispatch/index.ts    # withSupabase({ auth: 'secret' }, …)
      push-receipts/index.ts    # withSupabase({ auth: 'secret' }, …)
  ```

  - Error envelope: `{ "error": { "code": "PHOTO_DELETE_FAILED", "message": "…" }, "requestId": "…" }`. Use `crypto.randomUUID()` per request and echo it in `x-request-id`.
  - CORS: restrict the origin to the Vercel dashboard domain for dashboard-called functions. For mobile-only functions CORS is irrelevant, because native fetch sends no Origin.
  - Observability: one JSON `console.log` per request, which Supabase captures in function logs and `query_logs` can query, plus a `fn_failures` metric through log queries. Skip Sentry-for-Deno until the volume justifies it.
  - There is no hand-rolled `_shared/auth.ts`: `withSupabase` already does JWKS `getClaims`-style verification, so writing it again is the slop to avoid.
- **Deadline risk.** The legacy key deprecation lands within weeks of 2026-11-27. The function must move from `SUPABASE_SERVICE_ROLE_KEY` to `ctx.supabaseAdmin` or `SUPABASE_SECRET_KEYS`, and the clients from the anon key to the publishable key.

### Gaps
- I could not see whether the project has already switched to asymmetric JWT signing keys or new API keys; that is not visible via SQL. Until then `getClaims` falls back to a network call.

---

## Q7. Ranked gaps, target event architecture (SQL and function sketches) and rollout

### Takeaway
The core idea: the database decides, Edge Functions deliver.
- Domain triggers and cron write `notifications` rows.
- Delivery fans out from those rows to `realtime.send` (live dashboard and app), pgmq `push` (Expo), and email digests.
- Every piece is a Supabase-native extension that is already available.
- The rollout starts with three near-free fixes: the dead `send-welcome-email` call, refetch-on-reconnect, and trimming the publication.

### Cited Findings
- All mechanisms used below are documented in current Supabase docs: [Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization), [Queues](https://supabase.com/docs/guides/queues), [Cron](https://supabase.com/docs/guides/cron), [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth), [Expo sending notifications (2026-11-16)](https://docs.expo.dev/push-notifications/sending-notifications/).
- Extension versions available on this project: pg_cron 1.6.4, pg_net 0.19.5, pgmq 1.5.1. — [live DB]

### Inferences

#### Ranked gaps (impact × effort)
1. **No asynchronous or server side-effect path at all.** Coaches learn about weekly check-ins, missed check-ins and expiring packages only by opening the dashboard. There are 67 expired and 7 expiring packages with no alert. (High; Phase 2)
2. **No server push to clients.** There are no tokens, preferences or timezones in the database, so a coach's actions never reach the client's phone. (High; Phase 3)
3. **Dead `send-welcome-email` invocation.** Every claim shows an error toast. (High visibility, trivial fix; Phase 0)
4. **Dashboard realtime correctness.** No refetch on (re)subscribe under `staleTime: Infinity`; DELETE events bypass RLS; public channel; 0 `realtime.messages` policies; 2 unused published tables. (Medium; Phase 0 and 1)
5. **Legacy-key Edge Function pattern ahead of the end-2026 deprecation**, plus no `config.toml` in the repo. (Medium, time-boxed; Phase 1)
6. **Coach metrics only in the browser.** Unbounded fetches, logic duplicated between coach and admin, and JS vs SQL month drift for `package_end_date`. (Medium-low; Phase 2, as the view the alerts need anyway)
7. **Storage hygiene.** About 285 of 1,691 photo objects are unreferenced and 1 is orphaned from a deleted user. This is both a privacy and a cost issue. (Low; Phase 4)
8. **Preventive: prune `cron.job_run_details` from day one.** (Low; ships with Phase 2)

#### Target SQL sketches (pseudocode-grade; verify column names; apply as numbered files in `sqlmigrationfiles/` per repo convention)

**(a) Realtime authorization and producer (Phase 1)**
```sql
-- Who may join which topic. No INSERT policy: only the DB sends.
create policy "rt user topic" on realtime.messages for select to authenticated
using ( realtime.messages.extension = 'broadcast'
        and (select realtime.topic()) = 'user:' || (select auth.uid())::text );

create policy "rt coach topic" on realtime.messages for select to authenticated
using ( realtime.messages.extension = 'broadcast'
        and ( (select realtime.topic()) = 'coach:' || (select auth.uid())::text
              or ((select realtime.topic()) like 'coach:%' and (select public.is_admin())) ) );
-- note: 'coach:<own uid>' needs no is_coach() check: a client joining coach:<self> receives nothing.

create or replace function public.emit_client_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r      jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  client uuid  := case when tg_table_name = 'users' then (r->>'id')::uuid else (r->>'user_id')::uuid end;
  coach  uuid;
begin
  select u.coach_id into coach from public.users u where u.id = client;
  if tg_table_name = 'users' then coach := (r->>'coach_id')::uuid; end if;
  if coach is not null then
    perform realtime.send(jsonb_build_object('table', tg_table_name, 'op', tg_op,
                                             'client_id', client, 'id', r->>'id'),
                          'client_changed', 'coach:' || coach, true);
  end if;
  -- reassignment: tell the previous coach too. Nested IF + jsonb so plpgsql never
  -- prepares old.coach_id for tables that lack the column (no short-circuit guarantee).
  if tg_table_name = 'users' and tg_op = 'UPDATE' then
    if (to_jsonb(old)->>'coach_id') is not null
       and (to_jsonb(old)->>'coach_id') is distinct from (r->>'coach_id') then
      perform realtime.send(jsonb_build_object('table','users','op','UNASSIGN','client_id',client),
                            'client_changed', 'coach:' || (to_jsonb(old)->>'coach_id'), true);
    end if;
  end if;
  return null;
end $$;

-- one trigger per table: daily_check_ins, weekly_check_ins, body_measurements,
-- weekly_progress_photos, users (+ workout_logs if the dashboard wants it)
create trigger emit_client_change after insert or update or delete on public.daily_check_ins
  for each row execute function public.emit_client_change();

-- after the client switch has run for ~1 week:
alter publication supabase_realtime drop table public.daily_check_ins, public.users,
  public.weekly_check_ins, public.body_measurements, public.weekly_progress_photos,
  public.workout_logs, public.workout_templates;
-- then turn OFF "Allow public access" in Realtime Settings.
```
Dashboard client (replaces CoachClientsPage.tsx:55-80):
```ts
const KEY: Record<string, string> = { daily_check_ins: 'coach-client-checkins', users: 'coach-clients',
  weekly_check_ins: 'coach-client-weekly', body_measurements: 'coach-client-measurements',
  weekly_progress_photos: 'coach-client-photos' };
await supabase.realtime.setAuth();
const ch = supabase.channel(`coach:${effectiveCoachId}`, { config: { private: true } })
  .on('broadcast', { event: 'client_changed' }, ({ payload }) =>
      queryClient.invalidateQueries({ queryKey: [KEY[payload.table] ?? 'coach-clients'] }))
  .subscribe((status) => { if (status === 'SUBSCRIBED') queryClient.invalidateQueries(); }); // catch-up after (re)connect
```
Phase 0 fix, before any migration: add the same `subscribe((status) => …)` callback to the existing postgres_changes channel.

**(b) Jobs plumbing (Phase 2)**
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgmq;
select pgmq.create('push');
-- Vault: project URL + a NEW secret key (sb_secret_…), not the legacy service_role JWT
select vault.create_secret('https://hzifwkebzhzlxvigbcup.supabase.co', 'project_url');
select vault.create_secret('<sb_secret_… named "default">', 'jobs_secret_key');

create or replace function public.invoke_edge(fn text, body jsonb default '{}')
returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json',
               'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'jobs_secret_key')),
    body    := body, timeout_milliseconds := 10000);
$$;
revoke execute on function public.invoke_edge(text, jsonb) from public, anon, authenticated;
```

**(c) Notification model (Phase 2: coach inbox; Phase 3: client push)**
```sql
create table public.notification_prefs (
  user_id     uuid primary key references public.users(id) on delete cascade,
  timezone    text not null default 'UTC',          -- IANA, written by app/dashboard from Intl
  quiet_start time not null default '21:00',
  quiet_end   time not null default '07:00',
  muted_kinds text[] not null default '{}'
);
create table public.push_tokens (
  token       text primary key,                     -- ExponentPushToken[…]
  user_id     uuid not null references public.users(id) on delete cascade,
  platform    text not null check (platform in ('ios','android')),
  updated_at  timestamptz not null default now(),
  disabled_at timestamptz                           -- set on DeviceNotRegistered
);
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text not null,
  data        jsonb not null default '{}',          -- {url:'/weekly-feedback'} deep link, matches useNotificationRouting
  dedupe_key  text unique,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  sent_at     timestamptz,
  tickets     text[],
  receipts_checked_at timestamptz
);
create index on public.notifications (user_id, created_at desc);
alter table public.notification_prefs enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.notifications      enable row level security;
create policy "own prefs"  on public.notification_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tokens" on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "read own"   on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "mark read"  on public.notifications for update to authenticated using (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;

-- Seconds until the user's quiet hours end (0 if not in quiet hours).
create or replace function public.quiet_delay(p_user uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce((
    select case
      when (qs <= qe and t >= qs and t < qe) or (qs > qe and (t >= qs or t < qe))
      then extract(epoch from ((qe - t) + case when qe <= t then interval '24 hours' else interval '0' end))::int
      else 0 end
    from (select (now() at time zone p.timezone)::time t, p.quiet_start qs, p.quiet_end qe
          from public.notification_prefs p where p.user_id = p_user) x), 0);
$$;

-- The outbox: one call records the inbox row, queues the push, signals live UIs. Same transaction as the caller.
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text,
                                         p_data jsonb default '{}', p_dedupe text default null, p_push boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_role text;
begin
  insert into public.notifications(user_id, kind, title, body, data, dedupe_key)
  values (p_user, p_kind, p_title, p_body, p_data, p_dedupe)
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then return; end if;                       -- idempotent on retries / bulk writes
  select role into v_role from public.users where id = p_user;
  perform realtime.send(jsonb_build_object('id', v_id, 'kind', p_kind), 'notification',
            (case when v_role = 'client' then 'user:' else 'coach:' end) || p_user, true);
  if p_push and v_role = 'client' then                       -- coaches are web-only
    perform pgmq.send('push', jsonb_build_object('notification_id', v_id), public.quiet_delay(p_user));
  end if;
end $$;
revoke execute on function public.notify(uuid,text,text,text,jsonb,text,boolean) from public, anon, authenticated;

-- Example domain trigger
create or replace function public.on_weekly_check_in() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_coach uuid;
begin
  select coach_id into v_coach from public.users where id = new.user_id;
  if v_coach is not null then
    perform public.notify(v_coach, 'weekly_checkin_submitted', 'Weekly check-in received',
      'A client submitted their weekly check-in.',
      jsonb_build_object('client_id', new.user_id, 'weekly_check_in_id', new.id), 'wci:' || new.id, false);
  end if;
  return null;
end $$;
create trigger notify_weekly_check_in after insert on public.weekly_check_ins
  for each row execute function public.on_weekly_check_in();

-- Claim function used by the push-dispatch Edge Function (service only)
create or replace function public.push_claim(n int default 100)
returns table(msg_id bigint, notification_id bigint, token text, title text, body text, data jsonb)
language sql security definer set search_path = '' as $$
  select m.msg_id, nt.id, t.token, nt.title, nt.body, nt.data
  from pgmq.read('push', 120, n) m                            -- 120 s visibility = retry window
  join public.notifications nt on nt.id = (m.message->>'notification_id')::bigint
  join public.push_tokens t on t.user_id = nt.user_id and t.disabled_at is null;
$$;
revoke execute on function public.push_claim(int) from public, anon, authenticated;
```
Note: messages whose user has no live token will never match the join and keep reappearing. `push-dispatch` should also `pgmq.archive` any message id it read but could not join. The simpler alternative is a LEFT JOIN that archives messages with a null token.

**(d) Derived view and cron alerts (Phase 2)**
```sql
create or replace view public.coach_client_summary with (security_invoker = true) as
select u.id as client_id, u.coach_id, u.full_name, u.package_type,
       (u.package_start_date + make_interval(months => u.package_duration))::date as package_end_date,
       dc.last_checkin_date, dc.checkins_30d, wc.last_weekly_at, bm.last_measurement_date, ph.last_photo_date
from public.users u
left join lateral (select max(d.date) last_checkin_date,
                          count(*) filter (where d.date > current_date - 30) checkins_30d
                   from public.daily_check_ins d where d.user_id = u.id) dc on true
left join lateral (select max(w.created_at) last_weekly_at from public.weekly_check_ins w where w.user_id = u.id) wc on true
left join lateral (select max(b.date) last_measurement_date from public.body_measurements b where b.user_id = u.id) bm on true
left join lateral (select max(p.date) last_photo_date from public.weekly_progress_photos p where p.user_id = u.id) ph on true
where u.role = 'client';

create or replace function public.enqueue_coach_alerts() returns void
language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  for c in
    select s.coach_id, count(*) filter (where s.last_checkin_date is null or s.last_checkin_date < current_date - 3) inactive,
           count(*) filter (where s.package_end_date between current_date and current_date + 14) ending
    from public.coach_client_summary s
    join public.notification_prefs p on p.user_id = s.coach_id
    where s.coach_id is not null and extract(hour from now() at time zone p.timezone) = 8
    group by s.coach_id
  loop
    if c.inactive + c.ending > 0 then
      perform public.notify(c.coach_id, 'daily_attention', 'Clients needing attention',
        c.inactive || ' inactive 3+ days, ' || c.ending || ' packages ending within 14 days',
        jsonb_build_object('url', '/coach/clients'), 'attention:' || c.coach_id || ':' || current_date, false);
    end if;
  end loop;
end $$;

select cron.schedule('push-dispatch', '30 seconds',   $$ select public.invoke_edge('push-dispatch') $$);
select cron.schedule('push-receipts', '*/15 * * * *', $$ select public.invoke_edge('push-receipts') $$);
select cron.schedule('coach-alerts',  '0 * * * *',    $$ select public.enqueue_coach_alerts() $$);
select cron.schedule('cron-prune',    '30 3 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '14 days' $$);
```

**(e) Edge Function sketches (Phase 3)**
```ts
// supabase/functions/push-dispatch/index.ts   (config.toml: verify_jwt = false)
import { withSupabase } from 'npm:@supabase/server@1';
export default { fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
  const { data: rows = [] } = await ctx.supabaseAdmin.rpc('push_claim', { n: 100 });
  if (!rows.length) return Response.json({ sent: 0 });
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` },
    body: JSON.stringify(rows.map((r) => ({ to: r.token, title: r.title, body: r.body, data: r.data,
      channelId: 'default', collapseId: String(r.notification_id) }))),
  });
  if (res.status === 429 || res.status >= 500) return new Response('retry', { status: 503 }); // vt expiry re-delivers
  const { data: tickets } = await res.json();
  // per ticket: DeviceNotRegistered -> disable token; ok -> store ticket id on notification; then pgmq archive msg_id
  // (one rpc: push_ack(jsonb) doing the updates + pgmq.archive in SQL)
  return Response.json({ sent: rows.length });
}) };
```
- `push-receipts` selects notifications sent at least 15 minutes ago with unchecked tickets, POSTs ≤1,000 ids to `/push/getReceipts`, sets `push_tokens.disabled_at` on `DeviceNotRegistered`, and stamps `receipts_checked_at`.
- Mobile registration, after sign-in and on token change:
  ```ts
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await supabase.from('push_tokens').upsert({ token, user_id, platform: Platform.OS, updated_at: new Date().toISOString() });
  ```
  The app also writes `notification_prefs.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone` on each launch.
- Android: create a `default` channel next to the existing `reminders` channel. [repo: mobile/src/lib/reminders.ts:53-60]

**(f) Checks to ship with it** (one runnable check per piece of logic). A SQL script run in a transaction that ends in `rollback`:
1. Insert a `weekly_check_ins` row for a test client; assert one `notifications` row for the coach.
2. Insert it again with the same dedupe key; assert there is still one row.
3. Set prefs to quiet hours; assert `quiet_delay() > 0`.
4. Join `coach:<other uuid>` as a coach JWT; assert the join is rejected.

#### Rollout
| Phase | Scope | Effort | Exit check |
|---|---|---|---|
| 0 (now) | Deploy or remove `send-welcome-email`. Add `subscribe(status)` refetch plus `refetchOnWindowFocus: true` on coach pages. Drop `workout_templates` (and `workout_logs` unless planned) from `supabase_realtime`. | hours | No error toast on claim. Dashboard is fresh after sleep. |
| 1 | Edge Function standard (`config.toml`, `_shared/http.ts`, `withSupabase`) and migrate `delete-account` off the legacy key. Realtime: `realtime.messages` policies, `emit_client_change` triggers, dashboard on private `coach:{id}`; run in parallel with postgres_changes for ~1 week, then drop the tables from the publication and disable public access. | 1–2 days | Coach A cannot join `coach:B`. Events arrive. Logs show no postgres_changes subscribers. |
| 2 | Enable pg_cron, pg_net and pgmq; Vault secrets (new secret key). Add `notifications`, `notification_prefs` (dashboard writes the coach timezone), `notify()`, the weekly check-in, assignment and package triggers, the `coach_client_summary` view (dashboard switches to it, deleting the 4 unbounded queries), `enqueue_coach_alerts`, `cron-prune`, and a dashboard notification bell on the `coach:` topic. Optional email digest Edge Function (HTTP email API). | 2–4 days | Alerts fire once per coach per day (dedupe). The view matches the old TS numbers for 5 sampled clients. |
| 3 | Mobile push: `push_tokens` registration, the `default` Android channel, `push-dispatch` and `push-receipts`, the Expo access token in Edge secrets, client events (plan updated: statement trigger; coach note; assignment). Optionally `user:{id}` realtime for an in-app inbox. | 3–5 days plus an EAS build | Receipts are processed. A `DeviceNotRegistered` token gets disabled. Quiet hours defer delivery. |
| 4 (later or optional) | Server-side "not checked in yet" nudge (replaces the unconditional local daily reminder for opted-in users). Storage-orphan sweep. Live Activity remote updates (`enablePushNotifications: true`, direct APNs) only if coach-led live sessions ship. Android `ProgressStyle` Live Updates only with a native module. | as needed | n/a |

Deliberately skipped:
- a generic `domain_events` table: add it when a second consumer appears;
- materialized views and pg_ivm;
- Analytics Buckets: alpha, with no managed ingestion;
- an external scheduler;
- Web Push for coaches: add it when coaches need alerts with the dashboard closed.

### Gaps
- None of the SQL above was executed. It is design-grade and must be validated on a branch or staging project:
  - column names of `workout_plans` and `meal_plans`;
  - the `is_admin()` signature;
  - `pgmq.send(queue, msg, delay)` overload behaviour in pgmq 1.5.1;
  - IMMUTABLE status if `package_end_date` becomes a generated column.
- The owner-side dashboard settings needed for rollout have not been checked: Realtime "Allow public access", JWT signing keys, new API keys, and the Expo enhanced-security token.

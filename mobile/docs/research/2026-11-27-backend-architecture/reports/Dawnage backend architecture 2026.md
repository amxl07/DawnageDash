# Lock Dawnage's backend contract before launch

Dawnage's backend is now secure at the row level, but weak everywhere underneath. The 22 November fixes closed the data-exposure holes. The platform under them is still a single production database on Supabase's **Free plan, with no backups and one day of logs**. Its only photo bucket holds **927,962,420 bytes against a 1 GB quota**. **CI on `main` has failed on every push since 22 November.** A repo script, `npm run db:push`, would still diff production against a stale drizzle schema. And **nothing runs in the background**: no jobs, push or alerts. So 67 lapsed client packages raise no alert, and the dashboard notices 86 silent clients only when a coach opens it.

Two deadlines squeeze the work into the next five weeks:

- **Legacy keys retire.** Supabase retires the legacy `anon`/`service_role` keys "by the end of 2026". This project still signs HS256 tokens and publishes an empty JWKS.
- **The first store build (R3) locks the mobile contract.** The app sends no version marker, has no OTA channel and reads raw tables with `select('*')`, so whatever contract build 1 ships with is stuck for months.

The best late-2026 architecture for a 152-user, 28 MB coaching platform is not a new platform or a sync engine. It is Supabase used well:

- **Plan and workflow:** the Pro plan with a staging branch, and CLI-v3 migrations backed by pgTAP RLS tests and generated types.
- **API contract:** a versioned `api_v1` schema of views and RPCs, with a server-enforced minimum app version.
- **Writes:** idempotent writes built on client-minted UUIDv7 ids and a maintained `updated_at`.
- **Events:** "the database decides, Edge Functions deliver", built on pg_cron, pgmq, pg_net and private Broadcast topics.
- **Photos:** a pipeline that stops re-downloading full-size originals.
- **AI:** a layer that only drafts for coaches.

A ten-phase expand–migrate–contract plan gets there. Its first two phases must land before store build 1. Every destructive production step (data rewrites, deletions, key revocation, column drops) waits for explicit owner approval and a backup that has been restored at least once. **No production change was made for this report.** Every live figure comes from read-only queries recorded in the seven research notes.

## Eleven urgent risks, led by a production database with no backups

Each claim is cited:

- **Live database facts** cite the research note that recorded the read-only query.
- **Code facts** cite the file.
- **Platform facts** cite the vendor page.

Findings already in the [22 November release-readiness review](../../../review/2026-11-22-release-readiness/README.md) (B1–B10, H1–H9) and the [27 November status review](../../../review/2026-11-27-status-review/README.md) (R1–R3, M1–M3, L1–L5) are referenced by ID, not re-reported. The risks below are ordered by blast radius × likelihood × deadline.

| # | Risk | Evidence | First safe step | Owner gate |
|---|---|---|---|---|
| 1 | **Free plan: zero platform backups, 1-day log retention, pause after a week of inactivity** | Org `DAWNAGE` is `plan: free` ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)). Free plan: backups "Not included" ([Supabase pricing](https://supabase.com/pricing)) | Manual `supabase db dump` plus a bucket export today, then Pro ($25/mo, daily backups kept 7 days) | Billing |
| 2 | **Photo bucket at 86–93% of the 1 GB Free quota, about 2–5 months of runway** | 1,691 objects, 927,962,420 bytes, growing 31.7 MiB/month ([media note](../research_notes/Dawnage%20backend%20architecture%202026/media_timeseries_health.md)) | Decide on Pro. Then sweep orphans | Sweep deletes objects |
| 3 | **`npm run db:push` runs `drizzle-kit push` against `DATABASE_URL` from a stale model** | [`package.json:12`](../../../../../package.json), [`drizzle.config.ts`](../../../../../drizzle.config.ts). The model lacks `weekly_check_ins`, `profile_data` and `country` ([schema note](../research_notes/Dawnage%20backend%20architecture%202026/data_model_schema.md)) | Delete the scripts, the drizzle deps and the dead `server/` stack. Remove `DATABASE_URL` from the everyday `.env` | None (repo only) |
| 4 | **CI red on `main` since 22 Nov and not required for merges. The only DB test checks a migration that was never applied** | Runs `44992993223` and `45884241977` fail on `@babel/runtime` from `../shared/*` ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)). [`verify-photo-privacy.mjs:5`](../../../../../scripts/verify-photo-privacy.mjs) loads the superseded 2026-09-19 file | Root `npm ci` in the `mobile` job, branch protection, and a wider path filter | None |
| 5 | **Key and JWT migration not started; deadline 31 Dec** (extends B7) | Only the legacy `anon` key exists, JWKS returns 0 keys, and every token is HS256. `delete-account` has `verify_jwt: true` ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)) | Create publishable and secret keys (additive). Ship store build 1 with the publishable key only | Deactivation and revocation |
| 6 | **Offline outbox: time-outs are filed as permanent, and flushes run only on certain screens** | [`delivery-errors.ts`](../../../../src/lib/delivery-errors.ts) has no "timed out" case, so it falls to `unknown`, which is non-retryable. Check-ins flush only from the editor route ([sync note](../research_notes/Dawnage%20backend%20architecture%202026/mobile_sync_offline.md)) | Fix the classifier and add one root flusher (app only) | None |
| 7 | **`send-welcome-email` is invoked but not deployed. Deploying it as designed would create a mail relay** | [`CoachClaimPage.tsx:88`](../../../../../client/src/pages/CoachClaimPage.tsx). Only `delete-account` is deployed ([events note](../research_notes/Dawnage%20backend%20architecture%202026/events_realtime_jobs.md)) | Remove the call now. Rebuild it later as a database-triggered send | None |
| 8 | **Role mirrored to user-editable `user_metadata`; both apps route the UI on it** (extends B2/B9) | `sync_role_to_auth_metadata` writes `raw_user_meta_data`. 0 users have `app_metadata.role`. The routing reads are at [`App.tsx:46`](../../../../../client/src/App.tsx) and [`AuthContext.tsx:122`](../../../../src/contexts/AuthContext.tsx) ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)) | Mirror the role to `app_metadata` as well, then switch routing | `auth.users` backfill |
| 9 | **`VITE_COACH_ACCESS_KEY` in the public bundle** (already recorded as B2) | Still in the root `.env` ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)) | Since migration 06 it gates only a request form. Remove it when admin invites replace coach self-sign-up | None |
| 10 | **608 `service_role` inserts into `daily_check_ins` from an unidentified writer, with the service-role key in the everyday `.env`** | `pg_stat_statements` joined to `pg_roles`. In the repo, only `delete-account` and two scripts use `service_role` ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)) | Owner identifies the writer. Move the key to a password manager, and replace it with a new secret key | Key replacement |
| 11 | **No OTA, version marker or minimum-version gate before store build 1** | `expo-updates` is absent. `eas.json` has no `channel` and the client sets no custom headers ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)) | Add a fingerprint runtime, a client version marker and an empty gate table before build 1 | None |

**Backups and logs come first** because they decide whether every other mistake can be undone. A bad migration, a misfired `db:push`, a buggy account deletion or a cleanup script currently has no restore path. Free-plan logs last **one day**, so the status review's "last 24 hours" log check is the furthest back anyone can ever look. That is also why the **608 `service_role` check-in inserts** cannot be traced today. The candidates are an old import script, an external automation or a leaked key. Seven-day logs on Pro are the first tool that could answer it ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)). Separately, 78 check-in rows sit in two bulk-insert minute clusters, which looks like seeded data that should be tagged before any analytics run on it ([AI note](../research_notes/Dawnage%20backend%20architecture%202026/ai_layer.md)).

**Storage numbers differ between the notes because of units, not because the bucket changed.** The media note's live sum is **927,962,420 bytes**:

| Unit | Value | Share of the 1 GB Free quota |
|---|---|---|
| Decimal GB | 0.928 GB | 92.8% |
| Binary GiB | 0.864 GiB (885 MiB) | 86.4% |

The platform note's "885 MB, about 88%" puts a MiB figure over a decimal denominator. Supabase's own usage SQL divides by 1,048,576, but the unit it meters in is unconfirmed. So headroom is **72 MB** (decimal) or **160 MiB** (binary). At the last three months' average of **31.7 MiB/month**, the Free quota is crossed in **about 2.2 to 5.0 months** ([media note](../research_notes/Dawnage%20backend%20architecture%202026/media_timeseries_health.md)). Supabase's Fair Use Policy puts over-quota Free projects into a notice and grace period ([Supabase storage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)).

Cleanup alone buys roughly **21 months**: deleting 285 orphans (139 MiB) and re-encoding 336 referenced legacy originals would shrink the bucket to about 280 MiB. Both are destructive and both need owner approval after an export.

**The CI failure has the same root cause as R1.** Code under `shared/` has no `package.json`. On the dev machine it resolves `@babel/runtime` from the root `node_modules`. On the runner, the `mobile` job installs only `mobile/` ([`.github/workflows/mobile.yml`](../../../../../.github/workflows/mobile.yml)). The workflow's path filter also watches only `shared/progress-photos*` and never `supabase/**`. So a pull request that changes `shared/questionnaire.ts` or an Edge Function alone does not run CI at all. The status review recorded 1,407/1,407 green because it ran on the developer's machine. The second CI job gives false assurance: it validates the never-applied 2026-09-19 photo migration on PGlite, with `auth.uid()` and the roles faked, while production runs the 2026-11-22 replacement ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)).

**The key migration's blocker is a function setting, and the deadline is soft only on paper.** Supabase says the legacy keys "keep working until the end of 2026" ([migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)), and its July 2025 blog says "Late 2026, TBC" ([Supabase blog](https://supabase.com/blog/jwt-signing-keys)). Plan against 31 December. Rotating to asymmetric signing keys will break any Edge Function that still uses the platform "Verify JWT" check, because that check "only understands the legacy JWT-based keys" ([signing keys docs](https://supabase.com/docs/guides/auth/signing-keys)). `delete-account` (the one deployed function) must therefore move to `verify_jwt = false` plus in-code verification before the rotation.

Two non-obvious facts make the migration safer than it looks:

- **Legacy-key traffic is measurable.** Edge logs record `request.sb.jwt.apikey.payload.role` for every request, despite the guide's "no automatic usage indicator" ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)).
- **No store binary carries the legacy key yet**, so the population that cannot be force-updated is zero. It stays zero only if build 1 ships with the publishable key.

## Sector by sector, the backend is sound in intent and brittle in mechanism

### Data model: one wide user row, and plans that are copies, not entities

The live schema has **20 tables in `public`** on Postgres 17.6 and totals 28 MB. It is weakly typed:

- **Two CHECK constraints in the whole schema**, both on `coach_payouts`.
- No enums and no views.
- **No `updated_at` trigger on any table.** Only 0 of 946 workout logs and 1 of 2,107 check-ins have an `updated_at` that differs from `created_at`.
- Seven core values stored as JSON inside `text` columns ([schema note](../research_notes/Dawnage%20backend%20architecture%202026/data_model_schema.md)).

`users` is the aggregate root for everything: coach, package, billing state, plan pointers, six coach-authored notes and onboarding progress.

**A plan is not an entity.** It is a four-column hierarchy key (`level, workout_type, sub_category, days_per_week`), copied into per-client day rows and "pointed at" by a JSON string on `users`. Assigning a plan runs three unordered client round trips, per client, in a browser loop ([`useTemplates.ts:686-800`](../../../../../client/src/hooks/useTemplates.ts)):

1. Delete **all** the client's plan rows.
2. Insert the template days.
3. Rewrite the pointer.

A dropped connection between steps leaves a client with no plan. The live data already shows the damage:

- **23 of 123 plan pointers** do not match the client's own rows, and the app falls back silently to a global template.
- **19 duplicate day groups** are resolved by "keep the highest id". Over random UUIDv4 keys that is an arbitrary row, not the newest ([schema note](../research_notes/Dawnage%20backend%20architecture%202026/data_model_schema.md)).

Several integrity rules exist only in TypeScript, and the two clients disagree. **The coach dashboard's weekly workout count compares `workout_status === 'done'`** ([`Dashboard.tsx:73,95`](../../../../../client/src/pages/Dashboard.tsx)). It therefore misses the 466 legacy `Done` rows, **39% of all completed days**, while the mobile app normalizes case on read.

**The weekly unique key added on 22 November protects nothing.** `week_start_date` is null in **all 107** weekly rows, and Postgres treats NULLs as distinct. M3 counted 91 such rows, so it understated the problem. The fix is a backfill from `created_at` plus a BEFORE INSERT default. Other structural defects:

- `client_payments` has `UNIQUE(client_id)`, so renewals cannot be stored. One record is already overpaid, and no currency is recorded.
- `workout_logs` and `onboarding_questionnaire` reference `auth.users` rather than `public.users`, which blocks PostgREST embedding.
- `dedupe_backup_2026_11_22` keeps 112 rows of personal-data copies in `public`, with no retention date ([schema note](../research_notes/Dawnage%20backend%20architecture%202026/data_model_schema.md)).

**One constraint is invisible but binding for every later migration.** The installed app parses `users.active_*_plan`, `workout_plans.exercises`, `supplements_data` and the questionnaire answers with `JSON.parse`. If those `text` columns were retyped to `jsonb` in place, supabase-js would return objects, `JSON.parse` would throw, and the client's plan would disappear. These columns must gain typed twins. They must not be altered in place ([schema note](../research_notes/Dawnage%20backend%20architecture%202026/data_model_schema.md)).

**Nothing is generated from the database.** Both clients call `createClient` without a `Database` generic, so query results are untyped. Three hand-maintained type sets drift apart: drizzle, `mobile/src/types/db.ts` and the dashboard interfaces.

Two version notes:

- **Minor version.** The project runs Postgres 17.6. Supabase shipped 17.11 on 2026-09-25 with fixes for 44 CVEs ([Supabase changelog](https://supabase.com/changelog.md)).
- **PG18.** Supabase has published no hosted PG18 date ([GitHub discussion #42681](https://github.com/orgs/supabase/discussions/42681)). So the design must stand on PG17 features (`JSON_TABLE`, `MERGE … RETURNING`, `NOT VALID` constraints, `btree_gist` exclusion constraints) and take PG18's `uuidv7()` and `WITHOUT OVERLAPS` later ([PostgreSQL 18 notes](https://www.postgresql.org/docs/release/18.0/)).

### Identity and authorization: protected data, spoofable UI, sessions that never expire

Authorization *of data* is now correct: RLS reads `users.role` through `is_admin()` and `is_coach()`. The problems sit around it ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)).

**UI routing reads a field the user controls.** `sync_role_to_auth_metadata()` mirrors the role into **`user_metadata`**. Supabase calls this "not a good place to store authorization data" ([Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)). Nine dashboard sites and the mobile gate route on it. A client who calls `updateUser({ data: { role: 'admin' } })` gets the admin UI, though RLS still returns no admin data. The one drifted admin that B9 found is still drifted.

**Sessions never expire.** There are **784 sessions with unrevoked refresh tokens** for about 152 users:

- Median age about 180 days; maximum about 337 days.
- One user holds 184 sessions.
- About 713 sessions have not refreshed in 30 days and are still valid credentials.
- No session has a `not_after` time box.

**Staff accounts have no second factor.** All 10 staff accounts (7 coaches, 3 admins) are password-only at `aal1`, with 0 MFA factors.

**Signing out signs out everywhere.** Both apps call `signOut()` with no scope. The auth-js default is `global`, so a client signing out on a phone also kills their web session.

**Password reset uses the implicit flow.** The mobile reset link carries live access and refresh tokens in a custom-scheme URL fragment. PKCE has never run: `auth.flow_state` has 0 rows.

**The API surface is wider than either app uses.** Of 92 policies, **85 apply `TO public`**, which includes anon. **anon holds full DML grants on all 19 API tables**, and the policy "Anyone can read global workout/meal templates" lets anyone with the shipped key read the 161 global workout and 27 global meal templates. On the helper functions, H4 is only half done:

- `search_path` is fixed.
- `is_admin()` and `is_coach_of()` remain **VOLATILE plpgsql, executable by PUBLIC and anon**, and live in the exposed schema. That makes them per-row costs and callable `/rpc/` endpoints.
- `get_my_coach` still runs with `search_path=public`.

**Exposure defaults contradict the 22 November review.** That review said new tables are no longer auto-exposed since 2026-10-30. The live `pg_default_acl` still grants anon and authenticated full rights on new tables and EXECUTE on new functions, so the live catalog wins and the revoke must be explicit ([changelog #45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)).

**Privacy gap.** Any coach can read the full row (email, phone, `profile_data`) of every one of the **54 unassigned clients**.

**Coach list queries cost about five times more than owner queries.** Measured means are **22.3 ms** for coach list queries against **4.0 ms** for owner queries. The cause is that `is_coach_of(user_id)` is evaluated per candidate row and OR'd with two or three overlapping SELECT policies. The biggest consumer of database time, though, is not policy evaluation. **PostgREST schema-cache reloads used about 837 s** (2,532 `pg_timezone_names` calls at 330 ms each), more than every policy-bound query combined ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)).

**The write surface is almost entirely raw table calls.** There are **93 write call sites** (75 dashboard, 15 mobile, 3 shared). All but one go straight to PostgREST tables: the only RPC is `get_my_coach`, and the only Edge Function is `delete-account`. Claim, unassign and plan assignment are multi-step and non-atomic. Profile and assessment saves run client-side compare-and-swap loops over text JSON.

**After the key rotation, local JWT verification still won't happen on mobile.** auth-js 2.112.4 falls back from `getClaims()` to a network `getUser()` when `crypto.subtle` is missing, and Hermes has no WebCrypto polyfill. That is a code reading, not a device test ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)).

### API contract: raw tables, `select('*')`, and no way to say "too old"

The mobile app defines a long-lived contract without having one:

- **11 read sites use `select('*')`** across 10 tables, so every column becomes part of the contract, including private ones such as `coach_note` (M2).
- It writes 7 tables through multi-step PostgREST calls.
- It sets **no client version marker**.
- It has **no OTA channel**: `expo-updates` is not installed and there is no `runtimeVersion`.

Edge logs already capture `x_client_info` and `user_agent` per request. So overriding `X-Client-Info` with `dawnage-mobile/<version>+<build> <os>` gives version telemetry and a gate key at zero cost ([identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md)).

Two outside sources show why the gate must ship in the very first binary:

- **Clerk.** Its 2026 minimum-version feature needs an SDK new enough to render the update screen, so a gate cannot be retrofitted onto a build that lacks it ([Clerk changelog, 2026-11-03](https://clerk.com/changelog/2026-11-03-minimum-app-version)).
- **Zable.** It shows that a blunt minimum-version check forces updates on builds that still work. The better target is the API version the build consumes ([Zable engineering, 2026-05-14](https://careers.zable.com/blog/articles/a-better-forced-update-approach)).

PostgREST already provides the mechanism for both: schema selection through `Accept-Profile`/`Content-Profile` ([PostgREST schemas](https://docs.postgrest.org/en/v13/references/api/schemas.html)), and per-request rejection through `pgrst.db_pre_request` ([Supabase hardening guide](https://supabase.com/docs/guides/api/hardening-data-api)).

### Mobile data and sync: a careful outbox undermined by two small bugs

The app's custom AsyncStorage outbox is unusually rigorous ([sync note](../research_notes/Dawnage%20backend%20architecture%202026/mobile_sync_offline.md)):

- It persists the intent before sending.
- It keeps revisions and coalesces work per target.
- It refreshes auth and replays at least once.

It covers only check-ins and workouts. Weekly feedback, measurements, photos and profile are online-only.

**The worst failure mode is a stuck queue, not a conflict.** React Native's fetch polyfill rejects a slow request with `TypeError('Network request timed out')`. The classifier recognizes only "network request failed", "failed to fetch" and "load failed" ([`delivery-errors.ts:29-33`](../../../../src/lib/delivery-errors.ts)), so a time-out falls through to `unknown`, which is non-retryable. `flush()` skips non-retryable items, so a check-in saved on weak gym Wi-Fi waits forever for a manual retry. No test covers the case.

The second bug compounds it. **Check-ins flush only from a NetInfo listener inside the pushed `daily-check-in` editor route**, and workouts flush only while History or the logger is mounted. Home displays outbox items as "queued" but never flushes them. A check-in saved offline can therefore stay invisible to the coach long after connectivity returns.

**The two clients use opposite concurrency models on the same rows.** The dashboard compare-and-swaps `workout_logs.content` and reports "changed in another session" on a mismatch. The app updates blindly by id and overwrites whole check-in rows, nulls included. **The app can silently erase a coach's correction; the dashboard cannot erase the app's.** And because no `updated_at` is maintained, neither side can detect staleness.

Two smaller costs:

- **Self-inflicted conflicts.** Select-then-insert races produce `23505` errors, which are classed as permanent conflicts. An upsert would make them impossible.
- **A slow cold start.** It costs about **8 PostgREST calls in 3–4 sequential levels**. The query cache lives in memory only, and TanStack's `onlineManager`/`focusManager` are unwired ([TanStack RN docs](https://tanstack.com/query/latest/docs/framework/react/react-native)), so offline queries fail instead of pausing.

**Do not adopt a sync engine now.** Each late-2026 option fails a hard requirement or costs too much at this scale:

| Option | Why not now |
|---|---|
| **PowerSync** (most mature) | Needs a replication slot, a `BYPASSRLS` role and Sync Streams that re-encode the RLS rules, plus a rewrite of every read. The free tier caps at 50 peak concurrent connections ([Supabase+PowerSync guide](https://docs.powersync.com/integration-guides/supabase-+-powersync); [pricing](https://www.powersync.com/pricing)) |
| **TanStack DB** | The natural successor to today's TanStack Query, but still a 1.0 release candidate ([npm](https://www.npmjs.com/package/@tanstack/db)) |
| **Zero** | Does not support offline writes ([Zero docs](https://zero.rocicorp.dev/docs/offline)) |
| **Triplit** | Its team folded into Supabase in October 2025 ([Supabase blog](https://supabase.com/blog/triplit-joins-supabase)) |

The data is under 100 KB per user, and about 11 users log workouts in a month. What is missing is a **server-side idempotency and version contract**: client-minted ids, upserts and a maintained `updated_at`. That is exactly what any future engine's upload handler would need anyway.

### Events, realtime, jobs and notifications: nothing runs unless a coach looks

**Realtime.** The whole platform has one realtime channel: the dashboard's public `coach-clients-realtime`, with five unfiltered `postgres_changes` listeners. The mobile app has none ([events note](../research_notes/Dawnage%20backend%20architecture%202026/events_realtime_jobs.md)). Its defects are about correctness, not throughput:

- **Missed events are never caught up.** `.subscribe()` has no status callback ([`CoachClientsPage.tsx:75`](../../../../../client/src/pages/CoachClientsPage.tsx)), and the global query defaults are `staleTime: Infinity` with focus refetch off ([`queryClient.ts:49-50`](../../../../../client/src/lib/queryClient.ts)). A laptop that sleeps through a check-in shows stale "attention" data until reload.
- **DELETE events leak row ids.** Supabase states that "RLS policies are not applied to `DELETE` statements" ([Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes)), so every connected coach receives the primary key of every deleted row platform-wide.
- **Two published tables have no subscriber.** `workout_logs` and `workout_templates` were added by H1's migration but nothing listens to them.
- **Private channels have no policies.** `realtime.messages` has RLS on and **0 policies**. Yet the Broadcast-from-database plumbing (a dedicated publication and replication slot) is already running. Supabase now ranks Broadcast "the recommended method for scalability and security" ([Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)).

**Jobs.** No background or scheduled work exists. `pg_cron`, `pg_net` and `pgmq` are available but not installed, and none of the four business triggers reaches outside the database. The cost shows in the data:

- **67 of the 81 clients with package dates are already past their end date**, and 7 more end within 30 days. Nothing alerts anyone.
- **86 of 88 coached clients have no check-in in the last 5 days**, and the dashboard flags it only when a coach opens the page.

**Push.** There is no server push. Reminders are on-device only, and the database has no push-token, preference or timezone column.

**Coach metrics.** Compliance, attention score and package expiry are computed in the browser over unbounded fetches. Package end dates use JavaScript `setMonth`, which rolls 31 January + 1 month into March, while Postgres clamps to the end of February. So a future server-side expiry job and the dashboard would disagree unless the date is computed once in SQL ([events note](../research_notes/Dawnage%20backend%20architecture%202026/events_realtime_jobs.md)).

**`delete-account` as a template for future functions.** It works, but has six weaknesses:

- CORS allows `*`.
- It verifies the caller with a network `getUser()` call.
- It uses the legacy `SUPABASE_SERVICE_ROLE_KEY`.
- It writes no logs, so it leaves no deletion audit line.
- Its errors carry no machine-readable code.
- Its folder listing stops at 1,000 entries, with no pagination.

The 2026 standard is the `withSupabase({ auth })` wrapper from `@supabase/server` with `config.toml`-managed `verify_jwt` ([Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)).

### Media: photos re-download every four minutes, and 17% of uploads leak

Both clients compress on the device to about 200 KB JPEG. After that, the pipeline undoes the savings ([media note](../research_notes/Dawnage%20backend%20architecture%202026/media_timeseries_health.md)):

1. Each photo is signed individually with a **300 s** token.
2. It is **re-signed every 240 s**.
3. It is rendered with `cachePolicy="none"` and `recyclingKey={url}`.
4. The dashboard's Media page shows **full-size originals as thumbnails**.

Smart CDN "treats each unique token as a separate cache key" ([Smart CDN docs](https://supabase.com/docs/guides/storage/cdn/smart-cdn)), so a new token every four minutes means a fresh download. In 24 hours of logs: **205 sign POSTs for 151 signed GETs, 142 CDN misses against 3 hits (about 98% MISS)**. This is the cost side of L4. The Free plan has neither Smart CDN nor Image Transformations.

**Leaks and storage.** No code path deletes a replaced or removed photo, and stale or failed saves leave fresh uploads behind. So **285 objects (139 MiB, 16.9% of objects)** are orphans, at 9–55 more every month. **384 pre-April originals (624 MiB, 67% of all bytes)** were uploaded before compression existed, and may still carry GPS EXIF data. Checking means reading the bytes, which needs owner approval.

**The bucket's allowlist is too loose.** Migration 07 set `image/*` up to 20 MB. That still lets anyone calling the Storage API directly store an SVG or an unstripped 5 MB original, so the client-side EXIF strip is a convenience, not a control. B4's "no MIME allowlist" is fixed in letter but not in effect.

**Legacy references and deprecated APIs.** **1,394 of 1,406 references** are still legacy public URLs, canonicalized only on read. The mobile encoder still calls `manipulateAsync`, which is deprecated in SDK 57 in favor of `ImageManipulator.manipulate` ([Expo docs](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator.md)).

**Egress.** Photo egress measured **about 12 MB per user-month**, nearly all uncached. At that rate, egress alone exceeds Free's 5 GB uncached quota at roughly 400 users. This is a single-day sample.

### Time-series and health data: the right shape without provenance

Check-ins, measurements and workouts are stored as **one row per user per local calendar date**, which is the right grain for coaching. Health data handling is also correct in shape:

- HealthKit and Health Connect are **read-only and mediated by the user**: the app reads one day's totals, and the user picks values to copy into the check-in.
- No raw samples, sample ids or source names leave the device.
- HealthKit statistics queries already merge overlapping sources ([media note](../research_notes/Dawnage%20backend%20architecture%202026/media_timeseries_health.md)).

What is missing is **provenance and guards**:

- There is no record of whether a value was typed or imported. The source app name is collected for the review sheet, then discarded.
- There is no IANA timezone of entry.
- Units are implicit.
- Ranges live only in the client's `fields.ts`, so the dashboard or a direct API write can store a 4,000 kg weight.

**Rejected storage options.** TimescaleDB is "not available" on Supabase PG17 ([Supabase docs](https://supabase.com/docs/guides/database/migrating-to-pg-partman)). `pg_partman`, despite being documented, is not offered on this project's image (17.6.1.037). Neither matters: 10,000 users checking in daily produce about 3.65 M rows a year, and a btree on `(user_id, date)` handles that ([Supabase partitioning guidance](https://supabase.com/docs/guides/database/partitions)).

**Compliance gaps.**

- **Cross-border storage.** All data sits in Sydney while clients live mainly in India (35), the UK (24), Canada (23) and Australia (21). A region choice "does not make your application GDPR compliant on its own" ([Supabase GDPR docs](https://supabase.com/docs/guides/security/gdpr-compliance)).
- **No export-my-data path.**
- **No written retention rule** for photos after a client churns.

Column encryption is not one of the gaps. Supabase advises against new `pgsodium` use and calls default at-rest encryption sufficient ([pgsodium docs](https://supabase.com/docs/guides/database/extensions/pgsodium)).

### Platform engineering: production is the only database, and its history is fiction

There is exactly one Dawnage database. It has no branches, no `supabase/config.toml` and no local stack. The installed Supabase CLI is 2.95.4, while v3 became the default on 2026-11-02 ([CLI v3 changelog](https://supabase.com/changelog/supabase-cli-v3)) ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)).

**The migration history does not describe the database:**

- `sqlmigrationfiles/` holds 78 hand-applied entries, but **the live migration history has only 8 rows**, all from 22 November onward.
- **None of the 8 matches its repo file by MD5.**
- The B9 metadata backfill ran outside the history.
- Mock-data and reset scripts sit beside real migrations.

**Permissions are tested only by hand, and only on production.** The 39 permission checks run manually inside rolled-back transactions, and the harness script is not in the repo.

**Observability is dormant even after R2 is fixed:**

- Metro does not use `getSentryExpoConfig`, so stacks will not be symbolicated ([Sentry Expo docs](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)).
- `enableAutoSessionTracking: false` removes crash-free-session metrics.
- The dashboard has no error tracking at all.

**Supply chain:**

- There is no Renovate or Dependabot.
- Actions are tag-pinned on the deprecated Node 20 runtime.
- The repo keeps two lockfiles.
- The web dashboard runs React 18 while mobile runs React 19.2.
- The duplicate `DawnageMobile/` and `mobile-2/` directories confuse search.

Cooldowns matter now: the May 2026 "Mini Shai-Hulud" attack published 84 malicious versions of 42 `@tanstack/*` packages ([GHSA-g7cv-rxg3-hmpx](https://github.com/advisories/GHSA-g7cv-rxg3-hmpx)). The `query` packages this repo uses were not among them.

### AI layer: no code yet, thin text, and a consent wall in front of it

**Starting point.** There is no AI code, dependency or vector extension in use. The data is about 6,500 rows and roughly 90% structured ([AI note](../research_notes/Dawnage%20backend%20architecture%202026/ai_layer.md)):

| Gap | Measured |
|---|---|
| Daily check-in `notes` | Empty in **100%** of rows |
| Macros | Filled in **3.7%** of check-ins |
| RPE | Filled in **8.1%** of sets |
| Weekly check-ins | About **one per week across the whole platform** over the last 90 days |
| Exercise names | 394 distinct logged names against 231 template names |

An LLM therefore adds value mainly by narrating numbers computed in SQL and by reading the little free text that exists.

**What the market has shipped.** Late-2026 competitors validate AI that drafts programs for coach review: Kahunas' "Whim" "doesn't assign plans or message clients on its own" ([Kahunas 2.0](https://kahunas.io/blog/kahunas-2-0)). Client chat and nutrition AI remain "mostly still marketing" ([Coachway, Sept 2026](https://coachway.io/articles/best-ai-coaching-apps/)).

**Compliance gates before any client data reaches a model:**

- **Apple consent.** Since November 2025, Apple's guideline 5.1.2(i) requires explicit permission before sharing personal data "with third-party AI" ([TechCrunch](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai)).
- **Residency.** Anthropic's first-party API offers only `global`/`us` inference, so data leaves Australia ([Anthropic data residency](https://platform.claude.com/docs/en/manage-claude/data-residency)).
- **Automated-decision disclosure.** Australia's ADM transparency duty starts on **10 December 2026** ([Allens, 2026-10-02](https://www.allens.com.au/insights-news/insights/2026/10/mandatory-automated-decision-making-disclosure-requirements-are-coming-key-takeaways-from-the-oaic-guidance/)). A one-paragraph privacy-policy clause is cheap insurance.
- **Minimization.** The questionnaire contains direct identifiers (name, city, occupation, WhatsApp number in `q1`, `q5`, `q6` and `q7`), so a column whitelist is mandatory.

**Cost.** A Sonnet 5.5 weekly digest costs about **$0.021 per call, roughly $0.09 per client-month**. That is under $5 a month at today's 18–41 active clients ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)).

## Reconciling the numbers the notes disagree on

Where figures differ, the live catalog measured with the more precise method wins. The table names the source of record for each.

| Figure | Values in the sources | Reconciled value | Source of record |
|---|---|---|---|
| Photo bucket size | "885 MB, ~88%" (platform note); 0.928 GB / 0.864 GiB (media note) | 927,962,420 bytes = 885 MiB = 0.928 GB. That is 92.8% of a decimal GB or 86.4% of a GiB. The 88% mixes units | [Media note](../research_notes/Dawnage%20backend%20architecture%202026/media_timeseries_health.md), live SQL |
| Bucket object count | 1,679 (B4, 22 Nov); 1,691 (media, events and platform notes, 27 Nov) | Both correct for their dates. The 12 newest objects are exactly the ones carrying `max-age=0`, which matches uploads since migration 07 | Media note |
| Photo DB references | 1,430 (B6, 22 Nov); 1,406 (media and events notes) | 1,406 now. The drop of 24 fits the 22 Nov dedupe that moved 11 photo rows to a backup table (inference, not verified) | Media note |
| Orphaned objects | "about 285, heuristic" (events note); 285 objects / 139 MiB, canonicalized anti-join (media note) | 285 objects, 139 MiB | Media note |
| Global templates readable by anon | "about 171" workout (identity note); 161 workout + 27 meal (schema and AI notes) | 161 + 27. The identity figure was an estimate | [Schema note](../research_notes/Dawnage%20backend%20architecture%202026/data_model_schema.md), direct count |
| Check-ins and workout logs | 2,094 / 938 (identity note, cost analysis); 2,107 / 946 (schema, sync and AI notes) | 2,107 / 946 exact counts. The smaller pair looks like planner estimates (inference) | Schema note |
| `users` column count | 27 (schema note); 25 (sync and platform notes) | Unresolved. Two notes say 25, and drizzle has 23. Recount in the Phase 2 baseline | — |
| Tables and policies | 19 API tables (identity note); 20 tables (schema and platform notes); 92 policies (both) | 20 tables, one of which (`dedupe_backup_2026_11_22`) has no policies or API grants. That leaves 19 API tables and 92 policies | Schema and identity notes |
| `week_start_date` nulls | 91 rows from dashboard inserts (M3); 107 of 107 (schema and AI notes) | All 107 are null, so M3 understated the impact | Schema note |
| New-table exposure default | "not auto-exposed since 2026-10-30" (22 Nov review); `pg_default_acl` still auto-grants (identity note) | The live catalog wins. Revoke explicitly | [Identity note](../research_notes/Dawnage%20backend%20architecture%202026/identity_authz_api.md) |
| `pg_partman` availability | Documented as available ([Supabase docs](https://supabase.com/docs/guides/database/extensions/pg_partman)); absent from `pg_available_extensions` | Not available on image 17.6.1.037 | Media note |
| Legacy key end date | "end of 2026" (migration guide); "Late 2026, TBC" (blog) | Treat 2026-12-31 as hard | Identity note |
| ADM disclosure start | 10 Dec 2026 (Allens, Maddocks); 11 Dec (ACC) | Plan for 10 Dec | [AI note](../research_notes/Dawnage%20backend%20architecture%202026/ai_layer.md) |
| Scoped PAT GA date | August alpha; "28 Sep" (third party); 2026-10-06 (changelog) | 2026-10-06 | [Scoped PATs changelog](https://supabase.com/changelog/scoped-personal-access-tokens-ga) |
| Activity, last 30 days | 8 users checked in (media note); 11 logged workouts (sync note); 18 clients logged anything (AI note) | Consistent; these are different metrics | Respective notes |
| Photo egress | 1.85 GB/month (media note) | From a 12.6-hour sample on the private bucket's first day. Re-measure over 7 days before planning on it | Media note |

## The late-2026 target keeps Supabase and adds a contract

**The right target for this app fixes its contract and governance, not its scale.** At 152 users and 28 MB, every scale-oriented choice is premature: partitioning, sync engines, materialized views, gateways and agent platforms. Every correctness-oriented choice is cheap and uses primitives already on the project. The target rests on four principles:

1. **Postgres + RLS stays the single source of truth for both apps.**
2. **The mobile app talks only to a versioned, explicitly granted surface**, while base tables evolve behind it.
3. **The database decides; Edge Functions deliver.** Invariants, side effects and alerts originate in SQL transactions. Functions hold only secrets and third-party calls.
4. **Every schema change is a reviewed, tested, replayable migration.**

| Layer | Late-2026 target for Dawnage | Deliberately rejected |
|---|---|---|
| Platform tier | Supabase Pro plus one persistent `staging` branch (about $9.81/mo at $0.01344 per branch-hour). Previews come from Branching without Git, the default since May 2026 ([Supabase blog](https://supabase.com/blog/branching-without-git-is-now-the-default)) | PITR ($100/mo), log drains ($60/mo) |
| Schema workflow | CLI v3 imperative migrations in `supabase/migrations`, baselined with `db pull`, plus a nightly `db diff --linked` drift check. Declarative pg-delta waits for 1.0: today it is pre-1.0 and "DML … is never captured" ([Supabase docs](https://supabase.com/docs/guides/local-development/declarative-database-schemas)) | drizzle, Atlas, pgschema |
| Tests and types | pgTAP in `supabase/tests/database` on a local stack in CI ([Supabase testing](https://supabase.com/docs/guides/database/testing)). It covers persona × table × operation, "RLS enabled on every table", and a contract suite for columns the oldest supported build reads. Types are generated into a shared package, with a `git diff --exit-code` gate ([type generation](https://supabase.com/docs/guides/api/rest/generating-types)) | PGlite simulations |
| Data model | A relational core: `plans` headers, effective-dated `plan_assignments` (`daterange` with a `btree_gist` exclusion constraint), `coaching_relationships` and `client_guidance`. `jsonb` only at the edges, checked by `pg_jsonschema` ([docs](https://supabase.com/docs/guides/database/extensions/pg_jsonschema)). Text-plus-CHECK vocabularies, `moddatetime` triggers, client-minted UUIDv7 ids and `JSON_TABLE` analytics | Postgres enums for vocabularies that keep changing; partitioning |
| API contract | An `api_v1` schema of explicit-column `security_invoker` views plus RPCs for every mobile write. The client selects it with `db: { schema: 'api_v1' }`. One `app_release_policy` table drives both the in-app update screen and a `pgrst.db_pre_request` gate keyed on `X-Client-Info`. `api_v2` exists only for a change that cannot be made additively | pg_graphql, raw tables, a gate on its own |
| Identity | Publishable and secret keys, asymmetric JWT signing, and a role claim in `app_metadata`. STABLE helpers (`is_admin`, `my_client_ids`) in an unexposed `private` schema, wrapped as initPlans, giving about 46 policies instead of 92. anon revoked. TOTP MFA for staff, enforced by a restrictive `aal2` policy that exempts clients ([Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)). Coaches join by admin invite. PKCE for password reset | Coach lists in the JWT; anonymous sign-ins; passkeys (still beta) |
| Mobile data | The existing outbox on top of server idempotency, a persisted TanStack Query cache (scoped per user, with a version buster), one root flusher with backoff, and `expo-background-task` as a best-effort extra ([Expo docs](https://docs.expo.dev/versions/latest/sdk/background-task/)) | PowerSync or TanStack DB until a trigger appears (thousands of users, frequent coach edits, or a persistent waterfall) |
| Events | A `notifications` table as both inbox and outbox, written through a transactional `notify()`. Private Broadcast topics `coach:{id}` and `user:{id}` carry ids only. A pgmq `push` queue is drained by cron into Expo Push (100 per request, 600/s, receipts after about 15 min) ([Expo push docs](https://docs.expo.dev/push-notifications/sending-notifications/)). `notification_prefs` holds an IANA timezone and quiet hours | Database webhooks without retry, external schedulers, a generic `domain_events` table |
| Derived data | One `security_invoker` view, `coach_client_summary`, shared by the dashboard and the cron alerts, with the package end date computed in SQL | Materialized views (no RLS), pg_ivm (not offered), Analytics Buckets (private alpha) |
| Edge Functions | `config.toml` per function, `withSupabase({ auth })`, a shared HTTP helper with error codes and request ids, and one JSON log line per request | A hand-rolled auth helper |
| Media | Full and thumbnail WebP renditions encoded on the device. Bucket limited to `image/jpeg,image/webp` and 2 MB. Signing batched with `createSignedUrls(…, 3600)` ([reference](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurls)), with `cacheKey = path` and `cachePolicy="memory"`. Delete on replace, a monthly reconciliation and an export-my-data function | Server-side transforms (Pro only, about $5 per 1,000 images), TUS, AVIF |
| Health and time-series | Per-day aggregates plus `tz`, `sources jsonb` and range CHECKs. A `health_daily` table only if passive sync is ever built | Raw samples, TimescaleDB, pgsodium |
| Observability | Sentry in both apps with source maps and release health. Supabase Metrics API into Grafana Cloud alerts ([Metrics API](https://supabase.com/docs/guides/telemetry/metrics)). Uptime pings | OTLP log drains for now |
| AI | An `ai` schema with SQL flags first. A pgmq → Edge Function → Claude Messages API pipeline using structured outputs. Drafts that a coach approves through an RPC with optimistic concurrency. A consent table enforced at enqueue, per-coach budgets, ZDR, and no Batch or Covered Models for client data ([Anthropic retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)) | Managed Agents, AI gateways, client chatbots, vision on body photos |
| Repo | npm workspaces: `apps/web`, `apps/mobile` and one `packages/shared` holding the generated types and zod payload parsers ([Expo monorepos](https://docs.expo.dev/guides/monorepos/)) | Turborepo or Nx; split packages |

**Three of the notes proposed different version gates, and the target merges them.** The data-model note wanted an `x-app-version` header plus an `app_config` row. The identity note wanted a `db_pre_request` check on `X-Client-Info`. The platform note wanted an `app_release_policy` table that the app reads on launch. The merged design uses one table:

- The app reads it on launch for a friendly update screen. It offers a store link when the build is too old, or `Updates.fetchUpdateAsync()` when only the OTA is stale.
- The server enforces the same row in `private.check_request()`.
- Auth, Storage and `delete-account` stay outside the gate, so an outdated user can still sign out or delete their account.

The marker rides in `X-Client-Info`, which the edge already logs. A custom header is the fallback if supabase-js will not let the default be overridden; that is unverified.

**The steady-state bill is about $35–60 a month.** That covers Pro, a staging branch, occasional previews, and free tiers of Expo, Sentry and Grafana, whose quotas are unverified ([platform note](../research_notes/Dawnage%20backend%20architecture%202026/platform_devops.md)). AI adds about $0.09–0.35 per client-month by phase ([AI note](../research_notes/Dawnage%20backend%20architecture%202026/ai_layer.md)).

## A ten-phase plan that never strands an installed build

Six rules govern every phase:

1. **Installed builds.** Today the only installed build is an internal Android preview from 19 September (R3). The owner should confirm that, then retire it. **Store build 1 is the first long-lived binary.** From the day it ships, `api_v1` and the legacy `public` shapes it reads are frozen until the minimum-version gate retires it.
2. **Expand → migrate → contract.** Add nullable structures and bridge triggers. Switch the dashboard first, since Vercel force-updates it. Switch the app in its next release. Drop old structures only after telemetry shows no writes from old `app_version` values for an agreed window (60 days is the proposal).
3. **Never retype a column the app parses as text.**
4. **Constraints go on `NOT VALID` first, then `VALIDATE`**, and only after confirming that the current app's payloads pass.
5. **After the Phase 2 baseline, production DDL goes only through CI** (`supabase db push` behind a GitHub Environment with a required reviewer). Ad hoc SQL-editor changes stop.
6. **Every destructive production step needs explicit owner approval, a fresh restorable backup and a rehearsal on the staging branch.** That means anything that rewrites or deletes data, revokes access or keys, or drops schema.

| Phase | When | Scope | Production effect | Exit check |
|---|---|---|---|---|
| **0. Safety net** | This week | Manual dump and bucket export, then Pro. Delete the drizzle/`db:push`/`server/` stack. Root `npm ci`, branch protection and a wider CI path filter. Remove the `send-welcome-email` call. Add a `subscribe(status)` refetch on the dashboard. Create publishable and secret keys. Identify the `service_role` writer. Move secrets out of the everyday `.env` | Additive (keys); billing | CI green on `main`; the dump restores into a branch |
| **1. Freeze the mobile contract** | Before store build 1 | Workspaces monorepo, then `expo-updates` with a fingerprint runtime and channels. `X-Client-Info` marker. `api_v1` views and RPCs (`save_check_in`, `save_workout_log`, `save_measurement`, `save_progress_photos`, `submit_weekly_check_in`, `save_profile`, `save_assessment`). Empty `app_release_policy` gate. Role mirrored to `app_metadata` as well. Publishable key in EAS (R2). Client UUIDv7 ids. Classifier fix, root flusher and persisted cache. Sentry source maps and sessions. `delete-account` on `withSupabase` with `verify_jwt = false` | Additive schema; `auth.users` metadata backfill | Contract tests pass; build 1's requests carry the marker |
| **2. Governable schema** | Weeks 2–3 | Pin CLI v3. `migration repair` (metadata only), then `db pull` baseline, then an empty `db diff --linked`. pgTAP suite porting the 39 checks. Type generation with a diff gate. Staging branch. Archive `sqlmigrationfiles/`. Rehearse the 17.x minor upgrade on staging, then apply it in a quiet window | Migration metadata; upgrade downtime | Drift check empty in CI; types typed in both apps |
| **3. Key rotation** | December, done by 31 Dec | Dashboard on the publishable key. Seven days of zero legacy-apikey traffic in edge logs. Migrate the JWT secret, then rotate to asymmetric keys. Deactivate the legacy keys (reversible). Revoke the legacy secret at least 1 h 15 min after rotation | Signing change; revocation is irreversible | No legacy apikey in edge logs; nobody signed out |
| **4. Authorization consolidation** | One quiet window after Phase 2 | `private` helpers. `users(coach_id)` index built concurrently. Policies swapped table by table, one transaction each (this closes M1). Revoke anon. Explicit default privileges. RPC for listing unassigned clients. Routing switched to `app_metadata`. Staff TOTP enrolment, then restrictive `aal2` policies. `signOut({ scope: 'others' })` after staff sign-in | Access semantics change | pgTAP matrix green on staging, then on production; per-table rollback ready |
| **5. Integrity expand** | Weeks 4–6 | `moddatetime` triggers. CHECKs as `NOT VALID`. Vocabulary normalization. `week_start_date` backfill plus default trigger. `plans`, `plan_assignments`, `coaching_relationships` and `client_guidance` with two-way bridge triggers. `assign_plan`, `claim_client` and `unassign_client` RPCs. Coach-history trigger. Dashboard switched over | Additive tables; data UPDATEs | Dashboard metrics match a sample of 5 clients; no rejected writes in the logs |
| **6. Event layer** | Weeks 5–8 | Enable pg_cron, pg_net and pgmq. Vault secrets using the new secret key. `notifications`, `notify()`, `realtime.messages` policies and Broadcast triggers, run in parallel with `postgres_changes` for a week. `coach_client_summary`. Coach alerts. `cron-prune`. Push tokens plus `push-dispatch` and `push-receipts`. Then trim the publication and disable public Realtime access | Additive, then publication changes | Coach A cannot join `coach:B`; alerts fire once per coach per day |
| **7. Media** | Next app release, plus owner jobs | WebP full and thumbnail renditions, a `.webp` regex, the EXIF fixture test, batched signing and delete-on-replace. `tz`, `sources` and range CHECKs on check-ins. Tighten the bucket once clients are verified to send only JPEG under 2 MB. Backfill URLs to paths. Orphan sweep. Legacy re-encode. `export-my-data` | Bucket policy; deletions; byte rewrites | Bucket under 50% of quota; CDN MISS rate falls on a 7-day re-measure |
| **8. AI** | Privacy clause before 10 Dec; the rest after Phase 6 | ADM and AI-subprocessor clauses. `ai.consents` and the consent screen. SQL flags. Sonnet 5.5 digest in shadow mode for 2–3 coaches. Later, an Opus 5.5 copilot whose drafts pass through `approve_draft` | Additive | At least 80% of digests approved without edit; zero failures of the "every number comes from SQL" check |
| **9. Contract** | At least 60 days after telemetry shows no pre-Phase-1 builds, and after the gate has been raised | Drop the reverse bridge triggers, the legacy text pointers and note columns, `progress_photos`, `user_goals`, `workout_plans.notes` and `dedupe_backup_2026_11_22`. Revoke direct grants the app no longer uses | Irreversible drops | No write from an old `app_version`; pgTAP `040_contract` updated |

The ordering constraints matter more than the calendar:

- **Phase 1 must ship before store build 1.** The workspace move changes the fingerprint, and only build 1 can carry the gate, the marker and the publishable key.
- **`delete-account` must leave `verify_jwt` before Phase 3's rotation.**
- **The legacy JWT secret is revoked only after the legacy API keys are deactivated.** Those keys are themselves JWTs signed by that secret.
- **The restrictive `aal2` policies go on only after all ten staff have enrolled.**
- **Broadcast runs in parallel with `postgres_changes` before the publication is trimmed.**
- **Bucket tightening waits until no client still uploads raw `.jpeg` files.** Six post-April objects over 1 MB suggest an old web client is still doing so.
- **Phase 4 needs Phase 2's pgTAP suite.** Today's only permission harness runs by hand against production.

These are the steps that require the owner's explicit approval, each preceded by a verified backup:

| Step | Phase | Why it needs approval | Rollback |
|---|---|---|---|
| Pro upgrade | 0 | Billing | Downgrade |
| `auth.users` `app_metadata` backfill (152 rows) | 1 | Writes auth records | Re-run from `users.role` |
| `migration repair` and baseline | 2 | Rewrites migration metadata | Restore `schema_migrations` from the dump |
| Postgres 17.x minor upgrade | 2 | Downtime; `pg_cron` is dropped and recreated ([Supabase upgrading](https://supabase.com/docs/guides/platform/upgrading)) | Platform restore |
| Deactivating legacy keys; revoking the legacy JWT secret | 3 | Breaks any remaining legacy caller; the revocation cannot be undone | Reactivate the keys (the revocation has no rollback) |
| Policy swap, anon revoke, `aal2` enforcement | 4 | Changes who sees what | Per-table transaction rollback script |
| Vocabulary normalization (about 1,532 rows) and `week_start_date` backfill (107 rows) | 5 | Rewrites client data | Restore from backup copies in a non-exposed schema |
| Plan-day dedupe (19 groups) | 5 | Deletes rows, and UUIDs carry no order | Backup copies; coach decides ambiguous cases |
| Publication trim; disabling public Realtime access | 6 | Ends the old realtime path | Re-add the tables |
| Bucket MIME and size tightening | 7 | Can reject uploads from older clients | Restore the previous limits |
| Orphan sweep (285 objects) and legacy re-encode (336 objects) | 7 | Deletes or rewrites photo bytes | Bucket export taken beforehand |
| Bulk session cleanup | 4 | Signs users out | None needed; users sign in again |
| Contract drops | 9 | Irreversible schema loss | Backup restore only |

## Conclusion

The release-readiness work fixed what a client could exploit. What remains is what the team itself could break, and the platform currently gives it no way to recover:

- no backups;
- a migration history that matches nothing;
- CI that was red while reviews reported green;
- a loaded `db:push`;
- a contract with the mobile app that exists only implicitly.

The best late-2026 architecture for Dawnage is mostly removal and formalization rather than new infrastructure. It deletes a dead server stack, folds three type systems into one generated file, replaces 93 hand-written table writes with a dozen RPCs, and turns a set of browser-side computations into one SQL view that both the dashboard and the alert jobs read.

The window to do this cheaply is unusually short and unusually favorable. No store binary exists yet, no client depends on the legacy key, and the database is small enough that every backfill finishes in seconds. Five weeks from now, the legacy-key deadline will have passed. The first store build will also have frozen whatever contract it shipped with, for months, on phones nobody can update remotely. So the order of work is the main decision: **backups and CI this week, the mobile contract before build 1, key rotation before 31 December**. Everything after that can proceed at the team's own pace through reversible, tested, owner-approved migrations.

# Dawnage data model and schema architecture: current state and a late-2026 target

Scope: the live Supabase database (project `hzifwkebzhzlxvigbcup`, ap-southeast-2) and the code's assumptions about it (`client/`, `mobile/`, `shared/`, `server/`, `supabase/`). Researched 2026-11-27.

Evidence conventions:
- **[live SQL]** means a read-only catalog or aggregate query run on 2026-11-27 through the Supabase MCP `execute_sql` / `list_tables` tools. Only aggregates were read. No personal values were printed. Category labels such as `'Done'` or `'GYM_WORKOUT'` are app vocabulary, not personal data.
- `path:line` is the repo working tree on branch `codex/native-ui-modernization`, with `main` at `97f74c0`.

Already covered elsewhere and not repeated as findings: RLS holes, admin escalation, private photos, the one-per-day unique rules, account deletion, M1 (clients can write plan rows), M2 (clients can edit `coach_id`/`package_*`/`coach_note`), M3 (dashboard omits `week_start_date`) and the performance-advisor counts. See `mobile/docs/review/2026-11-22-release-readiness/README.md` and `mobile/docs/review/2026-11-27-status-review/README.md`.

---

## Q1. What exists in the live schema, and what is stored as JSON or text blobs?

### Takeaway
The app schema is 20 tables in `public` and is weakly typed:
- No enums, domains, views or app schemas other than `public`.
- 2 CHECK constraints in the whole schema.
- No `updated_at` triggers.
- Seven core values are JSON serialized into `text` columns. Only `users.profile_data` is real `jsonb`.

The blobs are small and very regular. Every stored workout log is still the legacy array format, and the plan "pointers" are four-key JSON strings standing in for foreign keys. All of this data can be typed. At 28 MB in total, no table needs partitioning.

### Cited Findings

**Server, size and extensions**
- Server: `PostgreSQL 17.6` (server_version_num 170006), 28 MB in total. The largest table is `workout_logs` at 1.4 MB, then `workout_plans` at 1.3 MB [live SQL: `version()`, `pg_database_size`, `pg_total_relation_size`].
- Supabase shipped the `17.11` minor on 2026-09-25 ("fixes 44 CVEs"), so this project is several minors behind — [Supabase changelog, entry 2026-09-25](https://supabase.com/changelog.md).
- Installed extensions: `pg_stat_statements`, `pgcrypto`, `uuid-ossp` and `supabase_vault` [live SQL: `pg_available_extensions`].
- Available but not installed: `pg_jsonschema 0.3.3`, `pg_cron 1.6.4`, `pgmq 1.5.1`, `pgaudit 17.0`, `btree_gist 1.7`, `moddatetime 1.0`, `pgtap 1.2.0`, `plpgsql_check 2.7`, `index_advisor 0.2.0` and `pg_graphql 1.5.11`. `pg_graphql` being absent means the GraphQL API is off [live SQL].

**Schemas and object kinds**
- The only non-system schemas are `public`, `auth`, `storage`, `realtime`, `vault`, `extensions`, `graphql*` and `supabase_migrations`. There is no `private` or `api` schema [live SQL: `pg_namespace`].
- No enum, domain or composite types exist in `public`. There are no views and no materialized views [live SQL: `pg_type`, `pg_views`, `pg_matviews`].

**Tables, with row counts** [live SQL: `list_tables`]

| Group | Table (rows) |
|---|---|
| Accounts | `users` (152) |
| Daily and weekly tracking | `daily_check_ins` (2,107), `weekly_check_ins` (107), `body_measurements` (259), `weekly_progress_photos` (366) |
| Training | `workout_logs` (946), `workout_plans` (956), `workout_templates` (179) |
| Nutrition | `meal_plans` (368), `meal_templates` (28), `food_items` (601) |
| Onboarding | `onboarding_questionnaire` (118) |
| Business | `client_payments` (55), `payment_transactions` (56), `coach_client_history` (200), `coach_commissions` (6), `coach_payouts` (0) |
| Unused | `progress_photos` (0), `user_goals` (0) |
| Leftover | `dedupe_backup_2026_11_22` (112) |

**Constraints** [live SQL: `pg_constraint`]
- CHECK: only 2 in the whole schema. Both are on `coach_payouts`: `payout_month between 1 and 12` and `payout_year >= 2020`.
- UNIQUE:
  - `(user_id,date)` on `daily_check_ins`, `body_measurements` and `weekly_progress_photos`
  - `(user_id,week_start_date)` on `weekly_check_ins`
  - `client_payments(client_id)`
  - `coach_commissions(coach_id)`
  - `coach_payouts(coach_id,payout_month,payout_year)`
- Foreign keys:
  - Most `user_id` columns reference `public.users(id) on delete cascade`.
  - Two reference `auth.users` directly instead: `workout_logs.user_id` and `onboarding_questionnaire.user_id`.
  - `users.coach_id → users(id) on delete set null`.
  - `client_payments.client_id → users on delete set null`.
  - `workout_templates.coach_id` and `meal_templates.coach_id → users on delete cascade`.
- No FK links any plan row to a template, any log to a plan, or a meal plan to a meal template.

**Indexes** [live SQL: `pg_indexes`]
- 33 non-PK indexes.
- 8 are redundant, because a composite or unique index already leads with the same column(s):

| Redundant index | Already covered by |
|---|---|
| `idx_daily_check_ins_user_id` | `daily_check_ins_user_date_key` |
| `idx_body_measurements_user_id` | the unique `(user_id,date)` index |
| `idx_workout_logs_user_id` | `idx_workout_logs_user_date` |
| `idx_workout_plans_user_id`, `idx_workout_plans_level` | `idx_workout_plans_hierarchy` |
| `idx_meal_plans_user_id` | `idx_meal_plans_level` |
| `idx_client_payments_client_id` | the unique index on `client_id` |
| `idx_coach_commissions_coach_id` | the unique index on `coach_id` |

- Three standalone `date` indexes (`idx_*_date`) serve queries that never filter on date alone.
- `users(coach_id)` has no index. This is already known as L3.

**Triggers** [live SQL: `pg_trigger`]
- `on_auth_user_created` on `auth.users`, running `handle_new_user`.
- `trg_auto_set_start_date`: AFTER INSERT on `daily_check_ins`.
- `guard_users_privileged_columns`: BEFORE INSERT OR UPDATE on `users`.
- `sync_role_to_auth_metadata`: AFTER UPDATE OF role on `users`.
- There is **no `updated_at` maintenance trigger on any table.**

**Functions** [live SQL: `pg_proc`]
- 9 functions in `public`, all `SECURITY DEFINER`: `auto_set_package_start_date`, `get_my_coach`, `guard_users_privileged_columns`, `handle_new_user`, `is_admin`, `is_coach`, `is_coach_of`, `progress_photo_can_read` and `sync_role_to_auth_metadata`.
- All have `search_path=""` except `get_my_coach`, which uses `search_path=public`.

**Realtime publication** [live SQL: `pg_publication_tables`]
- `supabase_realtime` covers `users`, `daily_check_ins`, `body_measurements`, `weekly_check_ins`, `weekly_progress_photos`, `workout_logs` and `workout_templates`.

**Column-type inconsistencies** [live SQL: `information_schema.columns`]
- `timestamp without time zone` is used in `client_payments`, `coach_commissions`, `coach_payouts`, `food_items`, `meal_templates`, `payment_transactions` and `weekly_progress_photos`. Every other table uses `timestamptz`.
- ID defaults mix `uuid_generate_v4()` (uuid-ossp) and `gen_random_uuid()`.
- Numerics carry precision, for example `daily_check_ins.morning_weight numeric(5,2)` and `client_payments.total_amount numeric(10,2)`.
- No table has a currency column.

**Migration history** [live SQL: `supabase_migrations.schema_migrations`; repo `ls supabase sqlmigrationfiles`]
- 8 rows: 7 dated 2026-11-22 and `private_progress_photos` dated 2026-11-26.
- About 75 older hand-applied files in `sqlmigrationfiles/` have no recorded history.
- There is no `supabase/config.toml` and no `supabase/migrations/` directory. `supabase/` holds only `functions/`.

**Blob shapes, measured on live data** [live SQL: `pg_input_is_valid(col,'jsonb')`, `jsonb_each`, `jsonb_array_elements` and `percentile_cont` over `octet_length`; only key names and counts were read]

| Column (declared type) | Non-null / rows | Valid JSON | Shape | Size p50 / max |
|---|---|---|---|---|
| `users.active_workout_plan` (text) | 123 / 152, all clients | 123 | Object with exactly `level`, `workoutType`, `daysPerWeek` (number) and `subCategory` (string or null) | 90 / 99 B |
| `users.active_meal_plan` (text) | 55 / 152 | 55 | Object `{calories: number, dietType: string}` | 45 / 45 B |
| `users.profile_data` (jsonb) | 152, of which 93 are `{}` | 152 | Flat string map. Key counts: `goal` 58, `injuries` 58, `timezone` 58, `medicalCondition` 57, `allergies` 53, `workoutDays` 53. One `primary_goal`, a stray alias. | 2 / 947 B |
| `users.supplements_data` (text) | 49 | 49 | Array of `{id, name, serving, timing}` objects, 274 items, all keys strings | 660 / 1,186 B |
| `workout_logs.content` (text) | 946 / 946 | 946 | **All 946 are legacy arrays; 0 are app v2 objects.** 5,738 exercise entries `{exercise, sets}` and 15,967 sets `{setNumber: number, weight: string, reps: string, rpe: string}`. Entries per log: p50 6, max 9. | 1,137 / 1,770 B; 1.0 MB total |
| `workout_plans.exercises` (text) | 956 | 956 | Arrays, 10 of them empty. 5,434 entries `{name, reps: string, sets: null/number/string, id (5,387), videoLink (3,899), notes (2,169)}` | 821 / 1,506 B |
| `workout_templates.exercises` (text) | 179 | 179 | Arrays, 2 of them empty. 891 entries `{name, reps, sets: number/string, videoLink (62), notes (25)}` | 346 / 1,057 B |
| `meal_templates.content` (text) | 28 | 28 | Object with exactly `breakfast`, `mid_morning_snack`, `lunch`, `evening_snack` and `dinner`, each an object | 831 / 862 B |
| `meal_plans.description` (text) | 368 | **0** | Plain text, not JSON | 61 / 142 B |
| `onboarding_questionnaire.answers` (text) | 118 | 118 | Flat object, 91 distinct keys overall, p50 80 keys per row (max 87). Only 2 rows carry `__assessment_catalog_version: 2`; 116 have no version marker. | 2,680 / 14,741 B; 351 KB total |
| `onboarding_questionnaire.completed_sections` (text) | 118 | 118 | Array of 10 distinct section ids | 160 / 160 B |
| `workout_plans.notes` (text) | 0 | n/a | A dead column | n/a |

**Value-level data quality** [live SQL]
- Set values are strings but nearly all numeric: 1 of 15,967 `weight` values and 2 `reps` values fail `pg_input_is_valid(...,'numeric')`.
- Exercise names are free text:
  - 394 distinct names (case-insensitive) across logs
  - 560 across `workout_plans`
  - 231 across `workout_templates`
  - 24 logged names appear in no plan or template
- `daily_check_ins.workout_status` has 9 spellings: `done` 720, `Done` 466, `no` 271, `No` 127, `rest_day` 187, `Rest` 114, `cardio_day` 78, `Cardio` 60, and null 84. The capitalized forms were last written in 2026-07.
- `digestion` has 8 values in 4 case pairs: `none` 947 / `None` 720, `bloated` 65 / `Bloated` 20, `constipated` 28 / `Constipated` 20, `diarrhea` 34 / `Diarrhea` 5. The capitalized forms were last written in 2026-07.
- Out-of-range values:
  - `workout_performance = 0` in 26 rows, against a 1–10 scale.
  - `morning_weight` outside (0, 400] in 2 rows.
  - `sleep_hours` outside [0, 24] in 1 row.
  - `body_measurements` with all five measures null: 1 row.
  - `weekly_progress_photos` with all four URLs null: 8 rows.
- `weekly_check_ins.week_start_date` is **null in all 107 rows**. The `(user_id, week_start_date)` unique key therefore constrains nothing today, because NULLs are distinct.
- `weekly_progress_photos.front_url`: 353 rows hold `http…` URLs, 3 hold storage paths and 10 are null.
- `updated_at` is effectively never maintained. It differs from `created_at` in only 0 of 946 `workout_logs`, 1 of 2,107 `daily_check_ins` and 2 of 152 `users`.
- 2 `auth.users` rows have no `public.users` row.
- `dedupe_backup_2026_11_22` holds 112 rows of `row_data jsonb` copies of personal rows (93 daily check-ins, 11 photo rows, 8 measurements) inside `public`. It has RLS on, 0 policies, and no anon or authenticated grants.

### Inferences
- The blobs are already de facto schemas. Every `active_*_plan`, `supplements_data`, `meal_templates.content` and `workout_logs.content` row has one stable key set. So typing them costs data migration only, not reverse engineering. The only exception is the 2 to 3 numeric-parse failures in sets.
- The absence of `updated_at` triggers is a hidden blocker for any future delta sync, conflict detection or "coach changed this" notification. The column exists but means "created".
- No table needs partitioning, TimescaleDB or BRIN. At about 300 new logs a quarter (Q3), plain btree on `(user_id, date)` will stay sufficient for years.

### Gaps
- I did not read `pg_stat_user_indexes.idx_scan`, so the "unused date index" claim is inferred from code access patterns, not measured.
- RLS policies were deliberately not re-audited, because they are already covered.

---

## Q2. Where do the code's types come from, and is there drift?

### Takeaway
Nothing is generated from the database:
- The drizzle schema `shared/schema.ts` is imported by **no** code and has drifted badly.
- Both supabase-js clients are untyped (`createClient` without `<Database>`), so every query result is effectively `any`.
- Each app hand-writes its own row types.

The drizzle file is still wired to `drizzle-kit push` against the **live** database URL. That is a live data-loss hazard.

### Cited Findings
- `grep` finds no import of `shared/schema` anywhere in `client/src`, `mobile/src`, `mobile/app`, `server` or `shared` (repo grep).
- The only consumers are `drizzle.config.ts` (schema `./shared/schema.ts`, `dbCredentials.url = process.env.DATABASE_URL`) and the scripts `"db:push": "drizzle-kit push"` and `"db:studio"` in `package.json:12-13`.
- The repo `.env` defines `DATABASE_URL`, and it points at this Supabase project ref. The value was not printed; the check was a pattern match only.
- Neither client is typed:
  - `client/src/lib/supabase.ts:14` calls `createClient(supabaseUrl, supabaseAnonKey, …)`.
  - `mobile/src/lib/supabase.ts:7` calls `createClient(`, also with no `Database` generic.
  - No `database.types.ts`, `Tables<>` or `supabase gen types` exists anywhere in the repo (repo grep).
- The mobile types say outright that they are hand-written: `mobile/src/types/db.ts:1` reads "Row types hand-written per plans/01-data-contracts.md (schema.ts is stale)". It defines `Numeric = string | number | null` because "supabase-js returns numerics as strings".
- The dashboard has its own separate hand-written interfaces, for example `client/src/hooks/useTemplates.ts:10-47` (`WorkoutHierarchyKey`, `Exercise`, `DayPlan`) and `client/src/lib/checkin-utils.ts:6` (`RawDailyCheckIn`).

**Drift between `shared/schema.ts` and the live database** [repo vs live SQL]
- `users`:
  - Drizzle has `country_code` (`shared/schema.ts:16`); the live DB has `country`.
  - Drizzle lacks `profile_data`, `onboarding_step` and the rest of the post-2025 columns.
  - Drizzle uses `timestamp` where the DB uses `timestamptz`.
- `daily_check_ins`: drizzle keeps `day_number` (`shared/schema.ts:66`), which the DB dropped (`sqlmigrationfiles/remove_day_number_from_daily_checkins.sql`).
- `workout_plans`: drizzle marks `level`, `workout_type`, `days_per_week` and `day_number` as `.notNull()` (`shared/schema.ts:132-136`). All four are nullable in the DB.
- `progress_photos`: drizzle gives it `diet_type`, `calories_target` and `ingredients` (`shared/schema.ts:243-245`, apparently pasted from meal plans). The DB has `photo_type` and `notes`.
- `onboarding_questionnaire.user_id`: drizzle references `users.id`; the DB FK targets `auth.users`.
- `weekly_check_ins` is absent from drizzle entirely, as is `dedupe_backup`.
- `client_payments.client_id`: drizzle has `.notNull()` and `onDelete: cascade`. The DB has it nullable with `on delete set null`, changed by migration 08.

**Vocabulary drift**
- `package_type` live values: `elite` 84, `standard` 40, `premium` 2, `intermediate` 2, `beginner` 1 [live SQL].
- The dashboard type is `'elite' | 'standard' | 'beginner'` (`client/src/components/PackageSelectDialog.tsx:20`).
- The drizzle comment says `'premium', 'intermediate', 'basic'` (`shared/schema.ts:22`).

**Supabase's documented practice** — [Generating TypeScript Types](https://supabase.com/docs/guides/api/rest/generating-types), docs page fetched 2026-11-27:
- Generate `database.types.ts` with `supabase gen types typescript --project-id …`.
- Pass it as `createClient<Database>(…)`.
- Optionally overlay JSON column shapes with `MergeDeep`. Typed `->`/`->>` JSON selectors work from supabase-js v2.48.0.
- The page shows a nightly GitHub Action that regenerates the types.

**Supabase's documented migration workflow** — [Local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows), docs page fetched 2026-11-27:
- For an existing project, run `supabase db pull` to capture a baseline migration and mark it applied.
- Then use `supabase migration new` or the declarative `supabase/schemas/` files with `db diff`. The diff engine is now `pg-delta`.
- Regenerate types after every schema change.
- Declarative schema management with pg-delta entered public alpha on 2026-04-16 — [Supabase changelog](https://supabase.com/changelog.md).

### Inferences
- **Live hazard:**
  - Running `npm run db:push` from the repo root would diff the live database against a stale schema. That schema lacks `weekly_check_ins`, `profile_data`, `country`, `onboarding_step` and other columns.
  - drizzle-kit would then propose destructive statements. I did not verify how it handles tables that are absent from the file, and **this should not be tested against production**.
  - Removing the `db:push`/`db:studio` scripts and the `drizzle-orm`/`drizzle-zod`/`drizzle-kit` dependencies (or pointing `drizzle.config.ts` at nothing) is a zero-risk first step.
- Drift is guaranteed while three hand-maintained type sets exist: drizzle, `mobile/src/types/db.ts` and the dashboard interfaces.
- The cheapest correct fix:
  1. Run `supabase db pull` to get a baseline.
  2. Generate `shared/database.types.ts`.
  3. Add a `shared/json-shapes.ts` that `MergeDeep`s the typed JSON shapes in.
  4. Type both clients.
  5. Add a CI check that fails when the generated types change without a migration.
- `server/` is dead weight: `server/routes.ts` registers no routes. The `dev`/`build:full`/`start` scripts in `package.json:7-10` still build it, but Vercel deploys the SPA. It is irrelevant to the data model and could be deleted.

### Gaps
- I did not confirm whether any developer machine or CI runs `db:push`. Its git history was not examined.

---

## Q3. How is the coaching domain modelled, and which concepts are implicit or duplicated?

### Takeaway
The domain is modelled as "one wide `users` row plus per-client copies":
- Coach assignment, package, billing state, plan pointers, coach-authored guidance and onboarding progress all live on `users` (27 columns).
- A plan is not an entity. It is an implicit hierarchy key (`level, workout_type, sub_category, days_per_week`) shared by copied day rows, and it is "pointed at" by a JSON string.
- Assignment history, plan versions and the log↔plan link do not exist.
- Multi-step writes (assign a plan, change a coach) run as unordered client-side round trips with no transaction.

### Cited Findings

**`users` is the aggregate root for everything**
- Its 27 live columns include:
  - `role`, `coach_id`
  - `package_type`, `package_duration`, `package_start_date`
  - `active_workout_plan`, `active_meal_plan`
  - six coach-authored notes: `cardio_note`, `steps_note`, `supplements_note`, `training_note`, `nutrition_note`, `coach_note`
  - `supplements_data`
  - `onboarding_step`, `profile_data`
  - `can_edit_global_templates`
  
  [live SQL]
- The dashboard touches `.from('users')` 32 times; the app 8 times (repo grep of `\.from\('…'\)`).

**Coach ↔ client relationship**
- It is a single nullable `users.coach_id`. 88 clients are assigned and 54 are not [live SQL].
- History is a separate app-written event log, `coach_client_history`: 144 `assigned` and 56 `unassigned` events. No trigger ties it to `coach_id` changes.
- 41 unassigned clients still carry a `package_type` [live SQL].

**Packages and payments**
- Package state is three loose columns on `users`.
- `client_payments` has `UNIQUE(client_id)`, so there is one payment record per client ever and renewals cannot be represented.
- `payment_status` is stored, not derived: 1 record has transactions summing to more than `total_amount` [live SQL].
- No currency is stored. `payment_method` is null in 37 of 56 transactions [live SQL].

**Templates**
- `workout_templates` and `meal_templates` use `coach_id IS NULL` to mean global (161 workout and 27 meal rows) and non-null to mean private (18 workout and 1 meal) [live SQL].
- A workout "template" is not one row. It is the set of day rows sharing `(level, workout_type, sub_category, days_per_week)`, indexed by `idx_workout_templates_hierarchy`.

**Assigned plans are copies, not references**
- Assigning a workout runs, per client and in a JS loop:
  1. `delete from workout_plans where user_id = client` (all of the client's plans)
  2. `insert` the template days
  3. `update users set active_workout_plan = JSON.stringify({level, workoutType, subCategory, daysPerWeek})`

  This is in `client/src/hooks/useTemplates.ts:686-740`. Meal plans follow the same pattern at `:742-800`.
- There is no transaction, no template FK and no record of the previous plan.
- The meal path writes `meal_type: 'Mid-Morning Snack'` (`useTemplates.ts:751`). Every live row says `Mid Morning Snack` (73 rows), so a second writer with a different vocabulary exists [live SQL].

**Plan resolution happens on the client**
- The app reads the pointer and filters `workout_plans` on the four hierarchy columns. It falls back to *global* templates when the client has no rows (`mobile/src/hooks/usePlans.ts:150-215`).
- Live state [live SQL]:
  - 102 clients have `workout_plans` rows: p50 8 rows and 2 distinct plan keys each, max 38 rows and 7 keys. Old plans accumulate.
  - Of 123 pointers, 100 resolve to the client's own rows. 21 clients have a pointer but no own rows, 1 has a level mismatch and 1 a type mismatch. All 23 silently fall back to a global template.
  - 19 `(user, plan key, day_number)` groups are duplicated.
- The app dedupes those with "Keep the highest id when a day_number repeats" (`usePlans.ts:188`). With random UUIDv4 keys, "highest id" is an arbitrary row, not the newest one.

**Two formats for workout logs**
- The app defines `WorkoutContentV2 = { version: 2; planDayNumber: number | null; exercises: ParsedExercise[] }` (`mobile/src/lib/workout-content.ts:33-37`).
- The parser accepts three historical shapes, including legacy `{Exercise, Sets, …}` objects and plain text (`mobile/src/lib/workout-content.ts:1-7`, `:138-150`). The dashboard has a parallel parser (`client/src/lib/workout-record.ts:1-60`).
- The live DB holds 0 v2 rows [live SQL].
- `planDayNumber`, the only log↔plan link, exists only inside v2 JSON. The table has no `plan_id` or `plan_day` column.

**Check-ins**
- Daily check-ins are a 21-column typed table. This is good.
- Weekly check-ins are 16 free-text answer columns plus a coach `feedback` column, filled in 43 of 107 rows [live SQL]. Adding a question means a DDL change and an app release.
- Onboarding answers are the opposite extreme: one text blob with 91 keys and a mostly absent version marker (Q1).

**Measurements and photos**
- `body_measurements` is one row per day with five fixed numeric columns.
- `weekly_progress_photos` has four fixed URL or path columns per date.
- `progress_photos` (0 rows) and `user_goals` (0 rows) are unused duplicates of these concepts [live SQL].

**Health data**
- No table stores HealthKit or Health Connect data. The app's `features/health` maps it into existing check-in fields such as `daily_steps`. No separate table or provenance column was found (repo `ls mobile/src/features`; live table list).

**How the app writes**
- Every app write is select-then-insert-or-update on raw tables through PostgREST:
  - workout logs: `mobile/src/lib/workoutPersistence.ts:47-75`, which refuses with 409 when a day already has more than one log
  - daily check-ins: `mobile/src/features/checkin/persistence.ts:23-80`
  - weekly check-ins: `mobile/src/features/weekly/useWeeklyFeedbackController.ts:368`
  - profile: `mobile/src/features/onboarding/useSetupController.ts:50`
- The only RPC is `get_my_coach` (`mobile/src/hooks/useCoach.ts:44`).
- An offline outbox (`mobile/src/lib/outbox.ts`) replays queued writes later.

### Inferences
- The missing entities are Program/Plan (a header row), PlanAssignment (who is on what, from when to when, assigned by whom), CoachingRelationship (coach, client, package, period) and an exercise catalog.
- Today each of these is encoded as columns on `users`, as JSON strings, or as a hierarchy key repeated across copies.
- Every integrity bug above follows from that: stale pointers, orphan plan rows, duplicate day rows, divergent coach history and one-payment-per-client.
- The installed-app contract is narrow:
  - **Reads:** `users.active_*_plan` (text JSON), `workout_plans` and `workout_templates` filtered by hierarchy columns, `meal_plans`, `meal_templates`.
  - **Writes:** `workout_logs` (`user_id`, `date`, `title`, `content` text), `daily_check_ins`, `weekly_check_ins`, `body_measurements`, `weekly_progress_photos`, and `users.profile_data`/`onboarding_step`/`package_start_date`.
- Anything outside that list can be changed freely. Anything inside it must stay readable and writable in its current shape until old builds are gone.

### Gaps
- I could not see which installed app versions exist in the field. The status review says the only EAS build ever made is an Android **preview** from 19 September, and there has been no production or iOS build. So "installed older versions" today means internal testers only. This needs confirming with the owner.

---

## Q4. Which integrity rules live only in app code, and how do the gaps rank?

### Takeaway
Almost every domain rule is enforced, if at all, by one of two clients that disagree with each other:
- enum vocabularies
- score ranges
- JSON shape
- "one weekly report per week"
- "a pointer must resolve"
- "a payment cannot exceed its total"

The live data already shows each rule being broken. The database should own these rules through CHECK constraints (added `NOT VALID`, then validated), small triggers, and `pg_jsonschema` CHECKs on the JSON columns.

### Cited Findings
- **Status and digestion vocabularies exist only in TS:**
  - The app normalizes on read with `normalizeWorkoutStatus` (`mobile/src/types/db.ts:53-59`).
  - The dashboard does not. `client/src/pages/Dashboard.tsx:73` and `:95` count `workout_status === 'done'`, which misses the 466 `Done` rows (39% of all "done" days) [live SQL].
- **Score ranges (1–10)** are TS comments only (`shared/schema.ts:74-88`). There are 26 live zeros (Q1).
- **JSON shape:** the readers defend themselves with try/catch (`mobile/src/hooks/usePlans.ts:55-62` `parseJson`, `mobile/src/lib/supplements.ts:11`). `shared/questionnaire.ts:69-71` throws "Assessment answers must be JSON text." Nothing stops a writer storing malformed JSON.
- **Weekly uniqueness** is void, because all 107 `week_start_date` values are null (Q1).
- **Pointer resolution:** 23 of 123 pointers do not match the client's own rows (Q3).
- **Payments:** 1 record is overpaid (Q3).
- **Coach history vs `coach_id`:** history is app-written with no trigger (Q3).
- **Plan day uniqueness:** 19 duplicate groups (Q3).
- **`pg_jsonschema`** provides `json_matches_schema(schema json, instance json)` and `jsonb_matches_schema(schema json, instance jsonb)` for use inside a CHECK constraint. A violating insert fails with "new row … violates check constraint" — [Supabase pg_jsonschema docs](https://supabase.com/docs/guides/database/extensions/pg_jsonschema), page fetched 2026-11-27. Version 0.3.3 is available on this project [live SQL].
- **Enums versus CHECKs:**
  - Postgres enums suit "small, fixed" value lists. Adding values is easy, but removing one "is unsafe… there is no `ALTER TYPE DELETE VALUE`" — [Supabase: Managing Enums](https://supabase.com/docs/guides/database/postgres/enums), page fetched 2026-11-27.
  - On PG18, CHECK and FK constraints can be declared `NOT ENFORCED`, and NOT NULL can be `NOT VALID` — [PostgreSQL 18 release notes](https://www.postgresql.org/docs/release/18.0/), released 2025-09-25. On PG17 the long-standing `ADD CONSTRAINT … NOT VALID` followed by `VALIDATE CONSTRAINT` works for CHECK and FK.

### Ranked gaps and risks (new; not in the prior reviews)

1. **`npm run db:push` can rewrite the production schema from a stale file** (Q2). Severity: data loss. Fix in minutes by deleting the scripts and the drizzle deps.
2. **Plan assignment is non-atomic and destructive** (`useTemplates.ts:686-800`).
   - It deletes all of a client's plan rows before inserting. A network failure between steps leaves a client with no plan, or with a pointer to rows that do not exist.
   - It keeps no history of what a client was on.
   - Fix: one RPC per assignment, then an effective-dated assignment table.
3. **No `updated_at` maintenance anywhere** (Q1). This blocks delta sync, optimistic concurrency, "plan updated" pushes and audit. Fix: `moddatetime` or a 3-line trigger.
4. **Untyped clients plus three hand-written type sets** (Q2). Every schema change is a silent runtime risk. Fix: `supabase gen types`.
5. **Legacy vocabularies** (`Done`/`done` and so on) skew coach-facing metrics today (Dashboard.tsx:73). Fix: normalize 767 `workout_status` and 765 `digestion` rows, then add CHECKs.
6. **`weekly_check_ins.week_start_date` is null everywhere**, so the 2026-11-22 unique key protects nothing. Fix: backfill from `created_at`, plus a BEFORE INSERT default trigger, then `SET NOT NULL`.
7. **Duplicate plan-day rows with arbitrary "highest UUIDv4" selection** (`usePlans.ts:188`). Fix: unique `(user_id, plan key, day_number)` after dedupe. Long term, give the plan a header row.
8. **Workout logs carry no idempotency key.** The app's outbox can replay inserts, and `persistWorkoutLog` falls back to find-by-date (`workoutPersistence.ts:58-73`). Fix: client-generated id and upsert on `id` (target schema).
9. **Mixed `timestamp`/`timestamptz`** in 7 tables, and two FKs to `auth.users` instead of `public.users`. This prevents PostgREST embedding `users → workout_logs` and makes cascade order inconsistent.
10. **8 redundant indexes** add write cost and noise. A low-priority cleanup.
11. **`dedupe_backup_2026_11_22` keeps personal-data copies in `public`** with no retention date. Move it to a non-exposed schema or drop it after an agreed window (GDPR minimization).
12. **Dead tables and columns:** `progress_photos`, `user_goals` and `workout_plans.notes` all have 0 rows or 0 non-null values. Drop them in a contract phase.

### Inferences
- Items 1, 3, 5, 6 and 10 are server-only changes that no installed app can observe, so they are safe to do now.
- Items 2, 7 and 8 need the expand–migrate–contract path in Q6.

### Gaps
- I have not confirmed which code path wrote the capitalized `Done`/`None` values that stopped in 2026-07. Grep any older dashboard deploy before adding a CHECK, so a still-running writer isn't broken.

---

## Q5. What does late-2026 Postgres and Supabase practice say, and which Postgres version can this project use?

### Takeaway
- Hosted Supabase still offers Postgres 17 as its newest major on 2026-11-27. I found no official evidence of Postgres 18 for new or existing hosted projects. So the target must be built on PG17 features (JSON_TABLE, SQL/JSON, MERGE … RETURNING, `NOT VALID` constraints, `btree_gist` exclusion constraints) and written so PG18 features (`uuidv7()`, virtual generated columns, `WITHOUT OVERLAPS`, OLD/NEW in RETURNING) drop in later.
- Best practice for this app: a normalized relational core (plans, assignments, relationships), typed and schema-checked `jsonb` only at the edges (exercise and set payloads, questionnaire answers), generated types, CLI-managed migrations, and a stable API contract that installed apps call.

### Cited Findings

**Postgres versions on Supabase**
- The project runs 17.6 [live SQL]. Supabase's newest platform minors are 15.19 / 17.11 (2026-09-25), with a time-zone fix in 15.19.0.003 / 17.11.0.003 (2026-10-30). No changelog entry mentions Postgres 18 as of the newest entry on 2026-11-23 — [Supabase changelog](https://supabase.com/changelog.md).
- A Supabase maintainer wrote on 2026-05-04, about CLI and self-hosted: "we have to wait for the Postgres team to work on Pg 18 and add it to the platform first… not very soon, but eventually in 2026." No hosted date was given — [GitHub discussion #42681](https://github.com/orgs/supabase/discussions/42681).
- A PR adding PG18 to the Supabase Postgres build exists, but I could not confirm it was merged — [supabase/postgres PR #2051](https://github.com/supabase/postgres/pull/2051).
- An aggregator claims "Announced/Planned" — [Webhound](https://www.webhound.ai/p/cloud-databases-adding-postgresql-18-support-in-2026-8se2lb). This is low-confidence and not primary.

**How hosted upgrades work**
- In-place `pg_upgrade` from Dashboard → Infrastructure, at about 100 MB/s. For this 28 MB database, downtime is dominated by fixed overhead.
- `pg_cron` is dropped and recreated during the upgrade.
- Breaking changes come mainly from Postgres and PostgREST major versions.
- Source: [Supabase: Upgrading](https://supabase.com/docs/guides/platform/upgrading), undated docs page fetched 2026-11-27. The same page describes the 15→17 path and the extensions dropped in 17. None of the dropped extensions is installed here.

**PostgreSQL 18** (released 2025-09-25) — [release notes](https://www.postgresql.org/docs/release/18.0/):
- `uuidv7()`, described as "temporally sortable", plus a `uuidv4()` alias.
- Virtual generated columns, now the default kind: "generate their values when the columns are read".
- Temporal `PRIMARY KEY`/`UNIQUE … WITHOUT OVERLAPS` and FK `PERIOD`.
- `OLD`/`NEW` in `RETURNING` for INSERT, UPDATE, DELETE and MERGE.
- `NOT ENFORCED` CHECK and FK constraints.
- `pg_upgrade` keeps optimizer statistics.
- MD5 passwords deprecated.
- FK `RESTRICT` violations now report SQLSTATE `23001` instead of `23503`. App error mapping that keys on 23503 would need a check.

**PostgreSQL 17** (released 2024-09-26; older than 2025, but this is the authoritative spec of the running version) — [release notes](https://www.postgresql.org/docs/release/17.0/):
- `JSON_TABLE()` "to convert JSON data to a table representation", usable in `FROM`.
- `JSON_EXISTS`, `JSON_QUERY` and `JSON_VALUE`.
- `MERGE … RETURNING` with `merge_action()`.
- `MERGE` on updatable views.

**Supabase API-surface practice** — [Securing your API](https://supabase.com/docs/guides/api/securing-your-api), docs page fetched 2026-11-27:
- Grants decide which roles reach an object, and RLS decides which rows.
- Supabase is moving new projects to revoke automatic grants on `public`. Existing projects can opt in with `alter default privileges … revoke`.
- "lock down the `public` schema and expose a dedicated schema, such as `api`".
- Request headers are readable in SQL via `current_setting('request.headers', true)::json`.
- `pgrst.db_pre_request` runs a function on every Data API request and can reject it with a custom HTTP status.
- The automatic-exposure change became the default for new projects on 2026-05-30, with per-table Data API toggles — [Supabase Developer Update, May 2026](https://supabase.com/changelog/45702-developer-update-may-2026).
- The Supabase advisor flags `SECURITY DEFINER` views (lint `0010_security_definer_view`), so compatibility views must be `security_invoker` — [Supabase advisors](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0010_security_definer_view). I did not open this page beyond the title.

**Auditing**
- `supa_audit` (`audit.record_version` with `record`/`old_record` jsonb, `audit.enable_tracking(regclass)`) "was archived by the owner on Feb 16, 2025". Its README warns against tables above about 3k writes per second — [supabase/supa_audit](https://github.com/supabase/supa_audit).
- `pgaudit` 17.0 is available here [live SQL] for statement-level audit logging — [Supabase PGAudit docs](https://supabase.com/docs/guides/database/extensions/pgaudit). Title only; not read in full.

**Backward-compatible change pattern**
- Expand (add nullable or defaulted structures, dual-write), migrate (backfill, switch reads), contract (stop writing, then drop): "you should never couple your database schema and application code changes together", so that "at any step… you can rollback without data loss" — [PlanetScale, Taylor Barnett, 2023-05-09](https://planetscale.com/blog/backward-compatible-databases-changes). This predates 2025, but the pattern is stable.
- I found no 2025–2026 source specific to mobile clients that cannot be force-updated. The mobile adaptation below is my inference.

### Inferences

**IDs**
- Keep the existing UUIDv4 primary keys. The value of UUIDv7 here is not index locality (28 MB). It is:
  - (a) device-generated ids that make outbox replays idempotent, and
  - (b) time-ordered ids that make "keep the newest" correct.
- On PG17, generate v7 on the device and let the column default stay `gen_random_uuid()`. On PG18, switch defaults to `uuidv7()`.

**JSON versus columns**
- Keep exercise and set payloads as `jsonb`, validated with `pg_jsonschema`. Use PG17 `JSON_TABLE` for coach analytics (volume per exercise, PRs) instead of normalizing 16k sets into rows.
- Normalize only what is joined, filtered or constrained: plan identity, assignment, relationship, and status vocabularies.

**Enums versus lookup tables versus CHECK**
- Use `text` plus CHECK for app-facing vocabularies (`workout_status`, `digestion`, `meal_type`). This is reversible, and installed clients send strings either way.
- Use lookup tables only where coaches will edit the list (workout types, package types). Avoid Postgres enums for vocabularies that have already changed three times (`package_type`).

**Soft versus hard delete**
- Keep hard delete for accounts. The deletion Edge Function and cascades already exist, and GDPR erasure is simpler.
- Use effective dating (`valid daterange`) rather than `deleted_at` for assignments and relationships. History is then a fact, not a flag.

**Audit**
- Do not install the archived `supa_audit`. Copy its roughly 40-line trigger pattern into a non-exposed `audit` schema, and enable it only on coach-edited tables: plans, assignments, `workout_logs` and the privileged `users` columns.

**Partitioning** is not warranted at any foreseeable size of this app.

**Version upgrade**
- Apply the 17.x minor upgrade now (CVE fixes).
- Re-evaluate PG18 when Supabase announces it. Nothing in the target design requires it.

### Gaps
- No official Supabase statement confirms or denies hosted PG18 availability as of 2026-11-27. Check Dashboard → Infrastructure → "Upgrade project" directly.
- I did not fetch PostgREST docs on embedding across `auth.users` FKs.

---

## Q6. Target schema and an expand–migrate–contract rollout that never breaks the installed app

### Takeaway
Before the first store build ships, freeze a small, versioned contract:
- an `x-app-version` header
- device-generated log ids with upsert
- a server-side minimum-version gate

Then, behind that contract, add four normalized tables (`plans`, `plan_assignments`, `coaching_relationships`, and the existing tables gaining typed `jsonb` twins) and sync them with the legacy columns through triggers. Contract the legacy columns only once telemetry shows no write from an old build. All SQL below targets PG17. PG18 equivalents are noted.

### Cited Findings
- Columns the installed app parses as **text JSON** would break if retyped to `jsonb` in place:
  - `parseJson` calls `JSON.parse(raw)` (`mobile/src/hooks/usePlans.ts:55-62`), used for `active_workout_plan`, `active_meal_plan` and `workout_plans.exercises` (`:124-128`). A `jsonb` object would make `JSON.parse` throw, and the plan would disappear.
  - `readSupplements` calls `JSON.parse(raw)` (`mobile/src/lib/supplements.ts:11`).
  - `shared/questionnaire.ts:69` throws unless `answers` is a string.
  - Only `parseWorkoutContent` tolerates non-string content (`mobile/src/lib/workout-content.ts:138-150`).
- The status review reports no production or iOS build yet, only an Android preview from 2026-09-19 (`mobile/docs/review/2026-11-27-status-review/README.md`, "R3").
- Request headers are readable in SQL, and `db_pre_request` can reject requests — [Supabase: Securing your API](https://supabase.com/docs/guides/api/securing-your-api).
- Temporal uniqueness is native in PG18 (`WITHOUT OVERLAPS`) — [PG18 notes](https://www.postgresql.org/docs/release/18.0/). On PG17 the same rule is an exclusion constraint using `btree_gist`, which is available here as 1.7 [live SQL].

### Inferences: target schema (SQL sketches, PG17)

```sql
-- 0. Hygiene: server-only, invisible to every client
create extension if not exists moddatetime with schema extensions;
-- repeat for each table that has updated_at
create trigger set_updated_at before update on public.workout_logs
  for each row execute function extensions.moddatetime(updated_at);
drop index if exists idx_daily_check_ins_user_id, idx_body_measurements_user_id,
  idx_workout_logs_user_id, idx_workout_plans_user_id, idx_workout_plans_level,
  idx_meal_plans_user_id, idx_client_payments_client_id, idx_coach_commissions_coach_id;
create index on public.users (coach_id);

-- Vocabularies: normalize, then constrain (NOT VALID first, then VALIDATE)
update public.daily_check_ins set workout_status = case lower(workout_status)
  when 'rest' then 'rest_day' when 'cardio' then 'cardio_day' else lower(workout_status) end
  where workout_status <> lower(workout_status) or workout_status in ('rest','cardio');
update public.daily_check_ins set digestion = lower(digestion) where digestion <> lower(digestion);
alter table public.daily_check_ins
  add constraint dci_status_chk check (workout_status in ('done','no','rest_day','cardio_day')) not valid,
  add constraint dci_digestion_chk check (digestion in ('none','bloated','constipated','diarrhea')) not valid,
  add constraint dci_scores_chk check (
    workout_performance between 0 and 10 and nutrition_score between 1 and 10 and
    energy_level between 1 and 10 and hunger_level between 1 and 10 and stress_level between 1 and 10) not valid;
alter table public.daily_check_ins validate constraint dci_status_chk;  -- etc.

-- Weekly key: backfill, default on insert, then NOT NULL
-- ponytail: Monday in UTC; use profile_data->>'timezone' (58 users have one) if coaches care about the edge
update public.weekly_check_ins set week_start_date = date_trunc('week', created_at)::date where week_start_date is null;
create function public.weekly_default_week() returns trigger language plpgsql set search_path = '' as $$
begin new.week_start_date := coalesce(new.week_start_date, date_trunc('week', now())::date); return new; end $$;
create trigger weekly_default_week before insert on public.weekly_check_ins
  for each row execute function public.weekly_default_week();
alter table public.weekly_check_ins alter column week_start_date set not null;
```

```sql
-- 1. Plans become entities. Templates and client copies share one header table.
create table public.plans (
  id            uuid primary key default gen_random_uuid(),     -- PG18: default uuidv7()
  kind          text not null check (kind in ('workout','meal')),
  client_id     uuid references public.users(id) on delete cascade,  -- null = template
  coach_id      uuid references public.users(id) on delete set null, -- template author; null + client_id null = global
  source_plan_id uuid references public.plans(id) on delete set null, -- template this copy came from
  name          text,
  level text, workout_type text, sub_category text,
  days_per_week smallint check (days_per_week between 1 and 7),
  diet_type text, calories_target int check (calories_target between 500 and 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Existing day rows gain a nullable FK (expand). Old apps never see it.
alter table public.workout_plans     add column plan_id uuid references public.plans(id) on delete cascade;
alter table public.workout_templates add column plan_id uuid references public.plans(id) on delete cascade;
alter table public.meal_plans        add column plan_id uuid references public.plans(id) on delete cascade;
create unique index on public.workout_plans (plan_id, day_number) where plan_id is not null;
-- Typed twin of the exercises text, validated; the old text column stays for installed apps
alter table public.workout_plans add column exercises_doc jsonb
  check (exercises_doc is null or extensions.jsonb_matches_schema('{"type":"array","items":{"type":"object",
    "required":["name"],"properties":{"name":{"type":"string"},"sets":{"type":["integer","string","null"]},
    "reps":{"type":"string"},"videoLink":{"type":"string"},"notes":{"type":"string"}}}}', exercises_doc));

-- 2. Effective-dated assignment: who is on which plan, from when, set by whom
create extension if not exists btree_gist with schema extensions;
create table public.plan_assignments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('workout','meal')),
  plan_id     uuid not null references public.plans(id) on delete restrict,
  assigned_by uuid references public.users(id) on delete set null,
  valid       daterange not null default daterange(current_date, null),
  created_at  timestamptz not null default now(),
  exclude using gist (client_id with =, kind with =, valid with &&)
  -- PG18: unique (client_id, kind, valid without overlaps)
);
create view public.current_plan_assignments with (security_invoker = true) as
  select * from public.plan_assignments where valid @> current_date;

-- One atomic RPC replaces the delete/insert/update loop in useTemplates.ts:686-800
create function public.assign_plan(p_client uuid, p_template uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_plan uuid; v_kind text;
begin
  -- copy template header and day rows into a client plan (insert ... select), returning v_plan, v_kind
  update public.plan_assignments set valid = daterange(lower(valid), current_date)
    where client_id = p_client and kind = v_kind and valid @> current_date;
  insert into public.plan_assignments(client_id, kind, plan_id, assigned_by)
    values (p_client, v_kind, v_plan, (select auth.uid()));
  return v_plan;   -- the legacy pointer is written by the sync trigger below
end $$;

-- Compatibility: keep users.active_*_plan (text JSON) correct for installed apps
create schema if not exists private;  -- not exposed to the Data API; does not exist today
create function private.sync_legacy_pointer() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'workout' then
    update public.users u set active_workout_plan = json_build_object(
      'level', p.level, 'workoutType', p.workout_type, 'subCategory', p.sub_category,
      'daysPerWeek', p.days_per_week)::text
    from public.plans p where p.id = new.plan_id and u.id = new.client_id;
  else
    update public.users u set active_meal_plan = json_build_object(
      'calories', p.calories_target, 'dietType', p.diet_type)::text
    from public.plans p where p.id = new.plan_id and u.id = new.client_id;
  end if;
  return null;
end $$;
create trigger plan_assignments_sync after insert on public.plan_assignments
  for each row execute function private.sync_legacy_pointer();
```

```sql
-- 3. Workout logs: idempotent ids, typed body, a real link to the plan day
alter table public.workout_logs
  add column body jsonb,                          -- canonical v2 document
  add column plan_id uuid references public.plans(id) on delete set null,
  add column plan_day smallint check (plan_day between 1 and 7),
  add column app_version text;                    -- stamped from the request header
-- New app: id = device UUIDv7, upsert(…, { onConflict: 'id' }). Old app: no id sent, default applies.
-- The trigger keeps both representations in sync, whichever one the client wrote.
create function private.workout_log_bridge() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.body is null and new.content is not null then
    new.body := private.legacy_log_to_v2(new.content::jsonb);  -- array → {version:2, exercises:[…]}
  elsif new.body is not null and (tg_op = 'INSERT' or new.body is distinct from old.body) then
    new.content := new.body::text;                             -- the dashboard and old app keep reading text
  end if;
  new.plan_day := coalesce(new.plan_day, (new.body->>'planDayNumber')::smallint);
  new.app_version := coalesce(new.app_version,
    current_setting('request.headers', true)::json->>'x-app-version');
  return new;
end $$;
create trigger workout_log_bridge before insert or update on public.workout_logs
  for each row execute function private.workout_log_bridge();
alter table public.workout_logs add constraint wl_body_schema
  check (body is null or extensions.jsonb_matches_schema('<v2 JSON Schema>', body)) not valid;

-- Coach analytics with no extra tables (PG17 JSON_TABLE)
select l.user_id, l.date, x.exercise, x.reps, x.weight
from public.workout_logs l,
  json_table(l.body, '$.exercises[*]' columns (
    exercise text path '$.exercise',
    nested path '$.sets[*]' columns (reps numeric path '$.reps', weight numeric path '$.weight'))) x;

-- 4. Coaching relationship, effective-dated. Replaces coach_id + package_* + coach_client_history over time.
create table public.coaching_relationships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  coach_id  uuid references public.users(id) on delete set null,
  package_type text check (package_type in ('elite','standard','beginner','premium','intermediate')),
  package_months smallint check (package_months in (1,3,6,12)),
  valid daterange not null,
  exclude using gist (client_id with =, valid with &&)
);
-- An AFTER UPDATE OF coach_id, package_type, package_duration trigger on users closes the open range and
-- opens a new one, so coach_client_history-style events are DB-guaranteed, not app-written.
```

Further pieces:
- Coach-authored guidance (`*_note`, `supplements_data`, `coach_note`) moves to `client_guidance(client_id pk, notes jsonb, supplements jsonb, coach_private_note text)`. The table is coach-writable only, which closes M2 structurally.
- A trigger mirrors the guidance back into the `users` text columns until the contract phase.
- `client_payments`: drop `UNIQUE(client_id)` and add `currency char(3) not null default 'INR'`. Derive status in a `security_invoker` view (`sum(transactions) vs total`) instead of storing it.

Skipped:
- an exercise catalog table: add it when coaches need cross-client exercise analytics (394 / 560 / 231 free-text names today)
- weekly check-in forms as data: add them when coaches ask for custom weekly questions
- partitioning: not needed at any foreseeable size

### Inferences: rollout (expand → migrate → contract)

**Phase A. Now, before the first store build** (owner + app). This is the cheapest moment ever to fix the contract.
- (a) Add `global: { headers: { 'x-app-version': <expo version>+<build> } }` to `mobile/src/lib/supabase.ts:7`.
- (b) Generate device UUIDv7 ids for `workout_logs` and use `upsert(…, { onConflict: 'id' })`. Do the same idempotent upsert on `(user_id, date)` for check-ins, measurements and photos.
- (c) Ship a min-version check that reads an `app_config` row and shows an update screen.
- (d) Treat 23505 on weekly submit as success (L1).
- Without (a) and (c), a store binary can never be told "too old" except through generic errors.

**Phase B. Server hygiene** (DB only; invisible to every client)
- Apply the 17.x minor upgrade.
- Remove the `db:push`/drizzle scripts and deps.
- Run `supabase db pull` for a baseline and commit `supabase/migrations`. Generate types and type both clients.
- Add `moddatetime` triggers and drop the redundant indexes.
- Normalize the vocabularies, then add CHECKs `NOT VALID` → `VALIDATE`.
- Backfill `week_start_date` and add the default trigger, then `NOT NULL`.
- Move `dedupe_backup_*` out of `public`.

**Phase C. Expand** (additive; old app unaffected)
- Create `plans`, `plan_assignments`, `coaching_relationships` and `client_guidance`.
- Add `plan_id`, `exercises_doc`, `body`, `plan_day` and `app_version` columns.
- Add the bridge and sync triggers, in both directions:
  - New-table writes update the legacy text columns.
  - Legacy writes from the current dashboard or app (`users.active_*_plan`, `users.coach_id`) upsert the new tables.
  - Guard against loops with `pg_trigger_depth() > 1`.
- Backfill:
  - one `plans` header per distinct `(user, plan key)`, which gives 102 clients p50 2 headers each
  - templates grouped by hierarchy key
  - `plan_assignments` from the 123 + 55 pointers. Map the 23 fallback pointers to the global template plan.
  - `body` from all 946 legacy logs (`legacy_log_to_v2`)
  - relationships from `coach_client_history` plus the current `coach_id`
- Dedupe the 19 duplicate plan-day groups. Use `updated_at` where it exists, and flag the rest for a coach decision, because the UUIDs carry no order.

**Phase D. Migrate**
- The dashboard, which deploys instantly on Vercel, switches first: `assign_plan` RPC, `plan_assignments`, `client_guidance`, `body`.
- The next app release reads `current_plan_assignments` joined to `plans` and the day rows, and writes `body` and `plan_day`.
- Old builds keep working through the triggers.
- Track the share of writes by `app_version`, using `select app_version, max(created_at) … group by 1`.

**Phase E. Contract** (only when no write from a pre-Phase-D build appears for an agreed window, for example 60 days, and the min-version gate has been raised)
- Drop the reverse sync triggers.
- Make `users.active_*_plan` a read-only generated mirror, or drop it.
- Drop `workout_logs.content` (or keep it as `body::text` in a view), `users.coach_id`/`package_*`/the note columns, the `progress_photos`/`user_goals` tables and `workout_plans.notes`.
- Revoke direct table grants on anything the app no longer touches.
- On PG18, swap the exclusion constraints for `WITHOUT OVERLAPS` and the ID defaults for `uuidv7()`.

**Rules for every phase**
- Every step is reversible until Phase E.
- Never retype a column the installed app parses as text (see Cited Findings).
- Never add NOT NULL or CHECK to an app-written column without first confirming that the current app's payload satisfies it. Use `NOT VALID` plus a log check on rejected writes.

**Optional end state** (supported by the Supabase guide; adopt only if churn justifies it)
- Expose a dedicated `api` schema of `security_invoker` views and RPCs to the app.
- Stop exposing `public` tables to the app directly.
- Table refactors then never reach installed binaries.

### Gaps
- The JSON Schema for v2 logs (`<v2 JSON Schema>`) is not written here. Derive it from `mobile/src/lib/workout-content.ts:9-37`.
- I did not verify that `pg_jsonschema` 0.3.3 accepts `jsonb_matches_schema` with a `json` schema literal inside a CHECK on this project. The docs example uses `json_matches_schema`. Test on a branch.
- I did not test the trigger sketches. They are design sketches, not applied or run.
- The actual installed-build population, and whether any tester builds still write, is unknown. The `x-app-version` stamp exists to measure it.

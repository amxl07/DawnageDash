# Platform engineering and DevOps: Dawnage, late 2026

**Evidence conventions.**
- `repo:path:line` is a file in `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash`, read on 2026-11-27.
- `live:` is a read-only query against Supabase project `hzifwkebzhzlxvigbcup` through the Supabase MCP tools on 2026-11-27. These were `get_project`, `list_projects`, `get_organization`, `list_migrations`, `list_branches`, `list_extensions`, `list_edge_functions` and `execute_sql` running SELECT only.
- `gh:` is read-only `gh` CLI output.
- `cli:` is a local `--version` call.
- Web sources carry their publication or "modified" date where the page shows one. A page fetched without a visible date is marked "(fetched 2026-11-27, undated)".
- Anything older than 2025 is flagged as possibly stale. None of the web sources below are from before 2025.

**Already covered elsewhere and not re-researched:**
- R1: `.easignore` drops shared files, so EAS builds fail.
- R2: the EAS production env has no Supabase URL/key and no Sentry DSN.
- R3: the app has never had an iOS or production build.
- L3: advisor counts.
- L5: Expo Go cannot run SDK 57.

These are in `mobile/docs/review/2026-11-22-release-readiness/README.md` and `mobile/docs/review/2026-11-27-status-review/README.md`. They are only referenced here.

---

## Q1. Environments: is there only one Supabase project and no staging? Is Branching suitable, and what would it cost? Is there a local stack? Do the repo and DB migrations drift?

### Takeaway
There is exactly one Dawnage database: production `hzifwkebzhzlxvigbcup`. It has no branches, no `supabase/config.toml` and no local stack. The organisation is on the **Free plan**, which means three things:
- There are **no platform backups at all**.
- File storage is at about 88% of the 1 GB Free quota.
- Branching is not available.

Moving to Pro ($25/mo) is a prerequisite for every other environment improvement. On Pro, Branching costs $0.01344 per branch-hour, so a persistent staging branch is about $10/mo.

The repo's 78 hand-applied SQL files are not the source of truth. The live migration history has only 8 rows, all from 2026-11-22 or later. Their SQL matches the repo files semantically but not byte-for-byte, and a data backfill was applied outside the history.

### Cited Findings
**The project and the plan**
- The org `DAWNAGE` (`guqhqudwsuvvokhwlaph`) is `"plan":"free","tier":"tier_free"`. — live: `get_organization`
- The org has two projects:
  - `Project Dawnage` (`hzifwkebzhzlxvigbcup`): ap-southeast-2, Postgres `17.6.1.037`, ACTIVE_HEALTHY, created 2025-11-04.
  - An unrelated `AuxiDesk` project (ap-northeast-1, INACTIVE, Postgres `17.11.0.002`, created 2026-10-02).
  - There is no Dawnage staging project. — live: `list_projects`
- `list_branches` returns `{"branches":[]}`. — live

**Free vs Pro limits** — [Supabase pricing](https://supabase.com/pricing) (fetched 2026-11-27, undated)

| | Free | Pro |
|---|---|---|
| Database | 500 MB, shared CPU, 500 MB RAM | from $25/mo; 8 GB disk |
| File storage | 1 GB | 100 GB |
| Backups | "Not included" | daily, kept 7 days |
| PITR | not included | $100/mo per 7 days |
| Inactivity | paused after 1 week | never paused |
| Log retention | 1 day | 7 days |
| Log drains | not included | $60/drain/mo |
| Branching | "Not included" | **$0.01344 per branch, per hour** |
| Compute credit | none | $10/mo, covering one Micro |

**Live usage**
- Database: 28 MB. — live: `pg_database_size`
- Storage: 1,691 objects totalling **885 MB** in 1 bucket, about 88% of the Free 1 GB file quota. — live: `sum(storage.objects.metadata->>'size')`
- `auth.users`: 154 rows. Connections: 12 now, `max_connections` 60. Also `shared_buffers` 224 MB and `statement_timeout` 2 min. — live

**Branching**
- Branches can come from the GitHub integration, which builds the schema from repo migrations, or from the Dashboard, which builds from the base project's migration history. — [Supabase Branching docs](https://supabase.com/docs/guides/deployment/branching) (fetched 2026-11-27, undated)
  - Preview branches are deleted when the PR merges or closes. Persistent branches are "long-lived… for staging, QA".
  - Branches are data-less by default. The pipeline is Clone → Pull → Health → Configure → Migrate → Seed → Deploy.
  - OAuth/SMTP auth secrets must be set per branch.
- Branching 2.0 (no Git required; dashboard, CLI or Management API) launched in July 2025. — [Introducing Branching 2.0](https://supabase.com/blog/branching-2-0) (Jul 2025)
- Branching without Git became the default for every project in May 2026, and branches created through the Supabase MCP server use dashboard branching. — [Branching without Git is now the default](https://supabase.com/blog/branching-without-git-is-now-the-default) (May 2026)
- Limitation: custom roles created through the Dashboard are not captured on branch creation. — [Branching via the dashboard](https://supabase.com/docs/guides/deployment/branching/dashboard) (fetched via search, undated)
- **The Supabase–Vercel integration** — [Preview branches on Vercel](https://supabase.com/docs/guides/integrations/vercel-preview-branches) (undated); [Supabase KB: Vercel env vars not syncing](https://supabase.com/kb/troubleshooting/vercel-integration-environment-variables-not-syncing-for-persistent-git-branches) (undated)
  - It writes per-branch env vars into Vercel when a PR opens, and redeploys to cover a race.
  - Without it, Vercel previews "use the Supabase URL and keys set on your Vercel project, which usually point at your production project".
  - A known issue is that env vars do not sync for persistent Git branches.

**Local stack and migrations**
- There is no local stack. `supabase/` contains only `functions/delete-account/index.ts` (53 lines): no `config.toml`, `migrations/`, `seed.sql` or `tests/`. — repo: `find supabase`
- CLI versions:
  - Supabase CLI is installed at `2.95.4`, and it reports "A new version… v3.4.0 is available". — cli: `supabase --version`
  - EAS CLI is `21.0.1`, and it reports eas-cli 27.11.0 available. — cli: `eas --version`
- `sqlmigrationfiles/` holds **78 entries** (77 `.sql` files plus a `rollback` subdirectory), mixing several kinds of file:
  - DDL: `create_weekly_check_ins.sql`, `fix_rls_recursion.sql`, …
  - Seed or template data: `advanced_calisthenics_workout_templates.sql`, `import_full_food_database.sql`, …
  - Mock data: `mock_workout_logs.sql`, `mock_body_measurements.sql`
  - Destructive resets: `reset_food_database.sql`, `reset_checkins_for_user.sql`
  - Only the newest 10 files are date-prefixed. The rest have no ordering. — repo: `ls sqlmigrationfiles`
  - git history covers them in 31 commits, from 2025-12-02 to 2026-11-27. — `git log -- sqlmigrationfiles`
- **Live migration history has only 8 rows**, all from 2026-11-22 onward:
  - `20261122052118 block_role_escalation`
  - `…052505 enable_rls_open_tables`
  - `…052920 coach_access_from_db_role`
  - `…053523 realtime_publish_app_tables`
  - `…055816 dedupe_and_unique_days`
  - `…060345 admin_approved_coaches`
  - `…081748 keep_payments_on_account_deletion`
  - `20261126191535 private_progress_photos`

  The roughly 68 earlier files (2025-12 → 2026-10) were applied with no history. — live: `list_migrations`
- **Drift between the repo and the DB:**
  - Repo names (`2026-11-22_0N_*.sql`) do not map to live versions, and none of the 8 match by MD5, either trimmed or whitespace-stripped. — live: `md5(statements[1])` vs local `hashlib.md5`
  - Reading three pairs side by side, the bodies are the same SQL but the comments are condensed.
  - The repo's `2026-11-22_04_realtime_and_role_backfill.sql` also contains a B9 `update auth.users …` backfill marked "applied once on 2026-11-22". The live migration `realtime_publish_app_tables` holds only the `alter publication` line, so the DML ran outside the history. — repo: `sqlmigrationfiles/2026-11-22_04_realtime_and_role_backfill.sql:5-9`; live: `schema_migrations.statements`
  - `2026-09-19_private_progress_photos.sql` (11.5 KB) is **superseded and was never applied**: `2026-11-22_07…sql:4` says "Replaces the 2026-09-19 manual-grant design". — repo
- Leftover in the live DB: the `public` schema still holds a backup table, `dedupe_backup_2026_11_22` (112 rows). There are 20 tables in `public`, all with RLS enabled, and 92 policies. — live

### Inferences
- **The Free plan is the biggest reliability risk, not a cost saving.**
  - A database holding coaching data, payments and 885 MB of private photos has no restorable backup.
  - The storage quota is close to full.
  - Logs last only 1 day, so the status review's "last 24 hours" log check is the most it can ever look back.
  - Pro at $25/mo fixes all three and is required for Branching and log drains.
- **Branching fits, used sparingly.**
  - One persistent `staging` branch costs about 730 h × $0.01344 ≈ **$9.81/mo**. It backs the EAS `preview` channel and Vercel Preview env vars, and gives an interactive non-prod DB.
  - Ephemeral per-PR branches cost about $0.32 per branch-day. Ten PRs a month with 2-day branches is about $6.50/mo. They are optional.
  - For CI tests, the local Supabase stack on a GitHub runner is free and should be the default.
- The 2015 iMac on macOS 12 (Darwin 21.6) probably cannot run current Docker Desktop, so `supabase start` may not work locally. This is unverified; see Gaps.
  - If so, a persistent branch is the practical "dev DB", and CI runners host the disposable local stack.
- Branching consumes `supabase/migrations`, so it cannot be used until the schema is baselined (Q2).
- Upgrading the org to Pro: the $10 compute credit covers one Micro. If AuxiDesk is resumed it would be billed separately; per the pricing page, additional projects are billed at full compute cost.

### Gaps
- PITR, backup and compute-add-on state are not visible via SQL or MCP.
  - "Free plan" implies no backups, but it is not confirmed whether the owner keeps manual `pg_dump`s or storage exports.
  - It is also not confirmed what happens at 1 GB storage on Free: hard block or grace period.
- Docker Desktop's minimum macOS version in late 2026 was not verified, nor whether colima or OrbStack run on macOS 12.
- Not checked: whether the Supabase GitHub integration is installed on `amxl07/DawnageDash`.

---

## Q2. Schema workflow: CLI imperative migrations vs declarative (`supabase/schemas`) vs pgschema/Atlas, and how to baseline production without disruption

### Takeaway
**Adopt Supabase CLI v3 imperative migrations in `supabase/migrations` as the single source of truth now.** Baseline them from production with `db pull` after repairing the 8-row history.

Defer declarative schemas: pg-delta is still pre-1.0 and sits behind an `experimental` flag, and Dawnage's changes are frequently DML or storage changes that declarative diffing never captures. Skip Atlas/pgschema, because they add a third-party tool with no advantage at this scale.

### Cited Findings
**Declarative schemas**
- Declarative schemas now default to the **pg-delta** diff engine. — [Declarative database schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas) (fetched 2026-11-27, undated)
  - The config keys and flags are under `experimental` (`[experimental.pgdelta] enabled = true`).
  - The workflow is: edit `supabase/schemas/` → `supabase db schema declarative sync -f <name> --no-apply` → review → `supabase migration up` → `supabase db push --remote`.
  - Baseline on pg-delta: `supabase db pull --remote`, then `supabase db schema declarative generate --remote`.
  - Caveats: "DML (`insert`, `update`, `delete`) is never captured, including storage bucket rows". `auth` and `storage` are "mostly excluded — manage platform objects through migrations".
  - The legacy `migra` engine cannot track alter policy, column privileges, comments, view owner/grants or `alter publication … add table`.
- pg-delta timeline:
  - Public alpha announced 2026-04-16; the goal is to make pg-delta the default and to "eventually move declarative commands out of experimental". — [Changelog: Public Alpha pg-delta](https://supabase.com/changelog/44938-public-alpha-declarative-schema-management-with-pg-delta) (2026-04-16)
  - "Declarative Schemas 2.0" shipped on 2026-10-02. It needs CLI ≥ 2.119, the engine is still pre-1.0, and it "does not orchestrate zero-downtime rollouts". — [Declarative Schemas 2.0 blog](https://supabase.com/blog/declarative-schemas-2-0-pg-delta) (2026-10-13)

**Supabase CLI v3**
- v3.0.0 shipped on 2026-11-02 as the default in npm and `supabase/setup-cli`. — [Supabase CLI v3 changelog](https://supabase.com/changelog/supabase-cli-v3) (2026-11-02); [Migrating to CLI v3](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3) (undated)
  - Commands "run locally unless you say otherwise" and the CLI "ask[s] before any hosted change".
  - Deprecated commands are removed. `[inbucket]` in config.toml now fails.
  - v2 can be pinned with `supabase@v2.stable`.
  - v3.1.0 (2026-11-09) adds inspect-db diagnostics and an API retry cap for CI.

**Third-party tools**
- Atlas has a Supabase guide and recommends the direct (unpooled) connection for migrations. — [Atlas: Managing Supabase Schemas](https://atlasgo.io/guides/postgres/supabase) (undated)
- pgschema is a Postgres-only, Terraform-style dump/plan/apply CLI. Its latest release (v1.12.0, 2026-07-06) and its licence claims come only from aggregators. — [pgschema on pkg.go.dev](https://pkg.go.dev/github.com/pgplex/pgschema) (undated)

**What Dawnage's recent migrations contain** (repo `2026-11-22_0{1..8}`; live statements)
- `update storage.buckets set public=false…`, which is storage DML.
- `alter publication supabase_realtime add table …`, which migra cannot track.
- A dedupe that copies rows into a backup table, which is DML.
- An `auth.users` metadata backfill, which is DML.

### Inferences
- About half of the last 8 production changes are things declarative diffing cannot express, so imperative migrations are the right primary model. Declarative files can be added later per table once pg-delta reaches 1.0.
- **Baseline procedure.** This is a design, not executed; flags need checking against the CLI v3 reference.
  1. Pin `supabase@3.x` as a root devDependency.
  2. Run `supabase init`. It creates `config.toml`; remove any `[inbucket]` block for v3. Run `supabase link --project-ref hzifwkebzhzlxvigbcup` with a scoped PAT.
  3. `supabase migration repair --status reverted` on the 8 existing versions. This touches migration metadata only; no schema DDL runs.
  4. `supabase db pull`, including the `storage` schema so the photo policies come along. This produces one `…_baseline.sql` capturing the whole live schema: 20 tables, 92 policies, 9 functions, 3 triggers and the realtime publication. Accept the prompt to mark it applied remotely.
  5. In CI on a local stack, `supabase db reset` replays the baseline. `supabase db diff --linked` against prod must be empty. This is the drift proof.
  6. Move `sqlmigrationfiles/` to `supabase/archive/` (read-only history).
     - Convert the template/food data into `supabase/seed.sql` or data migrations.
     - Delete `mock_*`, `reset_*` and `link_sample_data.sql` from the main tree. Each is a loaded gun against prod.
  7. From then on, prod DDL goes only through `supabase db push` from CI on `main`. Ad hoc MCP `apply_migration` or SQL-editor DDL against prod stops.
- Live traffic is unaffected. Steps 3–5 write only to `supabase_migrations.schema_migrations`, and only after confirmation.
- Drop `dedupe_backup_2026_11_22` from `public` in the first real migration after the baseline, or move it to a non-exposed schema.

### Gaps
- Not verified:
  - CLI v3 behaviour of `db pull` when remote history has unknown versions (exact error and repair path).
  - Whether v3 `db pull` includes the `storage` and `auth` schemas by default.
  - Whether `supabase migration fetch` exists in v3 as an alternative to repair.
- pgschema/Atlas licensing and feature gating come from third-party pages only.

---

## Q3. Type safety across web, mobile and DB: is `supabase gen types` used? Is drizzle `shared/schema.ts` / `server/` dead or a drift risk? What is the target?

### Takeaway
No generated DB types exist. Both apps call `createClient(url, key)` with no `Database` generic, so every row is untyped. JSON is stored in `text` columns and parsed at 45 `JSON.parse` sites with no runtime validation.

The drizzle/Express/Neon stack is dead code **and** a live hazard:
- `npm run db:push` runs `drizzle-kit push` against `DATABASE_URL`, which is present in the root `.env`.
- The drizzle schema is stale: 18 tables vs 20 live, `users` 23 vs 25 columns, and no `weekly_check_ins`.

Target: delete it, generate `Database` types from the local stack into the shared workspace package, use `createClient<Database>` in both apps, parse JSON-in-text columns with zod at read boundaries (zod is already a dependency), and fail CI on type drift.

### Cited Findings
**Untyped clients and JSON-in-text**
- `client/src/lib/supabase.ts:14` `createClient(supabaseUrl, supabaseAnonKey, {...})` and `mobile/src/lib/supabase.ts:7` `createClient(` both have no generic. A grep for `createClient<`, `database.types` or `gen types` finds no app code. — repo
- There are 45 `JSON.parse` call sites in `client/src`, `mobile/src`, `mobile/app` and `shared` (non-test). The only zod import is in `shared/schema.ts`. — repo: `grep -rn JSON.parse`, `grep -rln "from 'zod'"`
- Live JSON-as-text columns: `workout_logs.content`, `workout_plans.exercises`, `workout_templates.exercises`, `meal_templates.content`, `onboarding_questionnaire.answers`, and `users.active_workout_plan`, `active_meal_plan` and `supplements_data`. All are `text`. — live: `information_schema.columns`
- The status review found 275 recent workout logs in the legacy JSON-array format, while the app writes a "v2 format". This is a cross-client content contract that nothing enforces. — repo: `mobile/docs/review/2026-11-27-status-review/README.md` ("Workout logs" bullet)

**The dead drizzle/Express/Neon stack**
- `server/routes.ts:4-7` registers **no routes**. `server/index.ts` is a Replit-template Express shell with a Vite dev middleware (77 lines). — repo
- `package.json` (name `"rest-express"`) carries a stack the deployed SPA does not use:
  - Scripts: `dev: tsx server/index.ts`, `build:full`, `start`, `db:push: drizzle-kit push` and `db:studio`.
  - Dependencies: `express`, `express-session`, `passport`, `passport-local`, `connect-pg-simple`, `memorystore`, `@neondatabase/serverless`, `ws`, `drizzle-orm`, `drizzle-zod` and `@replit/*` vite plugins.
  - Vercel runs only `npm run build` (= `vite build`). — repo: `package.json:6-14`, `vercel.json:2`
- `drizzle.config.ts` points `schema: "./shared/schema.ts"` at `DATABASE_URL`. — repo
- The root `.env` (gitignored) defines `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET`, among others. Only key names were read. — repo: `.env`, `.gitignore:8`
- Nothing imports `shared/schema.ts`: grep for `shared/schema` across `client`, `server`, `mobile/src`, `mobile/app`, `shared` and `scripts` returns nothing. — repo
- Drift in the drizzle schema — repo: `grep pgTable shared/schema.ts`; live
  - It has 18 `pgTable`s and no `weekly_check_ins`; live `public` has 20 tables.
  - Its `users` has 23 columns; live has 25.
- The root `tsconfig.json:2` still includes `server/**/*`, so the dead code is type-checked as part of the dashboard. — repo

**Supabase type generation**
- Commands: `supabase gen types typescript --local > database.types.ts`, or `--project-id`/`--remote` for the remote project. — [Generating TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types) (fetched 2026-11-27, undated)
- `createClient<Database>(…)`, the helpers `Tables<'x'>` and `QueryData`, and `MergeDeep` overrides for JSON columns, which need supabase-js ≥ 2.48 for typed JSON selectors.
- Supabase's sample GitHub Action regenerates types on a daily cron and commits them. It **does not** fail on drift; a `git diff --exit-code` gate must be added.

### Inferences
- `drizzle-kit push` would compute a diff between a stale model and prod and try to apply it. Data-loss statements prompt, but a hurried "yes" could drop columns or tables. This is inferred from drizzle-kit's push semantics and was not tested.
  - **Delete** `server/`, `drizzle.config.ts`, `shared/schema.ts`, the `dev`/`build:full`/`start`/`db:*` scripts, the dead dependencies (about 14 packages) and `DATABASE_URL`/`SESSION_SECRET` from the root `.env`.
  - Set `"dev": "vite"`.
  - This also shrinks the supply-chain surface (Q7).
- **Target type flow:**
  1. CI: `supabase db reset` (local) → `supabase gen types typescript --local > packages/shared/src/db.types.ts` → `git diff --exit-code`. A migration without regenerated types fails the PR.
  2. Both apps: `createClient<Database>()`. TypeScript then flags removed or renamed columns in web and mobile at compile time.
  3. JSON-in-text columns: one zod schema per payload (`WorkoutContentV1 | V2`, `PlanPointer`, `QuestionnaireAnswers`, `Supplements`) in `packages/shared`, used at the single read/write helper for each table. Use `MergeDeep` to type those columns as the parsed type.
     - zod is already a root dependency (`zod ^3.24.2`). Do not add Valibot unless mobile bundle size measurably matters.
     - Later and optional: migrate `text` → `jsonb`, plus a `CHECK (content ? 'version')` or pg_jsonschema so the DB rejects malformed payloads. `pg_jsonschema` is available but not installed. — live: `list_extensions`
- Generated types are only as good as the schema source. This depends on Q2's baseline.

### Gaps
- Not measured: how many of the 45 `JSON.parse` sites parse DB payloads vs local storage or drafts.
- Not verified: whether supabase-js 2.112 (mobile) and 2.79 (web) handle `MergeDeep` typed JSON identically.

---

## Q4. Testing: what exists, are there DB tests, and what should the RLS/permission regression suite in CI look like?

### Takeaway
Unit coverage on mobile is strong locally (1,407 Jest tests), but **CI on `main` has been red for both pushes since 2026-11-22**, and the status review recorded green because it ran locally.

There are no pgTAP or `supabase test db` tests. The only automated DB test runs a PGlite simulation of the **superseded, never-applied** `2026-09-19` photo migration, which gives false assurance. The 39-check permission harness runs by hand against production inside rolled-back transactions.

Target: a pgTAP suite in `supabase/tests/database` that runs on the local Supabase stack in CI. It should cover a persona × table × operation matrix plus "every public table has RLS".

### Cited Findings
**Existing tests**
- Mobile: 170 `*.test.ts(x)` files and about 1,081 static `it(`/`test(` sites. The status review counts **1,407/1,407** at runtime. — repo: `find`/`grep`; `mobile/docs/review/2026-11-27-status-review/README.md` "Test results"
- Shared and dashboard: `shared/progress-photos.test.ts`, `client/src/components/QuestionnaireSummary.test.ts`, `scripts/*.test.{ts,mjs}`. The status review counts them as "7 / 7 pass". — repo; status review
- `.superpowers/sdd/2026-09-29-…/baseline/` holds duplicate copies of test files (repo noise). — repo: `find`

**CI is red on `main`**
- `gh run list` shows `failure` on both pushes to `main`: `45884241977` (2026-11-26, 97f74c0) and `44992993223` (2026-11-22). — gh
- The `mobile` job fails at `npm run verify` with `Cannot find module '@babel/runtime/helpers/interopRequireDefault' from '../shared/assessment-save.ts'`. The same error hits `progress-photos.ts`, `questionnaire.ts` and `profile-save.ts` across 10 suites. — gh: `gh run view 45884241977 --log-failed`
  - Cause: the job runs `npm ci` only in `mobile/` (`.github/workflows/mobile.yml:20,33`). Files under `../shared` resolve `@babel/runtime` from the repo-root `node_modules`, which exists on the dev machine but not in CI. — repo
  - This is the same failure class as R1: code shared by relative path outside the package boundary.

**The only automated DB test checks a migration that was never applied**
- The `photo-contract` job runs `scripts/verify-photo-privacy.mjs` on PGlite 0.5.8. — repo: `mobile.yml:58-61`
- That script loads `sqlmigrationfiles/2026-09-19_private_progress_photos.sql`. — repo: `scripts/verify-photo-privacy.mjs:5`
- But `2026-11-22_07_private_progress_photos.sql:4` says it "Replaces the 2026-09-19 manual-grant design", and live history contains the 07-style SQL. — live
- PGlite also fakes `auth.uid()`, `storage.objects` and the roles. — repo: `verify-photo-privacy.mjs:13-25`

**The permission checks run against production**
- They are run by hand on prod: "Live permission checks (client, coach, other coach, anon, admin; rolled back) | 38 / 39 as expected". No harness file was found in the repo by grep. — status review "Test results"; repo grep
- `pgtap` is available on the live project but not installed, which is fine: tests should run locally. — live: `list_extensions`

**Supabase's testing guidance**
- pgTAP files go in `supabase/tests/database/*.sql` and run with `supabase test db`. — [Testing your database](https://supabase.com/docs/guides/database/testing) (fetched 2026-11-27, undated)
- [Testing overview](https://supabase.com/docs/guides/local-development/testing/overview) (fetched 2026-11-27, undated)
  - Tests are wrapped in `begin … rollback`, test `anon` and `authenticated`, and always include negative cases.
  - Roles are switched with `set local role authenticated; set local "request.jwt.claims" …`.
  - CI example: `actions/checkout@v4` → `supabase/setup-cli@v1` → `supabase start` → `supabase test db`.
  - It points to the Basejump database tests as a production-grade RLS example.

### Inferences
- **Stopgap (one line, today):** add `npm ci --no-audit --no-fund` at the repo root before `npm run verify` in the `mobile` job. The structural fix is workspaces (Q8).
- **RLS/permission regression suite (target):**
  - `supabase/seed.sql`: five fixed personas (`client_a`, `client_b`, `coach_a` assigned to `client_a`, `coach_b`, `admin`) plus one row per table per client, and photo objects in `storage.objects` under `client_a/…`.
  - `supabase/tests/database/000_rls_enabled.test.sql`: a pgTAP loop asserting `rowsecurity` for every `public` table, so a new table without RLS fails CI. Add `policies_are()` snapshots for sensitive tables (`users`, `client_payments`, `coach_payouts`).
  - `010_role_escalation.test.sql`: B1/B2 regressions. A client cannot `update users set role='admin'`, and metadata role edits do not grant coach access.
  - `020_matrix.test.sql`: a table-driven matrix of 20 tables × 4 operations × 5 personas + anon. It checks `results_eq`/`throws_ok`/`is_empty` per cell, using `tests.authenticate_as('coach_a')`-style helpers (basejump `supabase-test-helpers`) or plain `set local role` + `request.jwt.claims`. The existing 39 informal checks become the first rows.
  - `030_storage_photos.test.sql`: replaces the PGlite script. It runs against the real storage schema and the applied policies.
  - `040_contract.test.sql`: `has_column` assertions for every column the **oldest supported app binary** reads. A migration that drops or renames a column still in use fails CI (Q5 OTA gating).
- Run it in the same CI job as type generation, so one local stack serves both. Expected cost is a few minutes per PR on GitHub-hosted Ubuntu. That is an estimate, not measured.
- Keep the PGlite approach only for pure SQL-function unit tests, if at all. The real stack is now cheap and accurate.

### Gaps
- The 39-check harness script itself was not located in the repo, so its exact checks cannot be listed.
- The basejump `supabase-test-helpers` current version and install method (dbdev vs vendored SQL) were not verified for late 2026.
- No dashboard (web) component or e2e tests beyond one file. Playwright/Maestro coverage was not assessed.

---

## Q5. CI/CD: workflows today, how Vercel and EAS get triggered, the target pipeline, and the EAS Update (OTA) strategy

### Takeaway
Today:
- One GitHub Actions workflow, `Mobile quality`, runs on PRs and pushes. It is red, and nothing gates on it.
- Vercel deploys `main` through its Git integration, with no DB step.
- EAS builds are manual.
- **There is no OTA capability**: `expo-updates` is not installed and there is no `runtimeVersion` or channel.

Because R3 means no production binary exists yet, now is the cheapest moment to add `expo-updates` with a **fingerprint** runtime policy and channels. Every store binary shipped without it can never receive OTA fixes.

Target pipeline:
PR checks (lint, typecheck, test, local-stack DB tests and type-drift gate) → merge → `supabase db push` (expand-only) → Vercel production → EAS Workflow (fingerprint → reuse build + OTA update, or build + submit) with percentage rollouts and an app-side minimum-version gate.

### Cited Findings
**The current workflow** — repo: `.github/workflows/mobile.yml:1-65`
- `.github/workflows/mobile.yml` is the only workflow. It runs on `pull_request` and `push: main` with path filters, `permissions: contents: read`, and Node `22.16.0`.
  - Job `mobile`: `npm ci` → `npm run verify` → `expo install --check` → `expo export --platform all`.
  - Job `photo-contract`: shared and node tests, the PGlite photo check and `npm run build` with placeholder `VITE_SUPABASE_*`.
- Actions are pinned by tag (`actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4`). The run annotation warns "Node.js 20 is deprecated… forced to run on Node.js 24". — gh: run 45884241977; [GitHub changelog: Node 20 deprecation](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/) (2025-09-19)
- `gh workflow list` shows only `Mobile quality`. Both `main` runs failed, but the pushes landed anyway. Branch protection is presumably absent; it was not verified. — gh

**Vercel and EAS today**
- Vercel: `vercel.json` sets `buildCommand: npm run build`, `outputDirectory: dist` and an SPA rewrite. Per project memory, project `dawnage-dash` auto-deploys from `main`. No `.vercel/` link exists locally. — repo: `vercel.json:1-10`
- EAS: `mobile/eas.json` has build profiles `development`, `preview`, `preview-simulator` and `production` with `environment` per profile, `appVersionSource: remote` and `autoIncrement`. There is **no `channel`** key in any profile. — repo: `mobile/eas.json:1-28`
- `mobile/app.json` has no `runtimeVersion` or `updates`. `expo-updates` is absent from `mobile/package.json` and `node_modules`. — repo: `grep`, `ls mobile/node_modules/expo-updates` → not found
- `mobile/app.config.ts:13-27` already fails EAS builds on a missing or placeholder Supabase URL/key, or a missing privacy URL. This is a good, existing build-time env assertion. — repo

**Expo guidance**
- [Expo: Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/) (modified 2026-11-02)
  - Policies are `appVersion` and `fingerprint`, or a custom string.
  - `fingerprint` "increments… whenever anything that may affect the native runtime changes… makes incompatible updates very unlikely, but requires building more often".
  - Other mitigations: gradual rollouts, error-rate monitoring and preview channels.
- [Expo: Rollouts](https://docs.expo.dev/eas-update/rollouts/) (fetched 2026-11-27, undated)
  - Start with `eas update --rollout-percentage=10`, adjust with `eas update:edit` and revert with `eas update:revert-update-rollout`.
  - Roll back with `eas update:roll-back-to-embedded`; `--force-end-active-rollout` needs EAS CLI ≥ 24.9.0.
  - One active rollout per branch, platform and runtime version.
  - Branch-based rollouts use `eas channel:rollout`.
- [Expo Workflows: Deploy to production](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/) (modified 2026-11-18)
  - On `push` to `main`, the `fingerprint` job feeds `get-build`.
  - If a build with that fingerprint exists, a `type: update` job publishes to branch `production`.
  - Otherwise `type: build` then `type: submit` run.
- There is **no first-class critical or mandatory update** in `expo-updates`. Expo's `UpdatesAPIDemo` shows a custom `--critical` flag stored in `expo.extra`, which the app checks. — [Expo UpdatesAPIDemo (GitHub)](https://www.github.com/expo/UpdatesAPIDemo) (undated); [expo-updates SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/sdk/updates/) (undated)
- [Expo pricing](https://expo.dev/pricing) (fetched 2026-11-27, undated)

  | | Free | Starter | Production |
  |---|---|---|---|
  | Price | $0 | $19/mo | $199/mo |
  | Builds | 15 Android + 15 iOS | $45 build credit | $225 build credit |
  | Update MAU | 1,000 | 3,000 | 50,000 |
  | Workflows | up to 60 min | usage-based | usage-based |

**Vercel previews**
- Vercel previews fall back to production Supabase keys unless per-branch vars are synced. — [Preview branches on Vercel](https://supabase.com/docs/guides/integrations/vercel-preview-branches) (undated)

### Inferences
**Target pipeline**
- *PR* (GitHub Actions, required checks via branch protection on `main`):
  1. `js`: one root `npm ci` (workspaces) → typecheck web and mobile → lint → Jest, node tests and `vite build`.
  2. `db`: `supabase/setup-cli` pinned to 3.x → `supabase start` (exclude unused services) → `supabase db reset` → `supabase test db` → `gen types --local` → `git diff --exit-code`.
  3. `easignore-guard`: export the JS bundle from exactly the file set EAS would upload. Candidate: `eas build:inspect --stage archive`, not verified (see Gaps). This structurally prevents R1-class failures.
  4. Vercel preview deploys automatically. Point its *Preview* env vars at the persistent `staging` branch, not prod.
  5. Optional: on label `preview`, an EAS Workflow publishes `eas update --branch pr-<n>` for testers on the `preview` channel.
- *Merge to `main`*:
  1. `db-deploy`: a GitHub Environment `production` with required reviewer → `supabase db push` and `supabase functions deploy` when `supabase/**` changed. It uses a scoped PAT.
  2. Vercel production builds from Git as today.
     - **Rule:** migrations must be *expand-only*: add nullable columns, new tables and new policies. Then Vercel/DB ordering does not matter.
     - *Contract* steps (drop or rename) ship in a later PR, only after the minimum supported app version no longer reads the old shape.
  3. EAS Workflow `deploy-to-production` as in Expo's example. Updates go out with `--rollout-percentage` (10 → 100 after checking Sentry). Rollback is `eas update:rollback` or `roll-back-to-embedded`.

**OTA design**
- Install `expo-updates` and set `runtimeVersion: { policy: 'fingerprint' }`.
- Add `channel` to each `eas.json` build profile: `development`, `preview` (mapped to the staging DB) and `production`.
- At about 152 users, Expo Free (1,000 update MAU) suffices. Move to Starter ($19) only if build credits run out.
- **Minimum-version gating for schema compatibility**, since Expo has no built-in critical update:
  - A tiny public-read table `app_release_policy(platform, min_build int, min_update_created_at, message)`, with RLS select for `anon`/`authenticated` and admin-only write.
  - The app checks it on launch and on foreground. Below minimum, it shows a blocking "Update required" screen: a store link if `min_build` is unmet, `Updates.fetchUpdateAsync()` + `reloadAsync()` if only the OTA is stale.
  - This is the lever for breaking DB changes:
    1. Raise `min_build`.
    2. Wait for adoption.
    3. Then run the contract migration. pgTAP `040_contract` prevents the contract step from shipping early.
- **Web/mobile content versioning:** keep the existing v1/v2 dual-read for `workout_logs.content` in the shared zod parser. The dashboard must deploy readers before the app writes a new version. This is expand/contract applied to JSON payloads.

### Gaps
- Not verified: branch protection and rulesets on `amxl07/DawnageDash`. `gh api` was not called.
- `eas build:inspect` flags and authentication needs in CI were not verified.
- EAS Workflows minute pricing beyond "Free up to 60 minutes" is not detailed.
- Not confirmed whether the Vercel project uses Git auto-deploy for previews. No `.vercel/` link exists, and Vercel MCP was not queried.

---

## Q6. Observability: Sentry status, Supabase logs, `pg_stat_statements`, Query Performance, OTel, and SLOs/alerts for a small team

### Takeaway
- Mobile has a careful, privacy-scrubbed Sentry init, but it is dormant (no DSN, R2) and loses two things that matter:
  - symbolicated stacks, because Metro doesn't use `getSentryExpoConfig`;
  - crash-free-session metrics, because `enableAutoSessionTracking: false`.
- The dashboard has **no error tracking**.
- Supabase logs live for 1 day on Free.
- Query stats are healthy. App queries average 0.4–34 ms, and the biggest DB time is PostgREST schema-cache metadata.

For a small team: Sentry (two projects, release health on) + the Supabase Metrics API → Grafana Cloud free alerts + 7-day logs on Pro. Skip log drains ($60/mo) until there is a paging need.

### Cited Findings
**Mobile Sentry**
- `mobile/src/lib/telemetry.ts:10-25` sets up Sentry like this:
  - It initialises only when not `__DEV__` and `EXPO_PUBLIC_SENTRY_DSN` is set.
  - It sets `defaultIntegrations: false`, `enableAutoSessionTracking: false`, `tracesSampleRate: 0`, `maxBreadcrumbs: 0` and `sendDefaultPii: false`, with a `beforeSend` sanitizer. — repo
- `mobile/app.config.ts:51-53` adds the `@sentry/react-native/expo` plugin only when `SENTRY_ORG`/`SENTRY_PROJECT` are set. `mobile/metro.config.js:2,5` uses `expo/metro-config` `getDefaultConfig`. — repo
- Sentry's Expo docs — [Sentry: Expo manual setup](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) (fetched 2026-11-27, undated)
  - Use `getSentryExpoConfig(__dirname)` from `@sentry/react-native/metro` "to assign Debug IDs to bundles and source maps".
  - Store `SENTRY_AUTH_TOKEN` as a *sensitive* EAS env var.
  - For EAS Update, upload maps with `npx @sentry/expo-upload-sourcemaps dist`, e.g. via `eas env:exec production '…'`.
- The dashboard has no Sentry, PostHog, Bugsnag, Datadog or LogRocket in `client/src` or the root `package.json`. — repo: grep

**Live query statistics**
- `pg_stat_statements` is installed (v1.11) and stats reset on 2025-11-19, so about a year of data. — live
- The top total time is `authenticator`:
  - `SELECT name FROM pg_timezone_names`: 2,532 calls, mean 330 ms, total about 837 s.
  - Two type-introspection CTEs: about 137 s and 111 s.
- App queries are fast:
  - The `authenticated` `set_config` preamble runs 181,679 calls at 0.40 ms mean.
  - `workout_logs` selects average 5.9 ms; `daily_check_ins` selects 4.0–22 ms.
  - The `workout_logs` insert averages 33.9 ms; the hit ratio is 100%.
- The **`service_role`** role made 608 PostgREST `INSERT INTO daily_check_ins` calls (47 ms mean). — live: `extensions.pg_stat_statements` joined to `pg_roles`
- In-repo `service_role` users are only `supabase/functions/delete-account/index.ts`, `scripts/progress-photo-access.mjs` and `scripts/verify-photo-privacy.mjs`. — repo: grep

**Supabase observability options**
- Log drains forward to any OTLP/HTTP endpoint and need Pro, Team or Enterprise. — [Supabase Log Drains](https://supabase.com/docs/guides/telemetry/log-drains) (undated); [Log Drains now on Pro](https://supabase.com/blog/log-drains-now-available-on-pro) (undated)
- supabase-js can propagate W3C trace context via `import '@supabase/supabase-js/tracing'`, and `trace_id` then appears in API-gateway and Edge Function logs. Edge Function CORS must allow `traceparent`/`tracestate`/`baggage`. — [Connect client traces to your logs](https://supabase.com/blog/connect-client-traces-to-your-logs) (2026; exact date not shown); [Client-side tracing docs](https://supabase.com/docs/guides/observability/client-side-tracing) (undated)
  - Supabase does not export Edge Function spans directly; correlation runs through logs.
- The Metrics API is a Prometheus endpoint `/customer/v1/privileged/metrics` with about 200 series, "available on all hosted projects". Supabase publishes sample alert rules: disk saturation, long-running queries, replication lag. — [Supabase Metrics API docs](https://supabase.com/docs/guides/telemetry/metrics) (undated); [Own Your Observability blog](https://supabase.com/blog/metrics-api-observability) (undated)
  - Sources disagree on credentials: service-role key vs a `sb_secret_` key with username `service_role`.
- Log retention is 1 day on Free and 7 days on Pro. — [Supabase pricing](https://supabase.com/pricing) (fetched 2026-11-27)

### Inferences
**What the numbers mean**
- The `pg_timezone_names` and introspection queries are PostgREST schema-cache reloads. About 2,500 reloads in a year is consistent with DDL and dashboard activity; it is not app load, so there is nothing to tune.
- Reset `pg_stat_statements` after the baseline so the Query Performance view reflects only post-launch traffic.
- **Investigate the 608 `service_role` check-in inserts.** No shipped client should hold the service-role key, so this is an unknown writer.
  - Candidates: a past script such as `scripts/generate_checkins_sql.py`, an external automation, or a leaked key.
  - Check API-gateway logs once retention allows (7 days on Pro).

**Small-team SLOs (28-day windows)**
1. **Check-in delivery:** ≥ 99.5% of daily and weekly check-in submits reach the DB within 24 h. Measure from app outbox-failure events in Sentry plus PostgREST 5xx on `daily_check_ins`/`weekly_check_ins` in edge logs.
2. **Mobile crash-free sessions:** ≥ 99.5%. This requires turning `enableAutoSessionTracking` on; it is session counts only, no PII.
3. **Dashboard error-free sessions:** ≥ 99%. Add `@sentry/react` with the Vite source-map plugin.
4. **Capacity:** DB disk < 80%, storage < 80% of plan, connections < 70% of max. These come from the Metrics API.
5. **Recoverability:** a successful scheduled off-platform dump in the last 7 days (Q7).

**Alerts (email or Slack, no on-call rota)**
- Sentry: new issue, regression, and crash-free < 99%.
- Grafana Cloud free: Supabase's sample disk and long-query rules plus storage %.
- GitHub: failed `main` workflow, which is already emailed but was ignored.
- One uptime ping on the dashboard URL and `/auth/v1/health`.
- Log drains and OTLP tracing are deferred: at 152 users, Sentry plus Supabase's 7-day Logs Explorer answers the same questions.

### Gaps
- Sentry pricing and free-tier quotas in late 2026 were not fetched.
- `@sentry/react` + Vite plugin specifics for Vite 5 were not verified.
- Not checked: whether Supabase Query Performance or Advisors are fully available on Free vs Pro.
- The source of the `service_role` inserts was not identified. Free-plan 1-day logs cannot show history.

---

## Q7. Reliability and ops: backups/PITR, compute and pooling, disk, Postgres upgrades, secrets, scoped PATs, dependency pinning and supply chain

### Takeaway
- **Backups:** none on Free. Upgrade to Pro for 7-day daily backups, and add a weekly off-platform `supabase db dump`. PITR ($100/mo) isn't justified for a 28 MB DB.
- **Pooling:** Supavisor is irrelevant at runtime, because both apps talk to PostgREST over HTTP. It matters only for CI migration jobs, through the session pooler.
- **Postgres:** already on PG17. Only minor image updates are pending.
- **Secrets:** the service-role key and DB URL sit in the dev machine's root `.env`. CI should use **scoped PATs** (GA 2026-10-06), GitHub Environments with approval, and EAS *sensitive*/secret vars.
- **Supply chain:** there is no Renovate or Dependabot. Add Renovate with `minimumReleaseAge` and npm `min-release-age`, pin Actions by SHA, and delete the dead server dependencies.

### Cited Findings
**Backups and capacity**
- Backups are "Not included" on Free; Pro has daily backups for 7 days, and PITR is $100/mo per 7 days. — [Supabase pricing](https://supabase.com/pricing) (fetched 2026-11-27)
- Live capacity: DB 28 MB; storage 885 MB of 1 GB; 12 of 60 connections; `wal_level=logical`; `max_connections 60`. — live

**Runtime database access**
- Both apps use `@supabase/supabase-js` `createClient` (PostgREST/HTTP). No runtime code opens Postgres connections: `server/` has no routes, and drizzle is unused. — repo: `client/src/lib/supabase.ts:14`, `mobile/src/lib/supabase.ts:7`, `server/routes.ts:4-7`

**The Edge Function**
- `delete-account` is `ACTIVE`, `version: 1` and `verify_jwt: true`. It is deployed manually; no CI deploys functions. — live: `list_edge_functions`; repo: no workflow touches `supabase/functions`

**Postgres upgrades**
- Hosted upgrades take the project offline, copy data to a new instance and run `pg_upgrade`. Downtime scales with data size. `pg_cron` is dropped and recreated. — [Supabase: Upgrading](https://supabase.com/docs/guides/platform/upgrading) (undated)
- Postgres 14 support ended on 2026-07-01. — [Changelog: PG14 deprecation](https://supabase.com/changelog/45827-deprecation-notice-support-for-postgres-14-ending-on-1st-july-2026) (2026)
- Dawnage runs 17.6.1.037; another project in the same org already has 17.11.0.002. — live: `list_projects`

**Scoped personal access tokens**
- Each token is limited to per-resource read or read-write permissions (Database, Edge Functions, Production Branches, …) with an expiry. — [Scoped PATs GA changelog](https://supabase.com/changelog/scoped-personal-access-tokens-ga) (2026-10-06); [PAT docs](https://supabase.com/docs/guides/platform/personal-access-tokens) (undated; still says "public alpha… rolling out")
  - CI reads `SUPABASE_ACCESS_TOKEN`.
  - `supabase link` needs read on Project Settings, API Keys and API Key Secrets.
  - **Commands using `SUPABASE_DB_PASSWORD` bypass token permissions.**
  - Sources conflict on the GA date: an Aug-2026 alpha, a third-party "GA 28 Sep 2026", and the changelog's 2026-10-06. The changelog is treated as authoritative.

**Secrets in the repo**
- The root `.env` holds `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SESSION_SECRET` and `VITE_COACH_ACCESS_KEY`, plus public `VITE_SUPABASE_*`. Only key names were read. `.env` is gitignored; tracked files are only `.env.example`, `mobile/.env.example` and `mobile-2/.env.example`. — repo: `.gitignore:8-10`, `git ls-files`
- `mobile/.env.example` says "ANON key only — never SUPABASE_SERVICE_ROLE_KEY" and "Keep SENTRY_AUTH_TOKEN in the build secret store". — repo
- There is no `.github/dependabot.yml` and no `renovate.json`. — repo
- There are two lockfiles: root `package-lock.json` (2026-04-02) and `mobile/package-lock.json` (2026-09-25). — repo

**Supply-chain incidents and cooldowns**
- On 2026-05-11, 84 malicious versions of 42 `@tanstack/*` packages were published (Mini Shai-Hulud; CVE-2026-45321). They steal credentials and self-propagate. The query, table, form, virtual and store packages were **not** affected. — [GHSA-g7cv-rxg3-hmpx](https://github.com/advisories/GHSA-g7cv-rxg3-hmpx) (May 2026); [InfoQ](https://infoq.com/news/2026/05/tanstack-supply-chain-attack) (May 2026)
  - The repo resolves `@tanstack/react-query` 5.60.5 at the root and 5.102.8 in mobile. — repo: lockfiles
- Renovate `minimumReleaseAge` holds updates until a release is old enough. Since Renovate 42, releases without timestamps are held too, and it is a default in the "best practices" preset. — [Renovate docs: Minimum release age](https://docs.renovatebot.com/key-concepts/minimum-release-age/) (undated); [Mend blog](https://www.mend.io/blog/secure-npm-ecosystem-with-mend-renovate/) (Nov 2025)
- npm 11.10.0 (Feb 2026) added `min-release-age` (days). This comes from secondary sources.
- pnpm 10.16 (Sep 2025) added `minimumReleaseAge`. — [Socket blog](https://socket.dev/blog/pnpm-10-16-adds-new-setting-for-delayed-dependency-updates) (Sep 2025); [pnpm supply-chain security](https://pnpm.io/supply-chain-security) (undated)
- Supabase publishes a "Securing npm installs" guide. — [Supabase: Securing npm installs](https://supabase.com/docs/guides/security/npm-security) (undated)

### Inferences
- **Do this week:** upgrade the org to Pro. Before that, take a manual `supabase db dump` of the schema and data and an export of the `progress_photos` bucket. Today a bad migration or account-deletion bug has no recovery path.
- **Backups:** a scheduled GitHub Action runs a weekly `supabase db dump` (data) to an encrypted artifact or private bucket, kept 30 days. This gives off-platform coverage beyond Pro's 7 days at about $0. Restore is drilled quarterly into a branch.
- **Compute:** Micro (Pro credit) is ample: a 28 MB DB, 12 connections and 100% cache hit.
- **Pooling:** no change for apps. CI `db push` on IPv4-only GitHub runners should use the session-pooler connection, which is unverified (see Gaps).
- **Postgres:** apply the newer 17.x image during a low-traffic window, after rehearsing on the staging branch. No major upgrade is needed.
- **Secrets map:**
  - GitHub Environment `production` (required reviewer):
    - `SUPABASE_ACCESS_TOKEN`: a scoped PAT with Database and Edge Functions read-write on this project only, a 90-day expiry and a calendar reminder.
    - `SUPABASE_DB_PASSWORD`: it bypasses scopes, so only this environment holds it.
    - `EXPO_TOKEN`: a robot user.
    - `SENTRY_AUTH_TOKEN`.
  - EAS env per environment:
    - `EXPO_PUBLIC_*` as plain or sensitive. They are public by design.
    - `SENTRY_AUTH_TOKEN` as secret.
  - Vercel: only `VITE_*` public values.
  - **Remove the service-role key and `DATABASE_URL` from the everyday root `.env`.** Keep them in a password manager for break-glass.
  - Review `VITE_COACH_ACCESS_KEY`: any `VITE_*` value is compiled into the public JS bundle, so it cannot be a secret. This is security scope; flag it to the security researcher.
- **Supply chain:**
  - Renovate (`config:best-practices` + `minimumReleaseAge: "3 days"`). Group Expo SDK packages and leave SDK bumps to `npx expo install --fix`.
  - `.npmrc` `min-release-age=3` once CI's npm is ≥ 11.10.
  - Pin Actions by SHA and move to Node-24 action majors.
  - `npm ci` only.
  - A single lockfile after workspaces.
  - Delete about 14 dead dependencies.

### Gaps
- Not verified:
  - whether `supabase db push` in CLI v3 auto-selects the pooler on IPv4-only runners;
  - whether the project has the IPv4 add-on;
  - the npm `min-release-age` version and semantics (secondary sources only);
  - whether Dependabot has an equivalent cooldown;
  - the GitHub Actions minutes quota for this private repo.

---

## Q8. Repo topology: should this become a workspace monorepo (`apps/web`, `apps/mobile`, `packages/*`, `supabase/`)? How does the `.easignore`/Metro `watchFolders` hack fit in?

### Takeaway
Yes. The relative-path `../shared` sharing has now caused **two** classes of failure:
- R1: EAS archives miss files.
- CI red since 2026-11-22: Jest cannot resolve `@babel/runtime` for `../shared/*`.

Both have the same root cause: shared code with no `package.json` and no declared dependencies.

The minimum fix is npm workspaces, with no new tool, and **one** shared package, `packages/shared`, that includes the generated `db.types.ts`. Metro's SDK 52+ monorepo auto-config then replaces the manual `watchFolders`. The `.easignore` allowlists a directory (`/packages`) instead of single files. React 18 (web) vs React 19.2 (mobile) must be kept per-app.

### Cited Findings
**Current layout and sharing**
- The root layout mixes:
  - the dashboard (`client/` plus root `package.json` named `rest-express`, `vite.config.ts`, `tailwind.config.ts`);
  - `mobile/` (its own `package.json` and lockfile);
  - `shared/`;
  - legacy `server/`;
  - **`DawnageMobile/` and `mobile-2/`** (87 tracked files, each with its own `app.config.ts`/`.env.example`);
  - `.superpowers/…/baseline/` test copies;
  - `MISC/`, `data/`, `dist/`, `Payout.txt`. — repo: `ls -la`, `git ls-files`
- Mobile imports shared code by relative path. — repo: grep
  - `mobile/src/components/questionnaire/QuestionnaireWizard.tsx:18` imports `../../../../shared/assessment-save`.
  - `mobile/app/(app)/profile.tsx:36,38` import `../../../shared/assessment-save` and `profile-save`.
  - `mobile/src/lib/questionnaire-data.ts:1` imports `../../../shared/questionnaire`.
  - Web uses both `@shared/*` (tsconfig path) and `../../../shared/*`.
- `.easignore:3-8` allowlists `/mobile` and only `/shared/progress-photos.ts`, which causes R1. — repo
- `mobile/metro.config.js:7` manually adds `../shared` to `watchFolders`. — repo
- **React versions differ:** root `react ^18.3.1`, mobile `react 19.2.3`. — repo: `package.json` files

**Expo's monorepo guidance** — [Expo: Work with monorepos](https://docs.expo.dev/guides/monorepos/) (fetched 2026-11-27, undated)
- Supports Bun, npm, pnpm and Yarn workspaces.
- From SDK 52, Metro is auto-configured: "remove `watchFolders`, `resolver.nodeModulesPath`…".
- The recommended layout is `apps/*` and `packages/*` with `workspace:*` references.
- SDK 54 added isolated-dependency support with caveats. `autolinkingModuleResolution` is automatic for monorepos from SDK 55.
- It warns that duplicate React versions **in one app** cause runtime errors, and recommends npm `overrides` / pnpm overrides to force single versions.

### Inferences
**Target layout**
```
apps/web        (was client/ + vite/tailwind/postcss config; Vercel Root Directory)
apps/mobile     (was mobile/)
packages/shared (was shared/ minus schema.ts; package "@dawnage/shared", declares its own deps,
                 exports domain logic, zod payload parsers, generated src/db.types.ts)
supabase/       (config.toml, migrations/, seed.sql, tests/database/, functions/, archive/)
package.json    (private, "workspaces": ["apps/*","packages/*"], one package-lock.json)
```
- **Why one shared package, not `db-types` + `domain`:** a single consumer pair and a single team. Split when a second backend consumer appears.
- **How this removes R1 and the CI failure structurally:**
  - Both apps depend on `"@dawnage/shared": "*"`, so Jest and Metro resolve through `node_modules` symlinks with declared dependencies.
  - `.easignore` allowlists `!/packages`.
  - The `easignore-guard` CI job (Q5) exports the bundle from the EAS archive file set.
  - Remove the manual `watchFolders` from `metro.config.js` (keep the `realpath` logic only if worktrees still need it).
- **React split:** npm hoisting puts one React at the root and nests the other under the app that differs. This is legal across *different* apps, but fragile. Mitigations, in order of laziness:
  1. Add an npm-workspace check that `npm ls react` shows exactly one version per app. Make it a CI step.
  2. Upgrade the dashboard to React 19, which removes the split and is worthwhile anyway.
  3. Only if hoisting breaks native builds: pnpm with `nodeLinker: hoisted`.
- **Delete or relocate** `DawnageMobile/`, `mobile-2/` and `.superpowers/**/baseline/` (tag the commit first). They duplicate app configs and tests, confuse grep/agents, and are already excluded from EAS only by the allowlist.
- **Vercel:** set Root Directory to `apps/web`, install at the repo root. This is unverified for this project.
- **Sequencing:** do the move **before** the first production EAS build (R3). Changing paths afterwards changes the fingerprint and forces a rebuild anyway.

### Gaps
- Not verified:
  - Vercel's current monorepo settings for npm workspaces with a Vite SPA.
  - Whether EAS Build's archive respects workspace symlinks correctly with an allowlist `.easignore`; it should, since symlinks resolve inside `/packages`.
- Not tested: whether React 18 and 19 coexist cleanly under npm hoisting in this exact dependency set.

---

## Q9. Synthesis: ranked gaps, target platform workflow, rollout and cost

### Takeaway
The ranking is driven by "blast radius × likelihood" at about 152 users with a launch imminent:
1. No backups (Free plan) and near-full storage.
2. CI red on `main` and ungated.
3. No schema source of truth, with drift and destructive scripts in the tree.
4. Prod is the only test DB; the automated DB test targets a superseded migration.
5. The dead drizzle stack with a loaded `db:push`.
6. Untyped DB access and JSON-in-text.
7. No OTA or minimum-version gating before the first production binary.
8. Observability is dormant or absent.
9. Secrets and supply-chain hygiene.
10. Repo topology noise.

A four-phase rollout fixes all of them for about $25–45/mo extra.

### Cited Findings
- Each ranked item is evidenced in Q1–Q8:
  - Free plan and storage — live: `get_organization`, storage sum.
  - CI red — gh: runs 45884241977 and 44992993223.
  - Drift — live `list_migrations` vs `sqlmigrationfiles/`.
  - Superseded migration under test — `scripts/verify-photo-privacy.mjs:5`.
  - Dead drizzle stack — `package.json:12`, `drizzle.config.ts`.
  - Untyped clients — `client/src/lib/supabase.ts:14`.
  - No OTA — no `expo-updates` in `mobile/package.json`.
  - Dormant observability — `mobile/src/lib/telemetry.ts:10`.
  - Secrets — root `.env` key names.
  - Topology — `.easignore:3-8`.
- Cost inputs:
  - Supabase Pro $25/mo; branch $0.01344/h. — [Supabase pricing](https://supabase.com/pricing) (fetched 2026-11-27)
  - Expo Free: 1,000 update MAU, 15+15 builds. — [Expo pricing](https://expo.dev/pricing) (fetched 2026-11-27)

### Inferences
**Ranked gaps** (severity / effort)

| # | Gap | Severity | Effort |
|---|---|---|---|
| G1 | Free plan: zero backups; storage 885 MB/1 GB; 1-day logs; pause-on-inactivity risk | Critical | 10 min + $25/mo |
| G2 | CI red on `main` since 2026-11-22, merges not gated; status review reported local green | High | 1 line now, workspaces later |
| G3 | No schema source of truth: 78 hand-applied files; live history 8 rows; DML outside history; `reset_*`/`mock_*` scripts beside real migrations | High | 1–2 days |
| G4 | Prod is the only DB; 39 permission checks run on prod by hand; CI DB test targets the never-applied 2026-09-19 migration | High | 2–3 days |
| G5 | Dead Express/drizzle/Neon stack; `db:push` + `DATABASE_URL` can mutate prod from a stale model | High (latent) | 1 h |
| G6 | Untyped `createClient`; 8 JSON-in-text columns; 45 `JSON.parse`; v1/v2 workout content unenforced | Medium | 2–3 days |
| G7 | No `expo-updates`/runtimeVersion/channels and no min-version gate; must land before the first production binary (R3) | High (time-boxed) | 1 day |
| G8 | Mobile Sentry dormant, no source maps or release health; dashboard has no error tracking; 608 unexplained `service_role` inserts | Medium | 1 day |
| G9 | Service-role key and DB URL in the everyday `.env`; no Renovate/cooldown; tag-pinned Node-20 actions; two lockfiles; no scoped CI token | Medium | 0.5 day |
| G10 | Repo topology: `../shared` relative imports, file-level `.easignore` allowlist, `DawnageMobile/`, `mobile-2/`, baseline copies; React 18/19 split | Medium (causes G2/R1) | 1–2 days |

**Rollout.** Each phase is safe on its own, and nothing touches live data until Phase 2's metadata-only repair.
- **Phase 0, today:**
  - Pro upgrade (G1).
  - Manual dump and photo export.
  - Root `npm ci` added to the `mobile` CI job (G2 stopgap).
  - Branch protection requiring CI on `main`.
  - Delete the dead server stack and `db:*` scripts (G5).
- **Phase 1, week 1:**
  - npm workspaces: `apps/web`, `apps/mobile`, `packages/shared`.
  - `.easignore` allows `/packages`; Metro default config; `easignore-guard` job (G10, R1-class prevention).
  - Renovate with cooldown; SHA-pinned actions (G9).
- **Phase 2, week 2:**
  - Supabase CLI 3.x pinned.
  - `init`/`link` → `migration repair` → `db pull` baseline → CI replay + `db diff --linked` = empty (G3).
  - `seed.sql` personas.
  - pgTAP suite porting the 39 checks plus RLS-enabled and contract tests (G4).
  - `gen types` + diff gate; `createClient<Database>`; zod payload parsers (G6).
  - Archive `sqlmigrationfiles/`.
- **Phase 3, week 3, before R3's first production build:**
  - `expo-updates` with fingerprint policy and channels.
  - The EAS Workflow `deploy-to-production`.
  - The `app_release_policy` table + update-required screen.
  - Expand/contract rule documented in the PR template (G7).
  - Sentry: DSN set (R2), `getSentryExpoConfig`, session tracking on, the `expo-upload-sourcemaps` step, dashboard Sentry (G8).
- **Phase 4, week 4+:**
  - A persistent `staging` branch (about $10/mo) wired to the EAS `preview` channel and Vercel Preview env.
  - The Metrics API → Grafana Cloud alert rules.
  - A weekly off-platform dump Action and a nightly `db diff --linked` drift check.
  - Re-evaluate pg-delta declarative schemas once they reach 1.0.

**Steady-state cost:**

| Item | Cost |
|---|---|
| Supabase Pro | $25 |
| Staging branch | ~$10 |
| Occasional preview branches | ~$0–7 |
| Expo Free (Starter $19 only if build credits run short) | $0 |
| Sentry and Grafana Cloud free tiers (quotas unverified) | $0 |
| **Total** | **≈ $35–60/mo** |

Rejected as over-engineering at this scale:
- PITR ($100/mo).
- Log drains ($60/mo).
- Atlas/pgschema.
- Turborepo/Nx.
- Separate `db-types` and `domain` packages.

### Gaps
- Effort estimates are judgement, not measured.
- Not verified, to confirm with the owner and in the dashboards:
  - Sentry and Grafana free-tier limits;
  - the private-repo GitHub Actions minute quota;
  - Docker availability on the owner's machine.

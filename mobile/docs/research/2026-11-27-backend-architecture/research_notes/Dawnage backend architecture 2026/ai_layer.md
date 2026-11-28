# AI-native backend layer for Dawnage (state as of 2026-11-27)

Evidence conventions used below:
- **DB-1 … DB-6** = read-only aggregate SQL run on 2026-11-27 via Supabase MCP `execute_sql` against project `hzifwkebzhzlxvigbcup` (ap-southeast-2, Postgres 17). Only counts, null rates, lengths, JSON key names and enum labels were returned. No personal values, free text, names or emails were read or written here. DB-1 = schema/columns; DB-2 = row counts, date ranges, null rates, lengths; DB-3 = JSON shapes and bulk-insert clusters; DB-4 = plans/templates/users-notes; DB-5 = set-level types; DB-6 = activity by month and per-field lengths.
- **Repo** = files under `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash` at branch `codex/native-ui-modernization`.
- **Skill ref** = Anthropic's `claude-api` reference bundled with Claude Code 2.1.332, model table "cached 2026-11-03". Where a live Anthropic page was fetched, that page is cited instead.
- Sources older than 2025-01-01 are flagged **[pre-2025, possibly stale]**.

---

## 1. Data available for AI: what exists, its structure, and whether it is clean enough

### Takeaway
Dawnage holds about 6,500 rows of mostly **structured** coaching data for 142 clients: 2,107 daily check-ins, 946 workout logs (≈16k sets), 956 plan days, 259 measurement rows, 366 photo sets, 118 questionnaires and 107 weekly check-ins. Most of it is numeric, enum or JSON. Free text is sparse and short: daily notes are always empty, and the weekly check-in averages about 290 characters. The data is good enough for summaries and risk flags once a handful of hygiene fixes land: enum casing drift, numbers stored as text, a null `week_start_date`, exercise-name canonicalisation, and the legacy-vs-v2 workout-log formats. There is **no AI/LLM code, dependency or vector/queue extension in use today**.

### Cited Findings

**Baseline: no AI code exists (verified)**
- A grep for `anthropic|openai|@ai-sdk|langchain|generativeai|ollama|cohere|mistralai|Supabase.ai|gte-small|pgvector|vector(` across `client/ mobile/ shared/ server/ supabase/ scripts/ sqlmigrationfiles/ DawnageMobile/ mobile-2/` returned no matches. Neither root `package.json` nor `mobile/package.json` declares `ai`, `openai`, `@anthropic-ai/sdk` or `@ai-sdk/*` — [Repo grep, 2026-11-27]
- The only Edge Function is `supabase/functions/delete-account`. It uses a service-role client and verifies the caller with `admin.auth.getUser(token)`, which is a reusable auth pattern for AI functions — [Repo: supabase/functions/delete-account/index.ts](/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/supabase/functions/delete-account/index.ts)
- Installed extensions: `uuid-ossp`, `pgcrypto`, `pg_stat_statements`, `supabase_vault`, `plpgsql`. **Available but not installed:** `vector` 0.8.0, `pgmq` 1.5.1, `pg_cron` 1.6.4, `pg_net` 0.19.5 and `pg_jsonschema` 0.3.3 — [Supabase MCP list_extensions, 2026-11-27]

**Population and coach load (DB-2, DB-4, DB-6)**
- `users`: 152 rows (142 client, 7 coach, 3 admin). 88 clients have a `coach_id`. Clients per coach average 12.6, with a maximum of 34. Clients span 20 countries and 5 package types — [DB-2/DB-4]
- **Activity is low today:** 18 distinct clients logged anything in the last 30 days and 41 in the last 90 days. Daily check-ins peaked in 2026-05 (400 that month) and fell to 58 in 2026-11 (through the 27th). Workout logs peaked in 2026-05 (126) and were 55 in 2026-11 — [DB-6]

**Workout logs: `workout_logs.content` is text holding JSON (DB-2, DB-3, DB-5)**
- 946 rows from 61 users, dated 2025-12-01 to 2026-11-27, with 186 in the last 90 days. 100% parse as JSON, and 100% are top-level **arrays**. **0 rows** use the v2 object format `{version:2, planDayNumber, exercises}` — [DB-2]
- All 5,738 array elements have exactly the keys `exercise|sets`. All 15,967 sets have exactly `reps|rpe|setNumber|weight`, and all values are **strings** — [DB-3, DB-5]
- Set quality: `reps` is integer-parsable in 84.1% of sets (13,423/15,967). `weight` is numeric-parsable in 78.6% (12,548) and empty in 21.3% (3,404), which may be bodyweight or missing. `rpe` is filled in only 8.1% (1,287) — [DB-5]
- Each log averages 6.1 exercises. There are **394 distinct exercise names** after lower/trim, against **231 distinct names in templates**. Logs have 96 distinct titles. Content averages 1,108 characters (p50 1,137, p95 1,569, max 1,770). The median user has 10 logs — [DB-3, DB-4]
- The mobile parser tolerates three historical shapes: current `[{exercise, sets:[{setNumber,reps,weight,rpe}]}]`, a legacy object `[{Exercise, Sets, Reps, Weight, Duration, Rest, VideoLink}]`, and plain strings. Mobile now writes v2 (`version: 2`, `planDayNumber`, `completed`, `kind: warmup|work`, `duration`) through `serializeWorkoutContent` — [Repo: mobile/src/lib/workout-content.ts](/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile/src/lib/workout-content.ts). The dashboard has its own reader `readWorkoutRecord` — [Repo: client/src/lib/workout-record.ts](/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/client/src/lib/workout-record.ts)
- In practice the "two formats" are **live legacy arrays (100% of prod rows)** and **v2 objects (written by the unreleased mobile app, 0 prod rows)**. Any AI context builder must normalise both. The legacy object and plain-text shapes have 0 prod rows — [DB-2, DB-3]

**Plans and templates (DB-4)**
- `workout_plans`: 956 rows across 102 users. All `exercises` values are JSON arrays. Element shapes are `id|name|notes|reps|sets|videoLink` (2,046), `id|name|reps|sets|videoLink` (1,853), `id|name|reps|sets` (1,365), `id|name|notes|reps|sets` (123) and `name|reps|sets` (47). The `notes` column on the plan row is never filled; coach notes live *inside* exercise elements. There are 3 levels and 6 workout types — [DB-4]
- `workout_templates`: 179 rows (161 global, 18 coach-private) with only **4 distinct `template_name`s** and 231 distinct exercise names. Elements use `name|reps|sets[|videoLink][|notes]`, and `exercises` averages 335 characters — [DB-4]
- `meal_templates`: 28 rows (27 global), each a JSON object averaging 804 characters. `meal_plans`: 368 rows across 57 users, with a free-text `description` averaging 59 characters, macros 100% populated and 5 meal types. `food_items`: 601 rows with calories and protein 100% populated and 15 serving units — [DB-4]

**Daily check-ins: `daily_check_ins` (DB-2, DB-3)**
- 2,107 rows from 84 users, 2025-12-01 to 2026-11-27, with 314 in the last 90 days. The median user has 14 check-ins, and 31 users have 30 or more — [DB-2, DB-3]
- Non-null rates: morning_weight 91.7%, sleep_hours 89.9%, workout_status 96.0%, workout_performance 75.3%, nutrition_score 83.6%, calorie_intake 47.8%, water 83.8%, steps 76.7%, energy 82.8%, hunger 78.5%, stress 78.3%, digestion 87.3%. **protein, carbs and fats are each 3.7% (78 rows)** — [DB-2]
- **`notes` is empty in 100% of rows** — [DB-2]
- Enum drift: `workout_status` has 8 values (`Done/done`, `No/no`, `Cardio/cardio_day`, `Rest/rest_day`). `digestion` has 8 (`None/none`, `Bloated/bloated`, `Constipated/constipated`, `Diarrhea/diarrhea`) — [DB-3]
- 78 rows sit in two bulk-insert minute clusters (more than 20 rows in the same minute), which looks like seeded or imported data. The repo ships seed scripts such as `sqlmigrationfiles/mock_workout_logs.sql` and `mock_body_measurements.sql` — [DB-3; Repo: sqlmigrationfiles/]
- The mobile app reads HealthKit `StepCount`, `BodyMass`, `DietaryEnergyConsumed`, `DietaryWater`, `DietaryProtein`, `DietaryCarbohydrates` and `DietaryFatTotal`, plus Health Connect `Steps` and `Weight`. The iOS usage string says chosen values "enter your daily check-in and are shared with your coach". So **some daily check-in values are HealthKit-derived, and no column records their provenance** — [Repo: mobile/src/features/health/healthkit-reader.ts, mobile/app.config.ts](/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile/app.config.ts)

**Weekly check-ins: `weekly_check_ins` (DB-2, DB-3, DB-6)**
- 107 rows from 37 users, created 2026-01-08 to 2026-11-20, with only 13 in the last 90 days. **`week_start_date` is NULL in every row**, so the week has to be derived from `created_at` — [DB-2, DB-3]
- All 18 answer columns are `text`. The combined text averages 289 characters (p95 714). Per-field averages split into two groups: categorical-in-text (`stress_level` 1, `joint_pain` 2, `missed_sessions` 2, `recovery_issues` 2, `water_intake` 2, `step_count` 3, `training_progress` 3, `enjoying_*` 3, `nutrition_adherence` 4) and real free text (`overall_feeling` 51, `weekly_wins` 45, `nutrition_questions` 34, `overall_experience` 30, `feedback` 29, `training_questions` 27, `digestion` 20) — [DB-6]
- `stress_level` has 13 distinct values, `step_count` 42 and `water_intake` 16, so numbers are typed inconsistently as text. `joint_pain` and `missed_sessions` are non-empty in 105 of 107 rows. `training_questions` is non-empty in 53, `nutrition_questions` in 58 and `feedback` in 43 — [DB-2]

**Measurements and photos (DB-2)**
- `body_measurements`: 259 rows from 72 users (2025-12-01 to 2026-11-25). Chest, waist, hips, thighs and arms are each about 99% populated. There is no weight column; weight lives in daily check-ins — [DB-2]
- `weekly_progress_photos`: 366 rows from 90 users (2026-01-03 to 2026-11-25), with 4 angle columns (front 356, back 351, left 351, right 348). 353 front values are stored as `http…` URLs and 3 as storage paths. There are no captions or notes. The legacy `progress_photos` table has 0 rows — [DB-2]

**Questionnaire / assessment (DB-2, DB-3, DB-6; repo)**
- `onboarding_questionnaire`: 118 rows from 118 users (109 completed, 9 in progress). `answers` is JSON-in-text, 100% valid, with 91 distinct keys and about 72 keys per row. Values are 7,774 strings and 735 numbers, and **735 values are longer than 100 characters**. Size averages 2,966 characters (p95 5,761). Only 1 row contains the newer `v2_*` keys — [DB-2, DB-3, DB-6]
- Question IDs include direct identifiers: `q1` Name, `q5` City and country, `q6` Occupation and `q7` WhatsApp number. The "Health" section covers q56–q68, and q82–q86 rate digestion symptoms from 1 to 5. The v2 prompts add sensitive free text such as `v2_weight_history`, `v2_diet_history` and `v2_stress_routine` — [Repo: shared/questionnaire.ts](/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/shared/questionnaire.ts)

**Coach-authored notes (DB-4)**
- On `users`, `coach_note` is non-empty for 3 clients (average 29 characters). `training_note`, `nutrition_note` and `supplements_note` are each 0. `cardio_note` is 33, `steps_note` 30 and `supplements_data` 49. `profile_data` jsonb keys are `goal`, `timezone`, `injuries`, `medicalCondition`, `workoutDays` and `allergies` (53–58 rows each). `active_workout_plan` is JSON in 123 rows — [DB-4]
- `coach_client_history`: 200 events (144 assigned, 56 unassigned) with a free-text `reason`. `user_goals` has 0 rows. There is **no messaging/chat table** in `public` — [DB-2, DB-4; MCP list_tables]
- `dedupe_backup_2026_11_22` (112 rows) is a backup table in `public`. It must be excluded from any AI pipeline — [MCP list_tables]

### Inferences
- **Structured vs free text.** About 90% of the signal is structured: numeric daily metrics, set data and plan JSON. The only meaningful free text is 6–7 weekly fields, questionnaire long answers (735 values) and per-exercise coach notes. An LLM therefore adds value mainly by **narrating pre-computed numbers and reading the little free text that exists**, not by mining large corpora. The numbers should be computed in SQL rather than by the model.
- **Hygiene needed before AI (all cheap, done in SQL):**
  1. Map the `workout_status` and `digestion` casing and synonyms to canonical enums, through a view or migration plus CHECK constraints.
  2. Backfill `weekly_check_ins.week_start_date` from `created_at` and make it NOT NULL.
  3. Expose parsed numeric versions of the weekly `stress_level`, `step_count` and `water_intake` fields in a view.
  4. Build a canonical exercise dictionary to reconcile 394 logged names with 231 template names. This is a good embedding or LLM-assisted one-off job, reviewed by a coach.
  5. Parse set `weight`/`reps` strings to numerics in a view, keeping the raw value.
  6. Have one SQL function normalise both workout-log formats, mirroring `workout-content.ts`.
  7. Tag or exclude seed/demo rows before any evaluation or analytics.
- **Data gaps that limit some use cases.** Macros are 3.7% filled and calories 48%, which is why natural-language meal logging is a real gap. `rpe` is 8% filled, which limits auto-progression logic. There are 0 `user_goals`. Daily notes are always empty, so a summary can't rely on daily free text.
- Weekly check-in volume is tiny today: about 1 per week across the whole platform in the last 90 days. Daily check-ins plus workout logs are the real substrate for a "weekly digest", which should not depend on a weekly check-in being submitted.

### Gaps
- Whether the 78 bulk-clustered rows and any demo accounts are test data could not be confirmed without reading identities, which this task did not allow.
- Coach time spent per check-in today is unknown (no telemetry), so value estimates are qualitative.
- Whether stored photo URLs are signed or public was not determined; only the `http` prefix was counted.

---

## 2. Ranked AI use cases (value vs effort and risk) and what competitors shipped in 2025–2026

### Takeaway
Rank: **(1)** a coach-facing weekly digest with risk flags, **(2)** deterministic anomaly flags with no LLM, **(3)** a coach copilot that drafts plan adjustments for approval, **(4)** exercise substitution, **(5)** natural-language meal logging, **(6)** template and semantic search, **(7)** client Q&A. The market in late 2026 validates **AI drafting for coach review** (Trainerize, Everfit, Kahunas), while client-facing AI chat and nutrition AI remain mostly marketing.

### Cited Findings
**Competitor AI as of late 2026**
- **ABC Trainerize.** A conversational "AI Workout Builder", launched from a client's profile, was introduced on the Trainerize blog on **2026-02-24**. ABC Fitness's **2026-03-16** press release says it launched "in limited release earlier this month". A Trainerize post calls it "open beta… available now to all paid ABC Trainerize coaches", which conflicts on rollout stage. An ABC Fitness blog of **2026-09-03** says ">40% of workouts created on the platform are now AI-generated". Trainerize states the tool "does not have any access to your clients' names or personal identifiable information" — [Trainerize blog: AI workout builder](https://www.trainerize.com/blog/ai-workout-builder/); [ABC Fitness press release](https://abcfitness.com/press-release/abc-fitness-ai-infrastructure/); [Trainerize Aug 2026 updates](https://www.trainerize.com/blog/new-abc-trainerize-updates-august-2026-save-time-support-client-progress-and-keep-clients-engaged/). *(These dates and quotes came from search-result extracts; the pages were not fetched in full.)*
- Trainerize also points to a third-party "FitMetrics MCP" that connects Claude or ChatGPT to Trainerize data. A Kahunas comparison lists a FitMetrics AI assistant "from $6/client" — [Trainerize: alternatives 2026](https://www.trainerize.com/blog/top-trainerize-alternatives-and-competitors-for-2026/); [Kahunas: Everfit vs Trainerize 2026](https://kahunas.io/blog/everfit-vs-trainerize). One competitor (FitPilot) claims Trainerize has "zero AI capabilities", which is contradicted by the sources above — [FitPilot 2025](https://www.fitpilot.me/blog/best-pt-software-with-ai)
- **Everfit.** Its AI Workout Builder converts text or PDF programs into a structured plan and is in beta. It also lists an AI recipe builder, an AI meal scanner and "AI smart response" on the Pro tier — [Everfit blog 2026 (vendor)](https://blog.everfit.io/everfit-vs-trainerize-vs-truecoach). Coachway (updated Sept 2026) confirms only the builder (beta, "text notes into workouts in ~2 seconds") and says Everfit's site shows no AI nutrition or chat, which conflicts with Everfit's own post — [Coachway: Best AI coaching apps (Sept 2026)](https://coachway.io/articles/best-ai-coaching-apps/)
- **Kahunas.** Its 2.0 page (updated **2026-10-28**) lists "Whim", which drafts workout programs, nutrition plans and check-in forms "for the coach to review and save". Whim "doesn't assign plans or message clients on its own". The page also lists Labs (automated blood-test reading) and Exercise Analysis (form check, beta, from 50 seats) — [Kahunas 2.0](https://kahunas.io/blog/kahunas-2-0). The homepage, per a search extract, describes an AI summary of check-in changes — [Kahunas](https://kahunas.io/)
- **TrueCoach** markets no native AI. **Hevy Coach** has none. Coachway concludes that program drafting is the only "reliably real" AI category. AI chat, nutrition and form analysis are "mostly still marketing, not shipped features". Summarising check-ins is named as an admin win, but no platform is shown shipping it — [Coachway (Sept 2026, vendor-authored)](https://coachway.io/articles/best-ai-coaching-apps/)
- **CoachRx.** "RxBot" reportedly drafts progressive-overload models. The same source warns that drafts must be audited, because it suggests progressions needing equipment the client doesn't have — [KindaPeak 2026 (aggregator, low reliability)](https://kindapeak.com/ai-products/ai-tools-personal-trainers/)

**Dawnage data supporting each use case** (from §1)
- Coach load averages 12.6 clients (max 34). Daily check-in completeness is 75–96% on key metrics. Plan days have `days_per_week` and `day_number` for an adherence denominator. Weight is 92% filled for trends. `joint_pain` and `missed_sessions` are answered in 105/107 weekly check-ins — [DB-2, DB-4]
- Macros are 3.7% and calories 48% filled, against 601 `food_items` with full macros — [DB-2, DB-4]
- Templates are a small corpus (179 workout templates with 4 names, 28 meal templates), and exercise names diverge (394 logged vs 231 templated) — [DB-4]

### Inferences
Ranked table. Value and effort are relative to Dawnage today.

| # | Use case | Who | Expected value | Effort | Risk | Data prerequisites |
|---|---|---|---|---|---|---|
| 1 | **Weekly check-in digest + risk flags → coach inbox** | Coach | **High.** Replaces a manual review of about 7 dailies, about 3 logs and 1 weekly per client per week, for 12–34 clients per coach. Competitors are shipping adjacent features (Kahunas check-in summary), and Coachway names it a top admin win. | Low–Med | Low. Coach-only and read-only. | Enum normalisation, derived week, SQL aggregates (adherence vs plan, weight slope, sleep/stress/energy deltas), legacy/v2 log normaliser |
| 2 | **Deterministic anomaly flags** (missed sessions vs `days_per_week`, check-in gap ≥N days, weight trend outside goal band, sleep <6h streak, stress/energy drop, any `joint_pain` "yes") | Coach | High, and **needs no LLM**. It also supplies ground truth for #1. | Low (SQL views + pg_cron) | Very low | Same as #1 |
| 3 | **Coach copilot: draft plan adjustment** (load/volume/exercise swaps in `workout_plans` JSON, macro targets in `meal_plans`), coach approves before write | Coach | High. This is the market-validated pattern (Trainerize >40% AI-generated workouts; Kahunas Whim drafts for review). | Med–High | Medium: injuries and medicalCondition in `profile_data`, and a wrong load can cause harm. Human-in-loop is mandatory. | Exercise dictionary, plan JSON schema (pg_jsonschema), parsed sets, optimistic-concurrency writes |
| 4 | **Exercise substitution** (equipment, injury, preference) | Coach first, client later | Medium | Low (retrieval over the dictionary and templates plus a small prompt) | Low–Med. CoachRx shows equipment mistakes, so constrain to an allowed exercise list. | Canonical dictionary with equipment and muscle tags, `videoLink` |
| 5 | **Natural-language meal logging** ("2 eggs, toast, flat white") parsed to macros grounded in `food_items` | Client | Medium. It fills the 3.7% macro gap. | Med (mobile UI + confirm step) | Medium: accuracy and App Store AI consent. Everfit's meal scanner is unverified. | `food_items` with units, a confirm-before-save UI, HealthKit overlap rules |
| 6 | **Template / semantic search (pgvector)** | Coach | Low at current scale (207 templates). `pg_trgm`/FTS would do. | Low | Low | Useful mainly as the **retrieval substrate** for #3, #4 and #5 |
| 7 | **Client Q&A grounded in own plan** | Client | Medium | Med–High (needs a messaging surface, which doesn't exist) | **Highest.** Unreviewed health advice, App Store medical scrutiny (1.4.1), highest per-user cost. | Messaging table, plan context builder, escalation to coach |

- Build order: 2 → 1 → 3 + 4 (sharing retrieval) → 5 → 7. Ship #7 only as **"AI drafts a reply, coach sends"**, which is what Kahunas and Everfit's smart response imply, not as an autonomous client chatbot.
- Skip for now: AI on progress photos (vision). It processes body images, carries the highest sensitivity, has no field to write results to, and no competitor evidence shows coach value. Also skip LLM-run anomaly detection; rules are cheaper and auditable.

### Gaps
- No primary-source launch dates for Everfit, Kahunas or CoachRx AI features. The Kahunas page gives only an update date.
- No independent usage or outcome data on AI check-in summaries (retention or coach-time saved) from any vendor.

---

## 3. Architecture options on Supabase in 2026

### Takeaway
The simplest safe stack is **Postgres (pgmq + pg_cron + pg_net + pgvector) → Edge Function worker → Anthropic Messages API directly**, with structured outputs, drafts stored in Postgres and approval through an RPC. Supabase's built-in `Supabase.ai.Session` is production-usable only for **gte-small embeddings** (384-d, English, 512-token truncation). Hosted LLM inference is still early access. An external AI gateway adds another processor of health data and isn't needed at this scale.

### Cited Findings
**Edge Functions limits (live docs, undated, fetched 2026-11-27)**
- 256 MB memory. Wall clock 150 s on Free and **400 s on paid plans**. **2 s CPU per request** (async I/O excluded). Request idle timeout 150 s (504 after that). 20 MB bundle. 100 secrets per project — [Supabase: Edge Functions limits](https://supabase.com/docs/guides/functions/limits)
- Background work is supported via `EdgeRuntime.waitUntil()` — [Supabase: Background tasks](https://supabase.com/docs/guides/functions/background-tasks)

**Automatic embeddings pattern (queue-driven)**
- This official pattern combines pgvector, **pgmq** (queue with retries), **pg_net** (async HTTP from Postgres to Edge Functions) and **pg_cron** (scheduled processing). Triggers enqueue jobs, a function "will read jobs from the queue, group them into batches, and invoke the Edge Function", and pg_cron runs it "every 10 seconds". pgmq **visibility timeouts** ensure failed requests are retried. The example uses `halfvec(1536)` with an HNSW `halfvec_cosine_ops` index — [Supabase: Automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings)

**Built-in inference (`Supabase.ai.Session`)**
- `new Supabase.ai.Session('gte-small')` runs embeddings natively, available "since Supabase Edge Runtime v1.36.0", with `model.run(text, { mean_pool: true, normalize: true })` into a `vector(384)` with HNSW `vector_ip_ops` — [Supabase: Semantic search example](https://supabase.com/docs/guides/functions/examples/semantic-search) **[edge-runtime v1.36.0 dates from 2024; docs page current]**
- "`gte-small` model exclusively caters to English texts, and any lengthy texts will be truncated to a maximum of 512 tokens." LLMs run "via Ollama or Llamafile" with a **self-managed** server. Hosted support: "We are progressively rolling out support for the hosted solution. To sign up for early access, fill out this form." — [Supabase: Running AI Models](https://supabase.com/docs/guides/functions/ai-models)
- From pgvector 0.8.0, the planner supports **iterative index scans** for filtered HNSW queries, which fixes under-returned rows when filters are selective — [Supabase: Semantic search](https://supabase.com/docs/guides/ai/semantic-search). The project offers `vector` 0.8.0 — [MCP list_extensions]

**Anthropic API mechanics relevant to architecture**
- **Batch:** 50% off input and output. Up to 100,000 requests or 256 MB per batch. "Most batches completing within 1 hour". Batches expire after 24 h. Results are available for 29 days. The docs recommend the 1-hour cache TTL for batches with shared context — [Anthropic: Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- **Batch is not ZDR-eligible** ("29-day retention; async storage required"). **Managed Agents is not ZDR-eligible** (transcripts persist until deleted). **Message threads are not ZDR-eligible.** Messages API, prompt caching, citations, effort, thinking and data residency are eligible. **Structured outputs are "Yes (qualified)"**: "Only the JSON schema is cached, for up to 24 hours since last use… PHI must not be included in JSON schema definitions" (property names, enums, consts, patterns) — [Anthropic: API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- **Prompt caching:** 5-min write 1.25×, 1-h write 2×, read 0.1× on most models but **0.05× on Opus 5.5 and Sonnet 5.5**. "These multipliers stack with… the Batch API discount and data residency" — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing). The minimum cacheable prefix is **512 tokens** on Opus 5.5, Sonnet 5.5 and Haiku 5.5 (the reference says to confirm in the live docs) — [Skill ref: prompt-caching.md, cached 2026-11-03]
- **Structured outputs** use `output_config: {format: …}`; `output_format` is deprecated. Strict tool use is `strict: true`. On **Opus 5.5 and Sonnet 5.5, forced `tool_choice` `any`/`tool` returns 400**, so use structured outputs or `auto` with strict tools — [Skill ref, cached 2026-11-03]; consistent with the pricing page showing no "any, tool" token row for Opus 5.5 and Sonnet 5.5 — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Assistant **prefill is removed** on current models (400). Check `stop_reason: "refusal"` before reading content. The server-side `fallbacks` parameter (beta `server-side-fallback-2026-07-01`) is recommended for Opus 5.5 and Sonnet 5.5 — [Skill ref, cached 2026-11-03]
- Anthropic **Managed Agents** bills $0.08 per session-hour on top of tokens — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### Inferences
**Options compared**

| Option | Verdict for Dawnage |
|---|---|
| **A. Edge Function → Anthropic Messages API directly** (`npm:@anthropic-ai/sdk` in Deno; key in Edge secrets) | **Choose.** Fewest moving parts, ZDR-eligible path, one sub-processor. LLM calls are I/O, so the 2 s CPU cap is not binding. Keep single calls well under the 150 s idle timeout and 400 s wall clock (use streaming for interactive calls). |
| B. Edge Function → AI gateway (Vercel AI Gateway, Cloudflare, OpenRouter, LiteLLM) → Claude | Not now. It adds a second processor of health data, which means another disclosure under Apple 5.1.2(i) and APP 8. Budgets and observability are cheap to build in Postgres. Revisit if multi-provider fallback becomes a requirement. |
| C. Anthropic Managed Agents | **No.** Not ZDR-eligible, stores transcripts, and the tasks are single-call workflows, not agents. |
| D. Claude via Bedrock (Sydney) or Vertex (Australia) for in-region inference | Possible if AU residency becomes a hard requirement. Partner pricing and model availability are unverified (see Gaps). |
| E. Supabase hosted LLM (`Supabase.ai.Session` + Ollama) | No. Hosted generation is early access; self-hosting Ollama is ops work. **Use only gte-small** for embeddings. |

- **Embeddings:** use gte-small (in-runtime, no third party, no per-token fee) for the **non-personal** corpora: the exercise dictionary, `workout_templates`, `meal_templates` and `food_items`. These are English, short and well under 512 tokens. Don't embed client free text in v1: it's small enough to send directly, and storing health-text embeddings adds a new sensitive data store.
- **Batch vs streaming:** weekly digests are naturally batch work. At Dawnage's volume (18–41 active clients), the Batch saving is cents per month while Batch adds **29-day retention** at Anthropic. So use **synchronous Messages calls inside the pgmq worker** now, and move digests to Batch at ≥1,000 clients if the retention trade is accepted. Stream only interactive copilot and Q&A responses.
- **Structured outputs everywhere a draft is written.** Keep schemas generic (no client data in enums), and validate again server-side (zod in the function plus `pg_jsonschema` CHECK on stored payloads).
- **Prompt and version storage:** keep prompt text in git (`supabase/functions/_shared/prompts/`). Register `{task, version, sha256, model, params}` in a `prompt_versions` table on deploy, and stamp every run with it. A DB-editable prompt UI is speculative, so skip it.

### Gaps
- Supabase Edge Function invocation and compute pricing for 2026 was not verified.
- Whether Supabase's hosted LLM has a 2026 GA date: the docs give no date.

---

## 4. Model choice (Claude family, verified pricing and features)

### Takeaway
Use **Claude Sonnet 5.5** for weekly digests, **Claude Opus 5.5** (the default) for copilot plan drafts, and **Claude Haiku 5.5** for high-volume extraction (meal parsing, triage). Avoid **Fable/Mythos**: they are "Covered Models" requiring 30-day retention and are excluded from ZDR. All prices below come from Anthropic's live pricing page, fetched 2026-11-27.

### Cited Findings
- **Per-MTok prices.** Columns are input / 5-min cache write / 1-h cache write / cache read / output — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
  - **Opus 5.5:** $4 / $5 / $8 / $0.20 / $20
  - **Sonnet 5.5:** $2 / $2.50 / $4 / $0.10 / $10
  - **Haiku 5.5 (prompts ≤100K tokens):** $0.10 / $0.125 / $0.20 / $0.01 / $0.50. Over 100K tokens: $0.50 / … / $2.50 output.
- **Batch prices** (input/output per MTok): Opus 5.5 $2/$10, Sonnet 5.5 $1/$5, Haiku 5.5 $0.05/$0.25 — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Claude 4.7+ models use a tokenizer that produces "approximately 30% more tokens for the same text". The tool-use system prompt costs 286 tokens on Opus 5.5, Sonnet 5.5 and Haiku 5.5 — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- `inference_geo: "us"` costs **1.1×**. `global` is the default at standard price — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Covered Models** (Fable 5/5.1/5.2, Mythos 5/5.1/5.2) "require 30-day data retention" and aren't available under Legacy ZDR — [Anthropic: API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- Model behaviour, per the skill ref (cached 2026-11-03):
  - **Opus 5.5:** 1M context, 128K output. Thinking can't be disabled (effort is the control) and effort defaults to **`medium`**. Forced `tool_choice` returns 400.
  - **Sonnet 5.5:** effort defaults to `high`. To turn thinking off, send `thinking: {type:"between_tools"}` (`disabled` returns 400). Forced `tool_choice` returns 400.
  - **Haiku 5.5:** adaptive thinking on by default, effort default `medium`.
  - Opus 5.5 and Sonnet 5.5 can return refusal `stop_details` categories, so use `fallbacks`.

  — [Skill ref, cached 2026-11-03]

### Inferences
- **Routing:**

  | Task | Model | Effort |
  |---|---|---|
  | Weekly digest | `claude-sonnet-5-5` | `low` |
  | Plan-adjustment copilot | `claude-opus-5-5` | `medium` (default) |
  | Substitution | `claude-sonnet-5-5` | `low` |
  | Meal-text parsing, injection/abuse triage | `claude-haiku-5-5` | `low` |
  | LLM-as-judge in evals | `claude-sonnet-5-5` | — |

- Before splitting models, measure Opus 5.5 at `low` effort on the digest set. The skill reference notes lower effort on newer models often matches cascades, and caches are model-scoped.
- **Alternatives (brief):** OpenAI, Gemini and self-hosted open models were not evaluated in this research. Switching would repeat the consent and sub-processor disclosure work.

### Gaps
- The Anthropic structured-outputs and model-migration pages were not fetched live. Model behaviour comes from the bundled reference (cached 2026-11-03).
- Claude 5.5 availability and pricing on Bedrock `ap-southeast-2` or Vertex `australia-southeast1` were not verified.

---

## 5. Privacy and compliance for health and body data sent to an LLM

### Takeaway
Before any client data reaches Claude, Dawnage needs three things:
- **(a)** an explicit, revocable in-app AI consent, which Apple requires under 5.1.2(i) since Nov 2025;
- **(b)** strict minimisation and pseudonymisation, with no names, contact details, location, occupation or photos;
- **(c)** updated privacy policy and store labels, including the Australian ADM transparency clause that starts on **10 Dec 2026**.

Anthropic's first-party API offers only `global`/`us` inference and `us` workspace storage, so data **leaves Australia**. It doesn't retain prompts by default on non-Covered models, never trains on them without permission, and offers ZDR on request (Batch excluded).

### Cited Findings
**Apple**
- 5.1.2(i): "You must clearly disclose where personal data will be shared with third parties, **including with third-party AI**, and obtain **explicit permission** before doing so." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (live, no visible date). The third-party-AI wording was added in the guideline update reported on **2025-11-13** — [TechCrunch, 2025-11-13](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai)
- In 2026 developer-forum threads, apps were rejected under 5.1.1(i)/5.1.2(i) for third-party AI use. Some still were with a consent dialog, and reviewers missed consent screens — [Apple Dev Forums 815109](https://developer.apple.com/forums/thread/815109); [816140](https://developer.apple.com/forums/thread/816140); [820209](https://developer.apple.com/forums/thread/820209)
- 5.1.2(vi): data from **HealthKit**, Clinical Health Records and others, "or from depth and/or facial mapping tools (such as ARKit, Camera APIs, or Photo APIs) may not be used for marketing, advertising or use-based data mining, including by third parties." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.3(i): health and fitness data (incl. HealthKit, Motion and Fitness) may not be used or disclosed to third parties "for advertising, marketing, or other use-based data mining purposes other than improving health management… and then only with permission". "You must disclose the specific health data that you are collecting from the device." 5.1.3(ii) bars storing personal health information in iCloud — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 1.4.1 (medical) applies greater scrutiny to apps that could give inaccurate health data, but does not mention AI specifically — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Google Play**
- Health apps must complete the **Health apps declaration** and publish a privacy policy covering personal and sensitive data. Apps with health features are in scope even if they are not primarily health apps. Health Connect data is "personal and sensitive user data" with extra requirements. The general AI-Generated Content policy applies — [Play: Health apps](https://support.google.com/googleplay/android-developer/answer/13996823); [Play: Health Connect policy](https://support.google.com/googleplay/android-developer/answer/12991134) **[these pages reflect 2024–2025 updates; 2026 text not confirmed]**

**Anthropic data handling (live docs, fetched 2026-11-27)**
- "Retained data is never used for model training without your express permission." "Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is Covered Models, which require 30-day retention." Flagged content may be kept "up to 2 years" regardless of arrangement. ZDR is enabled per organization through sales. HIPAA readiness with a BAA is self-serve in the Console. ZDR organizations can't call the API from a browser (CORS) — [Anthropic: API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- Residency: `inference_geo` supports **only `"global"` and `"us"`**, and **workspace geo is only `"us"`** (data at rest) — [Anthropic: Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency)
- Bedrock and Vertex offer **regional endpoints** at a 10% premium over global for Claude 4.5+ — [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

**Australia**
- The Privacy and Other Legislation Amendment Act 2024 received Royal Assent on **2024-12-10**. The statutory tort for serious invasions of privacy commences by **10 June 2025**. The ADM transparency provisions have a 24-month delay — [ACC summary](https://www.acc.com/privacy-law-amendments-now-effect); [OAIC: passing of bill](https://www.oaic.gov.au/news/media-centre/pasing-of-bill-a-significant-step-for-australias-privacy-law) **[pre-2025 source, but it is the enacted law]**
- **ADM transparency (APP 1.7–1.9) starts 10 December 2026.** The OAIC issued guidance on 2026-09-30. Disclosure is required where:
  1. "a computer program" makes, or does "a thing… substantially and directly related to making, a decision";
  2. the decision "could reasonably be expected to significantly affect the rights or interests of an individual"; and
  3. "personal information… is used".

  Decision-support tools are captured "whether advisory or determinative… regardless of human oversight" when their output is a key factor. The privacy policy must list "the kinds of personal information used" and the kinds of decisions. Health and biometric data "should be called out more clearly". It is a transparency obligation only, with no right to contest — [Allens, 2026-10-02](https://www.allens.com.au/insights-news/insights/2026/10/mandatory-automated-decision-making-disclosure-requirements-are-coming-key-takeaways-from-the-oaic-guidance/); [Maddocks](https://www.maddocks.com.au/insights/oaic-releases-guidance-on-new-automated-decision-making-transparency-obligations)
  - Date conflict: one summary gives **11 December 2026** — [ACC](https://www.acc.com/privacy-law-amendments-now-effect).
  - The OAIC's own resource page returned 403 to the fetch tool — [OAIC](https://www.oaic.gov.au/news/media-centre/new-resources-on-transparency-for-use-of-ai-and-automated-decision-making)

**Industry precedent for minimisation**
- Trainerize's AI builder "does not have any access to your clients' names or personal identifiable information" — [Trainerize blog](https://www.trainerize.com/blog/ai-workout-builder/) (search extract)

### Inferences
- **Consent.** Add a `ai_consents` record (scope, policy version, granted/revoked) captured on a dedicated mobile screen, not buried in the privacy policy. The screen must name Anthropic and the data categories, and be revocable in Settings. **Enforce it in the database:** enqueue functions refuse clients without active consent. Coach-initiated copilot runs must also check the *client's* consent, because the data originated in the app.
- **HealthKit.** Daily `morning_weight`, `daily_steps`, `calorie_intake`, `water_liters` and macros may be HealthKit-derived. Sending them to Claude to produce coaching for that same user looks like "improving health management" with permission, not advertising or data mining. That interpretation is not legal advice. Anthropic's no-training commitment supports it. Add a `source` column (`manual|healthkit|health_connect`) so these fields can be excluded per policy if Apple pushes back, and update `NSHealthShareUsageDescription`, which today mentions only the coach. The prompt framed this as an "AI-training" prohibition; the guideline text fetched says **marketing/advertising/use-based data mining**, not "training" (see Gaps).
- **Minimisation contract** (enforced in SQL context builders with a column whitelist):
  - **Never send:** `email`, `full_name`, `phone_number`, `avatar_url`, questionnaire `q1`/`q5`/`q6`/`q7`, `country` (unless needed for units), any photo URL or path, `coach_client_history.reason`, payments.
  - **Send:** an age band instead of age, a goal enum, injury and medical-condition text (needed for safety, labelled "sensitive"), computed aggregates, and the minimal raw free text.
  - Replace `user_id` with a per-run random alias, and map it back only in the worker.
- **Residency.** First-party Claude means cross-border disclosure (US/global). The privacy policy must say so, and Dawnage remains accountable for the recipient's handling under APP 8, which is general Privacy Act knowledge not re-verified here. If a client or regulator requires AU processing, Bedrock Sydney is the candidate path (unverified).
- **Store labels.** Update the App Store privacy "nutrition label" and Play Data safety for Health & Fitness and the free-text "Other user content" processed by a service provider. Re-submit with reviewer notes that point to the consent screen, since forum threads show reviewers missing it.
- **Request ZDR** from Anthropic. Use the plain Messages API (not Batch, Files, threads or Managed Agents) for client data, never Fable/Mythos, and no PHI in JSON schemas.
- **ADM clause.** Digests and plan drafts plausibly don't "significantly affect rights or interests" in the loan or insurance sense. But the OAIC's broad reading of decision support makes a short privacy-policy clause before 10 Dec 2026 the cheap, safe move: list the kinds of personal information used (check-ins, training logs, measurements, questionnaire health answers) and say that coaches make final decisions.

### Gaps
- APP 8 (cross-border) and APP 3/6 (sensitive information) specifics were not re-fetched: the OAIC site returned 403.
- The Apple Developer Program License Agreement's HealthKit clauses (any explicit "AI training" wording) were not checked.
- Google Play 2026 policy text on AI or health was not confirmed.
- No authoritative answer on whether coach-facing AI summaries trigger the APP 1.7 "significant effect" limb.

---

## 6. Concrete target design (tables, functions, pipeline, guardrails, evaluation, cost, rollout)

### Takeaway
Use one `ai` schema with six tables, one pgmq queue, two Edge Functions plus one approval RPC, and SQL context builders. The design starts with no-LLM flags, then a Sonnet 5.5 weekly digest in shadow mode. Every AI output is a **draft** that a coach approves before anything is written to `workout_plans` or `meal_plans`. Token cost is **≈ $0.09 per client-month** for Phase 1 and **≈ $0.35** for the full suite: about $14 / $92 / $920 per month at 150 / 1,000 / 10,000 clients for Phase 1, and about $52 / $345 / $3,450 for the full suite.

### Cited Findings
- The queue → cron → pg_net → Edge Function → retry-via-visibility-timeout pattern is Supabase's documented approach — [Supabase: Automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings)
- Price inputs for the cost model come from [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing). Volume inputs (coach load, check-in sizes, log sizes, active users) come from DB-2 to DB-6.

### Inferences

#### 6.1 Tables (schema `ai`, RLS on, not exposed to clients)
```sql
-- ponytail: prompt text lives in git; this row only pins what ran.
create table ai.prompt_versions (
  id text primary key,                 -- 'weekly_digest@3+ab12cd34'
  task text not null, model text not null,
  params jsonb not null,               -- {effort, max_tokens, cache_ttl}
  output_schema jsonb not null,        -- generic; never contains client data
  status text not null check (status in ('shadow','active','retired')),
  created_at timestamptz default now());
create unique index on ai.prompt_versions(task) where status = 'active';

create table ai.consents (
  user_id uuid references auth.users on delete cascade,
  scope text check (scope in ('coach_ai','client_ai')),
  policy_version text not null, granted_at timestamptz not null, revoked_at timestamptz,
  primary key (user_id, scope, granted_at));

create table ai.runs (                 -- append-only audit + cost ledger
  id uuid primary key default gen_random_uuid(),
  task text not null, prompt_version_id text references ai.prompt_versions,
  client_id uuid references auth.users on delete cascade, coach_id uuid,
  trigger text check (trigger in ('checkin_insert','cron','manual','eval')),
  input_ref jsonb not null,            -- source row ids + updated_at, NOT the prompt
  model text, input_tokens int, output_tokens int, cache_read_tokens int, cache_write_tokens int,
  cost_usd numeric(10,6), latency_ms int, stop_reason text,
  status text check (status in ('ok','error','refused','invalid_output','budget_blocked','no_consent')),
  error text, created_at timestamptz default now());

create table ai.drafts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references ai.runs, kind text check (kind in ('weekly_digest','plan_adjustment','substitution','meal_parse','reply')),
  client_id uuid references auth.users on delete cascade, coach_id uuid,
  payload jsonb not null,              -- CHECK via pg_jsonschema per kind
  status text not null default 'pending' check (status in ('pending','approved','edited','rejected','superseded','expired')),
  target_table text, target_id uuid, base_updated_at timestamptz,   -- optimistic concurrency
  coach_edit jsonb, reject_reason text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz default now(), expires_at timestamptz default now() + interval '30 days');

create table ai.flags (                -- deterministic, no LLM
  id bigint generated always as identity primary key,
  client_id uuid references auth.users on delete cascade,
  kind text, severity smallint, window_start date, window_end date,
  evidence jsonb, created_at timestamptz default now(), resolved_at timestamptz,
  unique (client_id, kind, window_start));

create table ai.embeddings (           -- non-personal corpora only
  source_table text, source_id text, model text default 'gte-small',
  content_hash text not null, embedding extensions.vector(384) not null,
  updated_at timestamptz default now(), primary key (source_table, source_id, model));
create index on ai.embeddings using hnsw (embedding vector_ip_ops);  -- gte-small vectors are normalized

create table ai.coach_budgets (coach_id uuid primary key, monthly_limit_usd numeric(8,2) not null default 10);
```
- **RLS:** a coach can `select` drafts and flags where `client_id in (select id from public.users where coach_id = auth.uid())`. Admins can see all. Clients see nothing in Phases 1–2. Runs are visible to admins only.
- Budget check: `select coalesce(sum(cost_usd),0) from ai.runs where coach_id=$1 and created_at >= date_trunc('month', now())` compared with the limit. No separate counter table.
- Supporting views: `ai.v_daily_clean` (canonical enums, parsed numerics), `ai.v_weekly_clean` (derived `week_start`, parsed numbers), `ai.v_sets` (legacy + v2 logs into one row per set with numeric reps/weight) and `ai.v_adherence_week` (logged sessions vs `days_per_week`).
- Context builder: `ai.build_digest_context(client_id, week_start) returns jsonb` (security definer, column whitelist, alias id). It is **the only path by which client data leaves Postgres**.

#### 6.2 Pipeline: check-in → pgmq → summary → coach inbox
1. **Enqueue.** `AFTER INSERT ON weekly_check_ins` calls `ai.enqueue('weekly_digest', user_id, week_start)`. Separately, a pg_cron job (Sunday 20:00 per client `profile_data.timezone`, or simply 10:00 UTC Monday) enqueues digests for every consented active client. This covers the common case where no weekly check-in was submitted. A missing check-in is itself a flag. `ai.enqueue` no-ops without consent or over budget, recording a `runs` row with status `no_consent` or `budget_blocked`.
2. **Flags first.** pg_cron runs nightly `ai.refresh_flags()`, which is pure SQL over the views and upserts `ai.flags`.
3. **Dispatch.** pg_cron runs every 30 s: `ai.dispatch()` → `pgmq.read('ai_jobs', vt => 300, qty => 10)` → `net.http_post` to the `ai-worker` Edge Function, with a secret header read from `supabase_vault`.
4. **Worker** (`ai-worker`, `--no-verify-jwt` plus a shared-secret check). For each job:
   1. Call the `build_digest_context` RPC.
   2. Call Claude: `claude-sonnet-5-5`, effort `low`, a cached system prefix (rubric, safety rules, schema description), `output_config.format` set to the digest schema, and `fallbacks`.
   3. Validate (zod plus a cross-check that every number cited exists in the context).
   4. Insert `ai.runs` and `ai.drafts(kind='weekly_digest', status='pending')`.
   5. `pgmq.delete`.

   On error, leave the message for the visibility timeout to retry. When `read_ct > 5`, archive it and record a `runs` error row.
5. **Inbox.** The dashboard lists pending drafts and open flags per coach, via Supabase Realtime on `ai.drafts` with RLS or plain React Query polling. The coach marks a digest reviewed, or edits and rejects it. Every action is logged in `drafts`.
6. **Approval writes** (plan adjustments): the RPC `ai.approve_draft(draft_id, edited_payload jsonb)` (security definer) checks that the caller is the client's coach or an admin. It validates the payload against the target schema, checks that `target.updated_at = base_updated_at` and fails if the plan changed since drafting, writes `workout_plans`/`meal_plans`, and sets `status='approved'|'edited'`. No Edge Function is needed for writes.

#### 6.3 Edge Functions
- `ai-worker`: the queue consumer above, handling digest, substitution and meal_parse jobs.
- `ai-copilot`: coach-authenticated and interactive. It verifies the JWT and role like `delete-account`, and checks that the client belongs to the coach and has consented. It builds context (plan, 4-week aggregates, sanitised injuries, and top-k allowed exercises from `ai.embeddings` filtered by equipment), then calls `claude-opus-5-5` with SSE streaming of a short rationale plus the final structured draft, and writes `ai.drafts(kind='plan_adjustment')`.
- `embed`: the automatic-embeddings pattern with `Supabase.ai.Session('gte-small')`, triggered on template, food and exercise-dictionary changes.
- `_shared/`: Anthropic client, a cost calculator from `usage`, prompt registry and redaction helpers.
- Skipped: a separate apply function (the RPC covers it), a gateway, and a prompt-admin UI.

#### 6.4 Guardrails
- **Data:** a column whitelist in context builders, alias IDs, no photos or URLs, and free text wrapped in `<client_text>` tags and labelled as untrusted data. The digest call has no tools, so injected text can't trigger actions.
- **Output:** structured outputs plus server re-validation, and numbers must match SQL aggregates (reject otherwise, status `invalid_output`). Length caps per field. The output must include every deterministic flag in its window (recall check).
- **Safety policy in the prompt:**
  - No diagnosis.
  - Red-flag terms in free text (chest pain, fainting, injury, disordered-eating signals, self-harm) trigger an `escalate` field that the coach sees, with a "refer to a professional" note.
  - Never increase load on a movement linked to reported joint pain or an injury.
  - Macro changes are bounded (for example ±10% per week), and the coach must confirm.
- **Human-in-the-loop:** AI never writes plan tables directly. Drafts expire after 30 days, and stale drafts fail the optimistic-concurrency check.
- **API hygiene:** check `stop_reason` (`refusal`, `max_tokens`) before parsing, use `fallbacks`, set `max_tokens` caps per task, and use typed SDK errors with retry only on 429/5xx.
- **Cost:** the per-coach monthly budget is enforced at enqueue. Alert admins at 80%. There is a global kill switch (an `app_config` flag checked by `ai.enqueue` and the worker).
- **Privacy:** Anthropic ZDR requested, no Batch/Files/threads for client data, no Covered Models, `ai.runs` stores references rather than prompts, and every `ai.*` table cascades on account deletion.

#### 6.5 Evaluation
- **Offline set:** 40–60 **synthetic** client-weeks built from the repo's mock-data style (no real client data in dev). Cover:
  - normal weeks, missed sessions, weight plateau or drop, sleep or stress spikes;
  - joint pain "yes", an empty week, legacy vs v2 logs, contradictory signals;
  - a prompt-injection string in `feedback`;
  - red-flag phrases.
- **Code-graded checks (CI):**
  - schema-valid rate is 100%;
  - numeric faithfulness is 100%: every number in the output is present in the context;
  - flag recall is 100% against `ai.flags`;
  - no PII patterns in outputs;
  - every red-flag case escalates;
  - injection cases produce no instruction-following.
- **Model-graded:** a `claude-sonnet-5-5` judge with a 4-criterion rubric (accurate, prioritised, actionable, coach-tone). Calibrate it on about 20 coach-rated examples before trusting it.
- **Online:** per `prompt_version`, track approve, edit and reject rates, edit size (JSON diff), time-to-review, flag dismiss rate and cost per approved draft.
- **Promotion rule:** a new version runs as `shadow` (drafts hidden) for 2 weeks with 2–3 coaches. Promote only if offline checks pass and the online approve-without-edit rate is at least the incumbent's.

#### 6.6 Cost estimate (token spend only; Anthropic list prices, 2026-11-27)
Assumptions:
- About 3.3 characters per token (the 4.7+ tokenizer runs about 30% more tokens).
- Weekly digest: about 3,000 uncached input tokens (7 dailies, about 3 compressed logs, weekly text up to the p95 of 714 characters, 4-week aggregates, plan summary) plus a 2,500-token cached prefix, and about 1,500 output tokens including low-effort thinking.
- Copilot: 1 per client-month on Opus 5.5, with 9,000 input + 3,000 cached + 4,000 output tokens.
- Meal parsing: 60 per client-month on Haiku 5.5, with about 2,000 input (half cached) and 300 output tokens.
- Q&A: 10 questions per client-month on Sonnet 5.5 with a cached plan context, plus session cache writes.

| Per call | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| Weekly digest (sync) | $0.043 | **$0.021** | $0.001 |
| Weekly digest (Batch, −50%) | $0.021 | $0.011 | $0.0006 |

| Per client-month | Composition | Cost |
|---|---|---|
| Phase 1 | 4.33 Sonnet digests (sync) + SQL flags | **≈ $0.09** |
| Phase 2 | + Opus copilot ×1 (~$0.12) + substitutions (~$0.01) | **≈ $0.22** |
| Phase 3 | + Haiku meal parsing (~$0.02) + Sonnet Q&A (~$0.12) | **≈ $0.35** |

| Clients | Phase 1 / mo | Phase 2 / mo | Full / mo | Full with Batch digests |
|---|---|---|---|---|
| 150 | ~$14 | ~$33 | ~$52 | ~$45 |
| 1,000 | ~$92 | ~$220 | ~$345 | ~$300 |
| 10,000 | ~$920 | ~$2,200 | ~$3,450 | ~$3,000 |

- Today's real load is 18–41 active clients, which is **under $5 a month** for Phase 1.
- Per coach (average 12.6 clients), the full suite is about $4.40 a month, so a $10/coach/month default budget is ample.
- Embeddings: gte-small runs in the Edge runtime with no per-token fee; the corpus is about 1,000 short rows.
- Supabase compute, invocation and Realtime costs are excluded (see Gaps).
- Opus 5.5 for digests doubles Phase 1 to about $0.18 per client-month. That is still small, so model choice should be quality-driven at this scale.

#### 6.7 Phased rollout
- **Phase 0, data and compliance (≈2 weeks; ships value with no LLM):**
  - Enum and week backfills, cleaning views, `ai.flags` with nightly refresh, and a flags panel in the coach dashboard.
  - Enable `pgmq`, `pg_cron`, `pg_net`, `vector` and `pg_jsonschema`.
  - Consent table and mobile consent screen, privacy-policy update (AI sub-processor, cross-border, ADM clause **before 2026-12-10**), and store labels.
  - Anthropic organisation setup: request ZDR, no Covered Models, workspace spend limit.
  - HealthKit `source` column.
- **Phase 1, weekly digest (weeks 3–6):** the queue pipeline plus Sonnet 5.5 digest in **shadow** mode for 2–3 coaches, then inbox GA. Eval harness in CI, budgets and kill switch.
  - Exit: ≥80% of digests approved without edit, 0 numeric-faithfulness failures in prod sampling, cost within estimate.
- **Phase 2, copilot (weeks 7–12):** the exercise dictionary (a one-off LLM-assisted job, reviewed by a coach), gte-small embeddings, the `ai-copilot` function with Opus 5.5 plan drafts and substitutions, the `approve_draft` RPC, and an injury constraint layer.
  - Exit: coach edit rate trending down, zero unsafe-load incidents in review.
- **Phase 3, client-facing (2027):** natural-language meal logging (Haiku 5.5, confirm-before-save, grounded in `food_items`). Client Q&A **only after** a messaging feature exists, and initially as coach-sent drafts. Re-check App Review 5.1.2(i) and 1.4.1 before each client-facing launch.

### Gaps
- Supabase 2026 pricing for Edge Function invocations, compute and Realtime was not verified, so infrastructure cost is excluded from the estimates.
- Token sizes are estimates from character lengths. Validate with `count_tokens` on synthetic contexts before committing budgets.
- Coach approval-rate targets (80%) are proposed thresholds, not benchmarks; no public benchmark for AI check-in summaries was found.
- Whether Opus 5.5 at `low` effort beats Sonnet 5.5 on digest quality per dollar is untested; it needs the eval set.

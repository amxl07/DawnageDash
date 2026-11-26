# Dawnage combined delivery plan

26 September 2026 · **Proposed consolidation following a head-to-head review. No implementation has started under this plan.**

**Goal:** Deliver a premium human-coached fitness experience with fast daily interactions, dependable records and a complete coach-to-client service; establish product quality through observed use.

**Architecture:** Retain the current Expo client, React coach dashboard and Supabase boundary. Use Product Excellence's data, authorization, synchronization and coaching contracts, enriched with Market Review's concrete interactions. Deliver small complete user journeys; introduce immutable identity/versioning where a feature needs it rather than blocking every UI improvement on the full architecture.

**Tech Stack:** Existing Expo/React Native/TypeScript, TanStack Query, Supabase Postgres/Auth/Storage/Edge Functions, React/Vite dashboard, Jest, Maestro and signed native builds. Verify installed/native-compatible versions during the baseline; this plan does not prescribe a framework rewrite.

**Spec:** [Comparison and corrections](../../review/2026-09-26-plan-comparison/README.md), [complete task disposition](../../review/2026-09-26-plan-comparison/task-disposition.md), and the [Product Excellence design](../specs/2026-09-26-product-excellence-design.md), as amended here.

**Execution:** Use `superpowers:executing-plans` for implementation. This is the controlling proposed roadmap; use original packages for detailed tasks only after applying the corrections. Do not execute both original backlogs independently or copy uncorrected Market Review examples.

## Global constraints

- Optimize for a real human coach serving paying clients. Every client promise needs a working coach workflow, ownership and service capacity.
- Preserve the current working tree, historical records, local reporting dates and supported legacy readers. Review task-specific diffs; do not broadly stage unrelated work.
- All applicable daily check-in fields remain required. No automatic submission, subjective carry-forward or shorter-protocol experiment in this delivery.
- Missing is not zero; prescribed is not consumed. Saved, synced, completed, reviewed and acknowledged are separate states.
- Use fictional accounts and staged, additive migrations. Keep privileged credentials out of clients and health values/free text/media out of analytics. Protect account boundaries across local storage, APIs and notifications.
- The original brief limits web/backend/deployment actions. This comparison authorizes documentation, not production changes. At implementation, reconcile the actual authorized scope once; prepare complete reviewable migrations/deployment artifacts before any outstanding approval. Do not repeatedly ask for an authorization already supplied.
- Include `mobile/` and the necessary `client/`, `shared/` and Supabase service work in the delivery estimate. Exclude `mobile-2/`. A mobile-only prototype is not a completed premium coaching service.
- Native claims require current iOS/Android evidence. Optional native capabilities have usable manual fallbacks. Do not promise a 10/10 score, novelty, retention or clinical benefit without evidence.

## Product promise and scope

The first product promise is: **“I know what to do today, can record it with little effort, and understand what my coach recommends next.”**

Include fast workout entry, the required daily check-in, reviewed meal confirmation, honest progress, a real coach review/conversation loop, recovery/synchronization, privacy/account lifecycle and accessible native behavior.

Do not add all ideas to launch. Defer a GLP-1 program, general AI coaching, broad grocery tooling, shortened check-ins and automated readiness prescriptions. Stage form video, richer lock-screen details, dictation, monthly Chapters and approved session alternatives after their specific prerequisites. The Chapter is the preferred early differentiation experiment; it connects outcomes to the human relationship without inventing clinical claims.

## Resolve the conflicts before building

| Decision | Combined rule |
| --- | --- |
| Coaching schema | One shared contract based on A/C01, extended with B's contextual references. Do not implement two competing message models. Validate record ownership; use stable authorship, revisions and operation IDs. |
| Meal persistence | A/N02 durable confirmed-intake ledger with B's direct interaction. Capture the actual portion and nutrient snapshot when confirmed; preserve unknown nutrients as null/partial. Never recalculate historical intake from today's plan. |
| History and identity | Fast controls can use clearly labeled suggestions now. Comparable PRs need stable identity, valid completed sets and sufficient history. Plan alternatives need explicit approved semantics. |
| Completion | Apply a confirmed edit and completion in one operation. A nonempty field or saved workout is not proof of completion. |
| Navigation | Test B's Today/Training/Nutrition/Progress/Coach candidate against a simpler alternative. Choose from current native task evidence; preserve direct check-in and settings access. |
| Readiness | Offer a contextual question first. Do not label any substitution “lighter” or infer current readiness from an absent/evening-only check-in. |
| Release evidence | Retain A's service, data, device and pilot gates. Code examples or SQL-inserted replies cannot replace real workflow acceptance. |

## Milestones and dependencies

Milestones describe outcomes, not a requirement to finish every unrelated task in sequence. Device capture and UI prototypes can run alongside the baseline. New persisted features depend on the relevant authorization/write/recovery contracts. Accessibility and error handling belong in every increment.

### M0 — Establish the real baseline and protect existing records

**References:** A/F01–F02, F06–F07; B/1.1–1.6. **Owner:** engineering lead, with QA/device and backend support.

- [ ] Record the current diff, installed versions, build availability, supported platforms, actual schema/policies and current critical journeys using fictional accounts.
- [ ] Make all web workout consumers understand mobile v2 safely. Preserve duration, tracking, warm-up/work kind, completion, plan-day context and metadata. Preserve supported legacy display; unsupported formats must not be silently rewritten.
- [ ] Inventory private photo objects and allowed extensions before changing the regex/bucket configuration. Verify assignment-based access and private coach-note projection.
- [ ] Capture current native Home, logger, check-in, Nutrition, Progress and coach surfaces, including loading/empty/error states. Separate current evidence from historical web screenshots.
- [ ] Produce a scoped forecast and a risk register with owners. Record any inaccessible external dependencies as unverified, never passed.

**Exit:** A mobile v2 workout survives a web read/edit/read round trip without unintended semantic change; fixture-based compatibility and actor-based access tests pass. Current build/device limitations are documented. UI prototypes can proceed before all backend work finishes.

### M1 — Make the daily workout fast and recoverable

**References:** A/F03–F07, T02, U02, Q02–Q04; B/3.1–3.5/3.7. **Owner:** mobile engineer; backend support for write contracts.

- [ ] Remove silent unsent-draft expiry and restore cold-start offline access for a previously authenticated eligible user. Preserve account separation and safe logout behavior.
- [ ] Centralize replay and truthful local/sending/synced/failed states; make server writes idempotent and acknowledgments durable.
- [ ] Add visible sets, appropriate steppers and explicit confirmation of previous comparable values. Retain direct entry, undo, warm-up distinctions and duration mode.
- [ ] Apply confirmed values and completion atomically. Test historical suggestions together with manual/quick input, rather than only testing callbacks separately.
- [ ] Measure entry effort and rendering with real histories on devices. Prototype these UI changes independently of a full exercise catalog; do not enable unverified lifetime-PR claims.

**Exit:** Repeated set entry is observably easier; killed-process, offline restart, timeout-after-commit and account-switch cases preserve records and statuses. No typed values are overwritten by suggestions.

### M2 — Finish the human-coaching loop

**References:** A/C01–C05, F02/F07; B/2.1–2.7. **Owner:** web/backend engineer plus coach lead, with mobile support.

- [ ] Implement a real dashboard queue and response composer, not a deferred specification. Show pending work, age and service-window status.
- [ ] Publish a response with “what I noticed / what to do next / why.” Support contextual questions linked to owned workouts or check-ins, acknowledgments and follow-up.
- [ ] Keep send operation IDs, account-scoped durable drafts, pagination, per-message visibility/read behavior, stable authorship and reassignment history.
- [ ] Complete notification jobs and safe delivery; keep accurate in-app unread state when permission is denied. Never include sensitive health content in generic push payloads.
- [ ] Define review cadence, response expectations, coverage, unavailable-coach handling and practical client capacity. Rehearse reassignment and absence.

**Exit:** A coach can receive and answer a client's contextual question entirely through the dashboard, the client can read/acknowledge/follow up, and both sides see correct state after retry or reassignment. No SQL-editor step is needed. This milestone can develop alongside M1 after its required contracts exist.

### M3 — Improve daily check-in, nutrition and trustworthy progress

**References:** A/U03–U04, N01–N02/N04, T01/T04–T05, Q01; B/4.1–6.5. **Owner:** mobile engineer, designer and coach lead; shared backend support.

- [ ] Test Morning/Your day grouping, an accurate answered count and clear error navigation while retaining the required protocol.
- [ ] Add confirmed sleep import only after stage/source/date/overlap handling and actual permission/device checks. Manual entry remains complete.
- [ ] Implement meal confirmation with portion review, skipped/changed states, undo and a durable immutable nutrient snapshot. A full food database and grocery system are unnecessary prerequisites.
- [ ] Reconcile intake into check-in through explicit review of source, partial coverage, unknown nutrients and existing manual overrides.
- [ ] Give comparable exercises stable identity before stronger PR/progression claims. Validate completed observations, units and consistent metrics; label short/capped histories.
- [ ] Present progress for the client's goal with honest gaps and dates. Reproduce any chart visibility defect before applying a global rendering change.

**Exit:** Required check-in usefulness is maintained while effort falls; changing a meal plan cannot rewrite old intake; concurrent confirmations do not lose entries; sparse data cannot produce misleading four-week/PR claims. Clients can explain the next action and the reason behind their progress summary.

### M4 — Refine the premium experience and test differentiation

**References:** A/U01–U03, F08–F10, Q01–Q04; selected B/7 and B/8. **Owner:** designer, mobile/web engineers, QA and coach lead.

- [ ] Select navigation from formative task evidence; unify typography, spacing, controls, feedback and empty/error states on current native screens.
- [ ] Complete accessible scaling, VoiceOver/TalkBack, reduced motion, keyboard, contrast and reachable controls. Measure lifecycle/performance instead of assuming polish from screenshots.
- [ ] Finish usable privacy/support, export and deletion for every data type included in release.
- [ ] Prototype a monthly Chapter using trustworthy existing observations and a coach-authored interpretation. Measure client comprehension and coach preparation time before scaling it.
- [ ] Rank remaining experiments from pilot demand: dictation with review/atomic apply; approved shorter/easier options with versioned prescriptions; form video with complete upload/playback/access/retention; account-safe richer lock-screen consent.

**Exit:** Core journeys and service quality meet the agreed usability/device gates. Optional experiments have a clear benefit, owner, support cost and stop criterion; failing experiments do not delay the core release.

### M5 — Validate, release gradually and re-grade

**References:** A/R01–R05. **Owner:** engineering lead, QA, coach lead and product owner.

- [ ] Run meaningful failure scenarios across local writes, commit-before-response timeouts, replay, migrations and account transitions. Retain A's proposed ≥500-scenario inventory, but do not manufacture repetitive cases merely to hit a count. Require zero lost acknowledged entries and explain duplicates/conflicts.
- [ ] Run formative studies with about 12 clients and 2–3 coaches. Proposed starting targets: ≥11/12 unaided core-task completion and ≥10/12 able to explain the latest coach decision/next action; verify material effort reduction without reduced coach-rated usefulness.
- [ ] Operate a capacity-limited private beta for at least four stable weeks, extending for adequate evidence. A's starting proposal is roughly 30–50 clients if supported, ≥1,000 measured sessions and ≥50 eligible review events.
- [ ] Report raw counts and coverage for stability, data loss, review timeliness and support demand. Proposed starting thresholds are ≥99.8% crash-free sessions, ≥95% reviews within the configured service window, and no unresolved critical data/accessibility/authorization failures. A small pilot cannot prove rare-event safety; keep monitoring after launch.
- [ ] Rehearse migration/rollback, support and account lifecycle; complete store requirements and native acceptance. Release in controlled cohorts and re-grade against observed behavior.

**Exit:** Evidence supports the actual client and coach promise. Targets are proposed project decision rules, not universal market standards or a guarantee of a 10/10 product.

## First three implementation slices

These slices make the next work concrete. Existing package acceptance remains applicable after the comparison's corrections.

| Slice | Exact initial files / supporting tasks | Required checks |
| --- | --- | --- |
| 1. Lossless workout interoperability | Modify `client/src/components/WorkoutLogDialog.tsx`, `client/src/hooks/usePreviousWorkoutData.ts`, `client/src/pages/WorkoutLogs.tsx`; create `shared/workout-content-contract.ts` and `scripts/workout-content-contract.test.mjs`; integrate with `mobile/src/lib/workout-content.ts` and its test. Use A/F01/F06 and corrected B1.4. | Unchanged v2 round trip; edit one weight without changing duration/kind/completion/metadata; legacy array/string display; unknown versions read-only; fractional values and invalid input; history consumers recognize v2. Inspect web UI as well as pure contracts. |
| 2. Recoverable, faster set entry | Modify `mobile/src/hooks/useWorkoutDraft.ts`, `mobile/src/hooks/useCheckInDraft.ts`, `mobile/src/hooks/useOnboarding.ts`, `mobile/src/hooks/usePlanProgress.ts`, `mobile/src/components/logger/CurrentSetEditor.tsx`, `mobile/src/components/logger/ExerciseSlide.tsx` and relevant existing tests; use exact coordinator/reducer files identified in A/F04–F07 and current baseline. | Offline cold restart and expired-draft migration; completion distinctions; 62.5 kg × 8 must survive a 60 kg × 10 suggestion; warm-up/work matching; duration decimals; undo and native accessibility. Implement recovery and interaction as independently reviewable changes. |
| 3. Real contextual coach response | Create/extend `shared/coaching.ts`, `client/src/pages/CoachReviewsPage.tsx`, `client/src/components/coaching/ReviewQueue.tsx`, `client/src/components/coaching/ResponseComposer.tsx`, `mobile/src/features/coaching/CoachScreen.tsx` and `ThreadScreen.tsx`, with A/C01–C05 migration/test/routing files. | Assigned/unassigned/unavailable/reassigned actors; owned context references; accepted-timeout retry; pagination/read behavior; durable drafts; actual dashboard reply → client acknowledgment → follow-up; permission-denied notifications. |

For slice 1, the edit contract must preserve the original supported document and apply explicit validated edits; a lossy display parser must not become the serializer. A useful regression fixture is a completed 60-second plank plus an unfinished warm-up containing reps. Editing an unrelated bench weight must leave those facts unchanged. Unknown metadata is preserved; unsupported structural variants become read-only rather than guessed.

For each slice: record the failing behavior, add the relevant behavioral regression, implement the smallest complete change, run existing affected checks, inspect the actual UI where relevant and record evidence. Do not reuse the plan-review probe runner as the product's acceptance suite.

## Staffing, estimate and execution discipline

A's 26–39 engineering person-weeks and 16–22 calendar weeks with two engineers, a half-time designer, part-time QA and an available coach lead remain an initial outer planning envelope. B has no comparable total estimate. This consolidation reduces launch breadth but also corrects omitted service work; it does not justify inventing a shorter promise now.

At M0, estimate the selected scope from actual current implementations, backend access, device/build setup and coach availability. Publish separate forecasts for the first usable increment, private beta and public release. Count designer/QA/coach work and multi-week study elapsed time, not only code-writing time.

Use one backlog with the [78-task disposition](../../review/2026-09-26-plan-comparison/task-disposition.md) as traceability, not 78 mandatory launch tasks. Capture a baseline before setting performance/effort targets. Record each optional feature's user demand, measurable benefit, data cost and coach workload; ship it only when it improves the intended service.

The original plans remain unchanged as references. This proposed plan is the recommended next implementation basis because it preserves the best ideas from both and corrects the specific issues verified in the comparison.

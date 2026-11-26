# G — Validation and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish credible evidence of client value, sustainable coaching and safe operation before public release, then keep improving from actual use.
**Architecture:** Extend existing CI and staged builds with shared contract tests, privacy-preserving product measurement, formative research and controlled rollout.
**Tech Stack:** Existing GitHub Actions/EAS/Jest/Maestro, Supabase local/staging tests, Deno, web build and shared-domain test scripts.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## R01 — Build the evidence system and release checks

**Priority:** P0. **Depends on:** F01; definitions begin before new features.
**Modify:** `.github/workflows/mobile.yml`, `mobile/src/lib/telemetry-event.ts`, `mobile/src/lib/telemetry.ts`, `mobile/package.json`, root `package.json`.
**Create:** `shared/product-events.ts`, `mobile/src/lib/product-events.test.ts`, `scripts/domain-contracts.test.mjs`, `mobile/docs/release/product-excellence/metrics.md`, `mobile/docs/release/product-excellence/gates.md`, `mobile/docs/release/product-excellence/fault-matrix.csv`.

- [ ] Define events and denominators before collecting them: enrollment, assignment, check-in start/submission, local save, confirmed delivery, workout start/save/completion, review publication/view/acknowledgment, follow-up and recovery failure. Keep state distinctions from the spec.
- [ ] Allow only pseudonymous/cohort IDs, platform, build, event time and bounded reason codes where needed. Add tests that reject unknown properties and fake health/free-text/token fields. Document consent, retention and access.
- [ ] Define activation as the first completed client-to-coach loop: assigned plan, meaningful client record, published response and explicit next-action acknowledgment. Record time-to-assignment separately. Define D7/D28 cohort/window rules before the pilot.
- [ ] Extend the existing workflow rather than replacing it: mobile verification, Expo dependencies/export, root web build/photo checks, generated-type parity, shared-domain tests, local Supabase migration/RLS tests and Edge Function tests.
- [ ] Add ≥500 automated fault scenarios distributed across drafts, queues, writes, account transitions and migrations: failure before local write, after durable write, before send, after server commit/before response, during replay and during sign-out. Count scenarios explicitly; report zero lost acknowledged entries plus duplicates/conflicts separately.
- [ ] Add direct server access checks for rows/columns, private photos, stale signed links, jobs, plan versions, coaching drafts and service operations. Test anonymous, A/B clients, assigned/unrelated/former coaches and admin/service boundaries.
- [ ] Maintain one gate ledger with evidence path, build/schema version, owner, date and status. Tests that did not run remain incomplete.

```sh
# repository root, after creating the tests
node --import tsx --test scripts/domain-contracts.test.mjs scripts/session-completion.test.mjs scripts/training-progress.test.mjs scripts/coaching-contract.test.mjs scripts/client-profile-contract.test.mjs
supabase test db
deno test supabase/functions/account-export/export.test.ts supabase/functions/account-delete/delete.test.ts supabase/functions/push-dispatch/dispatch.test.ts
npm run build
# mobile/
npm run verify
npx expo install --check
npx expo export --platform all
```

The root domain suite covers shared meal, protocol and date contracts without pulling browser UI into a Node test. Add narrow scripts to existing test commands; do not run production migration tools from CI. Private staging credentials are scoped to the protected CI environment.

**Acceptance:** new code has executable gates and privacy-safe measurement; a green unit-test job is never substituted for device or service evidence.

## R02 — Run formative studies and remove core friction

**Priority:** P0. **Depends on:** usable F04/F05/U02–U04/C03 slice. Add T/N scenarios as they become ready; this study does not wait for U05.
**Create:** `mobile/docs/release/product-excellence/research/formative-protocol.md`, `formative-results.csv`, `findings.md` in that directory.

- [ ] Recruit 12 representative coaching clients spanning newer/experienced users and iOS/Android, with varied age, text-size needs and technical confidence. Include 2–3 coaches in dashboard/workload sessions. Obtain research consent and use fictional sensitive records where possible.
- [ ] Run moderated tasks without teaching the interface: understand today's action, complete required check-in, start/log/resume a workout, locate/understand/reply to coach feedback, record a meal, interpret progress, find help and data controls.
- [ ] Time reviewed-import and manual strict check-ins separately; record success, assistance, critical errors, confidence and quotes. Compare with F01/U04 baseline using equivalent tasks. Counterbalance order where learning would bias the result.
- [ ] Observe real context for at least several gym and meal-planning sessions. Desktop preference ratings cannot substitute for phone task success.
- [ ] Require ≥11/12 unaided completion for each core task, ≥10/12 explaining their next action/latest coach decision, import median ≤60 seconds/p90 ≤120 seconds, and ≥30% manual effort improvement without lower coach-rated usefulness.
- [ ] Fix critical issues, repeat affected tasks and report both attempts. Do not hide initial failures or repeatedly retest only expert users.
- [ ] Feed navigation evidence to U01 and field-use evidence to U05. The short-protocol decision may remain “retain optimized strict mode”; it does not block finishing the formative study.

**Acceptance:** raw counts, task definitions, timing method, findings and retest evidence exist. Twelve participants support usability discovery, not a market-wide retention claim.

## R03 — Operate an expanded private beta

**Priority:** P0. **Depends on:** G1–G4 for enabled features and R02 critical fixes.
**Create:** `mobile/docs/release/product-excellence/research/beta-protocol.md`, `beta-weekly.csv`, `beta-report.md` in that directory.

- [ ] Start with an operationally supportable cohort, approximately 30–50 clients if coach capacity permits. Use signed TestFlight/Android closed-test builds and explicit feature cohorts. Limit enrollment if review coverage is insufficient.
- [ ] Run at least four weeks after stabilization, extending as needed to obtain ≥1,000 measured sessions and ≥50 eligible weekly review events. Neither a four-week calendar nor a target headcount alone guarantees adequate evidence.
- [ ] Track crash-free sessions, loss/duplicate/conflict incidents, foreground delivery time, task completion, overdue reviews, coach review/follow-up time, support contacts and reasons for inactivity. Show raw denominators and telemetry coverage.
- [ ] Require ≥99.8% crash-free sessions and zero unresolved blocking crashes/ANRs, zero lost acknowledged entries, ≥95% reviews within the configured service window and no unresolved critical authorization/accessibility issues.
- [ ] Compute the north-star fraction weekly: active coached clients with a currently agreed next action and an on-time review within their configured cadence. Report unassigned/overdue clients separately. Keep meaningful activity client-initiated within the last seven days.
- [ ] Report D7/D28 return and activation by enrollment/assignment cohorts, with sample sizes. Treat early retention as directional; no invented “industry-leading” benchmark. Interview continued users and dropouts, including people who stopped before activation.
- [ ] Review every week with coach, product and engineering owners. A serious data/access failure pauses cohort expansion while the defect and affected records are resolved.

**Acceptance:** an evidence report shows client value and a service the actual coach team can sustain; failed criteria remain open release blockers or explicitly scoped-out capabilities.

## R04 — Rehearse and execute controlled release

**Priority:** P0. **Depends on:** G5 and all blockers resolved.
**Create:** `mobile/docs/release/product-excellence/release-runbook.md`, `rollback-runbook.md`, `store-checklist.md` in that directory.
**Modify:** EAS/app/store configuration, privacy/help website content and server feature configuration as needed.

- [ ] Reconcile the final capability inventory with current Apple/Google policies, health data declarations, account deletion requirements, privacy labels/data-safety form, screenshots and permission text. Recheck official rules at submission time.
- [ ] Rehearse migrations in staging with a production-sized synthetic snapshot: backup, additive schema, compatible readers, jobs, new writes behind account flags, monitoring and restore. Record actual restore time and test a recovered account; do not assume a backup is restorable.
- [ ] Verify feature rollback: disable new writes/entry while keeping published responses, submitted nutrition and recovery records readable. Server migration rollback must not require deleting newly recorded user data.
- [ ] Test signed production-like iOS/Android builds, deep links, login/recovery, health permissions, notifications, private media, export/deletion, minimum-version behavior and backend compatibility. Include older supported client versions against the new server.
- [ ] Assign release owner, coach coverage and support owner; define severity and escalation. Internal target: investigate a blocking incident immediately during staffed rollout, communicate status promptly, and stop expansion until scope is known.
- [ ] Expand from staff/test accounts to a small eligible cohort, then approximately 5%, 25% and wider availability where platform/cohort controls permit. Observe at least 48 hours at meaningful traffic per stage, longer when denominators are weak. A percentage alone is not evidence.
- [ ] Stop rollout for cross-account access, lost acknowledged data, broken authentication/core saves, misleading plan/coach state or regression beyond measured stability targets. Prefer disabling the affected capability and restoring service over destructive schema rollback.

**Acceptance:** store materials are truthful, recovery/rollback is rehearsed, operations are staffed and every required gate links to current evidence. Actual deployment/publication follows the authorization and release controls in the implementation session.

## R05 — Maintain quality, re-grade and evaluate the next investment

**Priority:** P1 operating cadence. **Depends on:** R03 for initial decisions; R04 for production review.
**Create:** `mobile/docs/release/product-excellence/operating-review.md`, `scorecard.md`, `next-experiments.md` in that directory.

- [ ] Hold weekly product/service reviews during early launch, monthly thereafter: reliability, review coverage, user friction, retained value, accessibility regressions, support patterns and deletion/export operations.
- [ ] Re-score the product using the rubric below and evidence links. Include at least one reviewer who did not implement the flow. Do not promote the provisional source-based 6.5/10 to a higher grade merely because tasks are checked off.
- [ ] Repeat core tasks with fresh clients after four weeks; compare the same measures and investigate new-user versus experienced-user differences.
- [ ] Rank the next three investments by observed client problem, coach time saved, evidence confidence, development effort and ongoing operational cost. Avoid adding a broad feature solely because a competitor advertises it.
- [ ] If coach summarization is a measured bottleneck, design a separate coach-only AI draft experiment. Use a consented/de-identified or synthetic benchmark with source references, omissions, unsupported claims, edit time and coach-rated usefulness. Require human publication; exclude automatic prescriptions and messages. This experiment's implementation/cost is outside the base estimate.
- [ ] Recheck whether clients value the decision trail, approved alternatives and goal-specific progress. Deepen the strongest differentiator before expanding to food databases, social feeds, watch apps or video.

### Re-grading rubric

Use a weighted 0–10 score with linked evidence; do not average away release blockers.

| Dimension | Weight | What earns a high score |
| --- | --- | --- |
| Reliability and data integrity | 20% | Interruption/restore evidence, correct acknowledgment, no unexplained loss/duplication |
| Coaching value and personalization | 20% | Useful timely decisions, understood next actions, sustainable workload |
| Daily usability and accessibility | 20% | Core task targets met across devices and assistive technology |
| Training/nutrition/progress correctness | 15% | Accurate actual/prescribed/source distinctions, trustworthy alternatives and comparisons |
| Native performance and polish | 10% | Measured responsive signed builds, coherent screen states and lifecycle behavior |
| Privacy and account ownership | 10% | Direct access tests, protected local/private data and usable export/deletion |
| Product evidence and operation | 5% | Repeatable research, client feedback, truthful service metrics and incident readiness |

A 9–10 rating requires sustained evidence across the whole experience, not simply feature presence. Record unknown dimensions rather than awarding points without observation. This future weighted rubric differs from the original editorial 6.5/10 assessment; do not present the numerical difference as a measured improvement without re-scoring the baseline on the same rubric.

**Acceptance:** the team has a measured quality assessment, a sustainable review cadence and an evidence-ranked next roadmap.

## Release evidence index

The gate ledger must link baseline/schema/builds, design captures, authorization/SQL results, local migration/fault runs, coaching round trip, nutrition/training contracts, health/lifecycle/accessibility/performance matrices, research results, beta denominators and store/rollback artifacts. This index is the definition of “ready”; an unchecked critical item cannot be replaced by a persuasive demo.

# Dawnage release hardening implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for bounded tasks and focused reviews. Preserve the existing working tree; no commits, branch switches, live database mutations or deployment in this implementation pass.

**Goal:** Implement the accepted current-state review: dependable delivery and progress data, private photo access, simpler code and a verifiable release path.

**Architecture:** Preserve existing Expo Router routes, semantic theme, guided flows, draft ownership and domain outboxes. Correct SDK/database boundaries and share canonical queries. Store photo object paths and resolve authorized short-lived URLs; migrate mobile and web readers together. Remove proven dead modules before removing their dependencies. Diagnostics accept only sanitized categories and timing.

**Tech stack:** Expo SDK 57, React Native 0.86, React Query, Supabase, TypeScript, Jest, Expo Router, existing React web dashboard.

**Spec:** `mobile/docs/review/2026-09-18/README.md`, approved by the user with “Yes do all this”.

## Global constraints

- Keep refined athletic styling, light/dark tokens, reduced motion and accessibility behavior.
- Protect account/date identities, edits made during asynchronous work, local drafts, explicit log IDs and multiple workouts per date.
- No live photos, real account data or production writes in tests. Use injected fetch, local fixtures and temporary storage.
- Do not reset, stash, clean or commit the large pre-existing working tree. Snapshot source before edits and review against that snapshot.
- Keep independent task ownership explicit. Package/lockfiles, app config and CI belong to the integration task.
- Physical-device tests, cloud builds and live policy checks require available tooling/accounts. Prepare runnable checks, execute available checks and report actual evidence; do not mark external validation complete from source tests.

## Task 1: Delivery boundaries

**Own:** `mobile/src/lib/delivery-errors.ts`, `workoutPersistence.ts`, relevant outbox tests, `features/checkin/persistence.ts`, new persistence adapter tests.

- [x] Extend the existing review reproductions into assertions: SDK-wrapped offline failure must queue and retry; permission/validation/conflict failures must remain nonretryable; zero-row updates must retain intent.
- [x] Observe the failure before changing implementation. Use the installed PostgREST adapter with injected fetch instead of only throwing a raw mocked TypeError.
- [x] Normalize actual response status/error envelopes at persistence boundaries. Only evidenced transport/server failures retry.
- [x] Request and validate owned row IDs for check-in writes before acknowledging synchronization. Preserve workout ID behavior.
- [x] Run covering tests and retain logs. Review correctness, backward outbox envelopes and error privacy.

## Task 2: Plans, measurements and weekly UX

**Own:** Plans, Measurements and weekly-feedback routes/tests; `useDashboardData`, `useMeasurements`, MeasurementSheet; supporting Home data/local/types/weekly presentation; weekly feature selectors/controller/history extraction.

- [x] Add focused regressions for initial plan errors, unaffected Nutrition access, template provenance/start behavior, shared measurement cache order and draft preservation on refetch.
- [x] Use one canonical measurement query. Remove aggregate dashboard calculations and unused Home measurement requests; migrate imports without breaking `useDailyCheckIns` consumers.
- [x] Keep Plans shell/switch mounted and give independent errors accurate retry actions. Match template actions to the logger's user-plan contract.
- [x] Extract weekly reporting-window/observed-value selectors and labeled history. Define Monday-to-today calendar dates in the app's reporting timezone convention; disclose dates and observation count. Missing values are not zero.
- [x] Use neutral measurement-change labels suitable for every onboarding goal.
- [x] Add a restrained Home weekly resume/due action using existing saved draft/history rather than a new flow; preserve error and owner scopes.
- [x] Run covering tests, review async ownership and cached data behavior.

## Task 3: Private progress-photo contract

**Own:** photo helpers/hooks/components/routes/tests in mobile, photo upload/read consumers in client/web, relevant new SQL migration and local verification/migration instructions. Do not edit package manifests.

- [x] Trace every progress-photo producer/consumer and coach ownership relationship before designing policies.
- [x] Add regression tests for accepted object paths, same-project legacy public URL conversion, rejected foreign/traversal paths, short-lived URL resolution and account changes.
- [x] Store canonical object paths in existing photo reference columns with coordinated readers. Resolve authorized signed URLs and refresh on expiry/focus. Never fall back to a public URL after signing fails.
- [x] Prepare an idempotent transactional migration for private bucket/object policies, owner/authorized-coach access and safe existing-reference conversion. Unrecognized references fail explicitly and require review, not silent data deletion.
- [x] Include staging cross-account denial checks, rollout order and rollback implications. Do not apply migration to live storage.
- [x] Verify source tests and web compatibility; document remaining live policy validation precisely.

## Task 4: Cleanup, diagnostics and release integration

**Own:** verified dead modules/tests/exports; mobile package/lockfiles; fonts/root startup; app/eas/Metro/ESLint config; CI; diagnostics and recovery boundaries; release documentation and test runner integration.

- [x] Recheck import reachability then remove the review's 14 dead modules, unused Stepper/Stagger/chart wrappers and dedicated obsolete tests. Preserve active swipe, timer provider, MetricCard and current guided form.
- [x] Remove unused font families and use per-weight Inter imports. Remove only unused direct dependencies, preserving Expo/Router and test peers. Regenerate lockfile with the package manager.
- [x] Remove stale reset script and verified starter assets. Update current docs without deleting historical evidence/attribution.
- [x] Implement environment-specific development/preview/production app identifiers and real-device build profiles with SDK-compatible development-client support.
- [x] Add sanitized production diagnostics and an app recovery boundary; instrument save/retry outcomes/timing without raw answers, IDs, tokens, photo URLs or backend error text.
- [x] Add mobile-scoped CI for reproducible install, typecheck/lint/Jest/UI contracts and platform export; add photo-contract checks where relevant.
- [x] Prepare device/5–8-user study scripts and acceptance record. Exercise available runtime checks; record unavailable physical/cloud validation honestly.

## Task 5: Integrated verification and review

- [x] Review task changes against the captured source baseline, including untracked files.
- [x] Run focused new regression tests, full mobile typecheck/lint/Jest/UI contracts, SDK dependency check and iOS/Android/web export. Run appropriate web/photo checks and build.
- [x] Attempt fresh local route captures; Chrome debugger startup timed out after 60 seconds. No current visual proof is claimed and no historical screenshots were reused.
- [x] Obtain focused code review, fix substantive findings and rerun affected tests.
- [x] Save measured dependency/font/export changes, exact checks and external prerequisites in a single implementation handoff.

## Coordination decisions

The accepted design is a bounded hardening of existing flows, including a cross-client photo storage interface. No new visual direction or state framework is needed. Work proceeds in the established feature checkout because its uncommitted source is the approved app state. Source snapshots supply a review baseline without bundling earlier changes into commits. Photo policy changes are implemented as reviewable migration artifacts; deployment and physical-device evidence remain separate execution steps.

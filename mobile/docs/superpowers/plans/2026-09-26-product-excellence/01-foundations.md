# A — Foundations and Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every saved record, access boundary and account action dependable before expanding the product.
**Architecture:** Add typed server contracts, transactional writes, protected local persistence and one account-scoped synchronization coordinator to the existing clients.
**Tech Stack:** Existing Expo/React/Supabase stack; Expo SecureStore and SQLCipher-enabled Expo SQLite after the F01 native compatibility check; Supabase CLI, pgTAP, Deno tests, Jest.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## F01 — Establish the actual baseline and staging environment

**Priority:** P0. **Depends on:** audit. **Owner:** mobile + backend engineers. **Output:** G0 baseline, buildable staging, verified schema and revised estimate.

**Inspect/modify:** `mobile/package.json`, `mobile/eas.json`, `mobile/app.config.ts`, `mobile/src/types/db.ts`, `shared/schema.ts`, `.github/workflows/mobile.yml`.
**Create:** `supabase/config.toml`, `supabase/seed.sql`, `supabase/functions/deno.json`, `supabase/tests/database/baseline.test.sql`, `shared/database.generated.ts`, `mobile/src/types/database.generated.ts`, `mobile/docs/release/product-excellence/baseline.md`, `mobile/docs/release/product-excellence/budget.csv`.

- [ ] Record the commit and dirty-tree snapshot; map every route, feature, storage key, query, deployed database table/policy/trigger/function and private bucket. Preserve the user's current changes. Record baseline test failures separately from new failures.
- [ ] Create a dedicated staging project and local Supabase environment with fictional clients A/B, coaches A/B and an administrator. Pull the applied schema into a reviewed baseline migration; validate a fresh local restore. Reconcile it with historical SQL and the stale shared schema without replaying historical scripts into an existing database.
- [ ] Generate both client type files from the same schema output. Keep presentation/domain types in separate modules; add an automated equality check for generated definitions. Document the actual Auth/Storage/Edge Function deployment process and configuration names, never secrets.
- [ ] Run existing mobile verification, Expo dependency checks/export, root web build and existing photo tests. Build signed preview iOS/Android apps. Capture current main flows and failures; U01 owns the visual inventory. Record unsupported native capabilities and actual OS floors.
- [ ] Prove the chosen SecureStore + SQLCipher configuration builds on both platforms and survives terminate/reopen. Measure serialized session size, encrypted database migration behavior and platform backup behavior. Resolve compatibility here before F03; do not silently downgrade to unencrypted sensitive persistence.
- [ ] Price staging/build/monitoring/device/research costs from actual accounts or quotes; assign role owners and reforecast the 26–39 person-week envelope from the baseline.

**Verification commands:** run from the stated directory, on staging/local configuration only.

```sh
# mobile/
npm run verify
npx expo install --check
npx expo export --platform all
# repository root; Supabase CLI version is pinned in the baseline
npm run build
supabase start
supabase test db
```

**Acceptance:** current native screenshots/build IDs, command exit results, applied-schema diff, safe test accounts and a documented local restore exist. A stalled command is recorded as incomplete, not passed. No production migration is part of this task.

## F02 — Protect profiles, roles, assignments and private coach notes

**Priority:** P0. **Depends on:** F01. **Owner:** backend/web engineer.
**Modify:** `mobile/src/contexts/AuthContext.tsx`, `mobile/src/hooks/useCoach.ts`, `client/src/contexts/AuthContext.tsx`, `client/src/pages/CoachClientsPage.tsx`, `client/src/components/CoachClientTable.tsx`, `client/src/components/ClientDetailsSheet.tsx`, `mobile/src/features/checkin/persistence.ts`.
**Create:** `supabase/migrations/20260926000100_client_access.sql`, `supabase/tests/database/client_access.test.sql`, `shared/client-profile.ts`, `mobile/src/lib/client-profile.ts`, `scripts/client-profile-contract.test.mjs`, `shared/capabilities.ts`, `mobile/src/hooks/useCapabilities.ts`, `mobile/src/hooks/useCapabilities.test.ts`.

- [ ] Add failing direct database tests for anonymous access, client A reading/updating B, client A changing role/coach/package, former coach access, and client reading private notes. Test explicit column requests as well as normal profile queries.
- [ ] Replace client `select('*')` with a safe profile contract. Enforce safety at the server: remove broad table grants that expose private columns, use explicit safe column grants or a tested safe RPC, and put private notes behind assignment-checked coach access. A UI projection alone is insufficient.
- [ ] Move package-start initialization from mobile's post-check-in update into an authorized server function before revoking the old field grant. Cover existing onboarding, package assignment and admin workflows so the tightening does not strand legitimate users.
- [ ] Use verified session identity inside RPCs; pin security-definer search paths, schema-qualify objects, restrict execute grants and test actor/assignment every call. Extend the existing safe `get_my_coach` response only with client-visible service details.
- [ ] Add server-owned, account-readable capability configuration for the master plan's rollout flags. Default new entry/write features off; enforce privileges independently. Cache only the current account's flags, and retain compatible readers for previously published data when a flag is disabled. Test that a client cannot enable its own capability.
- [ ] Deploy compatible dashboard/mobile readers first, then tighten grants using the recorded migration order; older releases receive a clear minimum-version/re-auth path if a safe compatibility adapter cannot support them.

**Authorization test matrix:** client A can read/edit allowed fields on A; cannot read notes or mutate role, assignment or package fields; assigned coach can access permitted client records; unrelated/former coach cannot; server-owned operations cannot be called anonymously. Test Storage access separately in R01.

**Acceptance:** bypassing the app cannot cross the boundary. All legitimate profile and package workflows still pass. Scope is a verified authorization repair, not a claim about previously deployed exploitability.

## F03 — Protect local sessions and retained health records

**Priority:** P0. **Depends on:** F01/F02.
**Modify:** `mobile/src/lib/supabase.ts`, `mobile/src/contexts/AuthContext.tsx`, `mobile/src/lib/asyncOutbox.ts`, `mobile/src/lib/outbox.ts`, `mobile/src/features/checkin/checkInOutbox.ts`, the three draft hooks, `mobile/app.config.ts`.
**Create:** `mobile/src/lib/storage/secure-database.ts`, `mobile/src/lib/storage/account-store.ts`, `mobile/src/lib/storage/migrate-legacy.ts` and corresponding `.test.ts` files.

- [ ] Define `AccountStore` with asynchronous `read/write/remove/list`, atomic transactions and explicit account ownership. Store health-bearing drafts, queues and selected offline snapshots in encrypted SQLite; keep encryption keys in OS-protected SecureStore. Store auth sessions through an encrypted adapter so oversized JSON is not assumed to fit a single SecureStore value.
- [ ] Add migration interruption tests before implementation. Inventory all legacy AsyncStorage keys, including weekly drafts, and move each record transactionally: copy, read/validate, record migration completion, then remove the original. An error must preserve the recoverable original and show an actionable state.
- [ ] Separate installation/session bootstrap from per-account records. On account change cancel queries/jobs, detach native surfaces, clear in-memory caches and lock previous-account data. Never expose one client's draft to another client.
- [ ] Make sign-out disclose pending local work and offer sync, retain locked, or explicit discard; default to preserving work. Known session revocation locks access until reauthentication. Deletion cleanup removes the account's keys/files after the confirmed lifecycle in F10.
- [ ] Verify key-loss/reinstall, biometric setting change if used, device backup/restore, storage-full and locked-device cases on both native platforms. Do not back up a database without a recoverable/key-policy decision. Web preview uses an explicit limited adapter; it must not claim native secure offline storage.

**Behavioral contract to implement:**

```ts
type LocalRecord = { id: string; accountId: string; kind: string; payload: unknown };
interface AccountStore {
  read(accountId: string, id: string): Promise<LocalRecord | null>;
  write(accountId: string, record: LocalRecord): Promise<void>; // durable before resolve
  remove(accountId: string, id: string): Promise<void>;
  list(accountId: string, kind: string): Promise<LocalRecord[]>;
}
// Tests use an injected store that throws at every migration checkpoint.
// After each interruption, reopening must find the original or validated copy,
// and store.read(otherAccount, id) must return null or an ownership error.
```

**Acceptance:** no silent loss at migration boundaries; no sensitive plaintext left after a successful migration; restored/locked/error states have tested recovery. Never log keys or record payloads.

## F04 — Make offline recovery reachable and remove silent draft expiry

**Priority:** P0. **Depends on:** F03.
**Modify:** `mobile/src/hooks/useOnboarding.ts`, `mobile/app/(app)/_layout.tsx`, `mobile/app/_layout.tsx`, `mobile/src/hooks/useWorkoutDraft.ts`, `mobile/src/hooks/useCheckInDraft.ts`, `mobile/src/hooks/useWeeklyFeedbackDraft.ts`, `mobile/src/components/logger/WorkoutRecovery.tsx`.
**Create:** `mobile/src/features/recovery/access-state.ts`, `mobile/src/features/recovery/RecoveryInbox.tsx`, `mobile/src/features/recovery/access-state.test.ts`, `mobile/.maestro/offline-recovery.yaml`.

- [ ] Add cold-start tests with unavailable onboarding fetch, an expired token and account-owned cached context. Define `deriveAccessState` returning `online_ready | offline_recovery | needs_setup | needs_reauth`; offline context never grants server access.
- [ ] Cache minimal successful setup/access context and selected assigned-plan snapshots in F03 storage. Allow the known account to reach its retained drafts/queued records without a fresh setup query; show freshness and connectivity accurately.
- [ ] Replace the workout 24-hour and check-in three-day destructive read expiry with visible archived recovery. Preserve original reporting dates. Offer resume on original date, inspect, or explicit discard; moving data to another day requires a deliberate copy/review.
- [ ] Add a recovery inbox to Home/account that distinguishes draft, queued, blocked and archived. Clear a submitted draft only after a durable handoff to the queue or verified server acknowledgment.
- [ ] Test account switching, interrupted onboarding, midnight/timezone change, week-old drafts and a force-quit while saving. Keep transient raw numeric input so re-entry is not required after validation failure.

**Example test:** create a workout draft dated seven days earlier; launch cold with network disabled; opening recovery shows that draft under its original date. A different account sees none of it. A server-revoked session can request reauthentication but cannot send queued work.

**Acceptance:** no required network response blocks access to locally retained work for the recognized account; no timer deletes unsubmitted work.

## F05 — Centralize synchronization and truthful delivery status

**Priority:** P0. **Depends on:** F03/F04; integrates F07 acknowledgment contracts.
**Modify:** `mobile/app/_layout.tsx`, `mobile/src/lib/outbox.ts`, `mobile/src/features/checkin/checkInOutbox.ts`, `mobile/src/features/home/useHomeData.ts`, existing editor/logger/history replay callers.
**Create:** `mobile/src/features/sync/coordinator.ts`, `mobile/src/features/sync/useSyncCoordinator.ts`, `mobile/src/features/sync/coordinator.test.ts`, `mobile/src/features/sync/SyncStatus.tsx`.

- [ ] Build one account-scoped coordinator with `start(accountId)`, `stop()` and `requestFlush(reason)`. Adapt existing `flushOutbox(userId)` and `flushCheckInOutbox(userId)`; preserve payloads and operation IDs.
- [ ] Trigger bounded single-flight replay on authenticated foreground entry, connectivity restoration and manual retry. Subscribe to real connectivity/foreground changes; OS background execution is best effort and is not promised.
- [ ] Classify retryable network/server errors, auth blocks, validation rejection and revision conflicts. Use capped exponential backoff with jitter; retain blocked entries with a readable remedy. Do not repeatedly retry a rejected payload.
- [ ] Snapshot account identity for every batch, cancel on sign-out/reassignment-relevant permission failure, and revalidate before writes. Use server idempotency plus owned acknowledgments, rather than assuming a request timeout means failure.
- [ ] Invalidate the relevant account query keys after confirmed writes. Show pending counts and last success on Home. Keep bounded diagnostics without health values; never clear the queue merely because a flush returned a count.

**Fault test:** server accepts operation X, connection drops before response, process terminates, then Home opens online without entering the logger. Replay produces one server row, removes only acknowledged X, and shows synced. Concurrent focus/reconnect triggers produce one active flush. Switching to B sends none of A's operations.

**Acceptance:** healthy foreground reconnect reaches confirmed state at p95 ≤30 seconds in the recorded network scenario; blocked conflicts are excluded and visibly counted.

## F06 — Give completion one meaning across the app

**Priority:** P0. **Depends on:** F01. **Integrates:** T01 prescription snapshots.
**Modify:** `mobile/src/hooks/usePlanProgress.ts`, `mobile/src/components/plans/PlanDayCard.tsx`, `mobile/src/features/home/weekly-recap.ts`, `mobile/src/lib/workout-content.ts`, `client/src/components/WorkoutLogDialog.tsx`, `client/src/components/workout-mobile/MobileWorkoutCarousel.tsx`.
**Create:** `shared/session-completion.ts`, `mobile/src/lib/session-completion.test.ts`, `scripts/session-completion.test.mjs`.

- [ ] Define a shared pure function that consumes explicit required/completed work-set counts when a prescription is known, and whether reliable explicit completion data exists. Emit the spec's `SessionCompletion`; delivery is a different field.
- [ ] Add failing tests for partial v2 content, all unchecked, duration exercises, warmups, legacy free text, deleted prescribed sets and approved variants. Legacy records lacking original requirements remain unknown instead of inventing adherence.
- [ ] Update plan cards, Home, history and dashboard summaries to consume the same result. A saved session with unfinished required work is partial; ending it intentionally does not silently turn it into prescribed completion.
- [ ] Preserve the existing v2 payload reader. Until T01 supplies immutable requirements, show partial when incomplete work is explicit and unknown where completion against the original prescription cannot be established. Do not backfill fabricated targets.

```ts
// New shared contract, re-exported to both clients:
type CompletionInput = {
  requiredWorkSets: number | null;
  completedRequiredWorkSets: number;
  hasExplicitIncompleteWork: boolean;
  hasStarted: boolean;
};
expect(classifySession({
  requiredWorkSets: 6, completedRequiredWorkSets: 2,
  hasExplicitIncompleteWork: true, hasStarted: true,
})).toBe('partial');
expect(classifySession({
  requiredWorkSets: null, completedRequiredWorkSets: 0,
  hasExplicitIncompleteWork: false, hasStarted: true,
})).toBe('unknown');
```

**Acceptance:** the same record has the same completion classification everywhere; a partial save never advances a plan as completed.

## F07 — Make writes atomic, idempotent and precision-safe

**Priority:** P0. **Depends on:** F01/F02. **Feeds:** F05 and new domains.
**Modify:** `mobile/src/hooks/useMeasurements.ts`, `mobile/src/features/checkin/persistence.ts`, `mobile/src/components/questionnaire/QuestionnaireWizard.tsx`, web measurement/check-in/questionnaire writers, generated types.
**Create:** `supabase/migrations/20260926000200_record_writes.sql`, `supabase/tests/database/record_writes.test.sql`, `shared/record-write.ts`, `mobile/src/lib/record-write.test.ts`.

- [ ] Inspect actual duplicate daily/measurement/questionnaire rows and decimal types in staging. Write a non-destructive reconciliation report and preserve superseded values in an audit/recovery table before adding uniqueness. No arbitrary “latest wins” loss.
- [ ] Add RPCs `save_measurement_v1`, `save_checkin_v1`, `save_questionnaire_v1` using server-inferred actor, client operation UUID and expected revision. Enforce one canonical measurement/check-in per client/local date and explicit version semantics for assessments.
- [ ] Make write + operation receipt + package initialization (where applicable) one transaction. Return the owned normalized persisted row and revision; zero matched rows or an unexpected owner is not success.
- [ ] Reject stale expected revisions with a typed conflict carrying the permitted current row. Present review/reapply choices; never overwrite a concurrent device silently.
- [ ] Align water precision to support quarter-litres end to end (at least scale 2), and all units/null handling across forms, schema and readers. Date keys remain captured local reporting dates, independent of UTC upload timestamps.

```ts
type WriteResult<T> =
  | { kind: 'saved'; operationId: string; row: T; revision: number }
  | { kind: 'conflict'; current: T; revision: number };
// Contract fixtures: same operation UUID twice => same row/revision;
// two independent first writes to one date => one row plus explicit conflict;
// water_liters 2.25 => acknowledged 2.25, not 2.3; null never becomes zero.
```

**Acceptance:** concurrent/retried writes cannot create duplicates or false success. Direct SQL/RPC tests and mobile offline round trips cover all three record families.

## F08 — Add usable privacy, consent and support surfaces

**Priority:** P0. **Depends on:** F01/F02.
**Modify:** `mobile/app/(app)/settings.tsx`, `mobile/app/(auth)/login.tsx`, `mobile/app/health-access.tsx`, `client/src/App.tsx`.
**Create:** `mobile/app/privacy.tsx`, `mobile/app/help.tsx`, `client/src/pages/Privacy.tsx`, `client/src/pages/AccountData.tsx`, `mobile/docs/release/product-excellence/privacy-data-map.md`.

- [ ] Inventory collected information, processors, purpose, retention, exports, backups, health permissions, photo storage and support access. Reconcile the policy with actual implementation.
- [ ] Publish an accessible privacy route on the existing website and mobile public shell; connect it before registration and in settings. Confirm the operating entity and real support destination before release; do not ship invented contact details.
- [ ] Explain optional health imports and notification access at point of use. Permission refusal must leave manual core flows usable.
- [ ] Separate app support, coaching questions and account operations. Show current service expectations rather than a blanket unstaffed promise.
- [ ] Test public links logged out, assistive technology, offline explanatory copy and error recovery. Verify current Apple/Google disclosure requirements at R04.

**Acceptance:** policy matches the data map, support reaches a staffed real destination, and consent refusal does not trap a client.

## F09 — Deliver a private, recoverable data export

**Priority:** P0. **Depends on:** F02/F08; inventory updated as C/T/N tables arrive.
**Create:** `supabase/migrations/20260926000300_account_jobs.sql`, `supabase/functions/account-export/index.ts`, `supabase/functions/account-export/export.test.ts`, `supabase/functions/_shared/account-jobs.ts`, `mobile/src/features/account/ExportData.tsx`.
**Modify:** settings and web `AccountData.tsx`.

- [ ] Define server-owned account jobs with idempotency key, verified subject, status, timestamps, retry count and bounded error code. Require recent reauthentication for requesting/downloading sensitive exports.
- [ ] Build the Edge Function using verified identity, never a client-supplied target user. Export owned records in machine-readable form plus a readable manifest, original dates, units and available provenance; exclude private coach notes and other users' records.
- [ ] Include owned photos using authenticated/private retrieval. Store the finished archive privately, issue a short-lived download capability after revalidation, expire artifacts by the declared retention schedule and clean partial archives.
- [ ] Test duplicate requests, partial worker failure, reassignment, revoked session, another account's job ID and link expiry. Show queued/processing/ready/expired/retry states without claiming instant completion.
- [ ] Register every later table family in a central export inventory and test it against the applied schema.

**Acceptance:** client A obtains complete permitted data and cannot enumerate/download B's job; retries do not leak or duplicate archives.

## F10 — Implement account deletion across data, media and authentication

**Priority:** P0. **Depends on:** F03/F08/F09.
**Create:** `supabase/functions/account-delete/index.ts`, `supabase/functions/account-delete/delete.test.ts`, `mobile/src/features/account/DeleteAccount.tsx`, `mobile/docs/release/product-excellence/account-deletion-runbook.md`.
**Modify:** account jobs migration in development before deployment, or a new additive migration after deployment; settings and website account-request route.

- [ ] Specify request, recent reauthentication, explicit consequence confirmation, accepted job, processing and completed/failed states. Offer export first without obstructing deletion. State any actual retention exception and backup expiry accurately.
- [ ] Use verified subject and an idempotent server job. Revoke active capability/token access, remove owned private objects and application records in a dependency-aware sequence, then remove Auth identity. Keep enough minimal job state to safely resume after partial failure.
- [ ] Include coaching threads/follow-ups, meal entries, plan snapshots, notification tokens/jobs and every legacy table. Do not erase unrelated coach/client data. Retain only specifically justified minimum audit fields, never a blanket health copy.
- [ ] Clear this device's retained data and native surfaces after confirmed completion, or when a pending deletion is recognized on next authenticated launch. Explain that disconnected devices learn server changes on reconnect; do not promise instantaneous remote wiping.
- [ ] Provide the store-required public web request path and test signed-out identity verification, replay, interrupted cleanup, storage failure and unknown job enumeration.

**Acceptance:** a synthetic account is deleted end to end, access is revoked, private artifacts are removed, retries finish safely and documented retention matches behavior. Deletion capability is a public-release gate.

## Package verification and handoff

Run the relevant Jest suites after each mobile increment; use `npm test -- --runTestsByPath src/features/sync/coordinator.test.ts` from `mobile/` once that file exists. Run `supabase test db` from root and `deno test supabase/functions/account-export supabase/functions/account-delete` after F09/F10. The Edge test harness mocks external delivery/storage failures and uses local/staging fixtures for access checks.

Finish with full mobile verification, web build/contract tests and the native interruption matrix. Evidence must distinguish unit tests, direct server tests and device observations. Hand off generated types, typed errors, account-store adapters and the server deployment inventory to packages B–G.

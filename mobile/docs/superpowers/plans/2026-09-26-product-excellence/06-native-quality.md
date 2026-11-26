# F — Native Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that the daily experience remains responsive, accessible and trustworthy on real iOS and Android devices.
**Architecture:** Harden existing native adapters and shared screens; add measured lifecycle, accessibility and performance evidence rather than replacing proven infrastructure.
**Tech Stack:** Existing Expo development/preview builds, HealthKit/Health Connect adapters, native notifications/widgets, VoiceOver/TalkBack, platform profilers, Maestro and Jest.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## Device/evidence matrix

Use iPhone 13 plus a recent iPhone, Pixel 6a and Galaxy A54 where compatible with the generated build. Confirm the actual minimum OS in F01; cover the oldest supported and current OS. Record physical versus simulator evidence explicitly.

Each critical journey needs: normal online, slow/offline, cold launch, app interruption, large text, screen reader, keyboard present, dark/light appearance and account change. A web screenshot cannot validate a native permission dialog, background timer or accessibility gesture.

## Q01 — Validate optional health imports end to end

**Priority:** P0 for advertised health support. **Depends on:** F01/F03/F07/U04; N04 for nutrition reconciliation.
**Modify:** `mobile/src/features/health/healthkit-reader.ts`, `healthconnect-reader.ts`, `health-service.ts`, `health-model.ts`, `health-review.ts`, `health-review-sheet.tsx` in that directory; `mobile/app/health-access.tsx`, `mobile/app.config.ts`.
**Create:** `mobile/docs/release/product-excellence/health-device-matrix.md`.
**Extend:** existing `health-readers.test.ts`, `health-service.test.ts`, `health-review.test.ts`.

- [ ] Verify current native capabilities and permission text from the built app. Existing imports cover weight, steps, calories, water and macros; do not advertise unimplemented sleep import.
- [ ] Test unsupported device/build, no provider, denied permission, partial grants, revoked permission, empty result and stale result. Manual check-in remains available throughout.
- [ ] Validate units, aggregation, source deduplication, reporting-day bounds and timezone travel. Never shift historical DateKeys because an upload timestamp is UTC.
- [ ] Review values before application, with source/date/freshness visible. Preserve manual edits and explain conflicting imported versus meal-ledger totals.
- [ ] Verify permission revocation and account change clear cached pending imports and native surfaces. Persist only the selected necessary data under F03 protections.
- [ ] Run actual iOS and Android provider scenarios using fictional test records. Record provider/OS versions and screenshots without personal health data.

**Example test:** two sources report the same step interval; the provider aggregation/deduplication rule yields one intended total, not a sum of duplicate streams. A denied macro permission is distinguishable from measured zero grams.

**Acceptance:** imported values are correctly attributed and reviewable; refusal/unsupported states never block core daily use.

## Q02 — Verify rest timers, notifications and native surfaces across lifecycle

**Priority:** P1. **Depends on:** F03/F05/T02/C04.
**Modify:** `mobile/src/components/logger/useRestTimer.ts`, `RestDock.tsx` in that directory; `mobile/src/features/native-surfaces/controller.ts`, `model.ts`, `service.ts`, `hooks.tsx`, `adapter.ios.ts`; notification routing.
**Create:** `mobile/docs/release/product-excellence/native-lifecycle.md`.
**Extend:** existing timer, native-surface controller and routing tests.

- [ ] Keep timers based on a persisted target instant, not a foreground tick count. Reconstruct remaining time on foreground/relaunch and cancel obsolete scheduled notifications.
- [ ] Test background, locked screen, incoming call, process termination, clock adjustment, rest edit/skip, notification denied and stale delivered notification.
- [ ] Validate existing iOS widget/Live Activity content, privacy, stale states, app links and completion cleanup. Do not describe this as a new widget feature; it is a correctness/polish task.
- [ ] Provide useful Android in-app/timer notification behavior with platform-appropriate fallbacks. A full Android home-screen widget or watch app is a separately estimated enhancement.
- [ ] Clear account-specific widget/activity state on sign-out/deletion and never show sensitive coach/nutrition text on public surfaces. A stale link must recheck identity and access.
- [ ] Treat OS background execution limits honestly. The foreground app must recover even if the OS deferred an update.

```ts
// Inject clock into the timer model for deterministic tests.
expect(remainingSeconds({ endsAtMs: 120000 }, 90000)).toBe(30);
expect(remainingSeconds({ endsAtMs: 120000 }, 150000)).toBe(0);
// Add reschedule/cancel tests; reopening must not restart the original duration.
```

**Acceptance:** timers resume accurately, alerts do not repeat after cancel, and native surfaces cannot expose another account's information.

## Q03 — Complete native accessibility and interaction acceptance

**Priority:** P0. **Depends on:** U02–U04/C03/T02/T05/N04 as each becomes available.
**Modify:** affected route/components discovered by the matrix, keeping fixes in existing primitives first; `mobile/docs/ui-validation-matrix.md`.
**Create:** `mobile/docs/release/product-excellence/accessibility.md`, `mobile/.maestro/core-journeys.yaml`.

- [ ] Run every critical journey with VoiceOver and TalkBack: sign-in/setup, check-in, workout/set/undo, coach response/follow-up, nutrition confirmation, progress, export and deletion.
- [ ] Test focus order/restoration, sheet dismissal, actionable labels/hints, error announcement and chart text equivalents. Avoid inaccessible nested touch targets.
- [ ] Test largest practical system text settings and display scaling. Critical actions remain reachable without clipping or overlap; forms may scroll rather than shrink the text.
- [ ] Check touch target sizes, contrast in both themes, status text beyond color, keyboard avoidance, safe areas, Android Back, iOS back gestures and unsaved exit behavior.
- [ ] Verify reduced motion/transparency and interruption of transitions. Repeated logging must remain possible during feedback animations.
- [ ] Record issue, reproduction, affected device, severity, fix and retest. Automated accessibility checks support, but cannot replace, manual assistive-technology journeys.

**Acceptance:** no critical task requires visual-only interpretation, a precise gesture without an alternative, or an inaccessible control. Zero unresolved blocking accessibility/keyboard defects at G4.

## Q04 — Measure performance, stability and long-history behavior

**Priority:** P0. **Depends on:** F04/F05 and completed feature increments.
**Modify:** `mobile/src/lib/telemetry.ts`, `mobile/src/lib/telemetry-event.ts`, relevant data queries/history lists, `.github/workflows/mobile.yml`.
**Create:** `mobile/docs/release/product-excellence/performance.md`, `mobile/src/lib/performance-events.ts`, `mobile/src/lib/performance-events.test.ts`.

- [ ] Instrument startup milestones, local durable-save acknowledgment, foreground sync completion and bounded error codes. Scrub health data, free text, photos, tokens and identifiers from logs/breadcrumbs. Review native crash collection explicitly; existing sanitized JS telemetry does not prove native crash coverage.
- [ ] Measure signed release builds on fixed recorded network profiles with synthetic 90-day and multi-year histories. Run at least 30 cold launches per reference condition; report sample count, p50/p95 and variation.
- [ ] Profile the actual slow path before fixing it. Common candidates are blocking setup fetches, whole-history requests, expensive charts and frequent logger rerenders; they are hypotheses until measured.
- [ ] Add pagination/indexes where measured queries require them, bounded image handling and stable list behavior. Recheck numeric/plan correctness after caching optimizations.
- [ ] Run prolonged workout/check-in use and repeated photo/coach navigation for memory growth, native crashes and Android ANRs. Test storage pressure and slow response without freezing input.
- [ ] Add consent-appropriate crash/session denominator measurement for R03 and verify scrubbing with adversarial fake values. A telemetry outage is visible; it must not silently improve the crash-free ratio.

**Targets:** first useful content p95 ≤3 seconds online under the recorded network profile, cached offline recovery p95 ≤2 seconds, set feedback ≤100 ms and durable save ≤500 ms at p95. Beta crash-free sessions ≥99.8% across ≥1,000 sessions, with no unresolved blocking native crash/ANR.

**Acceptance:** results come from current signed builds and devices; any missed target has a measured cause and explicit release decision. Source tests alone cannot pass this task.

## Package verification

Complete existing mobile verification, build/export/dependency checks and native device matrices. Reuse current test infrastructure and preserve each build identifier. G4 needs both platform evidence; simulated callbacks or mocked permissions alone are insufficient.


# Production quality, validation, and rollout

This is the acceptance specification for the [redesign](../../superpowers/specs/2026-09-15-premium-experience-design.md). It defines work to perform, not checks that have already passed.

## Current evidence

- Source reviewed at repository HEAD 8ec16a7 with pre-existing uncommitted material.
- No native rendered baseline, device recording, accessibility-service run, or performance trace was captured.
- Earlier typecheck/lint/Jest attempts stalled and were stopped without results. They are not passes or evidence of product failure.
- Existing mobile/docs/ui-validation-matrix.md records unresolved release evidence and progress-photo privacy issues.
- The machine has Command Line Tools, not a usable full Xcode simulator setup. Plan on EAS preview/release-equivalent builds installed on physical devices or a suitable separate build machine.

## Q01. Baseline and visual acceptance

Before changing the shared theme, capture the current app using sanitized fixture accounts at the same data states and viewport sizes as the new design.

Required frame set:

| Journey | Required frames |
| --- | --- |
| Account/setup | Sign-in, signup stages, verification, recovery, goal, rhythm, review, failure |
| Home | First use, populated, sparse, draft, queued, partial query failure, all done |
| Check-in | Unanswered, populated, ruler/type interaction, validation, review, queued/synced receipt, backfill |
| Workout | Assigned entry, resumed draft, current set, keyboard, rest running/paused, overview, finish, queued |
| Shared | Sheet open/close, largest text, reduced transparency, both themes |

Use fictional fixtures rather than production client records. Record commit, build ID, platform, OS, viewport/device, font scale, theme, fixture, and screenshot path.

Acceptance means correct hierarchy, visible primary action, intentional grouping, legible labels, consistent alignment, no unsafe-area overlap, no keyboard obstruction, and no clipped names/values. Visual attractiveness is judged against the selected frame set, not a vague instruction to “make it premium.”

A mockup can validate composition. Only a running native build can validate gestures, focus, keyboard behavior, safe areas, haptics, and performance.

## Q02. Functional and persistence matrix

| Scenario | Required outcome |
| --- | --- |
| Slow first load | Appropriate stable loading state; available sections remain usable |
| Refresh failure with cached data | Retain data and show stale/retry status |
| Offline before first load | Explain unavailable remote content; allow recoverable local draft/queue access |
| Offline explicit save | Acknowledged durable submission intent; visible pending record |
| Online permission/auth/validation failure | Visible failure; preserve data; do not claim offline success |
| Kill after acknowledged draft write | Restore the same scope and values within the documented retention window |
| Kill before storage acknowledgment | Never previously label that edit saved; no impossible guarantee of recovery |
| Rapid submit taps | One in-flight submission per editor; no duplicate local queue intent |
| Edit while previous save completes | Newer generation survives acknowledgment and cleanup |
| Date/day change | Flush or deliberately discard current work before replacement |
| Midnight/travel | Active editor keeps original reporting date; Home refreshes its own date |
| Sign-out/account switch | No stale visible data or cross-account delivery |
| Local storage failure/corruption | Recoverable explanation; no silent empty-state substitution for unsaved work |
| Conflicting or multiple server rows | Inspect/choose/reload path; no silent arbitrary overwrite |

Existing draft expiry is three days for check-in and one day for workouts. Preserve and disclose those limits during initial refactoring; test restoration inside and outside the window. Queued submissions must not be discarded by draft expiry. A new retention policy is a separate explicit decision.

At-least-once retry is the practical network model. Local serialization and fetch-before-write reduce ordinary duplicates; they do not create server-side exactly-once delivery or solve concurrent edits from two devices.

## Q03. Automated verification

Run inside mobile:

~~~sh
npm run typecheck
npm run lint
npm test -- --runInBand
npm run verify:ui
npx expo install --check
~~~

Run an Expo bundle/export check on the installed SDK using documented project commands and an isolated output path. A JavaScript export is not a signed app or physical-device verification.

Prioritize behavioral tests:

- Profile patch preservation and onboarding error/milestone transitions.
- Date validation and calendar windows across UTC-negative, UTC-positive, DST, and leap-day cases.
- Check-in field/payload round-trip and first-invalid-field navigation.
- Draft ordering, scope changes, clear/save races, and acknowledged persistence.
- Outbox durability before network, supersession, permanent-error classification, and account isolation.
- Home action priority, independent query states, pending overlays, and honest date coverage.
- Workout initialization orders, explicit logId, completion state, copy/undo, and save generations.
- Absolute timer pause/resume/restart and exactly one local completion callback.
- Legacy and V2 content fixtures across mobile and the actual coach web consumers.

Do not substitute source-string assertions or blanket snapshots for these behaviors. Existing contract checks remain useful guardrails, but they are not proof of native quality.

Extend the existing Maestro flows for actual onboarding, Home-to-check-in, interrupted workout, backfill, queued receipt, and account boundaries. Use dedicated test accounts and reset fixtures. Record failures without entering credentials or health data into reports.

## Q04. Native accessibility matrix

| Configuration | Required tasks |
| --- | --- |
| Compact iPhone, default text | Setup, Home, full check-in, three-set workout |
| Notched/Dynamic-Island iPhone | Same tasks plus bottom dock/sheet geometry |
| iPhone at 200% text and largest practical accessibility setting | Inputs, errors, Review, timer, finish |
| Compact Android | Keyboard, hardware back, ratings, ruler vertical-scroll arbitration |
| Midrange Android | Full workout and long-history Home |
| TalkBack and VoiceOver | Complete each primary journey without sighted help |
| Reduced Motion | No forced scaling/parallax/spring travel; all feedback remains clear |
| Reduced Transparency / Increase Contrast | Solid readable controls, focus, and boundaries |
| 768-point-wide viewport/device | Centered readable content; no stretched forms |

Check target size, spacing, reading order, focus restoration, labels/states/values, announced errors, adjustable controls, chart alternatives, and every gesture equivalent. Use real service testing; screenshots cannot establish this.

## Q05. Performance budgets

These are initial acceptance targets to tune after a measured baseline. Report device, build mode, thermal state, fixture size, and measurement method.

| Measure | Initial target | Method |
| --- | --- | --- |
| Cached Home after auth is ready | Useful content and primary action within 1 second on the reference midrange device | Timestamp marks plus recording; exclude remote network waits explicitly |
| Cold launch | No more than 10% regression from measured baseline; investigate launches over 3 seconds on reference devices | Repeated cold launches, median/p95 |
| Touch acknowledgment | Visible feedback within 100 ms; normal goal is the next frame | High-frame-rate recording or native trace |
| Sustained interaction at 60 Hz | p95 application frame work below 16.7 ms in defined scroll/gesture tests | Native profiling on release-equivalent builds |
| ProMotion behavior | Inspect 120-Hz operation where available; 8.3-ms frame interval is a budget, not a guaranteed rate | Supported physical device; no universal 120-fps claim |
| Workout timer | Only timer-dependent views update each second | React/native profiling |
| Long histories | No full-history row mount or entrance replay; bounded visible rendering | Seeded 365- and 1,000-record fixtures |
| Memory | No sustained growth after ten repeated sheet/session open-close cycles | Before/after native memory observation |

Use platform profilers on an appropriate machine if necessary. Development mode, Expo Go timing, and simulator-only observations do not satisfy runtime-performance sign-off.

Keep gestures and continuous visual values on the UI runtime. Avoid per-frame React updates, full-screen blur animation, expensive chart work offscreen, or re-rendering the entire logger on timer ticks. Add a charting/rendering dependency only after profiling proves the existing approach inadequate.

## Q06. Trust, privacy, and content compatibility

### Progress photos

The checked-in storage setup declares a public progress_photos bucket, and the client creates permanent public URLs. The redesign does not resolve that by changing a disclosure.

Release dependency: privately scoped storage, owner/authorized-coach access, appropriate expiring access URLs, migration of existing references/objects, cache considerations, and two-account authorization tests. This requires separately scoped backend/storage work. No live exposure or remediation is asserted in this plan.

A UI feature gate can prevent new capture entry, but it does not remediate previously public objects. Do not mark the entire product privacy-ready solely because a button is hidden.

### Workout compatibility

The mobile writer uses a V2 JSON object; inspected coach-web consumers appear array-oriented. Validate the actual supported readers/editor with representative V2 and legacy fixtures.

If compatibility fails, the release gate remains closed until the web adapter is separately implemented and verified. Do not silently downgrade mobile data or discard completion/duration/plan-day metadata to make a legacy renderer appear functional.

### Account and local data

Retain account-scoped queries, drafts, queues, and timer state. Never flush account A's work with account B's session. Preserve unresolved work under its owner while removing it from another account's visible state.

Document what AsyncStorage contains; do not label it encrypted secure storage. Review local data retention and threat model before expanding storage. Do not place passwords, private API credentials, or service-role keys in bundled configuration.

## Q07. Observability and product measurement

Introduce a narrow event/crash adapter. Recommended provider evaluation: an Expo-compatible Sentry integration for sanitized errors/performance, with session replay, screenshots, form capture, and request/response bodies disabled. Provider setup and retention policy need a concrete configuration review before activation.

| Event | Allowed metadata |
| --- | --- |
| setup_stage_viewed / completed | Stage number, outcome, duration bucket |
| home_primary_action_selected | Action kind, data-state category |
| checkin_started / submitted | New/edit/backfill category, outcome, elapsed bucket |
| draft_write_result | Feature, success/failure category, latency |
| sync_result | Feature, retryable/permanent category, duration bucket |
| workout_resumed / finished | Outcome category, no exercise names or set values |
| ui_recovery_error | Sanitized code, app version, platform |

Exclude raw health values, notes, names, emails, exact reporting dates, credentials, photo URLs, request bodies, and full serialized app state. Use coarse task categories and short-lived anonymous session correlation where sufficient.

Initial operational alerts: reproducible lost-acknowledged-draft defect, cross-account state, repeated crash on primary route, elevated permanent sync failures, or substantial crash-free-session regression against the declared baseline. Exact service alert thresholds are configured after a baseline exists; no fictional threshold is treated as measured.

## Q08. Rollout and rollback

1. **Internal fixture build:** complete contract and device matrix with fictional/test data.
2. **Opt-in pilot:** small group of coached clients, both platforms, existing workflow available through the defined fallback build/flag.
3. **Expanded preview:** increase participation only after qualitative issues and critical defects are closed.
4. **Production release:** named sign-off for design, engineering, accessibility, backend compatibility, and privacy.

The current EXPO_PUBLIC_CHECKIN_SINGLE_SCROLL flag is build-time configuration, not a remote kill switch. Do not promise instantaneous production rollback. Use a known-good compatible build or an explicitly configured and tested update mechanism.

Any new presentation flags must affect only presentation, not the storage format or delivery rules. Switching a flag cannot erase a draft. Do not roll back a persistence fix by selecting the old visual treatment.

Store a release record per immutable build. Capture affected routes after any P0/P1 fix. Existing validation-matrix entries are never changed to Pass by this documentation work.

## Q09. Severity and exit gates

| Severity | Examples | Release treatment |
| --- | --- | --- |
| P0 | Cross-account data, public sensitive-data exposure, lost acknowledged submissions | Block release and investigate the whole affected data path |
| P1 | Primary task blocked, keyboard hides submit, draft loss after acknowledged write, incorrect saved state, unreadable coach record | Fix before release; rerun affected matrix |
| P2 | Recoverable secondary issue, inconsistent spacing, noncritical animation defect | Named owner and planned resolution; assess pilot impact |
| P3 | Cosmetic refinement with no comprehension/task effect | Prioritize after core gates |

Final sign-off requires: selected design frames, code checks, contract fixtures, physical iOS/Android runs, screen-reader runs, performance evidence, privacy/compatibility dependencies closed, and rollback rehearsal.

The release reviewer records actual results, not only checked boxes. The task is not complete because the screens look polished in a mockup.

# Daily-use refinement implementation plan

> **For agentic workers:** Use the approved design and scoped tasks below. Follow test-driven development for behavior changes and the dispatching-parallel-agents skill for independent screen domains. The controller owns shared inputs, integration and final verification.

**Goal:** Make daily entry faster, progress clearer and screen hierarchy quieter while preserving all collected data and recovery behavior.

**Architecture:** Refine existing Expo Router screens and components. Keep controller/storage contracts and native navigation intact; derive summaries from existing queries. Add small local presentation helpers where they keep screens understandable.

**Tech Stack:** Expo 57, React Native 0.86, React 19, TypeScript, existing Dawnage UI primitives, Jest and the fixture browser capture driver.

**Spec:** `mobile/docs/research/2026-09-24-ui-modernization/design-followup.md`, approved by the user with “yes do it”.

## Global constraints

- Every applicable daily check-in field remains required; incomplete drafts can still save. Workout performance remains conditional on training/cardio.
- No data schema, backend, dependency, navigation destination or authorization changes.
- Preserve missing-data gaps, source dates, decimal entry, explicit zero, selected reporting day, save/exit guards, outbox and undo behavior.
- Use existing Dawnage spacing, colors and native-control adapters. Keep at least existing 44/48 point targets and large-text reflow.
- Existing feature checkout contains earlier modernization work; preserve it and work in place. No commits, resets, publishing or server changes are needed.
- Unit/browser coverage does not establish native keyboard, material, assistive-technology or physical-device acceptance on this host.

## Task 1 — Check-in efficiency and recovery (controller)

**Files:** `src/features/checkin/CheckInEditorScreen.tsx`, `components/NumericEntry.tsx`, `components/NumericCommitProvider.tsx`, `components/PreviousValueButton.tsx`, `components/HistoryCaption.tsx`, `components/CheckInReceipt.tsx`, `src/components/ui/Input.tsx`, corresponding tests and `src/screens/__tests__/tabs/check-in.test.tsx`.

- [x] Add regression coverage: invalid numeric input has inline validation without Retry saving/Discard draft; a valid commit clears that numeric warning; actual failed persistence keeps recovery actions.
- [x] Extend numeric registration with optional focus behavior; Next commits the current field before moving, invalid text stays focused, last-field Done commits before dismissing. Keep registry identity stable.
- [x] Add inline unit adornments to Input/NumericEntry, short dated carry-forward actions and explicit expandable history details. Do not alter normalization bounds or automatic storage behavior.
- [x] Simplify completion heading/copy while retaining distinct synced/queued states and next actions.
- [x] Run the targeted numeric, form, editor, receipt and screen suites. Keep regression coverage for stale drafts and exit boundaries.

## Task 2 — Home hierarchy (Home owner)

**Files:** `app/(app)/(tabs)/index.tsx`, `src/features/home/TodayBrief.tsx`, `NextSessionCard.tsx`, `WeekRecordStrip.tsx`, a local progress-summary component/helper if useful, Home tests.

- [x] Compact header/action spacing and quiet static program metadata. Bring the weekly strip nearer to the main action.
- [x] Expose a small progress entry outside More details using existing ready check-in rows; show latest valid morning weight, source date and a supported comparison, with neutral direction wording. Treat stale/unavailable data honestly and do not create new requests.
- [x] Preserve next-action priority, recovery/welcome states, historical links and the grouped You screen.
- [x] Test source date/valid endpoints, absent data, stale presentation and correct progress navigation; verify existing Home tests.

## Task 3 — Progress presentation (Progress owner)

**Files:** `app/(app)/measurements.tsx`, `src/features/measurements/*`, `src/components/charts/LineChart.tsx` only where needed for configurable readout/legend, measurement/chart tests.

- [x] Default to one metric (Waist), with one headline value, source date and change; expose other metrics through the existing picker/choice components.
- [x] Add All/1M/3M/6M timeframe filtering using local calendar dates and existing observations. Keep gaps and source dates; timeframe comparisons must describe their endpoints truthfully.
- [x] Offer optional metric comparison without forcing all series on initially. Preserve date exploration, keyboard/accessibility equivalents and chronological values.
- [x] Remove repeated legends/summary values in the focused presentation while retaining configurable default chart behavior elsewhere.
- [x] Test selection, range boundaries, sparse/empty values, comparison and accessible history; run the existing measurement/chart suites.

## Task 4 — Workout and Nutrition hierarchy (Workout/Nutrition owner)

**Files:** `src/components/logger/CurrentSetEditor.tsx`, `RestDock.tsx` if needed, `src/features/nutrition/nutrition-screen.tsx`, local meal-detail helper if useful, existing related tests.

- [x] Put existing previous-set information/copy beside entry controls and above Complete set, preserving empty-field-only copy and Undo. Quiet static Target/Warm-up labels; shorten repeated guidance without losing necessary bodyweight instructions.
- [x] Keep active rest controls and visible Overview/Finish; settings remain in the existing Rest options surface.
- [x] Emphasize prescribed calories. Add accessible expandable meal details, always showing meal name/calories. Explain target/listed-meal differences with neutral prescribed-plan wording; never imply meals were consumed.
- [x] Test expansion, plan-total differences and missing values plus existing workout copy/undo/completion regressions.

## Task 5 — Integration, visual verification and review (controller)

- [x] Review scoped diffs against the pre-edit snapshot and resolve concrete integration defects.
- [x] Update browser journeys to exercise keyboard commit/focus, history, separated validation, meal expansion and metric/range selection. Assertions must retain full payload, persistence and chart date/gap checks.
- [x] Run `npm --prefix mobile run verify`; export fixture web bundle and, if the supported CLI completes, platform JS bundles. Native binary acceptance is separate.
- [x] Capture and inspect Home, check-in, workout, nutrition and progress in light/dark at 390 points, with compact 320-point samples. Use fictional intercepted data only.
- [x] Run a focused independent review, address findings, record exact evidence and remaining native limits in an implementation report.

## Progress

- Design approved; six-screen baseline and task journeys captured in `evidence/design-followup-audit`.
- Tasks 1–4 implemented. Check-in focused validation: 8 suites / 87 tests; Home: 5 / 56; Workout and Nutrition: 5 / 57; Progress and charts: 5 / 54.
- Independent review identified failed-submission recovery routing to draft persistence; a failing integration test reproduced it and the retry action is now explicit. Full source verification and fixture browser checks are complete, as recorded below.

- Final 390-point evidence covers six screens in both themes with 34 journey checks and no runtime errors (the existing react-native-svg DOM warning is retained separately). The full check-in path verifies every required value and submission payload.
- Compact checks exposed an editor sheet opening below its full scroll viewport. Editor sheets now open at their 95% detent; fixed-height and short-choice sheets keep their existing initial detent. The unchanged failing journey now passes at 320 × 720 and in both themes at 390 × 844; independent review found no index/focus/dismissal regression.

- Final browser verification: 17 base frames, 42 checkpoint frames, 51 passing journey checks, zero app runtime errors; the known SVG DOM warning remains explicit. Final TypeScript and full lint passed. The final complete Jest rerun passed all 146 suites / 1,141 tests, followed by UI contracts for 233 source files. The last changed hook-test mock also passed focused lint. Temporary browsers, fixture servers and raw development-bundle copies have been removed; the user’s Metro server remains running.

- Implementation and available verification complete. The first full-run mock failure was corrected by supplying the existing Text primitive in the hook-test double; assertions remain unchanged. Test and capture evidence is linked in `docs/research/2026-09-24-ui-modernization/daily-use-refinement.md`. Native acceptance and a fresh optimized export remain explicitly unverified on this host.

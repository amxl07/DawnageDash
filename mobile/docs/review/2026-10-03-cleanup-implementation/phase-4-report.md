# Phase 4 implementation report — completed in source 9 October 2026

Application changes are implemented. Controlled tests and Expo-web flows cover the changed state transitions; the native verification gate remains open. Final whole-app checks are recorded in `phase-5-report.md`.

## Changes

- Device drafts say “Draft saved on this device.” Account acknowledgments say “Saved.” Daily numeric input, newer edits over a prior receipt, queued delivery, local failure, and blocked sync retain distinct states. Phase 3’s synced-prior/blocked-newer precedence is preserved.
- Workout draft status uses the full width below the date/actions row. Receipt headings carry the current outcome without a second normal status pill. Incomplete/invalid set warnings and recovery actions remain.
- Weekly acknowledged submissions with failed draft removal use “Check-in sent,” a device-draft explanation, and Retry. Matching history recovery and cleanup retries retain their no-resubmission contract. Home uses “Remove sent check-in draft.”
- Confirmed reminder states show the requested time/day and switch without redundant normal captions or aggregate counts. Pending, unavailable, permission-denied, residual native schedules, and apply/storage errors retain explanations and recovery. Known-granted enabling bypasses both the pre-permission explanation and OS permission request. Unknown/denied permission retains the explanation.
- Email verification retains destination, resend cooldown, recovery, and the different-email consequence beside its action. Day 1 remains explained at the setup start choice and immediately before first submission with the actual check-in date. The practice guide explicitly says nothing is saved.
- Health disclosures retain optional read-only access, selected-day/source/partial-data context, selection and replacement choices, and sharing on submission. Weight and food-intake rules sit beside those fields. Access-management instructions match the platform. Existing null-field preselection and existing-value replacement safeguards are unchanged.
- Photo capture retains one upload/sharing/optional-angle disclosure and one alignment instruction. The repeated instruction lived in `PoseGuide.tsx`, so its text/imports were removed while retaining the overlay. Acknowledged photo references are tracked separately from uploaded objects: exiting after a successful partial retry states that saved photos stay saved and unsaved changes are discarded. No storage-object deletion is promised. Errors have one live visible explanation instead of an additional generic error pill.
- Nutrition has one prescribed target and one planned-meals total; exact matches omit redundant confirmation. Partial/missing calorie totals and real mismatches remain. All-absent macros collapse to one line; partial values and explicit zero remain distinct.
- Weekly reports retain their frozen actual date range once, with each prefilled field’s own recorded-day coverage. Missing observations stay blank. Repository schema declares one daily check-in per user/date; no live database or migration was touched.

## Historical verification record

All heavy checks run sequentially with browser work paused. The October 3 results below are the recorded historical results; their `/tmp/dawnage-cleanup-2026-10-03/` logs did not survive the session restart. October 9 continuation logs are persisted in `../2026-10-09-minimalist/verification/`.

- Initial Jest filesystem crawl stalled and was stopped. An incomplete CLI Haste override then removed the preset’s native platform resolution, causing Expo `window.addEventListener` setup errors before any tests. These are harness failures, not product RED results. The working override preserves `defaultPlatform: ios`, native platforms, and `forceNodeFilesystemAPI: true`; `--watchman=false` is also used.
- Behavioral RED: `phase4-red-native.log` — 3 failed / 41 passed tests across 3 suites. Expected failures: partial-photo exit denied acknowledged subset; known-authorized reminder still opened explanation instead of enabling; entirely missing meal macros repeated three absent values.
- First GREEN: `phase4-green.log` — 43 passed / 1 failed. All three behavioral changes passed; the remaining failure was the old photo-disclosure assertion, subsequently updated.
- Initial affected run: `phase4-affected.log` — 19 passed / 5 failed suites, 333 passed / 5 failed tests. Four suites had obsolete copy/status assertions, subsequently corrected without weakening retained-data/actions checks. Settings failed before tests after switching its delivery checks to the real selector without a native storage boundary mock; that harness mock is now supplied.
- The October 9 results below supersede the pending focused regression work.

## October 9 continuation

The source and existing regression tests survived the restart. Two pending correctness issues were reproduced and fixed: replacing the workout status pill with the receipt heading removed the explicit accessibility transition announcement; the weekly cleanup screen omitted the controller's failed-exit message. The targeted RED run reproduced both failures, followed by 46 passing tests across weekly feedback, workout summary and check-in receipt.

Independent review then found that today's queued-to-synced check-in remounted its receipt, preventing the new header transition effect from announcing. `CheckInCompletion` now keeps the receipt mounted and changes only its action slot; plan/profile reads still wait for acknowledgment. The wrapper-level regression failed first, then all 25 completion/receipt/workout tests passed. Initial mount and unchanged-state rerenders stay quiet. The heading owns live-region speech on web; native uses the transition announcement only when the separate status component is absent. Controlled tests do not establish actual VoiceOver/TalkBack behavior.

The first full continuation run passed 169 suites / 1,404 tests. The final run after the wrapper fix and last layout changes is recorded separately in the Phase 5 report and persisted verification logs. Source review closed all reported issues, including the collapsed nutrition notice's accessible name and web tab label positioning.

Real Expo-web fixture journeys completed daily submission, workout suggestions/steppers/Undo/partial save, weekly submission, measurement create/edit, and all ten assessment sections. No live account data was used. A setup journey exposed an unreachable practice confirmation; shortening the guide and using one 85% sheet detent fixed it. Setup then passed at 390 px and at 320 px with 1.4× browser text, with the no-save practice boundary and Day 1 decision retained. Photo editor/disclosure was exercised in the browser; upload/picker and permission outcomes use service/component fixtures, with actual devices still outstanding.

Logs and screenshots: `../2026-10-09-minimalist/`. Native tools are unavailable for this continuation; no native behavior is claimed from Jest or browser checks.

## Limits

No native permission prompt, notification delivery, HealthKit/Health Connect read, camera/library picker, native sheet dismissal, or native Dynamic Type was verified by this work. Jest uses controlled platform/service fixtures. Browser verification belongs to the coordinator and cannot establish those native behaviors. No dependencies, backend writes, migrations, deployment, stage, or commit were performed.

# Phase 1 — basic cleanup

Status: complete. Automated checks, independent review, and browser fixture comparisons passed; native-device limits remain recorded below.

## Changes
- Removed weekly service promises, redundant auth/setup/Home/hub/workout copy, the device-clock explanation and chart lazy-loading prose.
- Preserved current record and recovery behavior, workout controls, questionnaire IDs, useful rating/measurement instructions and all routes.
- Standardized Weekly check-in, Training history and View/Hide exercises labels. Replaced technical plate-input wording with plain units and minimums.
- Hid the confirmed-empty supplements content while retaining the existing loading, cached-content and error/retry surfaces. Error heading now identifies supplements too.
- Removed empty text spacing, including optional completion eyebrows and blank assessment descriptions. Signup now has a direct Create your account title.

## Evidence so far
- New nutrition behavior test RED: `phase-1-red.log`, 1 expected failure / 13 passes. The successful-empty state incorrectly rendered Supplements and Nothing has been prescribed yet.
- Focused Phase 1 tests: `phase-1-tests.log` (passed; final counts below).
- Browser fixture capture: `phase-1-screens/capture-manifest.json` and `phase-1-details/capture-manifest.json` (passed), before images remain in the September 30 audit.
- Initial typecheck and lint starts were stopped to run heavy checks sequentially under host memory pressure; they are not counted as passes.
- No deployment, live account write, git commit or unrelated file removal.

## Environment
Xcode is not installed (only CommandLineTools); simctl, adb and maestro are unavailable. Browser fixtures and component tests cannot verify native permission dialogs, health access, camera behavior or VoiceOver/TalkBack delivery. These remain explicit device-validation limits.

## Review
Root reviews directly where worker deployments are unavailable. Full change diff and file register are generated against the source snapshot taken before this cleanup, not against dirty branch HEAD.

## Review fix
The independent reviewer found that malformed JSON and non-array supplement payloads were previously folded into an empty array. Added a pure parse-result boundary and visible Retry supplements action for invalid prescriptions. Existing array accessor remains exported for compatibility; optional instruction fields and missing IDs remain supported.

- Initial affected-flow test group: **14 suites / 160 tests passed**, `phase-1-tests.log`.
- Malformed JSON / non-array / invalid element RED: **3 expected failures / 14 passes**, `phase-1-parse-red.log`.
- Focused GREEN and sequential typecheck/lint passed; see `phase-1-parse-green.log`, `phase-1-typecheck.log`, `phase-1-lint.log`.
- Re-review diff: `phase-1-supplements-fix.diff`.

## Automated and source review results
- Focused malformed-payload GREEN: **17/17 passed**, real parser exercised through the screen.
- Mobile typecheck: **passed**.
- Mobile lint: **passed with 9 pre-existing require-import warnings in health/native-surface tests**. Fixed the earlier audit capture script’s missing explicit Buffer import; no product behavior changed by that check fix.
- Independent source re-review: **approved**, required finding resolved, no new required findings (`phase-1-review.md`).
- Current source snapshot and diff: `phase-1-source.json`, `phase-1.diff`; `/tmp/dawnage-cleanup-2026-10-03/phase-1-snapshot`.
- Browser capture completed after automated checks; visual results below.

## Visual exit
- Main 10 screens captured at 390px, light theme, fixed fixture/date. All five before/after comparison sheets inspected: Home/signup, setup goal/rhythm, hub/workout, nutrition/You, Profile/weekly. No new clipping observed in these frames.
- Inspected workout completion, overview, partial review, expanded rest controls and all ten assessment section top frames. Useful inputs, units, Undo, suggestions, steppers, unfinished-set warnings and rest controls remain.
- Both capture processes exited 0; all 12 main capture records report no errors. Browser-only React Native SVG accessible-attribute warnings remain; accessibility props were retained.
- All ten assessment sections were visited. Existing section chooser reachability for the final two remains a Phase 2 repair; the fixture journey used Save & continue. Below-fold duplicate scroll captures are not evidence of complete scroll coverage.
- Fixture writes were intercepted; no live account was changed.

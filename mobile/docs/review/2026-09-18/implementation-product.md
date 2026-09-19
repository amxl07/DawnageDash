# Plans, measurements and weekly feedback implementation

Implemented 19 September 2026 against the accepted review and the source snapshot captured before implementation. Changes are confined to Task 2; no Git mutations, live database writes, new dependencies or visual redesign were performed.

## Changes

- **Canonical measurements:** `useDashboardData.ts` now contains the canonical daily-check-in query and a compatibility alias to the existing newest-first `useMeasurements` query. The unused dashboard aggregations and Home measurement subscription/refetch are removed. Measurements and weekly feedback request daily records directly. Existing `useDailyCheckIns` import paths remain valid.
- **Plans:** The page heading and Training/Nutrition switch stay mounted during loading and partial failures. Profile, workout-plan, training-history and meal-plan errors have their own retry actions with distinct visible and accessible names, including simultaneous failures. Cached plans and meals remain readable after refresh failures. A successful empty result is distinguished from an initial request failure. Templates are labeled as previews, retain prescription/details access, and offer no unsupported logger Start action or coach-assignment attribution. Template progress is neutral. Assigned user plans retain their existing start behavior.
- **Measurement editing:** An opened entry captures its prefill, comparison and local reporting date once. Background refetches no longer overwrite entered values or change the “last” comparison. Reopening receives the newest data. The editor resets with account identity, and an asynchronous save from an unmounted/closed session cannot close or announce success in a different session. Weight/waist metrics use signed, neutral “change” labels; the existing recorded-week average is labeled “Per recorded week.”
- **Weekly reporting:** `features/weekly/selectors.ts` defines Monday through today using the app’s existing device-local calendar-date convention. It excludes older/future records, averages observed finite values separately for steps/water/stress, retains observed zero where valid and leaves an unobserved field blank. The form discloses its reporting window, per-field observation counts and every distinct actual observation date, including sparse dates. Starting a flow captures the reporting date, prefill and observation sources; optional backward-compatible draft metadata preserves them across midnight, backgrounding and restart. Submission writes the captured Monday to the existing `week_start_date` column. Undated legacy drafts retain all answers and explicitly disclose that their original reporting dates were not stored; their displayed review window is marked as inferred. Daily-record refresh failures have a dedicated retry without replacing answers.
- **Weekly structure:** Reporting selectors, account-scoped history, labeled history presentation and draft/submission orchestration are extracted from the route. History uses the existing question definitions and display units. Existing validation, account ownership, asynchronous identity guards, accessibility focus, draft autosave, save/discard exit protection, and submitted-but-local-cleanup-pending behavior are retained.
- **Home weekly access:** A restrained weekly row resumes a saved account-owned draft or offers a new reflection when current history confirms no submission this calendar week. Unknown/stale absence does not produce a new-start invitation. Confirmed history and any remaining draft are resolved together: matching saved answers expose local-cleanup recovery, divergent same-week answers expose protected review, and submitted history without a draft suppresses a new invitation. Neither recovery state allows another insert. Reconciliation considers only the draft’s displayed reporting week: same-week exact answers enter cleanup, same-week divergent answers enter review, and older matching answers cannot identify an undated legacy draft as submitted. This uses confirmed history without inventing a completion flag. Draft discovery is read-only, and an unreadable weekly draft does not block unrelated daily/workout recovery records.

## Source inventory

Routes: `app/(app)/(tabs)/plans.tsx`, `app/(app)/(tabs)/index.tsx`, `app/(app)/measurements.tsx`, `app/(app)/weekly-feedback.tsx`.

Shared queries/components: `src/hooks/useDashboardData.ts`, `src/hooks/useWeeklyFeedbackDraft.ts`, `src/lib/weekly-feedback.ts`, `src/components/ui/ErrorState.tsx`, `src/components/plans/PlanDayCard.tsx`, `src/components/measurements/MeasurementSheet.tsx`, `src/components/weekly/steps.ts`.

Home: `src/features/home/useHomeData.ts`, `useHomeLocal.ts`, `types.ts`, and new `WeeklyReflection.tsx`.

New weekly modules: `src/features/weekly/selectors.ts`, `useWeeklyFeedbackHistory.ts`, `readWeeklyDraft.ts`, `WeeklyFeedbackHistoryCard.tsx`, `useWeeklyFeedbackController.ts`.

Regressions cover Plans, PlanDayCard, MeasurementSheet, Measurements, the installed QueryClient cache, weekly feedback, Home, weekly selectors and read-only draft discovery.

## Verification evidence

| Check | Observed result |
| --- | --- |
| Existing installed-QueryClient reproduction from the accepted review | Used as the witnessed RED baseline for canonicalizing measurements; the newly added real-QueryClient shared-cache regression passed after that fix. |
| First focused Jest batch | Five intended failures: four Plans error/provenance cases and MeasurementSheet overwriting `82.5` with refreshed `85`. Nine tests passed. The weekly suite also exposed an import-path typo during migration; that typo was corrected before the second batch. [Log](evidence/product-regressions-red.log). |
| Actual pre-change weekly autofill body executed through TypeScript transpilation and Node assertions | RED: dated sparse fixture produced `2500` steps instead of `8000` (and diluted water/stress). No backend or real account data was used. [Log](evidence/weekly-autofill-baseline-red.log). |
| Production weekly selectors through standalone Node assertions | GREEN: 12 assertions covering Monday/Sunday/year boundaries, sparse/null/zero values, sample counts/date labels and submitted-week detection. [Log](evidence/weekly-selectors-green.log). |
| Second focused Jest batch | Five intended remaining failures: neutral metric labels, three Home weekly-action cases, and unlabeled weekly history. **51 tests passed**, including dated weekly autofill/calendar/null/zero regressions and existing weekly draft, exit, account and cleanup protection tests after controller extraction. The five failed behaviors were then implemented. [Log](evidence/product-weekly-home-red.log). |
| Focused syntax parsing | Fourteen owned production modules parsed successfully using TypeScript transpilation. This was a syntax check, not a whole-project typecheck. |
| Review round 1 focused Jest RED | Nine intended failures covering weekly rollover/date persistence, confirmed-history cleanup and divergent recovery (including newer edits while submitting), sparse observation dates, and distinct Plans retry names; 54 tests passed. [Log](evidence/product-review-round1-red.log). |
| Draft report normalization RED → GREEN | Standalone assertions against production TypeScript first reproduced discarded report identity, then confirmed the original dated report survives normalization. [RED](evidence/weekly-report-normalizer-red.log), [GREEN](evidence/weekly-report-normalizer-green.log). |
| Review round 1 final focused Jest GREEN | **6 suites / 92 tests passed**, exit 0, 9.911 seconds. Weekly route, Home, Plans, weekly selectors, draft storage hook and draft normalization. Includes Sunday→Monday rollover, older-week restart, legacy-date provenance, exact cleanup-only recovery, divergent retained answers, newer in-flight edits, explicit discard confirmation/failure, snapshot persistence, sparse dates and simultaneous accessible retry actions. [Log](evidence/product-review-round1-green.log). |
| Review round 2 reconciliation RED → GREEN | Six standalone assertions against production selectors reproduced then fixed the cross-week legacy ordering defect: with and without inferred metadata, a current divergent report wins over older exact answers, a current exact report uses the current identity, and older exact answers alone leave the draft editable. No historical identity is inferred from repeated answers. [RED](evidence/weekly-reconciliation-round2-red.log), [GREEN](evidence/weekly-reconciliation-round2-green.log). |
| Review round 2 focused Jest GREEN | **4 suites / 64 tests passed**, exit 0, 139.29 seconds (filesystem startup dominated runtime): Home, weekly route, selectors and read-only draft discovery. The six new selector cases and both AsyncStorage-backed reader tests passed. The fixture typing correction is included; whole-project TypeScript remains in the integration owner’s checks. The batch completed before an attempted stop to hand off to the final full run. [Log](evidence/product-review-round2-green.log). |
| Final integrated checks | Delegated to the root integration run after dependency installation and the source freeze. Its final results supersede this interim task report; this report does not claim a final Jest/typecheck/lint pass before those results exist. |

Focused GREEN paths for integration:

```text
src/screens/__tests__/tabs/plans.test.tsx
src/components/plans/PlanDayCard.test.tsx
src/components/measurements/MeasurementSheet.test.tsx
src/screens/__tests__/measurements.test.tsx
src/hooks/measurement-cache.test.tsx
src/screens/__tests__/weekly-feedback.test.tsx
src/screens/__tests__/tabs/index.test.tsx
src/features/weekly/selectors.test.ts
src/features/weekly/readWeeklyDraft.test.ts
src/hooks/useWeeklyFeedbackDraft.test.ts
src/lib/weekly-feedback.test.ts
```

## Scope and remaining validation

“Ready for a weekly reflection” means no known submission for the current local calendar week; no new coach deadline, reminder schedule or backend uniqueness rule was introduced. Draft storage gained optional reporting metadata while preserving old answer/step formats. Existing history with a valid `week_start_date` uses it; older rows fall back to the device-local submission date. Undated legacy drafts cannot recover unknown historical provenance and show a date-review disclosure rather than imply their assigned review window is the original week.

Confirmed-history recovery never automatically deletes a divergent draft. Both the saved draft and submitted answers remain readable; the user can keep the draft or deliberately confirm local discard. Failed cleanup retains the draft. Edits made while an earlier snapshot is submitting are kept and saved as a protected conflicting draft. Submission waits for history to load successfully before checking known conflicts. These are client protections for known history, not a backend uniqueness guarantee against simultaneous submissions on other devices. Undated legacy drafts with only an older matching report remain editable, retaining their explicit original-date disclosure. The read-only draft test now imports the official AsyncStorage Jest mock locally; no production reader behavior changed. The weekly route history fixture uses the nullable `WeeklyCheckIn` date schema so reporting-week strings remain valid test data.

No physical-device, live-account, native-keyboard or fresh visual evidence was obtained in this task. The existing InteractionManager deprecation warning appeared in the Measurements screen suite; chart scheduling was outside this change. Native/network/refetch journeys remain part of the root release-validation handoff.


## Final coordinated persistence fix wave

The final whole-change review identified two remaining asynchronous persistence gaps. This wave changes only `src/components/measurements/MeasurementSheet.tsx` and `src/hooks/useProgressPhotos.ts` in production, with focused regressions in `MeasurementSheet.test.tsx`, `PhotoCaptureSheet.test.tsx`, and new `src/hooks/useProgressPhotos.test.tsx`. Existing photo signing/import cleanup remains intact; no manifests, SQL, dependencies or backend state changed.

- Measurement saving now captures the edit revision and uses a synchronous component-wide in-flight flag shared by keyboard and button submission that survives close/reopen, alongside per-session revision checks. The form keeps later edits visible when an older snapshot is acknowledged, explains that those latest changes still need saving, and invokes no success/close callback for that older snapshot. A later explicit save sends the newer values. The existing session guard continues to ignore completion after close/reopen/unmount; failures keep entered values available for retry.
- Photo updates and inserts now request `id,user_id` in the returned representation. Success requires a nonempty row ID and the requested owner; updates also require the exact ID found by the lookup. Missing, zero-row or mismatched acknowledgement rejects persistence so the capture sheet retains its existing exact-reference retry payload. The capture-sheet implementation itself did not change.

The installed-Jest RED batch reproduced **12 intended failures / 22 passes**, exit 1, 201.036 seconds: older measurement success discarded newer intent, repeated keyboard/button saves issued three mutations, photo writes did not request/validate a returned owned row, and the real capture integration closed after a zero-row response. [RED log](evidence/product-final-fix-red.log).

The photo tests use the installed PostgREST client with an injected fetch implementation and the real React Query mutation hook. They cover update/insert acknowledgement and assert outgoing representation requests, owner/ID filters and canonical payloads. The capture integration feeds a real zero-row acknowledgement through that hook, then confirms exact payload retention and successful retry with only one upload. Deferred measurement tests cover newer revisions, duplicate submissions and reopen recovery alongside existing failure/refetch checks. The initial final-wave GREEN run passed **3 suites / 34 tests**, exit 0, 278.099 seconds. [GREEN log](evidence/product-final-fix-green.log). Full lint, TypeScript, export and device outcomes remain with the root handoff.

The scoped review then identified that resetting only a session flag allowed another same-date write after closing/reopening while the original write was pending. The reopen regression was extended to submit before resolving the old request: **RED, 1 failed / 5 passed**, because two mutations were issued instead of one. [RED log](evidence/product-final-reopen-red.log). A component-wide in-flight ref now remains set through visible-session resets and is released only by the pending operation’s `finally`; existing session/revision guards remain intact. The amended MeasurementSheet-only GREEN run passed **6 / 6 tests**, exit 0, 254.269 seconds. [GREEN log](evidence/product-final-reopen-green.log). No further source changes followed that run. The earlier 34-test run covers the unchanged photo mutation/capture integration, while this final rerun covers the amended measurement guard. Lint, whole-project TypeScript and export outcomes are supplied by the root integration run; the redundant local lint process was stopped at that owner’s request without claiming a lint result here.


## Final integration handoff

The final source passed TypeScript, lint and iOS/Android/web export. The full mobile suite passed before the final persistence corrections; the affected regressions and reopening amendment then passed. The [release verification report](../../release/evidence/2026-09-19/README.md) supersedes earlier pending integration statements here and records precise scope, overlapping counts and external gates. No live migration or native-device validation is implied.

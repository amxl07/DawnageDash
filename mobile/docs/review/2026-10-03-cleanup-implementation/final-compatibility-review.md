# Final Phase 2 compatibility review

Reviewed 2026-10-03, read-only on application and test source, while Phase 4 work proceeded separately. Comparison is the frozen Phase 1-relative `phase-2.diff`, current source, and the preserved original baseline; **not git HEAD**. Read the approved Phase 2 plan/brief, storage decisions, implementation report and initial/follow-up independent review. No tests, builds, browser sessions, git mutations, native sessions or live-database operations were run for this review.

## Current source decision

**Spec compliance: PASS. Code quality: PASS. Open source findings: 0.** Scoped independent re-review approved both fixes and the maskless legacy fallback. Root reran both affected mobile suites: 43/43 tests passed (exit 0, 4.324 seconds). Final web/static checks remain separate gates. Earlier findings below are retained as review history and are addressed in current source.

## Original verdict at review time

- **Spec compliance: changes required.** Most compatibility requirements are met, but the remaining recovery path can broaden a narrow edit into unrelated overwrites, and completed readback can present unaccepted Profile suggestions as assessment answers.
- **Code quality: changes required.** Shared catalog/persistence helpers are appropriately small and bounded. The two integration paths below need corrections and focused regression coverage before final acceptance. The earlier web TDZ and initial recovery-hydration findings remain fixed.

## Required findings

### P1 — Discard bypasses narrow recovery restoration and can overwrite newer unrelated facts

**Location:** `mobile/app/(app)/profile.tsx:307`; downstream patch construction at lines 226–232.

Reproduction: a prepared goal-only journal records `goal = New goal`, with old phone/injury in its full form snapshot and only goal/q14 in its masks. The initial users save failed. Another device changes phone/injury. Remount correctly hydrates the recovered goal over the newer canonical phone/injury. Press Back, then Discard in the first dialog, then Retry save in the pending-save dialog. The Discard callback restores `recoveryRef.current.form` wholesale, reintroducing old phone/injury. Retry compares that snapshot with `restoreProfileForm(baseline, pendingIntent)` and treats the old unrelated values as new explicit edits. The users and assessment CAS helpers consequently overwrite newer phone/injury with those old values.

The first Discard dialog can appear even without another edit after remount: prepared recovery is dirty, and the correctly hydrated form differs from the stale journal snapshot. Choosing Stay after Discard and later saving has the same consequence. The existing full-form Discard line predates cleanup, but its interaction with newly introduced narrow journal ownership is an introduced compatibility gap; legacy full-intent restoration was the former policy.

Use the same `restoreProfileForm` ownership rule in Discard as in hydration/retry, overlaying the pending intent on the canonical baseline. Preserve the maskless legacy fallback. Cover prepared recovery with unrelated remote scalar and overlap changes followed by Discard → Retry; assert the narrow journal, users payload and assessment payload retain unrelated new facts.

### P2 — Completed summaries display Profile suggestions that were never accepted as assessment answers

**Locations:** `mobile/src/components/questionnaire/QuestionnaireWizard.tsx:118` and `client/src/components/QuestionnaireWizard.tsx:61`, followed by their summary branches.

Reproduction: load a completed legacy assessment with all six required answers and all ten completion-history IDs, but no optional q56. The Profile has `profile_data.injuries = Knee pain`. Both loaders put `suggestProfileAnswers(parsed, profile)` into the same answers state passed to the summary, then immediately open that summary based on the persisted record's completion. The summary shows Knee pain as a current assessment answer although the user never entered the editor, reviewed it or saved it. Before Phase 2 the summary received only stored assessment answers.

This also affects the existing web coach-view summary for incomplete records (`QuestionnaireWizard.tsx:243–247`), since that branch always passes the merged answers to readback. It violates the binding distinction between reviewable editable initial values and stored answers. Keep readback based on the acknowledged record; apply suggestions when entering the editor, or otherwise keep persisted and suggested values distinct. Cover a completed record with a missing optional overlap and a corresponding Profile fact; its summary must omit the suggestion until it is accepted and acknowledged. Loading alone does not write the database; the defect is inaccurate readback.

## Other reviewed contracts

- Immutable original catalog matches the preserved original baseline byte-for-byte (`cmp` exited 0). Both existing library entry points re-export the shared contract. Unchanged IDs retain original labels; new meanings use distinct IDs. The version marker does not select historical labels or downgrade a higher numeric writer version.
- Conditional parents, active/current versus earlier readback, zero presence, required whitespace rejection, preserved hidden drafts, completion-history retention and current-valid completion are shared by mobile/web/Home. Unknown metadata/objects remain in storage without becoming question rows.
- Assessment writes read latest, merge changed fields, compare original answer/progress columns, check returned acknowledgments and bound retries. New stable user UUID insert IDs leave existing IDs intact. Profile remains assessment-update-only. Users writes preserve unrelated JSONB/scalars and check receipts.
- Reviewed mobile recovery journal serialization, account guards and originating-account receipt handling; web Profile fail-closed reads and explicit-empty precedence; mobile/web wizard validation, save and summary paths; shared Profile suggestions and Profile overlap readback.
- Suggestions do not copy weight, height or body measurements from observations. Intake measurements retain their existing IDs/units and are not inserted as new dated measurements. The ambiguous waist distance remains an accepted unresolved content dependency, with no invented protocol.

## Evidence and scope limits

The Phase 2 implementation report supplies passing affected tests/static checks/builds, mobile-web journeys and 11 actual-web-wizard fixture checks. Those results were read, not rerun or independently certified here. Neither those fixture results nor this source review establishes native iOS/Android behavior or real PostgREST/RLS/concurrent-write behavior. **No native or live DB validation is claimed.**

Unchanged application capabilities, stricter numeric/domain validation beyond the approved required-presence contract, migration/database schema changes, and broader web/native redesign are outside this review. No additional pre-existing issue is promoted to a cleanup finding. This report records the source as reviewed; root owns fixes and subsequent acceptance evidence.

## Scoped correction re-review — 2026-10-03

This addendum supersedes the changes-required source verdict above for the two reported findings. **Spec compliance: PASS for the scoped corrections. Code quality: PASS for the scoped corrections.** No remaining required issue identified in these changes. Runtime validation remains separately coordinator-owned and pending at this re-review; this is not a claim that the currently running suites/browser checks have passed.

**P1 addressed:** `requestExit` now compares the editor with `restoreProfileForm(baseline.current, recovery)` rather than the full stale journal snapshot. The Discard callback restores through that same helper and derives dirty state against the acknowledged baseline. A recovered narrow intent with no newer edits proceeds directly to the pending-save dialog; discarding a subsequent phone edit retains canonical phone/injury and the pending goal. Existing helper behavior still returns the full journal form for a prepared legacy journal lacking masks, so its approved full-intent fallback is preserved. The two added parameterized regressions exercise both exit paths and assert newer phone/injury values, omitted scalar phone writes, preserved unrelated JSON data, the assessment payload and journal clearance.

**P2 addressed:** mobile summaries receive `acknowledged.current`; web summaries, including the existing read-only coach-view branch, receive `baseline.current`. These refs are loaded from persisted assessment answers and replaced only after successful acknowledgment. Editor state retains suggestions, so the correction preserves the authorized review/edit behavior. The new mobile regression checks the summary receives exactly the stored answer object, including historical/unknown values, and asserts no insert/update on load. The browser fixture adds completed-client and incomplete read-only remount paths that check suggested injuries are absent and no write occurs.

The coordinator reports three expected failing regressions before the correction. This reviewer inspected current application changes, new regression assertions and browser-fixture extensions without running tests, builds or browser sessions. Full two-suite GREEN verification and web RED/GREEN browser evidence were still running or scheduled when this addendum was written. Native/live-database limitations above remain unchanged.

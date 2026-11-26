# Phase 2 independent review

Reviewed 2026-10-03 against the frozen Phase 1 comparison in `phase-2.diff`, the Phase 2 brief, question mapping, storage design and additional coordinator rulings. Implementation authorization supersedes the older planning-only sentence.

## Verdicts

- **Spec compliance: changes required.** The reduced catalog, historical readback, conditional visibility and completion-history separation largely implement the agreed contract, but the web Continue/Finish path is broken and prepared mobile Profile recovery can overwrite unrelated newer values.
- **Code quality: changes required.** Shared pure catalog and persistence helpers use sensible bounded compare-and-swap and receipt checks. Two concrete correctness defects below must be resolved before this phase is accepted. The existing supplied tests do not cover these paths sufficiently.

## Required findings

### P1 — Web Continue/Finish calls its own uninitialized local variable

**File:** `client/src/components/QuestionnaireWizard.tsx:89`

`const missingRequired = missingRequired(currentSection, answers)` declares a local with the same name as the imported function. The right-hand reference resolves to that local in its temporal dead zone. Every Continue/Finish click throws before validation or `saveProgress(true)`, regardless of whether the answers are valid. Save draft does not exercise this branch, and the supplied web summary SSR checks cannot detect it. Rename the local (or alias the import) and verify the actual web advance path, including a missing-required case and successful save/advance. This is independently confirmed in the current source, not only the packaged diff.

### P1 — Prepared Profile recovery rebuilds narrow intent from a stale full form

**File:** `mobile/app/(app)/profile.tsx:219` (restoration at lines 163–167)

For a prepared journal, hydration restores `restored.form` wholesale while assigning the latest canonical form to `baseline.current`. On retry, line 219 discards the journal's saved `assessmentPatch`, `profileDataPatch` and `profileFieldsPatch` and reconstructs them by comparing that latest baseline against the old full snapshot.

Concrete trigger: save a goal-only edit; let the users write fail so the journal remains prepared; unmount; change phone and injury on another device; remount and retry the recovered goal. The restored snapshot still contains the original phone/injury, while the new baseline contains the newer values. The regenerated patches therefore include the old phone/injury as if the user had edited them, and the CAS helpers successfully overwrite those newer values. CAS protects concurrent changes during the retry, but cannot correct this broadened intent. This violates the binding requirement that the durable journal retain narrow intent across retry/remount.

Preserve the journal patches, combining only genuine edits made after restoration, or construct the restored form by applying the narrow intent onto the latest canonical form before establishing the editor baseline. Legacy journals without patches can retain the approved full-intent fallback. Cover a prepared goal-only journal with newer unrelated scalar and overlap values across remount/retry. Also hydrate untouched overlap fields from canonical data for the profile-saved recovery path rather than displaying stale full-form values.

## Reviewed coverage and positive findings

Read all 3,524 lines of the supplied diff in segments; explicitly reread the region whose tool output was truncated. Reviewed all 28 listed source/test/fixture changes, with current-source follow-up on the wizard and Profile persistence/restoration paths. Fixture scripts are QA helpers, not product behavior. No application edits, git mutations, tests, builds or browser execution were performed for this review.

- Both clients share the catalog through their existing import entry points. Original IDs and labels remain available independently of writer version; combined meanings use new IDs. The mapping retains all ten section IDs, six required questions and the four Profile overlap IDs.
- Active selection and pure parent visibility implement the 61-question maximum / 49-question base path. Hidden values remain in storage and are classified separately in summaries. No historical child answer implicitly answers a new parent.
- Current valid completion derives from relevant required answers and known section IDs, separately from stored completion history. Zero survives presence checks and whitespace does not satisfy required fields. Home and both summaries consume the shared calculation.
- Assessment saves merge narrow patches into freshly read data, preserve unknown keys/history, use bounded conditional updates and verify receipts. Stable user UUID insert IDs handle simultaneous first saves without changing legacy row IDs. Profile remains update-only for assessment records.
- Users updates compare JSONB and changed scalars, preserve unrelated keys, and verify the returned row. The mobile origin-account callback can retain a confirmed receipt without issuing further network writes or updating the new account UI.
- Rating readback uses historical descriptions, including inherited q83–q86 endpoints. Input guidance removes the ambiguous waist distance without inventing a protocol. The clean wizard state has no generic save hint; dirty state says “Unsaved changes.”
- The reviewed diff adds no routes, coach/messaging/voice/AI features or production migration and does not alter unrelated workout/check-in behavior.

## Evidence limits and remaining verification

- The coordinator reports the affected tests are green and the browser journey reached all ten chooser destinations, restored a hidden follow-up through save/reload/Yes, saved all sections and displayed mixed history. These are supplied results, not independently rerun or screenshot-certified here. The browser fixture journey targets mobile web; it does not demonstrate the separate client web wizard's Continue handler.
- Final mobile typecheck/lint, root check/build and final screenshot review remain coordinator-owned. This review does not certify their outcomes; the implementation report still lists final checks as pending.
- Prepared recovery with a narrow patch plus newer unrelated scalar/overlap changes after remount is not established by the supplied tests. Existing remount coverage chiefly checks the profile-saved stage or legacy full-intent prepared journals.
- Actual PostgREST/database concurrency, RLS, acknowledgment behavior and simultaneous insert collisions are exercised with mocks/fixtures in supplied evidence, not a real database. No live-data verification was requested or performed.
- Native iOS/Android runtime, accessibility interaction and device-sized section chooser behavior are unverified by this review. The supplied browser evidence alone does not establish those native results.
- An approved precise waist-measurement protocol remains the explicitly allowed unresolved content dependency.

Acceptance requires resolving both P1 findings and completing the coordinator's outstanding checks. Other observations above describe reviewed implementation or evidence limits, not additional product scope.

## Fix round 1 re-review — 2026-10-03

This addendum supersedes the original changes-required verdict for the reviewed source. Reviewed all 498 lines of `phase-2-fix-1.diff` across its seven files, rereading the truncated browser-helper region, plus the updated implementation report and supplied web manifest/log evidence. Scope was the two findings and regressions introduced by these fixes; no tests, builds or browser journeys were rerun.

- **Spec compliance: PASS for the scoped fixes.** Both original P1 findings are addressed, including untouched-field hydration for profile-saved recovery. No remaining required source changes identified in this fix diff.
- **Code quality: PASS for the scoped fixes.** The validation rename is minimal; recovery now applies explicit journal ownership consistently during hydration, retry construction and acknowledgment baseline updates. Added regression coverage exercises the reported failure paths rather than merely duplicating helper implementation.

### Original finding 1 — ADDRESSED

`client/src/components/QuestionnaireWizard.tsx` stores helper output in `requiredMissing`, so the imported `missingRequired` function is callable. The new browser fixture imports the actual web component and substitutes only authentication, toast and database boundaries. Supplied evidence reproduces the original TDZ failure against the frozen reviewed component, then reports 11 passing checks and no runtime exceptions for the corrected component. Those checks include missing-required validation, three rejected acknowledgment attempts without navigation, successful advancement through the sections and confirmed final completion with historical/unknown values preserved.

### Original finding 2 — ADDRESSED

`restoreProfileForm` overlays only journal-owned fields onto the canonical form for prepared recovery. Retry construction retains the original recorded patches and merges subsequent explicit edits relative to the restored intent, preventing unrelated remote changes from becoming unintended writes. The explicit-undo regression verifies that a user can still reverse a recovered edit. The acknowledged baseline uses the same restoration rule.

For profile-saved recovery, only keys in the pending assessment patch override canonical overlap values. Newer unrelated injuries/allergies therefore remain visible instead of being replaced by stale full-form values. Legacy journals without patch masks retain the approved full-intent fallback. The added prepared-remount test checks preserved newer phone/injury and unrelated JSON values; the profile-saved test checks untouched overlap hydration. Supplied evidence reports the relevant regressions failing before the correction and the full 45-test Profile/recovery/wizard set passing afterward.

### Other fix changes and remaining evidence boundaries

The `Array.from(new Set(...))` change preserves completion-history deduplication while accommodating the root TypeScript target. The coordinator reports root TypeScript checking passed. The added browser scripts are fixture-only; they do not introduce product features or live backend writes.

No new required issues were found. Final remaining mobile static/build checks and screenshot acceptance remain coordinator-owned; this addendum does not certify checks still running or independently validate screenshots. Native-runtime, live PostgREST/RLS/concurrency and waist-protocol limits from the original review remain. The previous gaps concerning actual web Continue/Finish interaction and narrow recovery remount coverage are closed by the supplied new evidence.

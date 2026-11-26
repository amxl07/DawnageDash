# Phase 2 implementation report

Status: **DONE_WITH_CONCERNS** — implementation, all required checks and independent re-review passed. The accepted remaining content dependency is an approved precise waist-measurement protocol; the ambiguous distance was not invented or reused in active guidance.

## Final check ledger

| Check | Result |
|---|---|
| Affected mobile tests (eight suites) | **68 passed, 0 failed** |
| Actual web summary SSR | **2 passed, 0 failed** |
| Mobile typecheck after recovery fixes | **Passed** |
| Mobile lint | **Passed**: 0 errors, 9 pre-existing require-import warnings |
| Root `npm run check` | **Passed** |
| Root `npm run build` | **Passed**, 3,881 modules; Browserslist/PostCSS warnings only |
| Mobile browser assessment workflow | **Passed**: all ten destinations, hidden draft recovery, saves and mixed history |
| Actual web wizard browser workflow | **11 checks passed**, 0 runtime errors |
| Scoped independent re-review | **Spec and quality passed**, both P1 findings resolved |
| Immutable original catalog comparison | **Passed** |

Final affected-suite command:

```sh
npm --prefix mobile test -- --watchman=false --runTestsByPath src/screens/__tests__/profile.test.tsx src/components/questionnaire/QuestionnaireWizard.test.tsx src/lib/profile-save.test.ts src/lib/questionnaire-contract.test.ts src/lib/assessment-save.test.ts src/features/profile/profileSaveRecovery.test.ts src/features/home/useHomeData.test.tsx src/lib/profile-data.test.ts
```

The added explicit-undo regression also passed: changing a recovered goal back to its original value overrides the pending patch correctly. Prior failures and intermediate pending notes below are historical development evidence, not unresolved findings. The only accepted content dependency is the unavailable precise waist protocol; no distance was invented.

## Contract and compatibility

The revised intake has 61 maximum questions, 49 with no conditional follow-ups, and the same ten section IDs. The exact mapping and conditions are in `phase-2-question-mapping.md`. The six original required questions remain required. New meanings use `v2_` IDs; unchanged Profile overlap stays q14/q56/q64/q33.

`shared/questionnaire-legacy.ts` is a byte-for-byte copy of the immutable original baseline catalog. `shared/questionnaire.ts` owns active selection, conditional visibility, required-value validation, current completion, mixed readback, presence, narrow patches, suggestions and JSON parsing. `shared/questionnaire-input-copy.ts` retains Phase 1's cleaned display copy separately from historical labels. Both clients re-export the same contract through their existing library entry points. Existing Metro shared watch-folder configuration already supports this location.

Readback resolves labels by immutable ID, independently of record version. Hidden and retired answers remain stored and appear under earlier/currently hidden answers. Absent new parents remain unanswered; old digestion ratings do not infer a Yes. Metadata and unknown objects survive saves without appearing as questions. Zero is a valid answer; whitespace does not satisfy required text. Legacy units, descriptions and rating ranges remain available in summaries.

Completion history remains stored, including unknown historic IDs. Current progress deduplicates known section IDs and requires visible required answers. Clearing a required answer removes the current completion claim without removing completion history. Home, both wizards and both summaries use this calculation.

## Persistence and Profile

`shared/assessment-save.ts` reads latest, applies only the patch changed against the acknowledged editor baseline, compares original answer/progress columns on update, checks the returned row, and retries up to three conflicts. Read failures fail closed. Missing/incorrect acknowledgments cannot report Saved. Account guards surround asynchronous boundaries; stale account results do not advance the editor. Hidden edited drafts, explicit clears and unrelated newer values are preserved. The writer marker never downgrades a higher numeric version.

Writer trace: `rg -n 'onboarding_questionnaire' client/src server mobile/src mobile/app shared --glob '*.{ts,tsx}'` found inserts only in the two questionnaire wizards; Profile was update-only, Home read-only, and shared/schema.ts only defined the table. Additional searches under server/scripts found no writer. New rows therefore use the existing user UUID as their assessment primary key; concurrent first inserts conflict and merge on retry. Existing random row IDs remain unchanged. No migration or live-data write was performed.

Both Profile consumers use shared/profile-save.ts for a bounded conditional update against the latest JSONB profile_data and changed scalar columns. They retry concurrent changes while preserving unrelated keys and unchanged top-level fields, check receipts, and send only changed overlap fields to the existing assessment. The originating mobile local journal retains an actual users receipt after an account switch without updating the new account UI or initiating further network writes. Mobile's durable recovery journal now retains its narrow assessment/profile-data intent, including across retry/remount. Older journals without patches preserve their previously recorded full intent. Web reads fail closed and honor explicit empty assessment values. Profile does not create an assessment.

Persisted name, phone and overlap facts are editable suggestions only when an assessment key is absent; explicit empty values take precedence. Phone includes review guidance because a profile phone is not a verified WhatsApp identity. No measurements are copied from observations and no Profile write happens merely from opening the questionnaire.

## Presentation

Short section names, one completion-count/navigation control, Save draft and unsaved-exit protection are retained. Profile's visible section-group label is removed with its accessible label preserved. Numeric rating anchors match the original ranges, including zero. The section chooser has a 90% viewport, explicit flex scroll sizing and bottom padding; root independently verified all ten destinations via actual pointer events, including the final two. Web also provides all ten section destinations.

The ambiguous “half a cam” waist distance is omitted only from active guidance. Its historical definition is preserved. An approved detailed waist protocol remains an unresolved content dependency; no distance was invented.

## Changed files

The complete 30-file source/test/fixture list is in `phase-2-files.json`, and the Phase 1-relative comparison is in `phase-2.diff`. Implementation-owned files:

- shared/questionnaire-legacy.ts, shared/questionnaire-input-copy.ts, shared/questionnaire.ts, shared/assessment-save.ts, shared/profile-save.ts
- shared/schema.ts (documentation only)
- mobile/src/lib/questionnaire-data.ts
- mobile/src/lib/questionnaire-contract.test.ts, mobile/src/lib/assessment-save.test.ts, mobile/src/lib/profile-save.test.ts
- mobile/src/components/questionnaire/QuestionnaireWizard.tsx, QuestionField.tsx, QuestionnaireSummary.tsx, QuestionnaireWizard.test.tsx
- mobile/app/(app)/profile.tsx
- mobile/src/features/profile/profileSaveRecovery.ts
- mobile/src/screens/__tests__/profile.test.tsx
- mobile/src/features/home/useHomeData.ts, useHomeData.test.tsx
- client/src/lib/questionnaire-data.ts
- client/src/components/QuestionnaireWizard.tsx, QuestionnaireSummary.tsx, QuestionnaireSummary.test.ts
- client/src/pages/Profile.tsx
- this report

Root-owned QA changes included `scripts/assessment-cleanup.browser.mjs`, `scripts/fixtures/assessment-cleanup-browser.tsx`, and the review directory's `scripts/assessment-fixture.mjs`, `assessment-journey.mjs`, `capture-flows.mjs`, and `cleanup-journeys.mjs`. Browser evidence/manifests and independent review documents are recorded separately alongside this report.

## Development verification history

- RED: focused catalog test expected 61 questions, observed 87; independently reproduced with tsx/assert.
- GREEN: revised catalog/visibility/readback/presence/patch tests passed (5).
- RED: save-contract test suite initially could not resolve the not-yet-created shared save module. Tests specified concurrency, first-insert collision, stale account and acknowledgment behavior before implementation.
- GREEN: catalog and initial save-contract suites: 9 tests passed.
- Mobile typecheck first run found one invalid spacing token (`xxl`); corrected to existing `2xl`.
- First affected-suite run: 59 passed, 2 failed out of 61. Six suites passed. Profile failures were old one-attempt missing-receipt fixture versus bounded retries, and old assertions that unchanged overlap values should overwrite newer assessment values. Fixtures/assertions were updated to enforce exhaustion and the approved narrow-patch semantics; subsequent and final runs passed.
- Immutable catalog `cmp` against original baseline passed.
- Root browser journey passed: all ten chooser destinations, Yes → No → Save → reload → Yes recovery, all ten acknowledged saves, mixed historical/revised summary, and unknown-answer preservation; no runtime errors. Root visual review requested two final copy corrections (clean-state filler and inherited q83–86 anchors), now applied.
- Users CAS helper: tests specified before implementation; concurrent unrelated JSONB update, unchanged scalar preservation, account switch and zero-row exhaustion passed (3).
- Final check results are in the leading ledger. Heavy jobs ran sequentially; root browser QA had separate reserved windows.

## Limits and review ownership

No git reset/stash/stage/commit, migration, live data writes, browser automation, Metro shutdown or unrelated tab/workout/check-in changes. Root owns browser captures and independent review; both initial and scoped follow-up evidence are recorded alongside this report. Native runtime evidence is not claimed. The final status and accepted limits are recorded in the leading ledger.

## Independent review fixes and covering evidence

The first independent source review identified a web wizard TDZ and a prepared-recovery lost-update path. Both were fixed before completion:

1. Web `handleNext` now stores validation output in `requiredMissing`, avoiding shadowing the imported `missingRequired` function. Root owns the actual browser advance/failed-acknowledgment regression check; the server-rendered summary test is not presented as coverage of interaction.
2. Mobile restores journal-owned fields over freshly loaded canonical facts instead of restoring the whole stale snapshot. A retry retains the original narrow patches and merges subsequent explicit edits against the restored intent. Acknowledgment updates the editor baseline using those same masks. Prepared and profile-saved journals therefore preserve newer unrelated phone, injury and allergy facts; old journals without masks retain their previous explicit full-form intent.

The two new screen tests first failed with stale injury values (`Old injury` and `Knee`) where current remote details were expected. After the fix, the complete Profile/recovery/wizard set passed: 45 tests. The prepared test also asserts that retry does not write the old phone and preserves unrelated profile_data and assessment values.

Root TypeScript initially identified ES5-incompatible Set spreading in the shared save helper. `Array.from(new Set(...))` fixes compatibility without changing the project's compiler settings. Root `npm run check` then passed.

Commands used for the covering checks:

```sh
npm --prefix mobile test -- --watchman=false --runTestsByPath src/screens/__tests__/profile.test.tsx -t 'hydrates only pending|prepared goal-only'
npm --prefix mobile test -- --watchman=false --runTestsByPath src/screens/__tests__/profile.test.tsx src/features/profile/profileSaveRecovery.test.ts src/components/questionnaire/QuestionnaireWizard.test.tsx
node --import tsx --test client/src/components/QuestionnaireSummary.test.ts
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm run check
```

The SSR command passed both actual web-summary tests. Mobile lint passed with zero errors and nine pre-existing require-import warnings in health/native-surface tests. Mobile typecheck passed again after the final recovery correction; root build and refreshed review also passed, as recorded in the leading ledger.

Root's actual web-wizard browser regression has now completed. The frozen reviewed source reproduced the exact `ReferenceError: Cannot access 'missingRequired3' before initialization` on Next (esbuild's renamed local). The current source passed all 11 checks: missing-required does not write/advance; all three zero-row CAS attempts fail without advancing; valid Next saves and advances through ten sections; Finish invokes completion only after acknowledgment; unknown and historical answers survive; no browser runtime exception. Evidence: `web-assessment-red.log`, `web-assessment-green.log`, and `web-assessment/manifest.json`. The fixture runs the real component with fictional Auth/database adapters; it does not write live data.

```sh
node scripts/assessment-cleanup.browser.mjs --reviewed-source # RED: expected TDZ failure in frozen reviewed code
node scripts/assessment-cleanup.browser.mjs                   # GREEN: 11 checks passed
```


Final verification completed with no active test/build process left running. Full application testing remains Phase 5 scope; this phase ran all eight affected suites. Native runtime and real-database/RLS concurrency were not claimed: the browser journeys and persistence tests use fixtures/mocks, with no live-data writes. Root's scoped re-review passed both spec and quality with no remaining required issues.

# Daily-use refinement

Implemented from the approved [design follow-up](design-followup.md) on 24 September 2026. Direction: restrained, Apple-like, with Dawnage branding.

## Changes

- **Check-in:** Inline units, shorter dated carry-forward actions, explicit history disclosure and numeric Next/Done controls. Every applicable answer remains required. Invalid numbers stay editable and no longer offer draft-discard recovery. Actual storage failures retain recovery; retrying a failed submission submits the record again. Synced and queued receipts retain distinct delivery wording with less repetition.
- **Home:** Tighter header and action spacing, weekly records before Training, and a visible morning-weight summary with its source date. Only valid observations on or before today are compared; stale and unavailable records remain explicit.
- **Progress:** One initial metric, one dated headline and change, All/1M/3M/6M calendar ranges, a metric picker and optional comparison. Missing values remain gaps. Selected dates, keyboard/accessibility actions, chronological values and an expandable weight summary remain available.
- **Workout:** Previous performance and copy/Undo sit above numeric entry. Static labels and repeated guidance are quieter; bodyweight guidance, rest options, Overview and Finish remain available. Editor sheets open at their larger detent so the full scroll area and Add exercise action are reachable on short screens.
- **Nutrition:** Stronger prescribed-target hierarchy and independently expandable meal details. Listed totals distinguish missing values from zero and explain differences from the separately prescribed target.
- **You:** Existing grouped navigation is preserved; Home provides the additional progress entry.

No dependencies, database schemas or backend behavior were changed. Existing drafts, outbox delivery, reporting dates and required-answer validation are preserved.

## Verification

- Final TypeScript and full lint checks passed. An earlier test-hook warning was corrected before this clean run.
- UI contracts passed for 233 source files.
- Final browser evidence covers **12 regular frames in both themes and five compact frames at 320 × 720**, with **51 passing journey checks and no app runtime errors**. The existing react-native-svg warning about its web `accessible` attribute remains recorded separately.
- The journeys verify required-field validation, numeric Done/Next, history disclosure, all submitted check-in values, workout completion/editing/addition/review, independent meal expansion, and chart range/metric/comparison/date behavior. Browser check-in entry explicitly commits weight with Done before selecting ratings.
- Visual review corrected a small overlap above Workout’s rest dock and an unreachable Add exercise action in the compact Overview sheet. Interactive target sizes were preserved. Numeric placeholders no longer repeat their inline units.
- The initial fixture web export completed. Final visual checks used the current Metro development bundle through a temporary local fixture mirror; only public Supabase environment values were replaced in memory. All backend requests used fictional intercepted data. The later optimized-export attempts were stopped after prolonged host file-I/O stalls, so these final images establish development-web behavior, not a new optimized or native build.
- The final complete regression run passed: **146 suites / 1,141 tests**, followed by the UI-contract check for **233 source files**. The run uses a 15-second command-line test timeout; repository timeout settings and assertions are unchanged. One existing hook-test UI mock was extended with the Text export used by the new keyboard accessory. [Final test log](evidence/daily-use-refinement/tests-final.log).

Screens: [regular layouts](evidence/daily-use-refinement/reviewed-screens.png) · [compact layouts](evidence/daily-use-refinement-compact/reviewed-screens.png). Exact checks and capture runs: [regular manifest](evidence/daily-use-refinement/capture-manifest.json) · [compact manifest](evidence/daily-use-refinement-compact/capture-manifest.json).

Focused tests cover commit-before-focus, invalid Done, disclosure, copy/Undo, exit/date races, required fields, submission recovery, source dates, local calendar boundaries, sparse chart observations and meal totals. Independent review found one recovery-routing issue, reproduced by a failing integration test and corrected before final verification.

Focused passing runs: check-in **8 suites / 87 tests**, Home **5 / 56**, Workout and Nutrition **5 / 57**, and Progress/charts **5 / 54**. The later failed-submission retry regression also passed in the integration-suite rerun. These are separate runs, not a combined unique-test total. The final shared sheet change received a further independent review with no unresolved findings.

## Device acceptance

The available host does not provide a usable current iOS Simulator or connected Android test device. Native keyboard accessory placement, VoiceOver/TalkBack, large Dynamic Type, native material appearance and physical-device performance require device acceptance. Fixture browser evidence is not native binary acceptance.

## Final status

All implementation tasks and available source/browser checks are complete. Native device acceptance and a fresh optimized export remain the explicit limits above. Temporary preview processes and browser data were cleaned up; the existing development server was preserved. [Source change manifest](evidence/daily-use-refinement/source-manifest.json).

# Guided workout polish — 2026-09-20

## Changed behavior

- The current set now separates the prescribed **Target** from the **Actual** values the client enters. Bodyweight guidance sits directly under the weight control instead of inside advanced options.
- A compact `Complete set → rest → next set` cue explains the workout rhythm without adding a tutorial or changing explicit completion. Previous-value copy/undo, completed-set undo, advanced options, and editable earlier sets remain intact.
- Assigned exercises expose an **Exercise guide** action with an accessibility hint describing the existing coach-note, target, and optional demonstration content. No demonstration or instruction is invented for custom exercises.
- Current, just-completed, exercise-complete, and active-rest states have stronger hierarchy using existing theme tokens. Active rest exposes an accessible remaining-time progress indicator while preserving pause, extend, skip, manual start, and rest preferences.
- Compact screens and enlarged text move Overview/Finish into a wrapping action row.
- A visible **Finish** action is available from the logger header whenever the session has exercises. It calls the same review path as Overview, so incomplete-set review, title validation, draft handling, delivery state, and final save behavior remain in the existing flow.

## Verification evidence

| Check | Observed result |
| --- | --- |
| `git diff --check` on the scoped logger source and tests | Passed with no whitespace errors after cleanup. |
| Focused Jest batch for `CurrentSetEditor`, `ExerciseSlide`, `RestDock`, and logger screen | Two attempts stalled during filesystem startup with no test output. The four-suite attempt and the isolated `CurrentSetEditor` attempt were interrupted after more than five minutes each, so no pass or fail is claimed. The integration owner requested no further local Jest/typecheck/lint runs and will run consolidated verification. |

## Validation limits

No physical-device, native-keyboard, reduced-motion, screen-reader, or fresh screenshot validation was completed in this task. The implementation retains the existing responsive column breakpoint, keyboard dismissal behavior, 44-point actions, tokenized colors/spacing, and reduced-motion-aware reveal components. The final integrated test, TypeScript, lint, UI-contract, and capture outcomes belong to the root verification run.


Integrated review corrected a missing theme-hook reference in active rest. Final shared verification results are recorded in the guided-start plan and supersede the initial stalled per-task checks.

Final integrated outcome: all relevant focused suites pass across the final runs, together with TypeScript, lint, UI contracts and diff checks. Source review has no outstanding findings. Visual/native acceptance remains open. See `../superpowers/plans/2026-09-20-guided-start-polish.md` for the evidence and next device checks.

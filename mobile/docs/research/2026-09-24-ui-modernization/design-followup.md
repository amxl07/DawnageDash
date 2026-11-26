# Recommended next design improvements

Reviewed 24 September 2026, after the required daily check-in correction. Direction: restrained, Apple-like, with Dawnage branding. This is a recommendation pass; application code was not changed.

The next gains are faster daily entry, clearer progress and less repeated information. The current grouped surfaces and primary action hierarchy provide a useful foundation.

![Six reviewed screens](evidence/design-followup-audit/reviewed-screens.png)

## Screen review

| Step | Surface and current health | Observation | Recommendation |
| --- | --- | --- | --- |
| 1 | Home — clear primary action, generous vertical spacing | Greeting, program/coach metadata and the next-action card occupy much of the opening screen. The weekly record begins near the bottom. | Tighten the header and action card so the weekly record becomes easier to scan. Add a compact link to a real recent progress summary, with its date and data source. Retain one dominant action. |
| 2 | Daily check-in — working validation, unnecessarily busy assistance | Each measurement can show a long dated carry-forward button and a history range. The invalid-number journey also displays Retry saving and Discard draft, even when the problem is entry validation. | Keep every applicable field required and visible. Use a concise previous-value line and action; move expanded history to an explicit detail affordance. Use inline units and a keyboard Next/Done path after native verification. Separate field validation from storage recovery, clearing the former after a valid commit. |
| 3 | Workout — clear current set, secondary guidance consumes space | Target, actual labels, the bodyweight hint, repeated completion instructions and rest settings compete with entry space. Previous values already exist, but render below Complete set. | Retain the large numeric targets and current-set focus. Position relevant previous performance beside the inputs, shorten persistent guidance and keep rest settings behind the existing options control. Preserve visible Overview/Finish and undo. |
| 4 | Nutrition — readable grouped meals, dense detail | The meal list exposes every description and macro row at once. The daily target and sum of listed meals appear separately. | Give the prescribed target stronger numerical hierarchy; allow meal details to expand while keeping meal names and calories visible. Explain any difference between the prescribed daily target and listed meal totals. Keep prescribed quantities distinct from recorded intake. |
| 5 | Progress — useful data, repeated readouts | Latest-entry text, selected-date text, legend values and baseline comparisons repeat measurements. Three chart series start selected; filter chips wrap to another line. | Default to one chosen metric, one prominent value, source date and change. Offer clear metric and timeframe selection, keeping comparison optional. Preserve missing-data gaps and the accessible chronological values view. |
| 6 | You — coherent grouped navigation | Coaching, progress and account rows are clearly organized. Progress destinations are discoverable here but require leaving Home. | Preserve the grouped rows. Improve progress discovery through a contextual Home entry; avoid adding another main tab just for visual novelty. |

## Cross-screen polish

- Reserve the strongest Dawnage red for primary actions and selection. Static labels such as Target and routine metadata can be quieter. Errors must remain explicit in text and semantics because the brand also uses red.
- Simplify confirmation copy. The captured check-in receipt repeats Saved and synced as both heading and badge, followed by another saving explanation. A clear completion headline, concise delivery status and next action can communicate the same information with less repetition.
- Keep meaningful motion, existing haptics and reduced-motion behavior. Further animation should solve an observed orientation or feedback problem.
- Preserve readable text and touch targets when compacting screens. Do not use smaller fonts, clipped labels or icon-only unnamed controls to achieve density.

## Suggested order

1. Check-in entry efficiency and validation/recovery separation.
2. Home spacing and progress presentation.
3. Workout guidance/previous-value placement and Nutrition detail hierarchy.
4. Consistent accent/copy polish, followed by a native device review.

The first pass should demonstrate fewer scrolls and easier corrections with all required answers still collected. Subsequent passes should make the next action and the meaning of progress obvious without increasing the navigation burden. These are design hypotheses to validate with realistic tasks, not measured user outcomes.

## Evidence and limits

Fresh captures used the current Expo web export at 390 × 844 in light mode, with reduced motion and fictional intercepted data. The six screen captures and twelve task checkpoints recorded no page errors or warnings. Check-in, workout and chart journeys passed eleven assertion groups. The six overview frames, the measurement-entry checkpoint, completion receipt, workout overview and chronological chart values were visually inspected for this report.

The Nutrition fixture deliberately permits a difference between its daily target and the sum of listed meals. That demonstrates how the UI presents a discrepancy; it is not evidence that a real user's assigned plan is incorrect.

This pass does not establish native navigation/material appearance, VoiceOver/TalkBack behavior, keyboard reachability, large-text fit, physical-device performance or full accessibility compliance. Native testing remains necessary, especially before changing keyboard flow or reducing spacing.

- [Capture manifest](evidence/design-followup-audit/capture-manifest.json)
- [Check-in measurement and validation state](evidence/design-followup-audit/checkin-measurements-light-390.png)
- [Check-in completion](evidence/design-followup-audit/checkin-saved-light-390.png)
- [Workout overview](evidence/design-followup-audit/workout-overview-light-390.png)
- [Chart chronological values](evidence/design-followup-audit/measurements-chart-chronological-values-light-390.png)

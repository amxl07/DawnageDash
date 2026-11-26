# Daily check-in: all fields required

The daily check-in now requires every applicable field before submission, following the user's correction to the modernization work.

- Readiness: morning weight, energy and stress. Weight appears first.
- Recovery: sleep, hunger and digestion.
- Training and nutrition: workout status, nutrition score, calories, water, steps, protein, carbs and fats. Workout performance is required after training or cardio; it does not apply to a rest day or a day without training.
- Review: notes, with an inline error for blank or whitespace-only text.

The optional disclosures were removed. Measurements remain visible within their section, and the form explains that all fields are required. Continue validates the current section; Submit validates every section, including a restored draft opened directly at Review. Missing measurements remain visible in review rather than being omitted.

Protein, carbs and fats use full-width rows. Screenshot review found that the previous three-column layout squeezed their history buttons on a regular phone; the updated layout keeps inputs and previous values readable at both tested widths.

An explicitly recorded zero remains valid wherever the existing numeric range permits zero. Blank inputs stay unanswered. Incomplete drafts still save and restore; existing records, storage formats and previously queued submissions retain their data. The in-app check-in guide and development gallery use the same required-field language.

Regression tests first reproduced the missing-field submission and hidden-input behavior. The focused validation, form and editor tests then passed: **3 suites, 52 tests**. These cover missing measurements, blank notes, invalid macros, explicit zero values and preserving an incomplete draft while blocking submission.

The complete `npm run verify` run passed: **145 suites / 1,092 tests**, TypeScript, lint, and UI contracts for **229 source files**. The Expo web export also passed.

After the final macro layout adjustment, the form suite passed again (**17 tests**), along with TypeScript, lint for the changed form, UI contracts and a fresh Expo web export.

The final exported app passed three browser journeys: light and dark at 390 × 844, and dark at 320 × 740, all with reduced motion. **18 assertion groups and 21 screenshots** cover required weight and focus, sleep presets, visible nutrition measurements, invalid numeric recovery, required notes, review edits and the complete submitted payload. There were no page errors or warnings. Submissions used fictional intercepted data; no live account was modified.

- [Regular-width manifest](evidence/required-check-in-web/capture-manifest.json)
- [Compact manifest](evidence/required-check-in-compact/capture-manifest.json)
- [Weight and required-field guidance](evidence/required-check-in-web/checkin-light-390.png)
- [Full-width macro inputs during validation](evidence/required-check-in-web/checkin-measurements-light-390.png)
- [Required notes on a compact screen](evidence/required-check-in-compact/checkin-required-notes-dark-320.png)
- [Completed check-in](evidence/required-check-in-web/checkin-saved-light-390.png)

Native device acceptance remains subject to the environment limits recorded in the [main implementation report](implementation.md).

# Training hub self-review

Reviewed the Training, History, Nutrition and tab changes against `/tmp/dawnage-training-hub-before/` and the approved daily-journey design.

- Training owns a `view=plan|history` route contract. Plan is the default; an explicit query parameter resets a previously selected view.
- History retains the original account-scoped query, local outbox visibility, retry triggers and `date`/`logId`/`outboxId` editor routes. Its FlatList remains the only vertical scroll owner.
- `/logs` is hidden from the tab bar and redirects to Training History while preserving recovery identity parameters.
- The assigned plan alone receives the focused next-session action. Active drafts say Continue; other focused sessions say Start. Promotion waits for error-free profile, plan and progress data that is neither fetching nor paused, while uncertain states keep the full day list marked unknown. The focused card expands to every exercise and day note, and its Details actions retain the full prescription sheet for rest, substitutions and demos. Template exercises remain preview-only, and plan provenance is marked seen only after assigned plan data is ready.
- Nutrition retains meal, supplement, coach-note, cached-error, retry and empty-state behavior in its own tab.
- The tab exit listener still runs the existing check-in guard before navigation.

Verification: all 14 changed TS/TSX files parsed with Babel, and `git diff --check` passed. A scoped ESLint run produced no output and stalled for more than 60 seconds, so it was terminated with exit 130. This agent did not start Jest while the existing root Jest process was stalled; the parent task owns the single consolidated scoped run.

Integration follow-ups owned by the parent: raise the shared `PlanDayCard` 44pt targets to 48pt and update legacy logger copy from “Logs” to “Training History.”

Integration verification and corrected test assertions are recorded in [the daily journey review](2026-09-20-daily-journey.md). The legacy redirect now uses the SDK 57 inferred search-parameter type.

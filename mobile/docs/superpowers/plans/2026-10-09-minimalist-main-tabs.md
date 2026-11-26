# Minimalist main tabs

The client asked for substantially fewer words, numbers and components, especially on Home. This amends the earlier cleanup plan: normal reference information moves behind deliberate disclosure; important save, recovery and permission states remain visible. Implementation is already authorized.

## Design

- Home: a short personal greeting, one primary action, at most one quiet training row, and “View details”. No ordinary date, program-day badge, coach caption, weekly strip, weight or totals on the collapsed screen. Dates remain on recovery actions and individual records. The details area retains the weekly record, recap, progress and assessment destinations.
- First use: a compact welcome and start action. Keep the optional practice guide and explain Day 1 at the existing submission decision. Avoid a second coaching/status card.
- Check In: title, one state-aware action, one history row. Preserve earlier drafts and failed delivery warnings.
- Training: lead with the next session and Start/Continue. Show exercise prescriptions when opened. Other sessions become simple focus rows; day numbers, counts and action status remain accessible and in expanded content. Put assignment metadata and actual training/cardio/steps notes in clearly named disclosures. Keep unavailable, template and changed-plan context accurate.
- Nutrition: meal names first; descriptions, calories and macros on expansion. “Nutrition details” contains the prescribed target and honest meal totals, including missing/zero values. Flag mismatched or incomplete totals without displaying a wall of numbers. Supplements and notes remain available by name.
- You: one destination list without category headers or repeated explanatory captions. Coach details remain accessible through disclosure. Sign-out confirmation remains.

Use existing neutral surfaces, restrained accent, readable typography and generous space. No new graphics, dependencies or navigation model. Retain minimum touch sizes and expansion semantics; do not truncate essential text to force a small layout.

## Execution

1. Capture the five actual tabs with fictional fixtures before changing the layout; document any environment limitations.
2. Implement Home/first-use, Check In, Training, Nutrition and You in that order. Preserve existing data fetching, route identities, save paths and workout logging controls.
3. Update meaningful existing interaction tests for progressive disclosure; verify recovery remains available without expanding normal details. Remove the separately approved unused daily-prompt helper only after confirming no consumer.
4. Review fresh 390 px and 320 px captures, light/dark and enlarged browser text. Exercise primary actions and newly disclosed content; run affected tests, then full existing checks and web compatibility checks sequentially.
5. Record the result and remaining device-only verification honestly. Browser text enlargement does not establish native Dynamic Type, keyboard or VoiceOver/TalkBack coverage.

Evidence: `mobile/docs/review/2026-10-09-minimalist/`. A pre-change source copy is retained at `/Users/manojthomas/.cache/dawnage-cleanup/2026-10-09-resume/`.

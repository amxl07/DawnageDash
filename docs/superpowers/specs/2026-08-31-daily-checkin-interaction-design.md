# Dawnage Daily Check-In Interaction Design

**Date:** 2026-08-31  
**Status:** Approved interaction direction; pending written-spec review  
**Target:** `mobile/` Expo application  
**Scope:** Daily check-in presentation and Expo Router test-boundary correction

## 1. Purpose

This specification makes Dawnage's existing daily check-in feel lighter, more tactile, and less repetitive without changing the client feedback protocol. The established questions, answer scales, required fields, stored values, validation semantics, and coach-facing analytics remain intact.

The design should feel like a short daily ritual rather than a conventional form. It must remain familiar enough for repeat use: visual variety can refresh the experience, but controls, question order, and meaning cannot move around unpredictably.

The same implementation also corrects the current Expo Router crash caused by colocated Jest files being interpreted as application routes.

## 2. Frozen questionnaire and data contract

The redesign must not alter question wording, question order, grading, required/optional state, database columns, mutation payloads, or downstream coach interpretation.

### 2.1 Existing stages and fields

| Stage | Existing prompt/control | Stored field | Contract |
|---|---|---|---|
| Readiness and energy | Morning weight | `morning_weight` | Optional decimal, 20–400 kg when present |
| Readiness and energy | Energy | `energy_level` | Required integer, 1–10 |
| Readiness and energy | Stress | `stress_level` | Required integer, 1–10 |
| Sleep and recovery | Sleep | `sleep_hours` | Required decimal, 0–24 hours |
| Sleep and recovery | Hunger | `hunger_level` | Required integer, 1–10 |
| Sleep and recovery | Digestion | `digestion` | Required existing enum |
| Nutrition and adherence | Workout | `workout_status` | Required existing enum |
| Nutrition and adherence | How did it go? | `workout_performance` | Required integer, 1–10 when workout status requires it |
| Nutrition and adherence | Nutrition score | `nutrition_score` | Required integer, 1–10 |
| Nutrition and adherence | Calories | `calorie_intake` | Optional existing range |
| Nutrition and adherence | Water | `water_liters` | Optional existing range |
| Nutrition and adherence | Steps | `daily_steps` | Optional existing range |
| Nutrition and adherence | Protein | `protein` | Optional decimal |
| Nutrition and adherence | Carbs | `carbs` | Optional decimal |
| Nutrition and adherence | Fats | `fats` | Optional decimal |
| Notes and confirmation | Notes (optional) | `notes` | Optional trimmed text |

The current `FormState`, `fromRow`, `prefillFrom`, `toPayload`, `validateCheckInStep`, and `validateCheckIn` behavior remains authoritative. Existing rows must round-trip without conversion or reinterpretation. A selected `7` remains the integer `7`; the UI must not map words or buckets onto the scale.

### 2.2 Explicitly prohibited changes

- Do not reduce the 1–10 scales to three or five choices.
- Do not replace numeric scores with moods, emoji, inferred values, or semantic buckets.
- Do not make a required question optional or an optional field required.
- Do not add, remove, rename, or repurpose database fields.
- Do not silently prefill today's subjective answers.
- Do not change coach dashboards, trends, alerts, or scoring formulas as part of this work.
- Do not randomize question order or control placement.

## 3. Evidence and design rationale

The interaction direction is based on the current Dawnage implementation, the ten local fitness repositories previously audited, and focused external research.

- Eisele et al. found longer experience-sampling questionnaires increased perceived burden and compromised data quantity and quality. Dawnage should therefore reduce visual and cognitive burden without deleting required data. Source: [Assessment, 2022](https://doi.org/10.1177/1073191120957102).
- A 2025 systematic review of movement-behavior ecological momentary assessment reported a burden/compliance trade-off and higher compliance in once-daily protocols than more frequent prompting in the reviewed studies. Dawnage's once-daily ritual should remain concise and predictable. Source: [JMIR mHealth and uHealth, 2025](https://doi.org/10.2196/52887).
- Daylio demonstrates that immediate tap-first input and optional typing can make repeated self-report feel approachable. Dawnage can adopt the interaction principle without changing its questionnaire.
- Oura's optional tags and the local Skulpt and Liftosaur repositories reinforce keeping context and objective detail visually secondary to the main daily pulse.
- Apple recommends at least 44 by 44 points for touch controls. Every interactive rating, segment, stepper, disclosure, and action must meet this minimum.

The resulting principle is: **preserve the protocol, reduce the feeling of form-filling**.

## 4. Experience design

### 4.1 Entry and daily framing

The screen retains the safe-area-aware title, streak, four-stage progress, draft restoration, and date behavior. The opening area becomes a compact daily header rather than a stack of generic form labels:

- Date and completion context remain immediately visible.
- The progress bar is paired with a concise stage label such as `1 of 4`.
- One short supportive line is selected deterministically from an approved set using the check-in date. This line is supplemental and never replaces a question. The same date always shows the same line, so rerenders do not feel random.
- Visual variation is limited to composition using Dawnage's existing black, white, red, surface, and muted tokens. No new palette or theme family is introduced.
- The existing top layout contract remains `safe-area top inset + base spacing`; no hardcoded device offset is added and no nested top inset is allowed.

Examples of supplemental tone include “A quick honest check-in is enough” and “Small signals help your coach see the full week.” These strings must remain calm, concise, and non-judgmental. They are not questionnaire content.

### 4.2 Four-stage pulse deck

The four existing stages remain in the current order. Each stage is presented as a focused pulse deck:

- A stage card gives the current category a strong title, a small Lucide icon, and the unchanged questions.
- Each question sits in a visually distinct field block with sufficient spacing, rather than appearing as one uninterrupted form.
- Answered blocks gain a restrained completed state: stronger border, selected value emphasis, and a small non-interactive completion mark.
- Unanswered blocks remain visually quiet; errors replace the completion mark and appear directly beneath the affected control.
- Scrolling remains available on compact phones and at large font sizes. The sticky action bar remains stable while content moves beneath it.
- Back and Continue preserve current draft behavior and never discard answers.

The deck is not a swipe carousel. Swipe-only navigation would hide progress, complicate accessibility, and increase accidental movement. Stage transitions remain button-driven and predictable.

### 4.3 Interactive 1–10 rating scale

Energy, Stress, Hunger, Workout performance, and Nutrition score keep their exact 1–10 values. Their shared rating control becomes the main tactile element of the experience.

Requirements:

- Display all integers 1 through 10 explicitly; users must never infer hidden intermediate values.
- Use a responsive two-row grid of five equal-width controls on compact phones so every value retains a 44-point minimum target. Regular-width layouts may use a single row only when all ten targets remain at least 44 points wide.
- Preserve direct selection: tapping `7` stores `7` immediately.
- Emphasize the selected number through existing primary color, border, foreground contrast, and a short scale/opacity response.
- Show a subtle contiguous progress treatment from 1 through the selected value, while the selected number remains unmistakable. This treatment is decorative and cannot make unselected numbers look selected.
- Fire selection haptics only when the numeric value actually changes, not on rerender.
- Announce the question and exact selected number to assistive technology.
- Preserve adjustable screen-reader actions where the full option set is not exposed as radios. When options are exposed individually for automated or assistive interaction, each option must report its exact number and selected state.
- Support large text without clipping or shrinking the numeric targets below the minimum size.

Endpoint hints may clarify direction only where the current question already has an unambiguous direction. They must not introduce named score bands, diagnoses, praise, or judgment. The numeric value remains the only answer.

### 4.4 Existing segmented and numeric controls

Workout and Digestion keep their current options and stored enum values. They receive the same field-block completion treatment as rating questions. Selection uses the existing segmented-control semantics and Lucide icons; emoji are not controls.

Morning weight, Sleep, Calories, Water, and Steps retain their existing ranges, increments, units, previous-value hints, and stepper behavior. The visual treatment should make the current value more prominent and the increment/decrement actions feel responsive, without changing the value logic.

Protein, Carbs, and Fats remain behind the existing optional disclosure. Opening the disclosure reveals the fields in place and preserves entered values when closed.

### 4.5 Confirmation and submission

The fourth stage remains `Notes and confirmation`; it is not removed.

- Notes retain the existing optional prompt and multiline input.
- The full current summary remains available so clients can verify every value before submission.
- Summary rows are grouped by the three data stages rather than rendered as one undifferentiated list.
- Required missing answers are detected by the existing validation functions. Submission focuses and announces the existing error summary, then returns the user to the first invalid stage.
- The sticky action uses the existing pending, retry, and draft status behavior.
- Successful submission keeps the current one-shot celebration, success haptic, streak/payoff text, and accessibility announcement.
- Failed submission preserves the entire form and exposes Retry; it never clears the draft.

### 4.6 Daily variety without instability

The experience should feel fresh while remaining learnable:

- Rotate only supplemental daily header copy, selected deterministically from the target date.
- Use stage-specific icons and progress treatment consistently: readiness, recovery, adherence, confirmation.
- Let completion progressively enrich the same stage card through border, tint, and check-state changes.
- Keep question order, control type, field position, CTA position, and validation behavior stable every day.
- Do not use random layouts, random colors, streak pressure, confetti on ordinary selections, or continuous ambient animation.

Novelty comes from responsive feedback and visible progress, not from making users relearn the form.

## 5. Motion and haptics

Motion must communicate selection, reveal, navigation, or successful completion.

| Event | Motion | Timing |
|---|---|---|
| Rating selection | Selected value scales from approximately 0.97 to 1; progress treatment settles to the new value | 120–160 ms or the existing press spring |
| Segmented/stepper selection | Existing press feedback plus a restrained color/border transition | 120–160 ms |
| Conditional workout performance | Fade and translate by no more than 8 points | Approximately 180–200 ms |
| Optional macro disclosure | Chevron rotation plus short content fade | Approximately 160–200 ms |
| Stage change | Short crossfade with no large page travel | Approximately 160–200 ms |
| Submission success | Existing one-shot celebration | Existing bounded duration |

Implementation constraints:

- Prefer Reanimated worklets and opacity/transform properties.
- Do not animate width, height, top, left, or other layout properties during frequent interactions.
- Interactions must remain interruptible; a new selection immediately takes ownership of the current value.
- Reduced Motion removes transform and travel. State changes remain immediate and legible; the static success state is still shown.
- Use one selection haptic per changed answer and one notification haptic for save success/failure. Do not vibrate during scrolling or every animation frame.

## 6. Accessibility and responsive behavior

- Every control meets a 44 by 44 point minimum target.
- The safe-area contract covers notches and Dynamic Island devices; the sticky action bar includes the bottom inset.
- Screen-reader order matches visible question order.
- Rating controls announce the unchanged question and exact integer value.
- Completion and error state never rely on color alone.
- Dynamic Type may increase vertical height; content wraps or stacks instead of truncating.
- At widths below 360 points or elevated font scale, the rating grid is explicitly two rows of five and optional macros stack when three columns would become illegible.
- Keyboard avoidance keeps Notes and numeric input actions visible.
- Focus moves to the error summary after invalid submission and the summary names the problem without replacing inline field errors.
- Reduced Motion and reduced-transparency behavior continue to flow from the shared theme hooks.

## 7. Component architecture

The implementation should remain within the existing design system and avoid unrelated refactors.

### 7.1 New or focused UI units

- `CheckInRatingScale`: owns the responsive 1–10 presentation, selection feedback, haptics, exact-value accessibility, and pure value semantics.
- `CheckInFieldBlock`: owns question spacing and visual states such as unanswered, answered, and invalid.
- `CheckInStageHeader`: owns stage icon, stage count, progress context, and deterministic supplemental daily copy.
- `CheckInSummarySection`: groups confirmation rows while preserving every existing displayed value.

These units receive values and callbacks; they do not know about Supabase, drafts, routing, or mutation state.

### 7.2 Existing responsibilities retained

- `CheckInForm.tsx` keeps form composition, field ordering, enum controls, objective fields, macros disclosure, `FormState`, and payload conversion helpers.
- `check-in.tsx` keeps date selection, existing-row behavior, draft lifecycle, navigation, validation orchestration, submission, and celebration.
- `checkin-validation.ts` remains the source of truth for required fields and ranges.
- `useCheckInDraft` and `useCheckInMutation` retain their storage/network behavior.
- Existing theme spacing, radii, colors, typography, motion, responsive layout, `Screen`, `StickyActionBar`, and safe-area helpers remain authoritative.

No database migration or API change is required.

## 8. Expo Router/Jest boundary correction

### 8.1 Root cause

Expo Router treats every `.tsx` module below `mobile/app` as a route candidate and evaluates it in the application bundle. Nine Jest files currently live in that directory. They do not default-export route components and access the Jest global, so the app reports route warnings and then fails with `Property 'jest' doesn't exist` outside the test runner.

### 8.2 Required correction

- Move all `*.test.*` and `*.spec.*` files out of `mobile/app` into a test location below `mobile/src`.
- Update only their route-module import paths and any affected relative mocks.
- Keep production route filenames and default exports unchanged.
- Add an automated boundary test that fails if a test/spec file is introduced below `mobile/app` again.
- Do not add dummy default exports to test files and do not expose Jest globals to the runtime bundle.

The `expo-notifications` Expo Go warnings are separate from this defect. Remote notification testing must use a development build; suppressing or weakening the notification implementation is not part of this correction.

## 9. Error, loading, and persistence behavior

- Loading and dashboard-fetch failure states remain unchanged unless a layout adjustment is necessary for the new header.
- A restored draft shows its saved fields and current step exactly as today.
- Stable form changes continue to autosave through the existing draft hook.
- Changing a rating repeatedly must not enqueue network mutations; submission remains explicit.
- Existing-data editing uses the same redesigned controls and preserves the current cancel behavior.
- If an answer becomes invalid, its error clears only when the existing validator reports that field valid.
- If a save fails, values, step, errors, and draft remain available.

## 10. Testing and verification

Implementation follows test-driven development.

### 10.1 Route-boundary tests

- A failing contract test first demonstrates that test/spec modules exist below `mobile/app`.
- After relocation, the contract test confirms the route tree contains no test/spec files.
- All nine relocated route-screen test suites still execute under Jest.
- Expo export/bundling completes without missing-default-export warnings for test files and without runtime Jest references.

### 10.2 Interaction tests

- Every 1–10 value can be selected and returns the exact integer.
- Selection haptics occur only when a rating value changes.
- Required questions and conditional workout performance retain current validation.
- `toPayload` produces the same schema and values before and after the visual refactor.
- Draft restoration and existing-row editing preserve all answers.
- Step back/continue, first-invalid-stage routing, retry, and success behavior remain covered.
- Reduced Motion produces no transform/travel animation while preserving state feedback.
- Accessibility roles, exact numeric labels, selected state, and increment/decrement behavior are covered.
- Compact-width and large-font layouts keep rating targets and action controls usable.

### 10.3 Release verification

- Run targeted new tests red before implementation and green afterward.
- Run the nine relocated route-screen suites.
- Run the full mobile Jest suite.
- Run TypeScript validation and the repository's UI contract checks.
- Run an Expo export/bundle check.
- Inspect the check-in on at least one compact iPhone viewport, one notched/Dynamic Island viewport, and one large-text configuration when a simulator or physical device is available.
- Verify Reduce Motion and VoiceOver behavior on device before claiming full accessibility acceptance.

## 11. Acceptance criteria

The work is accepted when:

1. No test/spec file exists under `mobile/app`, and launching the Expo app no longer evaluates Jest code or reports those files as routes.
2. Every current check-in question, field, option, 1–10 value, validation rule, payload key, and coach-facing stored meaning remains unchanged.
3. All five rating questions provide direct, exact, accessible 1–10 selection with visible and tactile feedback.
4. The four-stage workflow, review, drafts, edit mode, retry, and success flow remain functional.
5. Daily variety changes only supplemental presentation; the questionnaire remains stable and predictable.
6. Compact devices, safe areas, large text, keyboard use, Reduced Motion, and screen-reader semantics are handled by design.
7. Targeted tests, the full mobile suite, typecheck, UI contracts, and Expo export pass.

## 12. Non-goals

- No questionnaire redesign or clinical/coach protocol change.
- No database, RLS, API, or analytics migration.
- No health-platform import or wearable integration in this pass.
- No notification-system redesign; Expo Go limitations remain documented.
- No global app theme redesign.
- No decorative continuous animation, gamified punishment, score judgment, or randomized control layout.
- No unrelated screen refactors.

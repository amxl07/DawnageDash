# Easier daily check-ins and workout logging

## Intent

Make the daily tasks feel calm, guided and forgiving. The user has authorized planning and implementation in the working `mobile` app. Preserve the premium Dawnage theme and the now-working Expo SDK 57 setup.

## Evidence and decisions

The FitnessAPPRepos review recommends skulpt's focus on the active set, LiftLog's repeat-entry efficiency, and selected demos' immediate feedback. Apply these interaction ideas independently in Dawnage; do not copy licensed implementation or assets. Sources: `FitnessAPPRepos/_analysis/2026-09-16/REPORT.md` and its detailed reviews.

The current check-in mounts all four sections, multiple number rulers, ten-point rating grids, history hints and actions in one long page. Horizontal rulers compete with vertical scrolling and require precision dragging. The logger already emphasizes the active set, but always exposes other sets, adding sets/exercises, session options and a Finish action. Completing the last set returns to an already completed editor instead of presenting a clear next action.

Considered approaches:

1. Tune ruler physics and retain the long form: improves tracking but leaves the information burden.
2. One question per screen: clear, but adds too many transitions for repeat daily use.
3. Three short check-in sections followed by review, with direct numeric input and optional disclosures: selected. It preserves required coach data and reduces simultaneous choices without adding a new data model.

## Check-in experience

- Use the existing persisted steps `readiness`, `recovery`, `adherence`, `finish` as three entry sections and a review. The active application path is guided; remove the trial single-scroll choice from the route.
- Show one concise stage title, progress, date/history access, and one primary action. Back is secondary. Avoid repeated introductory paragraphs and multiple Review/Submit controls.
- Readiness asks energy and stress. Optional weight is behind a labeled disclosure.
- Recovery asks sleep, hunger and digestion. Sleep offers explicit 6, 7, 8 and 9 hour presets plus precise typing.
- Adherence asks training status, conditionally workout performance, and nutrition score. Optional calories, water, steps and macros are behind a labeled disclosure. Retain every field and saved value.
- Review provides a concise summary and edit access before the only submission action. Notes remain optional.
- Replace the three rulers (weight, sleep, water) in the active flow with the existing validated NumericEntry. Optional quick-value buttons use the same commit protocol as typing. No gesture is required to enter a number.
- Preserve the exact 1–10 rating range and existing saved scores. Keep rating targets at least 44 points, allow wrapping at large text sizes, and reduce nested visual containers and redundant history captions in the default view.
- Collapsing optional content or moving between steps must commit pending numeric text. Invalid text keeps the user in place with a clear error. Revealing an error/review edit opens its section and optional disclosure, then focuses the field after it mounts.
- Continue validates only the current step; it must never call submit. Final submission still runs all existing validation. The current date, draft, offline queue, retry, receipt and exit-intent behavior stay intact.

## Workout experience

- Show the current exercise and one active set. The usual action remains Complete set. Keep precise weight/reps/duration entry, bodyweight rules, optional RPE, previous-performance copy and undo.
- After all sets in an exercise are complete, show an exercise-complete state with a clear next action. Route to the next unfinished exercise when one exists; otherwise offer Review workout. Never automatically mark a set or save a session.
- Other sets and Add a set live behind an accessible Sets disclosure. Completed sets remain editable and removable with the existing undo behavior.
- Move the always-visible Add exercise form into the workout overview/management surface. Session settings remain secondary. Retain typed exercise names across dismissal and preserve the existing draft-and-exit behavior.
- Keep rest controls compact, with only contextual timer actions in the persistent dock. Put Finish/review access in the overview and completion path instead of competing with Complete set in a permanent full-width button. Partial workouts can still be reviewed and saved under existing rules.
- Preserve timestamp-based rest timing, auto-start preferences, load/recovery/error paths, offline saving and stable set IDs. No progression policy or automatic target changes are introduced.

## Global constraints

- Expo SDK 57 and the installed dependency versions remain unchanged; add no dependency.
- Use existing theme tokens, typography, buttons, sheets and motion preference. Both dark and light themes remain supported.
- Touch targets are at least 44 points; optional/expanded state and selected values are announced accessibly. Layout wraps for small screens and large text. The keyboard must not hide the current action or input.
- Do not change database payload keys, required fields, numeric bounds, saved record formats, account/date isolation or draft/outbox semantics.
- All existing optional values survive collapsed UI and review/edit navigation. Never silently copy subjective daily answers.
- Implement in the user's current mobile checkout, preserving existing uncommitted redesign/SDK work. A separate source snapshot supplies the review baseline. Do not reset, stash, commit unrelated work, merge, push or publish.

## Acceptance

Behavioral tests cover guided navigation, current-step validation without premature submit, hidden-field reveal, pending number commits, quick-value entry, completion-to-next-exercise, editing completed sets, add-exercise access and existing recovery flows. Run TypeScript, standard lint, the full Jest suite, UI contracts and iOS/Android/web exports. Capture the real app with fictional data at mobile sizes in both themes, and exercise the newly changed paths. Browser evidence does not certify native gesture/keyboard/haptic performance; the user can verify those in the working Expo Go app.

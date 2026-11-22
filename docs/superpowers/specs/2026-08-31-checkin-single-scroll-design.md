# Daily Check-In Single-Scroll Trial Design

## Status

Approved by the product owner on 2026-08-31. This document narrows the proposed
Instrument Panel concept to a reversible production trial that preserves the
existing Dawnage data contract.

## Goal

Make the repeated daily check-in feel responsive and personally useful without
changing the 16 values coaches receive, forcing a new native runtime, or
replacing the proven wizard without a fallback.

## Product decisions

- Preserve the current 16 fields, labels, ranges, enum values, conditional
  workout-performance rule, payload keys, and validation behavior.
- Offer a single-scroll layout by default behind
  `EXPO_PUBLIC_CHECKIN_SINGLE_SCROLL`; setting it to `false` restores the
  current four-step wizard.
- Keep the existing three content sections: Readiness and energy, Sleep and
  recovery, Nutrition and adherence. Notes follow as the final section.
- Keep the existing direct-tap 1–10 scales and segmented enum controls.
- Replace steppers only for morning weight, sleep, and water with a prototype
  `TickRuler`. The number remains a visible tap-to-type control. Dragging adjusts
  an already-set value and commits once on release.
- Calories, steps, protein, carbs, and fats remain direct numeric inputs because
  users usually know those values before opening the app.
- Show neutral personal-history captions only after a numeric field has a value.
  Use up to 14 earlier reported values, excluding the target day. With fewer
  than three points, state that a range will appear with more logs. Do not use
  praise, goals, arrows, rankings, or directional colour.
- Show an explicit `Use previous value` button beside each eligible objective
  field. The action is never hidden behind a long press and never copies
  subjective ratings or enum fields.
- Keep current required-field behavior. Partial submission is deliberately out
  of this implementation because it changes coach data quality and was not part
  of the approved reduced scope.
- Queue a check-in locally only when the device is offline. Connected server,
  permission, or validation failures remain visible errors. Reconnect flushes
  queued rows using the existing update-or-insert persistence contract.

## Architecture

The existing `CheckInForm` remains the renderer for one section. A new
`CheckInPanel` composes its four sections in one scroll, while the existing
wizard path remains intact. A field registry owns the 16 UI identifiers and
their exact form and payload mappings so future UI changes cannot silently
remove a coach-facing value.

History is computed from the already-fetched React Query data; no SQLite mirror
is introduced. A small generic AsyncStorage outbox primitive backs both the
existing workout queue and the new check-in queue. Check-in persistence is
separated from the hook so direct submission and reconnect flushing use the
same function.

## Interaction and motion

`TickRuler` uses Gesture Handler and Reanimated shared values. The tick strip
tracks the finger on the UI thread; a clamped, rounded value is committed on
gesture end. It settles with a 400ms, 0.8 damping-ratio spring, or instantly
under Reduce Motion. One light haptic fires when the value commits; no per-frame
haptics or React state updates occur.

History captions reveal with the existing short fade only when motion is
enabled. This is state explanation, not decoration. The single-scroll layout
does not add entrance choreography.

## Accessibility

- Rulers expose one `adjustable` element with numeric value and clamped
  increment/decrement actions.
- Tap-to-type remains a visible labelled button/input path.
- Carry-forward actions are visible buttons with the exact previous value in
  their accessible labels.
- Existing rating and enum semantics remain unchanged.
- All sections use content-driven height and remain inside the screen scroll;
  the sticky action bar reserves its measured navigation inset.
- History charts are omitted from this trial. Captions are text and therefore
  available to assistive technology without a duplicate SVG description.

## Failure and offline behavior

- Offline submit durably replaces any queued payload for the same user/date and
  reports `Logged · saved on device`.
- Reconnect retries queued entries. Success removes the queued row and refreshes
  check-in queries.
- Online persistence errors stay on screen and do not masquerade as offline
  success.
- Existing drafts continue to protect unfinished input independently of the
  submission outbox.

## Acceptance gates

- The registry contains exactly the 16 production fields and production enum
  values.
- Both feature-flag branches render and remain tested.
- All numeric history calculations preserve `null` versus zero.
- Ruler dragging performs no React update until release.
- A queued same-day check-in supersedes the older queued payload.
- Typecheck, lint, Jest, UI contracts, and an iOS export pass.
- Gesture feel and frame rate remain a real-device acceptance check; simulator
  or Expo Go timing is not considered performance evidence.


# Guided daily check-in and workout logging

Implementation plan: [guided daily flows](superpowers/plans/2026-09-17-guided-daily-flows.md). Design rationale: [flow specification](superpowers/specs/2026-09-17-guided-daily-flows-design.md).

## Daily check-in

The guided flow uses the existing draft's four steps: readiness, recovery, adherence and review. The first three show only the current section. Continue checks the current section; Save on the review screen validates and submits the complete record.

Energy, stress, hunger and nutrition retain their exact 1–10 values. Workout performance appears only when the chosen workout status requires it. Morning weight and additional measurements are optional disclosures. Sleep and water use direct numeric entry with quick choices instead of a draggable ruler. Choosing a quick value replaces unfinished typing, and leaving a section commits valid numeric text before it unmounts.

Review provides a way back to each section. Collapsing optional details does not clear values. Existing date selection, historical records, account isolation, draft persistence, offline delivery, retry and receipt behavior remain the data boundary.

## Workout logging

The main surface shows one current set. Other sets and Add a set are in the Sets disclosure. Completing an exercise shows an explicit next action: continue to the next unfinished exercise, or review the workout when no unfinished exercise remains. Completed sets stay editable, with a return to the exercise summary.

Overview manages exercise selection, adding an exercise and reviewing a partial workout. The compact rest dock keeps timer controls available, with advanced settings on demand. Opening review does not save or mark unfinished work complete. Existing timestamps, set IDs, previous-value copying, undo, draft recovery and offline saves remain authoritative.

The exercise-name field participates in the native sheet's keyboard handling. The shared sheet opens correctly from an initially hidden state, restores focus when dismissed, and measures its title and close action separately from the scrolling body. Explicit snap sizing supports both plain and scrollable sheet content.

## Verification

Implementation and available verification are complete. TypeScript and standard lint passed without warnings. All 118 Jest suites passed: 857 tests, zero failures. UI contracts passed for 187 source files. Fresh iOS, Android and web exports passed.

Eight real browser journeys passed across dark/light appearances at 390 × 844 and 320 × 568, with no captured runtime errors. They cover validation and focus, optional measurements, numeric replacement and correction, review editing, exact check-in submission values, set completion, retained edits to completed sets, next-exercise guidance, adding an exercise, and partial-workout review. Overview geometry checks confirm that the title never overlaps its scrolling content. The captures use fictional intercepted data.

See the [screenshots](redesign/evidence/guided/README.md) and [verification record](redesign/evidence/guided/verification.json), which includes command results, source hashes and bundle hashes. Independent reviews approved the implementation and subsequent keyboard, sheet lifecycle and header corrections. Work remains in the current checkout; it has not been deployed.

To reproduce the browser journeys against a local Expo server using fictional Supabase configuration:

```sh
node scripts/capture-redesign.mjs --url http://localhost:8088 --screens checkin,workout --themes dark,light --exercise-flows --output docs/redesign/evidence/guided/phone
node scripts/capture-redesign.mjs --url http://localhost:8088 --screens checkin,workout --themes dark,light --exercise-flows --width 320 --height 568 --output docs/redesign/evidence/guided/compact
```

The capture runner intercepts fixture writes and checks the submitted check-in values. It exercises numeric replacement, optional disclosure, review editing, exercise completion, completed-set editing, next exercise, adding an exercise and partial-workout review. It records checkpoints, errors and fictional payloads in the capture manifest. See [capture setup](redesign/evidence/README.md) for fixture-server configuration.

Native device checks still need to cover keyboard placement, VoiceOver/TalkBack, Dynamic Type, haptics and app interruption using the updated Maestro flows. Browser evidence does not establish native behavior or close the existing release gates.

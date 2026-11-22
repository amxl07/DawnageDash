# Dawnage premium mobile experience — master design

**Status:** Proposed complete redesign plan, prepared 2026-09-15. The refined Dawnage direction is the recommended default; it is not represented as a user-approved visual mockup.

**Product:** The existing mobile app, a client experience for human-led fitness coaching on iOS and Android.

**Outcome:** Make joining Dawnage, understanding today, reporting a day, and completing a workout feel clear, personal, tactile, and dependable.

**Supporting specifications:** [Research](../../redesign/2026-09-15/research-and-decisions.md), [design system](../../redesign/2026-09-15/design-system-and-motion.md), [journeys](../../redesign/2026-09-15/journey-specifications.md), [quality and rollout](../../redesign/2026-09-15/production-quality-and-rollout.md), [implementation roadmap](../plans/2026-09-15-premium-experience.md).

## 1. Product thesis

Dawnage should feel like a personal coaching practice with excellent instruments. A client opens it to know what matters, report their experience, and carry out an assigned plan. The visual system should express confidence through hierarchy, legibility, and exact behavior.

The daily loop is:

~~~mermaid
flowchart LR
    A[Join and understand coaching] --> B[See today's next useful action]
    B --> C[Record your day]
    B --> D[Follow the assigned workout]
    C --> E[Receive a factual receipt]
    D --> E
    E --> F[Review patterns and the coach's actual plan updates]
    F --> B
~~~

The differentiator is the human coaching relationship. The app should show real coach identity and actual plan provenance where available. It must distinguish a record reaching the server from a coach reading it. There is no invented chat feed, response deadline, readiness score, or automated coaching recommendation in this release.

“Premium” has observable consequences:

- A returning client can identify the next relevant action immediately.
- Touch feedback begins immediately, and gesture-driven content follows the finger.
- A saved draft survives normal navigation and interruption; the UI never calls memory-only work saved.
- Progress tells the truth about dates, coverage, missing observations, and sources.
- Large text, reduced motion, poor connectivity, and compact phones receive complete designs.
- Common tasks need fewer decisions without losing the information coaches rely on.

## 2. People and contexts

These are design hypotheses for validation, not invented research participants.

| Context | Need | Design response |
| --- | --- | --- |
| New coached client | Understand the service and reach a useful first action | Three short setup stages, optional tutorials, immediate first Home |
| Returning client | Repeat a familiar check-in without feeling ignored | Stable field order, factual personal context, visible receipt |
| Client training in a gym | Enter a set quickly with one hand and divided attention | Large weight/reps inputs, current-set focus, persistent rest controls |
| Client with intermittent connectivity | Know what is safe and what the coach can actually access | Durable draft and queue states, retry, explicit synced status |
| Client using large text or a screen reader | Complete the same workflows independently | Reflow, named controls, accessible alternatives to gestures |
| Client whose plan is missing or changing | Understand actual availability | Honest partial states, no fabricated assignment or schedule |

Support English initially while keeping new copy in named message constants, dates/numbers locale-aware, and layouts tolerant of longer strings. Additional languages are a separate translation deliverable, not claimed by this redesign.

## 3. Three directions considered

| Direction | Structure and personality | Strength | Trade-off |
| --- | --- | --- | --- |
| **Refined Dawnage — recommended** | Editorial Home, a personal daily record, and focused workout instruments; graphite/coral with a fully designed light appearance | Fits human coaching, preserves brand recognition, allows exceptional craft without replacing the product | Requires disciplined reduction of repeated cards and stronger state coordination |
| Health Ledger | Dense, quiet lists and charts, native grouped settings, minimal branded expression | Excellent for scanning history and expert users | The coaching relationship and first-run experience can feel administrative |
| Immersive Coach | Large full-screen prompts, one decision at a time, expressive transitions | Strong guided introduction and clear focus | Too many transitions for 16 daily fields; returning users pay for the theatrical structure repeatedly |

Use the first direction. Borrow the ledger's precision for data and the guided approach only where someone is learning or making a consequential choice.

## 4. Source precedence and constraints

The latest explicit request authorizes a substantial redesign plan. For existing behavior, actual code and the approved 2026-08-31 single-scroll specification are the baseline. The older mobile/plans/08 and /09 briefs contain useful intent but disagree about field counts, partial submission, and presentation.

The plan resolves those disagreements explicitly:

1. There are **16 check-in fields**, not 12.
2. Preserve their labels, order, payload keys, enums, ranges, and current required-field rules.
3. Preserve single-scroll as the default and the existing four-step wizard as the temporary rollback path.
4. A partial **draft** is allowed. A partial **submission** that bypasses required validation is not added.
5. Historical ranges use reported observations. Fourteen entries are not necessarily fourteen calendar days.
6. Motion may show a transient ruler value on the UI thread; the domain form still commits once at gesture end.
7. Never auto-fill subjective answers. Copying objective values remains a deliberate, visible action.

Project-wide constraints for every implementation task:

- Application changes stay inside mobile; web, backend, and database work are separately scoped dependencies.
- Keep Expo SDK 54 and the installed native dependency family for the core redesign.
- Keep iOS and Android functional; iOS 26 glass is an enhancement, not a requirement.
- Keep the existing Supabase authentication, role boundaries, and onboarding_step completion threshold of 3.
- Keep all 16 check-in fields and the current required-field, enum, and payload contracts.
- Keep device-local reporting dates; freeze an editor's target date until the user explicitly changes it.
- Keep existing workout V2 and legacy readers; do not add wire-format fields in the core redesign.
- Use semantic theme tokens; add no application color literals outside src/theme.
- Ship light/dark, large text, reduced motion, loading, empty, error, and offline states with each journey.
- Do not claim exactly-once server delivery, cross-device conflict resolution, or coach read receipts without supporting contracts.

The old Expo Go constraint is respected for feature compatibility. Production performance must still be measured in a release-equivalent native build. A cloud-built preview on physical devices is a viable route on this machine; a simulator is not currently available.

## 5. Information architecture

Keep the existing five destinations for the first redesign release. This avoids simultaneously changing navigation, content, and workflow semantics.

| Visible destination | Existing route | Responsibility |
| --- | --- | --- |
| Home | app/(app)/(tabs)/index.tsx | Today Brief, next action, saved day, next session, concise progress |
| Check In | app/(app)/(tabs)/check-in.tsx | Daily Record, history-date entry, review and receipt |
| Plans | app/(app)/(tabs)/plans.tsx | Training/nutrition and actual coach instructions |
| Logs | app/(app)/(tabs)/logs.tsx | Workout history and saved-session entry |
| You | app/(app)/(tabs)/more.tsx | Existing More content with a clearer personal label; Profile, assessment, measurements, settings |

Check In remains a destination showing editable or saved daily content; its tab must not submit or open an action menu. Tabs retain their labels, order, and navigation state. Workout is a pushed focused task with a clear exit and recovery, not a sixth tab.

Renaming/restructuring Plans and Logs into a combined Train tab is a later information-architecture experiment. It is not mixed into this release.

Use native stack navigation for hierarchy. Retain the current JavaScript tab implementation until a small installed-SDK native-tabs verification demonstrates parity for Android back, labels, safe areas, theme preference, keyboard, and state restoration. Newer Expo examples are not copied into SDK 54 without checking their version.

## 6. The four major experiences

### Onboarding: an introduction to an actual coaching relationship

Keep the persisted three-stage milestone: goal, coaching rhythm, setup review. Use spacious selection rows, optional on-demand video, a concise explanation of the daily/weekly loop, and a final editable recap. Hydrate saved selections. Moving Back changes presentation, not completed milestones.

The detailed 87-question assessment remains a separate, resumable Profile journey. Show its genuine progress on Home without making it a fourth mandatory onboarding stage. Request reminders after someone experiences value, not during account creation. See the [full onboarding specification](../../redesign/2026-09-15/journey-specifications.md#onboarding-and-account-access).

### Home: Today Brief

Replace the dashboard's repeated card stack with a deliberate composition:

1. Date and personal greeting, with small truthful coach identity.
2. One prominent next-action surface.
3. Today's saved or pending record and a compact week navigator.
4. One next-session summary grounded in the actual assigned plan.
5. At most two factual observations; deeper history is a deliberate secondary view.
6. Quiet assessment/setup work when incomplete.

Draft recovery takes priority over starting a new task. Queued work stays visible but does not prevent unrelated actions. A missing measurement request never removes a usable check-in action.

Weight direction is neutral. Hardcoded targets such as 10,000 steps or six workouts are removed from the new Home unless an authoritative assigned target exists. Existing legacy formulas are not silently relabeled; new screen selectors have explicit names and coverage.

### Check-in: Daily Record

Use one scrollable record with the existing Readiness, Recovery, Adherence, and Notes sequence. Add a compact date/save-status strip, strong section hierarchy, precise numeric instruments, neutral history captions, and a persistent submit area.

The pleasure comes from immediate control response and meaningful reflection. It does not depend on answer-by-answer animation. Show a factual receipt after submission, retain it on the selected day, and distinguish “Saved on this device” from “Saved and synced.”

An optional Review action exposes all values without adding a mandatory extra step to daily submission. Invalid submission moves focus to the actual invalid field. The existing wizard remains a release fallback sharing exactly the same model and persistence.

### Workout: Workout Focus

The active set becomes the visual center. Show the prescription and previous values nearby, a large current-set editor, and compact completed/future set rows. Keep exercise swipes as an accelerator with explicit navigation alternatives.

A rest dock remains available without taking over the screen after every set. Pause, resume, skip, and extend are deliberate controls. Finish opens an accurate review that retains incomplete work and explains pending sync.

Do not call the time since the logger screen opened “Workout duration.” The core release removes that misleading summary metric. True persisted session timing is a separate versioned contract decision.

## 7. Visual and interaction direction

The existing coral and graphite identity remains recognizable. The redesign changes hierarchy, typography, grouping, and control behavior more strongly than it changes the logo or palette.

- Use large, clear titles and spacious editorial grouping.
- Reserve enclosed surfaces for independently actionable objects, summaries, and modal tasks.
- Use a single strong action color per screen; semantic errors and successes also carry text/icons.
- Use quiet borders for structure and stronger boundaries for controls.
- Keep glass in navigation/control layers where the platform supports it. Data cards and forms stay legible on stable surfaces.
- Use platform typography on iOS, existing Inter on Android, and existing Poppins only for selected hero metrics/brand expression.
- Keep native scrolling and navigation behavior. Do not add parallax, ambient loops, or entrance cascades to frequently visited screens.

The [design-system specification](../../redesign/2026-09-15/design-system-and-motion.md) defines exact starting values. These are design targets to validate, not claims that Apple's HIG mandates a particular spring or palette.

The [screen blueprints](../../redesign/2026-09-15/visual-direction-and-screen-blueprints.md) make the proposed compositions and microcopy concrete. They are low-fidelity design instructions; matched rendered frames and native interaction evidence remain F01 deliverables.

## 8. Features by release priority

| Priority | Deliverable | Why it belongs |
| --- | --- | --- |
| P0 | Correct onboarding/error/role routing, profile preservation, draft durability, truthful sync, mobile/web workout compatibility evidence | The UI cannot be trusted without these |
| P1 | Today Brief, Daily Record, Workout Focus, improved setup and assessment entry | The core experience transformation |
| P1 | Accessible shared controls, measured keyboard/safe-area behavior, both themes, meaningful receipts | Quality across every interaction |
| P2 | Interactive chart inspection, date-qualified comparisons, optional rest preference, context menus with visible equivalents | Adds useful depth after core journeys pass |
| Separate extension | Native tabs or broader SDK upgrade | Needs version/device compatibility evidence; core redesign remains shippable without it |
| Separate extension | Coach reply thread, reliable multi-device conflicts, HealthKit/Health Connect, widgets/Live Activities | Requires backend/native contracts, privacy decisions, and new validation |

No generated AI coach, camera-based food estimate, competitive leaderboard, new readiness score, mandatory health permissions, or new question set is included.

## 9. Measures of success

Targets below are hypotheses for the first validation cycle; no baseline or improvement is claimed.

| Measure | Initial target | Measurement |
| --- | --- | --- |
| Find next action on Home | At least 7 of 8 formative participants identify it without help within 5 seconds | First-click task; report exact sample, not population inference |
| Finish setup | Median under 2 minutes excluding account verification and optional video | Timed prototype/native tasks |
| Repeated check-in | At least 7 of 8 complete unaided; median completion time no worse than current baseline; lower perceived repetition burden | Counterbalanced baseline/new tasks with identical data |
| Correct save-status understanding | All participants distinguish draft, queued, synced | Ask who can currently see the entry |
| Log three prescribed sets | At least 7 of 8 complete without navigation confusion or accidental completion | One-handed scenario with realistic keyboard use |
| Recovery | No lost acknowledged draft in the controlled interruption matrix | Automated race tests plus physical-device runs |
| Accessibility | All primary tasks completable with VoiceOver and TalkBack; no critical blocker at 200% text | Manual task scripts on both platforms |
| Runtime craft | Meet the measured performance budgets in the quality specification | Release-equivalent builds, declared devices, saved traces |

After formative testing, run a 7–14 day opt-in diary study to assess repetition and real interruption behavior. Retention effects require a longer controlled rollout and are not inferred from beautiful screens or a small usability sample.

## 10. Delivery shape and decisions

The roadmap first secures contracts and creates matched visual baselines, then builds shared components, then moves through onboarding, Home, Check-in, and Workout. Every journey includes its unhappy paths at implementation time.

Three concrete design checkpoints are required before broad UI implementation:

1. Matched Home, Check-in, Workout, and setup frames in dark/light, including at least one compact/large-text variant.
2. An interactive prototype of ruler/type entry, set completion/rest, and keyboard/exit behavior.
3. A review against the current app's actual rendered baseline, with differences recorded.

These are planned outputs, not generated screenshots attached to this document. No rendered native baseline was available during this planning run.

The remaining product choices have recommended defaults, so they do not block this plan:

| Choice | Default |
| --- | --- |
| Aesthetic | Refined Dawnage, graphite/coral; complete light mode; respect the saved system/light/dark preference |
| Navigation | Existing five routes; label More as You; retain links and deep-link behavior |
| Check-in mode | Single scroll; existing wizard available for rollback |
| Submission | Deliberate single submit, optional review, existing required-field rules |
| Runtime | SDK 54 for core work; evaluate native enhancements independently |
| Workout duration | Omit misleading duration; do not add metadata to V2 in this release |
| Coaching messages | Show actual identity and plan notes only |

External release dependencies are explicit: private progress-photo storage and migration, supported auth redirects, coach RPC availability, and compatible workout readers on the coach web app. Planning these dependencies does not modify or deploy them.

## 11. Definition of the intended end state

A client can create or recover an account, finish or resume setup, understand Home, submit or edit a daily record, train from an assigned plan, recover interrupted work, and recognize whether records have synced. Those journeys feel like one product in appearance, language, motion, and behavior.

The source is modular enough to keep polishing it, and the release is supported by real device evidence. That combination is the standard this plan uses for production-grade design.

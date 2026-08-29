# Dawnage Mobile UI/UX Design Specification

**Date:** 2026-08-29

**Status:** Approved design direction; pending written-spec review

**Target:** `mobile/` Expo application
**Compatibility decision:** Preserve Expo SDK 54 and Expo Go compatibility

## 1. Purpose

This specification defines a production-grade UI/UX evolution for the Dawnage mobile app. It consolidates the strongest interaction, layout, motion, and information-design ideas found across the ten repositories in `FitnessAPPRepos` while preserving Dawnage's existing brand and technical foundation.

The intended product character is **calm, coach-led, and high-performance**:

- Calm during planning, reflection, and progress review.
- Focused and information-dense only during an active workout.
- Coach-led wherever a real coach or coach-created plan exists.
- Fast, accessible, responsive, and reliable across compact phones, notched devices, large text, and reduced-motion settings.

This is an independent implementation. GPL, AGPL, and unlicensed source repositories are design references only.

## 2. Constraints and explicit decisions

### 2.1 Technical constraints

- Keep Expo SDK 54, React Native 0.81, React 19, and Expo Router 6.
- Remain usable in the App Store version of Expo Go and on the project's supported iOS baseline.
- Use the already-installed Reanimated, Gesture Handler, Safe Area Context, Expo Blur, Expo Haptics, Gifted Charts, and Gorhom Bottom Sheet packages.
- Do not introduce Skia, migrate the styling system, replace Expo Router, or upgrade to Expo 56/57 as part of this work.
- Prefer GPU-friendly opacity and transform animation. Avoid animating layout properties in frequently updated components.
- Preserve existing user changes in the working tree and evolve current components instead of replacing the application shell.

### 2.2 Product constraints

- Keep the five-tab information architecture: Home, Check In, Plans, Logs, and More.
- Preserve Dawnage's black, white, and red identity, existing typography, light/dark themes, and 4/8 spacing rhythm.
- Use a dawn-inspired glow or gradient sparingly for important progress or completion moments; it is not a general card background.
- Do not combine the reference apps' unrelated pastel, olive, neon, or multi-theme palettes.
- Retain 44pt minimum interactive targets and make compact layouts stack rather than shrink controls below that threshold.
- Coach identity surfaces are conditional on usable coach data. Database and RLS changes are dependencies, not implicit UI work.

### 2.3 Non-goals

- No web dashboard redesign.
- No backend schema migration in the UI implementation pass.
- No social network, wearable companion, workout-programming language, or AI-plan generator copied from a reference repository.
- No decorative continuous motion, Skia effects, parallax-heavy dashboards, or animated chart values during scrolling.
- No claim of WCAG or screen-reader compliance until physical-device testing is complete.

## 3. Audit method and evidence boundary

Each repository was reviewed at the repository level across:

- Routes, screens, navigation, and primary user flows.
- Shared visual components, theme/tokens, and responsive layout strategy.
- Motion, gestures, timers, sheets, haptics, and state transitions.
- Loading, empty, error, offline, and persisted-state behavior.
- Accessibility and test coverage visible in source.
- Framework/version compatibility and license posture.

Local screenshots and visual assets were used where available. This was a source and static-visual audit, not a full runtime capture of every repository on every supported platform. Phase 0 therefore includes reference-state capture and physical-device baselining before Dawnage implementation begins.

### 3.1 Current Dawnage evidence

| Area | Source evidence | Design consequence |
|---|---|---|
| Top safe area | `mobile/src/theme/layout.ts` calculates `statusBarHeight()` but `screenContentPadding()` always returns ordinary top spacing; `mobile/src/components/ui/Screen.tsx` consumes that padding while app headers are hidden | Root, child, and editor screens can begin under a notch/status bar; apply the safe-area contract centrally |
| Nested inset | `mobile/app/(app)/profile.tsx` also adds `insets.top` inside assessment content | Remove or opt out of the nested inset when the centralized contract lands |
| Week strip | `mobile/src/components/dashboard/WeekStrip.tsx` renders seven controls with 44pt minimum dimensions inside a padded card | The controls cannot fit on a 320dp device; make the strip horizontally scrollable |
| Consistency grid | `mobile/src/components/dashboard/ConsistencyGrid.tsx` uses approximately 12pt cells with minimal hit slop | Cells cannot be individual accessible actions; make the card the action and expose detail separately |
| Set editor | `mobile/src/components/logger/ExerciseSlide.tsx` combines fixed columns with two wide steppers | Use adaptive row/stacked set layouts based on width and font scale |
| Segmented control | `mobile/src/components/ui/SegmentedControl.tsx` animates width and height | Replace frequent layout animation with transform-based motion |
| Progress bar | `mobile/src/components/ui/ProgressBar.tsx` animates percentage width | Animate a full-size fill using scale or clipping |
| Numeric motion | `mobile/src/components/ui/AnimatedNumber.tsx` uses a long spring and 400ms layout transitions | Shorten real value changes and avoid replay on ordinary renders |
| Timer completion | `mobile/src/components/logger/CircularTimer.tsx` begins its completion mark at zero scale | Begin near final size with opacity and a short settle |
| Exercise swipe | `mobile/src/components/logger/SwipeableSlide.tsx` can choose direction from translation after a velocity threshold | Decide from projected position/velocity and add boundary resistance |
| Tab material | `mobile/app/(app)/(tabs)/_layout.tsx` uses blur intensity 24 without a reduced-transparency fallback | Cap blur at 20 and provide a semantic solid surface |
| Verification | `mobile/package.json` contains no mobile test scripts and Expo lint has no stable checked-in configuration | Add deterministic test/lint commands before release gating |

## 4. Repository-by-repository findings

### 4.1 FitnessApp

**Stack and posture:** Flutter UI template; no clear root license found.

**Strengths:** Friendly onboarding, illustrated workout discovery, workout detail hierarchy, progress photography, rounded cards, and approachable chart composition. The light pastel blue/purple visual language is coherent within the template.

**Weaknesses:** Several screens rely on low-contrast text, small labels, generous empty space, and static presentation. Motion and interaction state coverage are limited, and the visual style would weaken Dawnage's higher-performance identity.

**Dawnage adoption:** Use onboarding rhythm, workout-detail grouping, photo-progress framing, and friendly empty-state composition as conceptual references. Do not copy code, colors, or typography.

### 4.2 Flexify

**Stack and posture:** Flutter; MIT license; mature local/offline architecture and meaningful test coverage.

**Strengths:** Fast workout logging, strength/cardio support, exercise search and filtering, reorder behavior, persistent timers, configurable navigation, and clear graphs. It demonstrates how a functional training app stays quick under repeated daily use.

**Weaknesses:** The visual system is utilitarian and motion is limited. Dense controls can feel more like a tool than a guided coaching product.

**Dawnage adoption:** Use its search/filter model, reorder behavior, timer persistence, offline resilience, and rapid logging principles. Wrap those mechanics in Dawnage's calmer hierarchy.

### 4.3 Kenko

**Stack and posture:** Jetpack Compose; GPLv3.

**Strengths:** Editorial cream/olive hierarchy, distinctive plan cards, large set numbers, drag selectors, swipe deletion, predictive-back behavior, and polished theme transitions. It gives workout plans personality without relying on imagery.

**Weaknesses:** Four visual palettes add product complexity, and portions of the visual identity conflict with Dawnage's existing brand.

**Dawnage adoption:** Recreate the card hierarchy, large ordinal treatment, icon personality, drag feedback, and spatial transition principles independently. Keep one Dawnage light/dark system rather than adding theme families.

### 4.4 LiftLog

**Stack and posture:** Expo 57 / React Native 0.86; AGPLv3; local-first with AI plans, social surfaces, and internationalization.

**Strengths:** Native-feeling controls, compact statistics tiles, progressive-overload insights, clear safe-area behavior, feature onboarding, deliberate motion, and strong test posture.

**Weaknesses:** Its current platform versions are incompatible with the approved Expo 54 constraint. Social and AI breadth is beyond the present Dawnage scope.

**Dawnage adoption:** Independently implement the information hierarchy for insights, plan explanation, and progressive overload. Do not port code or upgrade Dawnage to match its stack.

### 4.5 PerfectGymCoach

**Stack and posture:** Kotlin Compose/Material 3 Expressive; GPLv3; includes Wear OS, Health Connect, and adaptive layouts.

**Strengths:** The strongest motion reference in the collection: full-screen rest mode, animated timer completion, meaningful haptics, shared transitions, adaptive panes, and highly visible workout state.

**Weaknesses:** Some expressive and wavy treatments would be visually noisy in Dawnage and expensive to reproduce faithfully on the approved stack.

**Dawnage adoption:** Use its rest-timer state model, completion choreography, haptic timing, and adaptive layout concepts. Omit decorative shape morphing and platform-specific effects.

### 4.6 SwiftLift

**Stack and posture:** SwiftUI targeting iOS 17; GPLv3.

**Strengths:** Restrained native composition, clear numeric transitions, direct safe-area usage, and a simple offline tracker flow.

**Weaknesses:** Very limited motion breadth, tests, and explicit accessibility support. It is an iOS-only reference.

**Dawnage adoption:** Use its restraint, native rhythm, and concise progress presentation. Do not inherit its platform limitation or validation gaps.

### 4.7 demos / reactiive

**Stack and posture:** 125 animation examples under a custom commercial-use license for app implementations; redistribution of the source library is restricted. Sixty-one examples directly depend on Skia and sixty-four do not.

**Strengths:** Broad motion vocabulary covering action trays, animated counters, lists, blur/tab indicators, checkboxes, drag-sort, sheets, online/offline state, timers, swipe cards, and toasts.

**Weaknesses:** It is a demonstration collection, not a cohesive product. Many effects are ornamental, and Skia-dependent examples are incompatible with the approved constraint.

**Dawnage adoption:** Select only non-Skia, purpose-driven Reanimated patterns. Preserve any required notices. Prefer an independent Dawnage implementation even where reuse would be permitted.

### 4.8 fitness_workout_app_flutter_3_ui

**Stack and posture:** Larger Flutter UI template related to FitnessApp; no clear root license found.

**Strengths:** Broader screen coverage for meals, sleep, progress photos, calendar, and workouts. Useful as an inventory of consumer-fitness screen archetypes.

**Weaknesses:** Shares the small-text, low-contrast, pastel-heavy, and largely static limitations of FitnessApp.

**Dawnage adoption:** Use flow coverage and content grouping as references only. Do not copy code or import its visual system.

### 4.9 liftosaur

**Stack and posture:** React PWA with React Native wrapper; AGPLv3; highly feature-rich with extensive tests.

**Strengths:** The best workout-logger information architecture in the collection: current/next-set highlighting, previous results, warmups, content-derived input widths informed by font scale, plate calculation, persistent timers, and bottom-sheet utilities.

**Weaknesses:** Dense layouts, inconsistent colors, and programming complexity can overwhelm ordinary users.

**Dawnage adoption:** Recreate the current-set hierarchy, previous-result context, adaptive input sizing, warmup treatment, timer persistence, and plate-calculator access. Keep advanced controls progressive and visually quieter.

### 4.10 skulpt

**Stack and posture:** Expo 57 / React Native 0.86 / Reanimated 4.5; GPLv3; closest architectural reference to Dawnage.

**Strengths:** Local-first organization, health integrations, FlashList, bottom sheets, charts, and a centralized safe-area/layout helper.

**Weaknesses:** Its framework versions exceed Dawnage's approved baseline. Its safe-area helper assumes a custom header and cannot be copied without adapting the contract.

**Dawnage adoption:** Use the centralized layout concept, sheet composition, and local-first screen boundaries. Do not migrate to Unistyles or FlashList without measured evidence that Dawnage's current list sizes need them.

## 5. Experience architecture

### 5.1 Navigation

The tab bar remains:

1. **Home** — daily coaching and readiness.
2. **Check In** — fast structured daily input.
3. **Plans** — training and nutrition prescriptions.
4. **Logs** — workout and history review.
5. **More** — profile, measurements, media, feedback, settings, and secondary tools.

The tab shell must preserve navigation state. A repeated tap on the active tab returns that tab to its root or scrolls its root screen to the top. Tab changes remain immediate; they do not receive decorative slide animations.

### 5.2 Home

Home follows this priority:

1. Greeting, date, and coach identity or unassigned-coach state.
2. Primary daily action: continue check-in, start today's plan, or review coach feedback.
3. Streak and seven-day strip.
4. Latest coach update when available.
5. Consistency summary.
6. Primary body/performance metrics.
7. Collapsed deeper insights.

Only one primary CTA is visually dominant at a time. Cards with no useful data use an actionable empty state rather than zero-filled charts.

### 5.3 Check In

The check-in remains a four-step focused workflow:

1. Readiness and energy.
2. Sleep and recovery.
3. Nutrition/adherence.
4. Notes and confirmation.

Requirements:

- Persistent progress and restoration after interruption.
- Autosave after stable input rather than on every gesture frame.
- “Same as yesterday” shortcut where the data model supports it.
- Clear back behavior without discarding saved answers.
- Validation appears next to the affected field and at the step CTA.
- Submission success is concise; failure preserves entered values and exposes retry.

### 5.4 Plans

- Training and Nutrition remain an accessible segmented selection.
- Coach-written plans show avatar/name, last-updated time, and provenance when available.
- Plan days use expandable cards with a clear status: upcoming, today, active, or complete.
- Today's plan owns the primary Start/Continue Workout CTA.
- Exercise substitutions and detailed prescriptions live in sheets so the list retains context.
- Nutrition follows the same hierarchy but does not mimic workout-specific dense controls.

### 5.5 Workout logger

The logger becomes a focused mode:

- Header: elapsed session time, exercise position, and finish action.
- Exercise summary: title, prescription, previous-session result, and optional coach note.
- Set list: large set number, status, target, previous result, weight/reps or duration controls, and completion control.
- Current set is visually dominant; completed sets recede; upcoming sets remain readable.
- Exercise navigation supports buttons and velocity-aware horizontal swipe.
- A persistent rest timer survives screen changes and can expand to a full-screen state.
- Finish produces a concise summary with volume, duration, completed sets, PRs, and optional note.

Regular-width layouts may keep weight and repetitions in one row. Compact widths or large text use stacked set cards. No value control may shrink below a 44pt target.

### 5.6 Progress and More

- Measurements prioritize trend, latest value, change, and source/date before the full chart.
- Progress photos use consistent capture framing, explicit privacy language, comparison mode, and empty guidance.
- Weekly feedback shows submission status and coach response as a thread when backend support exists.
- Secondary tools remain grouped by user goal rather than by implementation module.

## 6. Layout and safe-area system

### 6.1 Screen archetypes

Every screen declares one of four archetypes:

- `root`: tab-root screen with tab bar.
- `child`: pushed detail screen.
- `editor`: focused form/logger screen.
- `sheet`: modal sheet content.

For `root`, `child`, and `editor`, the scroll/content start position is:

```text
top padding = safe-area top inset + theme base spacing
```

For `sheet`, the containing sheet owns safe-area behavior and content receives only local spacing. Full-screen overlays such as the rest timer and photo viewer continue to own their explicit insets. Nested screens must not add another `insets.top` value.

This fixes the current mismatch where `statusBarHeight()` exists but `screenContentPadding()` does not use it.

### 6.2 Responsive modes

Responsive mode is derived from both available content width and font scale:

- **Compact:** width below 360dp, or font scale at/above 1.30.
- **Regular:** width from 360dp through 767dp with font scale below 1.30.
- **Wide:** width at/above 768dp.

Behavior:

- Compact layouts stack metric pairs and set controls.
- Regular layouts use two-column metric cards only when each card retains readable text and 44pt actions.
- Wide layouts center content in a readable container and may use two panes for list/detail flows.
- Text wraps; it is not truncated when the information is needed to complete the current task.
- Dashboard and form content use a maximum readable width; workout logging may use more horizontal space.

### 6.3 Known layout corrections

- The seven-day strip becomes horizontally scrollable with the selected day brought into view. Each day remains at least 44pt wide/high.
- Consistency cells are visual marks, not individual 12pt buttons. The whole card is a single accessible action that opens history.
- Logger input groups stack in compact/large-text mode.
- Metric pairs collapse to one column in compact/large-text mode.
- Long localized strings and coach names can wrap without overlapping icons or actions.
- Keyboard-visible forms retain access to the active field and submit action.

## 7. Visual system

### 7.1 Color and surfaces

- Retain Dawnage semantic color tokens for background, elevated surface, text, secondary text, border, accent, success, warning, and danger.
- Red is reserved for the primary brand/action accent and destructive semantics where context is explicit.
- Success and warning states include icon/text treatment, never color alone.
- Charts use semantic series colors that pass contrast checks in both themes.
- Blur is a progressive enhancement. Tab and sheet blur intensity must not exceed the existing system's intended limit of 20 and must fall back to a solid surface when reduced transparency is enabled or blur is unavailable.

### 7.2 Type

- Retain Inter for functional UI and Poppins for selected high-level display moments.
- Body and control text follows system scaling.
- Large display values may cap growth only when an adjacent accessible textual equivalent remains readable.
- Numeric values use tabular figures where comparison benefits from alignment.
- Labels are concise; supporting text explains consequence or next action rather than repeating the label.

### 7.3 Shape and depth

- Keep the existing radius scale and use continuous corner curves on supported iOS surfaces.
- One elevation system defines flat, raised, overlay, and modal layers.
- Avoid nested cards unless the inner surface is interactive or semantically distinct.
- Hairline borders and tonal separation are preferred to heavy shadows in dark mode.

## 8. Motion and haptics

### 8.1 Principles

Motion is allowed only when it provides feedback, communicates spatial continuity, or explains a state change. It must be interruptible, short, and removable under Reduced Motion.

- High-frequency response: 120–180ms.
- Normal state transition: 180–220ms.
- Deliberate numeric/content transition: 220–280ms.
- Rare completion sequence: up to approximately 500ms when composed of short stages.
- Prefer opacity and transform.
- Springs use no visible bounce for controls and small values; expressive settling is reserved for rare completion feedback.
- Haptics fire at the state change, not after the visual animation completes.

### 8.2 Motion corrections

| Existing behavior | Required behavior | Reason |
|---|---|---|
| Segmented thumb animates width and height | Equal segments use translate/scale; wrapping variants crossfade or spring between measured positions | Avoid high-frequency layout animation |
| Progress fill animates percentage width | Render full-size fill and animate horizontal scale/mask | Keep work on the UI thread/GPU path |
| Number transitions can last about one second | Use 220–280ms critically damped transitions only for real value changes | Faster comprehension and less distraction |
| Timer completion tick starts at scale zero | Start near 0.92 with opacity, then settle to 1 | Avoid harsh pop and preserve continuity |
| Swipe threshold uses translation direction after a velocity trigger | Use projected position and velocity direction, with edge resistance | Match gesture intent and platform physics |
| Heatmap cells animate with a long diagonal cascade | Use one capped first-load fade/color reveal; never replay on refresh | Avoid a 400ms+ wall of micro-motion |
| Blur is always active | Respect Reduced Transparency and use a solid semantic surface | Accessibility and predictable rendering |

### 8.3 Approved motion moments

- Set completion: 120–180ms check/row-state transition plus selection haptic.
- Exercise swipe: velocity-aware, interruptible spring with rubber-band resistance at boundaries.
- Rest completion: concise ring completion, fade, and check; notification haptic aligned with zero.
- Expand/collapse: 180–220ms with opacity and transform where possible.
- Connectivity/save state: compact pill or toast with no repeated entrance if the state remains unchanged.
- Workout/PR completion: rare celebratory treatment; no confetti loop.
- Skeleton loading: functional, subtle, and static when Reduced Motion is enabled.

### 8.4 Rejected motion

- Skia-only effects.
- Continuous decorative loops.
- Animated tab changes that slow navigation.
- Per-cell heatmap animation on every data refresh.
- Bouncy numeric inputs.
- Chart redraw animation while the user scrolls.
- Parallax or 3D effects without a task benefit.

## 9. Component architecture

### 9.1 Foundations

- `Screen`: owns archetype, safe-area, horizontal gutter, max width, keyboard behavior, and scrolling contract.
- `useResponsiveLayout`: exposes compact/regular/wide mode, content width, and font-scale state.
- Motion tokens: duration, easing, spring, reduced-motion, and haptic mapping.
- Surface tokens: background, card, overlay, border, and blur fallback.

### 9.2 Shared components

- Adaptive metric grid/card.
- Accessible week strip.
- Noninteractive consistency visualization plus history action.
- Transform-based segmented control.
- Transform-based progress bar.
- Status pill for saving, saved, offline, and failed states.
- Standard empty, loading, partial-data, and error states.
- Coach identity/provenance component with unassigned fallback.
- Adaptive set card/editor.
- Persistent rest timer and full-screen timer state.
- Exercise navigation with button and gesture parity.
- Standard sheet header, dismissal, and keyboard-safe content.

Each component exposes semantic state and callbacks; it does not own API fetching. Screen/container hooks supply domain data so components can be tested in isolation.

## 10. State, data, and failure behavior

### 10.1 UI state model

Every data-driven surface distinguishes:

- Initial loading.
- Loaded with data.
- Loaded but empty.
- Partially loaded/stale.
- Offline with locally available data.
- Save pending.
- Save failed with retry.
- Permission or backend capability unavailable.

Optimistic set completion and check-in input must preserve the user's local action. A failed synchronization displays a retry state without reverting the visible value unless the server explicitly rejects the content.

### 10.2 Coach dependencies

Coach identity, plan provenance, and feedback surfaces render only from authorized data. If RLS or schema support is unavailable:

- Show an explicit unassigned/unavailable state where it helps the user.
- Do not fabricate a coach identity.
- Keep plan content usable without the identity enhancement.
- Track database/RLS work as a separate dependency before enabling coach threads.

### 10.3 Privacy-sensitive media

- Progress-photo capture states state the storage/privacy consequence before first use.
- Permission denial provides a settings path and a non-blocking cancellation route.
- Upload progress, retry, cancellation, and local draft behavior are visible.
- Photo comparisons never expose unrelated gallery media.

## 11. Accessibility requirements

- Minimum 44x44pt interactive targets on both platforms.
- Screen-reader labels describe action and state; selected/completed/expanded states are announced.
- Swipe-only actions always have visible button alternatives.
- Focus moves to the new step heading, opened sheet title, or validation summary after structural changes.
- Dynamic Type is validated at default, 1.30, and largest practical accessibility size.
- Reduced Motion replaces movement with immediate state change or short opacity transition.
- Reduced Transparency replaces blur with semantic solid surfaces.
- Color is never the only indicator of completion, failure, intensity, or selection.
- Charts include textual summaries and do not require precise touch exploration to obtain the primary insight.
- Form errors remain visible and are programmatically associated with their fields.

## 12. Quality and validation strategy

### 12.1 Automated coverage

- Unit tests for safe-area padding, responsive-mode selection, timer state, swipe decision logic, and reducers.
- Component tests for compact/regular rendering, large text, selected/disabled/error states, and accessibility labels.
- Integration tests for check-in persistence, optimistic save/retry, workout continuation, and rest-timer persistence.
- Maestro smoke flows for sign-in/onboarding, check-in, opening today's plan, logging/finishing a workout, measurements, and progress-photo permission handling.
- TypeScript and lint checks must run without auto-modifying configuration during verification.

### 12.2 Device matrix

- Compact iPhone with notch.
- Dynamic Island iPhone.
- Compact Android device with status/navigation insets.
- Large Android phone.
- Tablet/wide layout where supported.
- Light and dark appearance.
- Default and large Dynamic Type/font scale.
- Reduced Motion and Reduced Transparency.
- Online, slow, offline, partial-data, and failed-save states.

### 12.3 Performance budgets

- Gestures and workout interactions target smooth frame delivery on a mid-range supported device.
- Long lists render only the visible work and avoid replaying entrance animations during ordinary updates.
- No animation creates per-frame JavaScript state updates.
- Charts defer expensive rendering until their section is visible where practical.
- Image thumbnails are sized for their display slots and full-resolution images are loaded only for comparison/viewer states.

### 12.4 Visual review

For each changed screen:

1. Capture the existing baseline at the same device size and data state.
2. Capture the implemented result.
3. Compare spacing, clipping, type, hierarchy, contrast, radii, and interaction state side by side.
4. Correct visible regressions before moving to the next wave.

Screenshots supplement but do not replace interactive, accessibility, and physical-device testing.

## 13. Delivery waves and gates

### Phase 0 — Baseline and reference ledger

- Capture Dawnage's current primary flows on at least one iOS and one Android target.
- Record reference screenshots/states used from each repository.
- Create the license/pattern ledger.
- Record performance and accessibility baselines.

**Gate:** Baselines and the device matrix are reproducible.

### Phase 1 — Layout and accessibility foundations

- Correct the centralized safe-area contract.
- Add responsive width/font-scale modes.
- Correct week strip, consistency grid, metric grid, and compact logger layout.
- Add reduced-transparency behavior and consistent screen max widths.

**Gate:** No content is obscured by status bars; compact and large-text layouts retain 44pt actions without overlap.

### Phase 2 — Motion and shared components

- Normalize motion tokens and reduced-motion behavior.
- Correct segmented control, progress bar, numbers, timer completion, swipe physics, and heatmap reveal.
- Add shared state, coach provenance, adaptive set, and sheet components.

**Gate:** Motion is interruptible, purposeful, and free of high-frequency layout animation.

### Phase 3 — Home and Check In

- Reorder Home around today's action and coach state.
- Ship accessible week/history interaction, consistency summary, and adaptive metrics.
- Refine check-in progress, autosave, validation, restore, and retry states.

**Gate:** Both flows pass compact/large-text and online/offline smoke tests.

### Phase 4 — Plans and workout logger

- Refine Training/Nutrition plan hierarchy and provenance.
- Ship adaptive set cards, previous-result context, exercise navigation, persistent rest timer, and finish summary.
- Add optional advanced utilities such as plate calculation behind progressive disclosure.

**Gate:** A complete workout can be started, interrupted, resumed, finished, and synchronized without losing user input.

### Phase 5 — Progress, media, feedback, and coach surfaces

- Refine measurements, progress photos, weekly feedback, and More grouping.
- Enable coach thread/identity enhancements only when backend authorization is ready.

**Gate:** Permission, empty, loading, partial, offline, and failure states are complete.

### Phase 6 — Production hardening

- Complete automated tests, physical-device review, accessibility checks, performance profiling, and visual comparisons.
- Remove deprecated components only after all consumers migrate.

**Gate:** Release checklist passes on the defined device/state matrix with no critical accessibility, clipping, data-loss, or gesture defects.

## 14. Success criteria

The redesign is complete when:

- No primary screen begins beneath the status bar or Dynamic Island.
- All primary tasks remain usable on a 320–359dp-wide device and at font scale 1.30 without clipped controls.
- All actions meet the 44pt target rule or are represented by a larger parent action.
- A user can complete check-in and a full workout in online and interrupted/offline conditions without data loss.
- Reduced Motion and Reduced Transparency produce complete, comprehensible experiences.
- Coach identity and plan provenance appear when authorized and degrade cleanly when unavailable.
- Motion follows the approved moments and timing ranges, with no Skia requirement.
- The automated smoke suite covers the primary flows, and physical-device verification covers the declared matrix.
- License-sensitive patterns are independently implemented and documented.

## 15. Risks and mitigations

- **Large visual scope:** Deliver in gated waves and keep the existing navigation/data architecture.
- **Dirty working tree:** Commit each wave narrowly; never sweep unrelated files into UI commits.
- **Expo 54 limitations:** Prototype every package-specific behavior inside the current project before relying on it; prefer existing dependencies.
- **Coach-data authorization:** Separate conditional UI from RLS/schema enablement and avoid fabricated content.
- **Motion overuse:** Centralize tokens, audit every animation against a functional purpose, and test Reduced Motion early.
- **Compact-device regressions:** Treat compact width plus large text as a first-class layout, not a final QA case.
- **Reference licensing:** Maintain the pattern ledger and avoid source copying from GPL, AGPL, and no-license repositories.

## 16. Implementation handoff boundary

This document defines the approved product and interaction architecture. After written-spec review, a separate implementation plan will map each delivery wave to exact files, tests, verification commands, and review checkpoints. No database migration, dependency upgrade, or unrelated refactor is authorized by this specification.

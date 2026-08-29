# 06 — UI/UX Uplift, sourced from 10 open-source fitness apps

Every claim below was read out of the repos in `~/Documents/DAWNAGE/FitnessAPPRepos`,
not recalled. Where a first read was wrong, the correction is noted.

---

## 1. What was analysed

| Repo | Stack | Size | Verdict |
|---|---|---|---|
| **demos** (reactiive.io) | Expo · Reanimated 4.3 · Skia | 128 animations | **Highest value.** Not a fitness app — an animation cookbook. |
| **skulpt** | Expo SDK 57 · Reanimated 4.5 · Unistyles · gifted-charts | 1 app | **Closest stack.** Value is *structure*, not motion. |
| **LiftLog** | Expo SDK 57 · RN 0.86 · Skia · gifted-charts (+ .NET backend) | 221 tsx | Same stack as us. Corroborates chart choice. |
| **liftosaur** | React 19 PWA + RN wrapper | 1068 ts/tsx | Most feature-rich. Bottom-sheet-driven IA. |
| **PerfectGymCoach** | Kotlin · Compose | 66 `AnimatedVisibility` | **Best motion design.** Concentrated in workout execution. |
| **Kenko** | Kotlin · Compose | 92 files | 4 named colour schemes (Default/Serene/Twilight/Zestful). |
| **Flexify** | Flutter | 78 dart | Optimised for speed/density, not motion (11 animations total). |
| **FitnessApp** | Flutter | 39 dart | UI-kit template. |
| **fitness_workout_app_flutter_3_ui** | Flutter | 58 dart | **Same design as FitnessApp** — identical palette. |
| **SwiftLift** | SwiftUI | 31 swift | Minimal (9 `withAnimation`). Low value. |

**Corrections to my first pass:** LiftLog is React Native (I initially read it as .NET —
that's only the backend). And skulpt's 32 `Layout` hits were **`LayoutChangeEvent`**,
not layout animations — it uses **zero**.

---

## 2. The constraint that shapes everything

**64 of the 125 demos depend on Skia — and Skia is not in Expo Go.**

We deliberately pinned SDK 54 so the app runs in App Store Expo Go on physical
devices (there is no usable simulator on this machine). Adopting a Skia demo
forfeits that entire development loop.

**Rule for this plan: pure-Reanimated only.** Every item below was individually
verified Skia-free. Three tempting demos are explicitly excluded for this reason:
`floating-bottom-bar`, `telegram-theme-switch`, `duration-slider`.

---

## 3. Cross-repo findings

1. **Both same-stack apps chose `react-native-gifted-charts`** (skulpt, LiftLog).
   Independent corroboration of our Phase 3 decision.
2. **Motion clusters in workout execution.** PerfectGymCoach's top files are
   `DoublePaneWorkout` (20), `SinglePaneWorkout` (12), `WorkoutPages` (10),
   `RestScreen` (9), `AdaptiveCircularTimer` (8). Our logger is the flattest
   screen we have — that is the gap.
3. **Nobody animates lists.** Not one repo uses `LinearTransition` / `entering` /
   `exiting` on list content. A cheap, uncontested win.
4. **The two Flutter templates share one palette** (`#92A3FD` blue → `#C58BF2`
   purple on `#F7F8F8`). Light, pastel, gradient-pair heavy — the opposite of
   Dawnage. Take the *screen archetypes*, never the colour.

---

## 4. Borrow list — prioritised

### P0 · Foundations (highest value / lowest risk)

**1. Odometer number — `demos/animated-count-text`**
Each digit is a 0–9 column; `translateY: -height * digit` with a spring, and
`LinearTransition` absorbs digit-count changes (9 → 10 grows a column).
> Replaces our `AnimatedNumber`, which interpolates a float and re-renders
> `toFixed()` every frame — that reflows text and defeats tabular alignment.
Targets: streak, weight, total volume, PR numbers, dashboard metrics.
Spring: `{ duration: 1000, dampingRatio: 0.9 }`.

**2. Sliding-thumb SegmentedControl — `skulpt/components/forms/fields/base/segmented`**
An absolutely-positioned thumb animates `translateX` **and `width`** via
`withTiming`, measured per-segment with `onLayout`. Animating width is what makes
unequal label lengths work.
> Ours fills/unfills each segment independently — no motion between states.
Targets: workout status, digestion, Plans tabs, Profile tabs.

**3. `screenContentPadding(archetype)` — `skulpt/unistyles.ts`**
One function returning correct insets for `'root' | 'child' | 'editor' | 'sheet'`,
composed from platform header height + safe area, including a **Dynamic Island
correction** (`insets.top > 50 → subtract 6`).
> We hand-roll insets in every screen. This is the single best structural idea
> in any of these repos.
Also worth taking: `space(v) => v * 4` as a function alongside our named tokens.

**4. List layout animations — uncontested**
`LinearTransition` on rows plus `FadeIn`/`FadeOut` on insert/remove. Targets:
check-in history, workout logs, measurements, media grid, logger sets.
Must respect `useMotion()` — no-op under reduced motion.

### P1 · Signature screens

**5. Consistency heatmap — `demos/github-contributions`**
Cells spring in on a **diagonal wave**: `delay = 45 * (weekIndex + (6 - dayIndex))`,
with `interpolateColor` level0 → level colour. Spring
`{ mass: 1.1, damping: 13, stiffness: 150 }`.
> Replaces "consistency 24%" — a year of check-ins as a glanceable grid. For an
> account with 64 check-ins across 271 days this is dramatically more legible.
Levels map to workout status, not just presence: none / rest / cardio / done.

**6. Circular rest timer + completion sequence — `PerfectGymCoach/AdaptiveCircularTimer`**
Their own comment specifies it: *(i) ring fills rapidly non-wavy, (ii) ring fades
away, (iii) a rounded chunky tick scales in* — chained via `finishedListener`.
Plus a **wavy** ring while running that goes smooth on completion, so the ring's
texture encodes state.
> Ours is a flat linear bar. In Reanimated this is `withSequence` +
> `withTiming(..., cb)`; the wave is an animated SVG path (react-native-svg, no Skia).
Keep our timestamp-driven `endsAt` — their model has the background-drift bug.

**7. Dedicated Rest screen — `PerfectGymCoach/RestScreen`**
Rest is a *state of the workout*, not a widget in the corner. Full-screen takeover
with the timer, next exercise, and last set's numbers.

### P2 · Interaction polish

| # | Borrow | From | Target |
|---|---|---|---|
| 8 | Swipe cards | `demos/swipe-cards` | Logger exercise carousel (keep visible prev/next) |
| 9 | Checkbox interactions | `demos/checkbox-interactions` | Set-complete tick |
| 10 | Blurred bottom bar | `demos/blurred-bottom-bar` | Tab bar (`expo-blur`, already installed) |
| 11 | Online/offline pill | `demos/online-offline` | Outbox "waiting to sync" |
| 12 | Staggered stat cards | `demos/staggered-card-number` | Dashboard first load |
| 13 | Calendar days | `demos/calendar-days` | Check-in date picker / backfill |

### P3 · Depth

14. `@gorhom/bottom-sheet` (skulpt) replacing our `Modal`-based `Sheet` — real
    detents, drag, and keyboard handling.
15. `@shopify/flash-list` (skulpt) for the long lists.
16. Shared-element photo transition (`demos/instagram-shared-transition`) →
    grid → full-screen viewer.
17. Bottom-sheet-driven editing (liftosaur) — it has ~8 dedicated sheet components
    rather than pushing screens for every edit.

---

## 5. Explicitly NOT taking

| Rejected | Why |
|---|---|
| Flutter templates' pastel gradient palette | Wrong brand. Dawnage is dark, high-contrast, one accent. |
| Kenko's 4 named themes | Scope creep. Light/Dark isn't even verified on device yet. |
| Unistyles migration | Our theme works and is contrast-measured. Churn without payoff. |
| **Any Skia demo** | Breaks Expo Go — forfeits the whole dev loop on this machine. |
| PerfectGymCoach's interval-based timer | Ours is timestamp-driven and survives backgrounding. Theirs doesn't. |
| Double-pane tablet layouts | Portrait-locked phone app. |

---

## 6. Sequencing

**Wave 1 — foundations ✅ DONE.** Items 1–4 shipped:
- `AnimatedNumber` rebuilt as a true odometer (UI-thread, no per-frame JS).
- `SegmentedControl` given a thumb that travels in 2D (x, y, width, height).
- `src/theme/layout.ts` — `screenContentPadding(archetype, insets)` +
  `statusBarHeight` (Dynamic Island correction) + `horizontalInset`; wired into
  `Screen` via an `archetype` prop and applied across the tab roots, logger and
  check-in. Removed the hand-rolled `bottomInset={80}` / `{126}` magic numbers.
- `useListMotion()` + `AnimatedFlatList`, applied to measurements, logs and media.

Open item for device verification: `DIGIT_WIDTH_RATIO = 0.62` in
`AnimatedNumber.tsx` is the one eyeball value — tabular figures are monospaced
so a single ratio holds per family, but it should be confirmed on a real screen.

**Wave 2 — signature moments ✅ DONE.** Items 5–7 shipped:
- `ConsistencyGrid` — diagonal-wave heatmap on the Dashboard, below the week
  strip. Levels encode workout STATUS (done / cardio / rest / logged-no-training
  / missed), not GitHub's intensity, and reuse WeekStrip's colours.
- `CircularTimer` — SVG ring with the three-stage completion chained via
  `withTiming` callbacks. **The wavy ring was deliberately dropped**: it would
  mean regenerating a ~120-point SVG path in a worklet every frame.
- `useRestTimer` — timer state extracted so the compact card and the
  full-screen view share one timer. Keeps our `endsAt` timestamp model.
- Full-screen rest is **opt-in** (a Focus button), not automatic: PerfectGymCoach
  takes the screen over because their flow is guided one-exercise-at-a-time;
  ours is a free-form swipeable logger where a takeover would block the next set.

**Wave 3 — polish ✅ DONE (items 8–12; 13 deliberately dropped).**
- **8** `SwipeableSlide` — pan between logger exercises, card follows the finger,
  edge resistance at the ends. `activeOffsetX`/`failOffsetY` so it never steals
  vertical scroll. Prev/next buttons and dot pager remain — swipe is an
  accelerator, never the mechanism.
- **9** Set-complete tick now enters on a spring `LinearTransition` instead of
  snapping (from `demos/checkbox-interactions`).
- **10** Blurred tab bar via `expo-blur` — **iOS only**. Android's blur is weaker
  and far more expensive to composite, so it keeps the solid surface.
- **11** Outbox pending pill enters/exits with `FadeInDown`/`FadeOutUp`.
- **12** Dashboard metric grid staggers on first load.

**13 (calendar picker) dropped, not deferred.** The heatmap now exposes ~21
weeks of tappable days and the week strip covers this week — a calendar would be
a third route to the same action. Rejected on redundancy, not effort.

**Wave 4 — structural ✅ DONE (14 + 17 shipped; 15 and 16 rejected on evidence).**

- **14 + 17** `Sheet` rebuilt on `@gorhom/bottom-sheet`. Gains drag-to-dismiss,
  a backdrop that fades with the drag, snap points, and — the reason it was
  worth doing — real keyboard handling for the form sheets. Pure JS over
  Reanimated + Gesture Handler, so Expo Go still works.
  All five consumers migrated to `SheetFlatList` / `SheetScrollView`; a plain
  RN scrollable inside a sheet fights the sheet's own pan gesture. Removed the
  now-harmful `KeyboardAvoidingView` from `MeasurementSheet` — it double-shifts
  against gorhom's `keyboardBehavior="interactive"`.

- **15 FlashList — REJECTED on measured data.** The live account has 21 workout
  logs, 9 measurements, 2 photo sets. FlashList exists to recycle hundreds of
  rows; on 9–21 it is pure churn, and FlashList v2 would also cost us the
  `itemLayoutAnimation` added in Wave 1. The only long lists are the country
  (177) and timezone (~600) pickers, which already have `getItemLayout` +
  tuned `windowSize` and are opened rarely.

- **16 Shared-element photo transition — BLOCKED, not deferred.**
  `sharedTransitionTag` was **removed in Reanimated 4** — verified absent from
  the entire installed package (4.1.7), not just the typings. Reproducing it
  means hand-rolling: measure the thumbnail rect, animate a full-screen overlay
  from it. That is ~100 lines of gesture and measurement code for a screen used
  weekly at most, so it is a deliberate open decision rather than silent work.

### Gates that apply to every item
- Pure Reanimated. No Skia.
- Every animation reads `useMotion()` and collapses under reduced motion.
- No hex outside `src/theme/`.
- `tsc` clean + both bundles green before moving to the next wave.
- Accessibility never regresses: the odometer must stay `accessibilityElementsHidden`
  with the value announced on the parent; the heatmap needs per-cell labels.

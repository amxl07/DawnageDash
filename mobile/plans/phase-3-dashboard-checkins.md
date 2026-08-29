# Phase 3 — The Daily Loop: Dashboard + Check-Ins

Web sources: `pages/Dashboard.tsx`, `hooks/useDashboardData.ts`, `pages/CheckIns.tsx`, `components/CheckInForm.tsx`, `components/CheckInDialog.tsx`, `components/CheckInTrendsChart.tsx`, `components/WeeklyCheckInTable.tsx`, `components/MetricCard.tsx`, `components/ProgressBar.tsx`, `lib/checkin-utils.ts`.

## 3a. Chart library decision (do first)
Evaluate `victory-native` (current XL version, Skia-based — pulls in `@shopify/react-native-skia`, heavier install but genuinely smooth and gesture-native) vs `react-native-gifted-charts` (pure RN/SVG, far lighter, less capable at interaction) against the needs: line chart (weight), grouped bar chart (3 series), donut (macros), tabs of small line/bar charts. Verify current Expo SDK compatibility for whichever you pick **before** committing — do not rely on remembered version support.

Pick ONE, justify in the summary, wrap it in `src/components/charts/` (`LineChart`, `BarChart`, `DonutChart`) so screens never import the lib directly.

The wrappers own these rules (§02.2, §03.A.6–7) so no screen has to remember them:
- Colors come from `theme.colors.chart[1..4]` — **the light and dark values differ and are not interchangeable**; the previous light values measured 1.37–2.74:1 and were invisible.
- **Multi-series charts differentiate by line style as well as color** — solid / dashed / dotted / dash-dot per §02.2. Color alone is not an acceptable encoding.
- Gridlines use the `border` hairline token, never a hardcoded grey.
- Every chart takes a required `summary` prop rendered as its `accessibilityLabel` — one sentence: `"Weight, last 7 days, down 0.8 kilograms, from 82.4 to 81.6"`. A chart with no text equivalent does not ship.
- Legends show the series **value**, not just its name, so the chart is readable without a tooltip on a phone.
- Series data is `useMemo`'d by the caller; the wrapper is `React.memo`.
- Under reduced motion, draw-on animations are skipped and the chart renders in its final state.

## 3b. Dashboard (Home tab) — read-only
Port `useDashboardData` verbatim (formulas in `01-data-contracts.md`). Layout top→bottom:
1. Greeting header ("Good morning, {first name}") + `Day {n} • Week {m}` badge.
1b. **Week strip (new — highest-value addition on this screen).** Seven dots, Mon→Sun for the current week, directly under the greeting: filled in the workout-status color when a check-in exists, hollow outline when missed, ringed for today, dimmed for future days. Each dot is a ≥44pt target that opens that day's check-in (past = edit, today = the check-in flow, future = disabled). It answers "how am I doing this week?" in one glance, costs no extra query (the data is already in `processCheckInHistory`), and is the single strongest habit-loop element a tracker can have. Accessibility: each dot labelled `"Tuesday 24 August, checked in, workout done"` / `"Thursday 26 August, no check-in"`; the row is not a color-only signal because the label carries the state.
2. 2×2 metric cards: Weight (kg, trend arrow, "Last 7 days"), Workouts (total tracked), Nutrition (avg score), Energy (x/10) — Poppins bold numbers, lucide icons (Weight, Flame, Trophy, Zap).
3. Weight trend line chart; Weekly Performance bar chart (last 7 days: performance/nutrition/energy, missed days = 0).
4. Macro Distribution donut (avg protein/carbs/fats grams, center total) — hide if all zeros.
5. Weekly comparison chart (workouts/avgNutrition/avgEnergy by week) if >0 weeks.
6. Current Week Progress card: glow ProgressBars — steps avg vs 10,000 (success), nutrition vs 10 (gold), workouts vs 6 (primary), weekly sleep hours vs 56 (success). Each bar shows `current / target` as text beside it — the bar's fill is never the only reading of the number.
- **If today has no check-in, a prompt card sits directly below the week strip**: "You haven't checked in today" + primary button → Check In tab. The dashboard is the landing screen; the day's one required action belongs above the fold, not one tab away.
- Empty state (no check-ins yet): "Welcome to Dawnage Coaching! 🎉" card + button to Check In tab. No WhatsApp/Resources menu.
- **Loading = skeletons shaped like the cards** (2×2 grid of card-shaped pulses, then chart-shaped blocks) — not a centred spinner. Error = message + Retry per §03.E.
- Pull-to-refresh invalidates the queries.
- Cards enter with a 250ms staggered fade+rise (~60ms apart) on first load only, not on every re-render; metric numbers count up over ~600ms. Both collapse to static under reduced motion (`useMotion()` from Phase 1 handles this).

## 3c. Check-In tab — the core habit screen
Two states, decided by whether a `daily_check_ins` row exists for TODAY (local date):

**Not yet checked in — the fast flow.** One scrollable screen (sectioned, not a multi-page wizard), warm greeting + streak counter at top (streak = consecutive days ending today/yesterday with a check-in; compute from `processCheckInHistory`).

**The <60s mechanism is prefill, not hiding fields.** Fourteen inputs on one screen cannot be *typed* in 60 seconds, but they can be *confirmed* in 60 seconds. So:
- **"Same as yesterday" chip, pinned at the top.** One tap fills every numeric field (weight, sleep, water, steps, calories, nutrition, energy, hunger, stress, macros) from the most recent check-in, leaving the user to adjust only what actually changed. This turns the screen from data entry into review — and it is why no field needs to be hidden from the coach. Show it only when a previous check-in exists; label it with the source date ("Same as Tue 26 Aug").
- **Every field prefills from the last entry anyway** (not just weight and sleep as originally specced) — the chip is the bulk version, the per-field prefill is the default.
- **Sticky bottom bar** inside the safe area: `Submit check-in` + a quiet `n of 14 filled` counter. Always enabled (empty submits are legal per web parity); scroll content gets a matching bottom inset so the last field never hides behind it.
- **Section headers group the ask**: *Body* (weight, sleep) · *Training* (status, performance) · *Nutrition* (score, calories, water, steps) · *How you feel* (energy, hunger, stress, digestion) · *More* (macros, notes — collapsed). Grouping is what makes fourteen fields feel like four decisions.

Inputs, in the web's field order, all optional except nothing (web allows fully empty submits; keep every field optional):
- Weight (kg): decimal Stepper ±0.1 with direct-entry tap, prefilled with last known weight.
- Sleep (h): Stepper ±0.5, prefill last value.
- Workout status: 4 big segmented buttons — **lucide icon + text label**: `Dumbbell` Done / `X` No / `Footprints` Cardio / `Moon` Rest (values `done|no|cardio_day|rest_day`). **No emoji** — these are controls, and emoji are font-dependent and unthemeable (§02.8). Each option is `accessibilityRole="radio"` with `accessibilityState.selected`. If Done or Cardio → reveal Performance 1–10 ScalePicker with a 200ms height+fade reveal.
- Nutrition score: 1–10 ScalePicker. Calories: numeric entry (numpad). Water (L): Stepper ±0.25. Steps: Stepper ±500 + direct entry.
- Energy / Hunger / Stress: 1–10 ScalePickers (compact rows, `accessibilityRole="adjustable"`). Digestion: 4 chips with lucide glyph + text (Normal/Bloated/Constipated/Diarrhea → `none|bloated|constipated|diarrhea`) — again no emoji, and the text label means the chip is never a color-only signal.
- **Keyboards (§03.C)**: `decimal-pad` for weight/water, `number-pad` for steps/calories/macros, `default`+multiline for notes. Steppers keep the keyboard closed entirely for the common path; long-press opens direct entry with a Done accessory. Every ScalePicker/Stepper/chip tap fires `selectionAsync()`.
- Optional collapsed "More" section: protein/carbs/fats (g) numeric, notes (multiline).
- Submit: build payload exactly per contract (numbers or null, LOCAL `yyyy-MM-dd`), insert; then the `package_start_date` fallback (contract §daily_check_ins). **The button disables and shows an in-place spinner for the whole round trip** — `UNIQUE(user_id, date)` makes a double-submit a hard error, so preventing it in the UI is mandatory, not cosmetic. On success: `notificationAsync(Success)` + a ~1.4s Reanimated celebration (checkmark burst) + one payoff line ("🔥 {streak}-day streak" / "↓{x} kg since Day 1") + `announceForAccessibility` of that same line so a screen-reader user gets the payoff too. Under reduced motion the celebration is a static checkmark and the haptic still fires. Emoji in this copy is fine — it's prose, not chrome.
- If a day was missed, the copy stays forward-looking ("Welcome back — today's a fresh start"), never guilt.

**Already checked in — summary/edit state.** Card summarizing today's values (weight, sleep, workout badge, scores) + "Edit today" button opening the same form prefilled (update by id — the DB UNIQUE(user_id,date) makes double-insert an error, so the row-exists check is mandatory). Lead the card with the streak and the day's best delta, so returning to an already-done day still feels like a reward rather than a dead end.

**History below the fold (segmented "Today / History" header — preferred over an endless scroll, so the daily action is never buried under a month of records):** the history list is a `FlatList` with memoized week rows and `keyExtractor` on row id (§03.D). metric cards (avg nutrition, avg performance, consistency %, weight progress per contract formulas), the trends chart (4 tabs: Weight/Scores/Activity/Wellness with All/30/14/5-day range filter), and week-grouped history cards (port the WeeklyCheckInTable mobile-card variant: Day n, date, workout badge, weight/cals/nutri/steps/sleep/digestion mini-grid, weekly AVG row). Tapping a past day opens the edit form locked to that date (backfilling past days is allowed, matching web; date picker capped at today).

## Acceptance criteria
- Against real data: dashboard numbers match the web app for the same account (spot-check weight, workouts, avg scores).
- **Time it twice, honestly**: a full check-in from cold open, (a) using "Same as yesterday" + adjusting two fields, and (b) filling every field from scratch. Report both numbers. (a) must be under 60s; if (b) is wildly over, say so rather than rounding it down.
- Submit → haptic + celebration + payoff line + screen-reader announcement; reopening shows the edit state; editing works; **double submit is impossible** (verify by rapid double-tap).
- Week strip states are all correct (checked-in / missed / today / future) and each dot navigates correctly.
- Streak, missed-day copy, and history grouping correct across a month boundary (test with seeded data if needed).
- Charts: legible in **both** themes (light chart colors are different values — confirm they aren't washed out), series distinguishable with color vision simulation or by line style alone, every chart has an `accessibilityLabel`.
- No emoji used as a control anywhere on these screens.
- §03 quick check passes; one screen traversed with a screen reader (name it). Both themes on every new screen. `npx tsc --noEmit` clean.

**STOP. Post summary (include chart-library decision + rationale). Wait for "continue".**

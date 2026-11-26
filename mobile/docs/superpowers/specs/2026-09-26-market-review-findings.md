# Dawnage mobile — market review findings (2026-09-26)

This is the **spec** for the plan set in
[`../plans/2026-09-26-market-review/`](../plans/2026-09-26-market-review/README.md).
Every task in that plan traces back to a finding here. Read this first. Implementers must not argue with the findings. If a task conflicts with this document, stop and ask the owner.

Scope: `mobile/` (Expo SDK 57, RN 0.86, React 19.2), branch `codex/native-ui-modernization` at `70c11b0`, plus the uncommitted work present on 2026-09-26.
Method: a full source read, the 2026-09-25 web-export screenshots in `docs/research/2026-09-25-native-daily-experience/evidence/`, and a competitor review (sources at the end). Limits: nobody ran the app on a physical device, and the screenshots come from the web export.

---

## 1. Overall grade: C+ (about 6/10)

Against 2026 coaching apps (Trainerize, Everfit, TrueCoach, Kahunas, Caliber, Future) and best-in-class trackers (Hevy, MacroFactor Workouts), the engineering is excellent and the product is thin. The thin parts are exactly where clients spend their time:

1. talking to their coach
2. logging quickly
3. seeing their own progress

| Area | Today | Market bar | Grade |
|---|---|---|---|
| Reliability / offline | Outbox, drafts, recovery, delivery receipts, 163 test files | Most coaching apps lose entries offline | A |
| Accessibility | WCAG-measured palette, 44/48pt targets, Dynamic Type reflow, announcements, Reduce Motion | Rarely done well | A− |
| Native feel | Native tabs, SF Symbols, iOS widgets, workout Live Activity, Health import | Hevy rebuilt in Liquid Glass / Material 3 (Jul 2026) | B+ |
| Visual design / brand | Clean, calm, generic and wordy | Hevy, Caliber, Future | C+ |
| Daily check-in | 16 required answers over 4 steps | One-tap habits, weekly forms, auto-imported data | C |
| Workout logging | One set at a time, every value typed | Pre-filled rows, one tap per set, PRs | C |
| Coach connection | Coach's name as text; weekly form is one-way | In-app messaging with voice/video | D |
| Nutrition | Read-only meal plan | Barcode, photo logging, Cronometer sync | D |
| Progress & motivation | Charts, photo ghost overlay, no PRs or milestones | PRs, achievements, strength score | C+ |
| Launch readiness | No native device run; backend holes; web break | — | D+ |

Nielsen heuristics (usability of what exists): **29/40, "Good"**.

| Heuristic | Score |
|---|---|
| System status | 4 |
| Match with the real world | 3 |
| User control | 3 |
| Consistency | 3 |
| Error prevention | 3 |
| Recognition over recall | 3 |
| Flexibility / efficiency | 2 |
| Minimalist design | 2 |
| Error recovery | 4 |
| Help | 2 |

## 2. Strengths to preserve (do not regress)

- **S1. Offline reliability.** `src/lib/outbox.ts`, `asyncOutbox.ts`, `features/checkin/checkInOutbox.ts`, workout drafts (`hooks/useWorkoutDraft.ts`), recovery screens, and receipts ("Saved and synced", "Saved on this device").
- **S2. Accessibility.** `src/theme/colors.ts` documents the measured contrast ratio for every colour. `HIT_SLOP_MIN`, `fontScale > 1.3` reflow, `accessibilityLiveRegion` and `useMotion()` are used throughout.
- **S3. Progress-photo ghost overlay.** `src/components/media/PoseGuide.tsx` shows last week's photo behind the camera.
- **S4. Native surfaces.** iOS widgets and the workout Live Activity (`src/features/native-surfaces/`), plus the Health import with a review sheet (`src/features/health/`).
- **S5. Rule:** subjective ratings never carry forward (`prefillFrom` in `src/features/checkin/model.ts`).
- **S6. Privacy rule:** Lock Screen content excludes exercise names and measurements (`activityContent` in `src/features/native-surfaces/model.ts`).

## 3. Findings (each has an ID used by the plan)

### F1 [P0] Launch blockers
The first three come from the 2026-09-25 audit. Re-verify them against the live database before acting.
- **F1a.** RLS is disabled on `workout_plans`, `meal_plans`, `weekly_progress_photos` and `food_items`, and `anon` has grants on them.
- **F1b.** Role escalation. `handle_new_user` copies `raw_user_meta_data.role` into `users.role`, and the "Users can update own data" policy has no `WITH CHECK`.
- **F1c.** The `progress_photos` bucket is public. `sqlmigrationfiles/2026-09-19_private_progress_photos.sql` has not been applied. The shared photo regex (`shared/progress-photos.ts:27`) accepts only lowercase `.jpg`.
- **F1d.** Mobile writes `workout_logs.content` as `{version:2, planDayNumber, exercises}`. The web (`client/src/pages/WorkoutLogs.tsx`, `client/src/components/WorkoutLogDialog.tsx`, `client/src/hooks/usePreviousWorkoutData.ts`) only understands JSON arrays. Coaches see nothing useful, and saving on the web wipes the log.
- **F1e.** The app has never run as a native build on a phone. `npm start` opens Expo Go (`--go`), but widgets, HealthKit, Health Connect and Live Activities need a development build.

### F2 [P0] The coach is invisible
- The coach appears only as "Coached by …" text (`src/features/home/TodayBrief.tsx:55`) and as `CoachStatusCard` in the You tab.
- There is no messaging.
- Weekly feedback history (`src/features/weekly/WeeklyFeedbackHistoryCard.tsx`) shows only the client's answers.
- WhatsApp is excluded by owner decision, so there is no channel at all.

Every competitor has in-app messaging:
- Trainerize: threads
- Everfit: voice messages
- Kahunas: voice notes and video feedback
- Caliber: form videos sent to the coach
- Future: its entire product is human coaches

A top churn reason (Coachway) is "the relationship quietly went cold".

### F3 [P1] The daily check-in is too long to do daily
- It has 16 required answers (`src/features/checkin/config/fields.ts`, `src/lib/checkin-validation.ts`), including calories, protein, carbs, fats, water, steps and notes.
- Step 1 shows weight plus two 1–10 grids, 20 buttons in total.
- The app offers no way to count the macros it requires.
- Health import covers weight, steps, water, calories and macros, but not sleep.
- **Owner decision (keep):** every applicable field stays required. The fix is to **fill fields automatically, with the values visible and editable**, never to make fields optional or skip them.

### F4 [P1] Logging a set is slow
In `src/components/logger/CurrentSetEditor.tsx`, a set takes about 6 taps:
1. tap weight
2. type it
3. tap reps
4. type them
5. close the keyboard
6. tap "Complete set"

- Fields start empty ("—"), and "Use previous" is an extra tap. Hevy and Strong pre-fill each set, so a repeat is one tap.
- There are no ± buttons.
- Adding an exercise is free text with no suggestions (`WorkoutOverviewSheet.tsx`).
- There is no PR detection.
- The all-sets list is hidden behind "Sets (n) · Manage".

### F5 [P1] The Nutrition tab has nothing to do
`src/features/nutrition/nutrition-screen.tsx` is read-only. Meal rows already carry `calories/protein/carbs/fats` (`Meal` in `src/hooks/usePlans.ts`), so "ate as planned" check-offs could produce the check-in macros without any typing.

### F6 [P2] The end of a workout is a receipt, not a reward
`src/components/logger/WorkoutSummary.tsx` shows completed sets, incomplete sets and "Volume … kg × reps".
- It has no PRs.
- It has no comparison with the last session.
- The `celebration` motion token in `src/theme/tokens.ts` is defined but unused.

### F7 [P2] Progress is hidden and doesn't show "since you started"
- Measurements and Photos sit under the You tab.
- Home uses text where a trend belongs. `weekly-recap-card.tsx:68` reads: "1 weight observation this week. A change needs two dates."
- The Measurements chart never mounts in the web capture. It shows "Chart loads when it comes into view." (`MeasurementProgress.tsx:119`), which is caused by the lazy-mount logic in `app/(app)/measurements.tsx:66-120`.
- Coachway's top churn reason is that clients can't see what they've accomplished.

### F8 [P2] Too many words, and the navigation is uneven
- Helper copy explains every screen. Examples:
  - `today-action.ts:55`: "Take a moment to reflect. Build a clear record of your day."
  - `WorkoutOverviewSheet.tsx:25`: "Choose an exercise to view its sets. Your entries stay in place."
- The tabs are Home · Check In · Training · Nutrition · You:
  - A whole tab goes to a once-a-day form.
  - Home also has a profile button (`TodayBrief.tsx:60`) that duplicates the You tab.
- Code readability:
  - `app/(app)/(tabs)/index.tsx:37-86` derives about 15 values inline during render.
  - `app/(app)/logger.tsx` holds about 15 `useState`s and 300–400-character JSX lines.

## 4. Standout features (differentiators)

Context: Future dropped its AI trainer in June 2026 to go all-human, and only 10% of consumers prefer AI guidance to a human coach (Les Mills 2026). Dawnage's moat is **a real coach plus rich daily data**. The features below make the coach feel present and make data cheap for the client to give.

| ID | Feature | Why it stands out |
|---|---|---|
| X1 | Coach comments pinned to a specific day, set, photo or weekly answer | Competitors have an inbox; none pin feedback to the exact data point |
| X2 | Form-check video from the set screen, answered by the coach | Caliber has videos to the coach; tying one to the exact set is rare |
| X3 | Plan-first food logging (tick meals, macros calculated) | Competitors are calorie-counter-first; this removes the macro typing |
| X4 | Readiness nudge using the coach's own substitutions | 2026 trend (Apple Readiness Score, Sept 2026) with the coach still in charge |
| X5 | Voice/dictation set entry ("8 at 60") | Only small solo trackers (Liftly, GhostFit) do voice logging; no coaching app does |
| X6 | Monthly "Chapter": then/now photos, trend, PRs | The ghost overlay makes the photos line up; it tackles the top churn reason |
| X7 | GLP-1 muscle-preservation mode | Up to 40% of GLP-1 weight loss can be muscle; coaching apps don't support it |
| X8 | Opt-in coach cue on the Lock Screen Live Activity | Builds on the existing Live Activity at small cost |

**Skip:** AI-generated workouts, a social feed, streak shaming (agrees with `plans/07-differentiation-strategy.md`).

## 5. Deliberately deferred (not in this plan)

| Item | Why deferred | Revisit when |
|---|---|---|
| Pounds (lb) support | Current clients use kg; conversion touches every weight display | A non-kg client signs up |
| Supersets | Needs plan-schema support on the web Template Builder | The coach side supports supersets |
| Session duration | Draft has no start time; low value | After Phase 3 ships |
| Full voice check-in / Siri App Intents | Needs native Swift/Kotlin (see `docs/research/2026-09-25-hands-free-daily-use/`) | Its own plan |
| Push notifications for coach replies | Needs a server (Edge Function + Expo push) | After Phase 2 data flow is proven (spec in Phase 2 Task 2.7) |
| Coach-configurable required check-in fields | Owner chose all-required | Owner changes the rule |
| Apple Watch, Android widgets, AI plan assistant | Large; not needed to reach the market bar | After launch |

## Sources

- [Everfit vs Trainerize vs TrueCoach (2026)](https://blog.everfit.io/everfit-vs-trainerize-vs-truecoach)
- [ABC Trainerize 2026 roadmap](https://www.trainerize.com/blog/abc-trainerize-2026-product-roadmap/)
- [Everfit August 2026 features](https://blog.everfit.io/august-2026-new-features-micronutrient-tracking-team-inbox-more)
- [Everfit March 2026 features](https://blog.everfit.io/march-2026-everfit-new-features)
- [Hevy July 2026 update](https://www.hevyapp.com/community-updates/july-26/)
- [MacroFactor Workouts launch](https://macrofactor.com/mm-jan-2026/)
- [Caliber Strength Score](https://caliberstrong.com/blog/introducing-strength-score/)
- [Kahunas review 2026](https://coachway.io/articles/kahunas-review/)
- [Future drops AI personal training](https://athletechnews.com/future-pulls-the-plug-on-ai-personal-training-commits-to-human-coaches/)
- [Apple health & fitness, Sept 2026](https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/)
- [Why online coaching clients quit](https://coachway.io/articles/why-online-coaching-clients-quit/)
- [Online coaching statistics 2026](https://coachway.io/articles/online-fitness-coaching-statistics/)
- [GLP-1 tracking apps compared](https://learnmuscles.com/blog/2025/11/27/6-best-glp-1-tracking-apps-compared-which-app-actually-works-in-2026/)
- [Liftly voice logging](https://apps.apple.com/us/app/liftly-voice-workout-logging/id6752257498)

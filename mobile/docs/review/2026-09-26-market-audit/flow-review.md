# Mobile workflow and feature review — 26 September 2026

## Evidence and limits

Read-only review of the **current working tree**, including uncommitted and untracked source. This is source-based workflow evidence for the parent review, not a live usability or visual audit. No app navigation, tests, server startup, production queries, source edits, or network research were performed by this reviewer. Current screenshots and native runtime validation remain separate. Older audit reports and source comments asserting market superiority were not used as evidence.

## What is actually present

The app has **5 primary tabs**: Home, Check In, Training, Nutrition, and You (`src/components/navigation/AppTabs.tsx:16`). There are **17 non-layout route files**, including the `logs` redirect alias (`app/(app)/logs.tsx:7`) and public Health access rationale (`app/health-access.tsx:7`). Treat this as 16 route destinations, including a utility screen, rather than 17 independent features. Training contains both Plan and History views (`src/features/training/training-screen.tsx:29`).

| Journey | Current implemented scope | Source-backed assessment |
| --- | --- | --- |
| Account entry | Email/password sign-in, signup, email verification and resend cooldown, forgot/reset password | More complete than a signup-only prototype. Inline validation, focus targeting and announcements are present. Real mail/deep-link delivery was not checked. |
| Initial setup | 3 stages: goal, explanation/practice, start now or wait for coach; timezone review | A strong reduction in initial commitment. First submitted check-in starts Day 1. |
| Coaching assessment | Separate profile tab, 87 questions across 10 sections, 6 explicitly required questions; section navigation, draft save, resume | Rich coach intake, but long and unbranched. It is **not an 87-question onboarding gate**. |
| Home | Prioritized recovery/check-in/plan action, program day, week record strip, weekly recap, next session, recent weight/sleep, assessment prompt | Good continuity and recovery awareness. Mainly descriptive feedback. |
| Daily check-in | Four stages; 15 required fields for rest/no-training days, 16 for completed/cardio days; dates/history/backfill, review/edit, drafts, offline queue, explicit health import and previous-value controls | Comprehensive data collection; substantial recurring effort. |
| Training | Assigned plans, template preview, exercise targets, notes, video links, substitutions, update timestamp; Plan/History switch | Useful coach-to-client delivery. No client plan generation/adaptation mechanism found. |
| Workout logger | Weight/reps, duration mode, optional RPE, warm-up/work sets, previous-value copy and undo, substitutions, add/remove/undo sets, custom exercise names, rest timer, plate calculator, review/save/edit, offline recovery | The most developed task-specific feature. Advanced programming and longitudinal analysis remain limited. |
| Nutrition | Prescribed daily calorie target, up to five meal categories, per-meal macros, supplements, coach notes, listed-total vs target explanation | A prescription viewer. No food diary, food search/barcode scanner, meal completion logging, or substitution workflow is implemented in this screen. |
| Progress | Five circumference metrics with All/1M/3M/6M charts and comparisons; weight summary from daily records; progress photos and baseline comparison | Useful body-change record. Progress is split between Home, Measurements, Photos and Training History. |
| Weekly feedback | 18 optional prompts over five stages; prefilled steps/water/stress averages, drafts, submission/history | Strong submission handling; the return path for a coach's reply is missing from the mobile flow. |
| Profile/settings | Basic details and coaching information, assessment, program dates, reminders, device/light/dark theme, sign-out | Account self-service and help paths are sparse. |

Key inventory sources: `app/(auth)/login.tsx:80`, `app/(app)/onboarding.tsx:24`, `src/features/onboarding/SetupStage.tsx:43`, `src/lib/questionnaire-data.ts:22`, `src/components/questionnaire/QuestionnaireWizard.tsx:315`, `src/features/checkin/config/fields.ts:28`, `src/components/weekly/steps.ts:18`, `src/lib/weekly-feedback.ts:103`.

## Strongest current qualities

1. **Progressive commitment is well considered.** Setup is three stages with explicit start timing, and the practice energy question is isolated from persistence (`app/(app)/onboarding.tsx:75`, `src/features/program/CheckInGuideSheet.tsx:8`). The assessment can be revisited separately in Profile (`app/(app)/profile.tsx:366`). Preserve this separation.
2. **The app respects unfinished work.** Home surfaces workout/check-in drafts and blocked delivery before starting new records (`src/lib/today-action.ts:31`), the editor flushes drafts before navigation (`src/features/checkin/CheckInEditorScreen.tsx:105`), and receipts distinguish device-saved from synced (`src/features/checkin/components/CheckInReceipt.tsx:24`). These are useful daily-life features; real recovery behavior still needs runtime testing.
3. **The logger separates prescription from performance.** Targets, previous dated values, explicit completion, undo, optional effort, and rest controls support actual gym use (`src/components/logger/CurrentSetEditor.tsx:60`, `src/components/logger/ExerciseSlide.tsx:73`, `app/(app)/logger.tsx:232`). Session review distinguishes completed, incomplete and excluded-volume sets (`src/components/logger/WorkoutSummary.tsx:36`).
4. **Health import is already implemented as a reviewed action.** It can populate weight, steps, food calories, hydration and macros; it does not silently submit them (`src/features/health/health-model.ts:6`, `src/features/health/health-import.tsx:32`). Do not recommend “add Apple Health” as though no implementation exists. Native build availability and real data quality are unverified here.
5. **Data explanations are often unusually careful.** Nutrition distinguishes the listed meal total from a separately prescribed target (`src/features/nutrition/MealPlanDetails.tsx:23`). Recaps expose partial/unknown workout completion and observation counts (`src/features/home/weekly-recap-card.tsx:35`). Charts retain missing observations as gaps (`src/features/measurements/MeasurementProgress.tsx:116`).
6. **Accessibility intent is visible in source.** There are named controls, heading focus, error announcements, large-text layout alternatives, and explicit button alternatives to exercise swiping (`app/(app)/onboarding.tsx:29`, `src/features/checkin/CheckInEditorScreen.tsx:166`, `src/components/logger/CurrentSetEditor.tsx:86`, `app/(app)/logger.tsx:243`). This supports a positive implementation assessment, not a claim of compliance or tested usability.

## Findings and priorities

### P0 — Close the coach connection and reply loop before presenting this as complete coaching

**Finding:** After a weekly submission, the product promises “detailed feedback within 48 hours” (`app/(app)/weekly-feedback.tsx:41`). The persisted weekly type contains only client answers (`src/lib/weekly-feedback.ts:25`), and history renders only those answers (`src/features/weekly/WeeklyFeedbackHistoryCard.tsx:33`). The coach card displays a name/avatar or unassigned/unavailable state, with no contact action (`src/components/coach/CoachStatusCard.tsx:39`). Training and Nutrition empty states say “Please contact your coach” without supplying that action (`src/features/training/training-plan.tsx:243`, `src/features/nutrition/nutrition-screen.tsx:46`).

**Impact:** A new user can sign up, provide extensive information, and encounter a passive “no coach” state. A weekly reporter cannot see where a promised reply will arrive. External WhatsApp/email workflows may exist operationally; the mobile source does not explain or link them.

**Recommendation:** Make assignment status actionable, name the delivery channel and response expectation, and provide a working support/contact path. Prefer a report thread with Submitted → Reviewed → Coach reply, one next action, and relevant plan changes. If feedback intentionally stays outside the app, the confirmation must tell the user precisely where to expect it. Do not claim that a coach's operational service failed; that was not observed.

### P0 — Audit launch account controls and help access

**Finding:** The You menu exposes weekly feedback, measurements, photos, profile, settings and sign-out (`app/(app)/(tabs)/more.tsx:21`). Settings covers reminders and appearance (`app/(app)/settings.tsx:129`, `app/(app)/settings.tsx:229`). Profile explicitly disables email editing (“Email can't be changed here”) without a follow-up path (`app/(app)/profile.tsx:390`). No visible account-deletion, data-export, privacy/terms or support destination was found in current `app` and `src` source searches.

**Recommendation:** Parent technical review should establish the release requirements and existing external service paths. From UX alone, provide clear Help/contact, Privacy/Terms, account deletion initiation, and a route for account-email changes. Export is a useful ownership feature, not evidence of a current legal violation. Avoid claiming App Store rejection without the separate policy analysis.

### P1 — Correct the meaning of “Complete” for partial workouts

**Confirmed source inconsistency:** `completedPlanDaysFromLogs` adds every saved v2 log with a plan-day number without checking completed sets (`src/hooks/usePlanProgress.ts:24`). That becomes status `complete` (`src/hooks/usePlanProgress.ts:66`), displayed as “Complete” with “Repeat Day” (`src/components/plans/PlanDayCard.tsx:27`). The same partial log is correctly called partial in the weekly recap (`src/features/home/weekly-recap.ts:47`).

**Trigger/result:** Save a planned session with incomplete sets → the Plan view can say Complete while the recap says partial. Home also advances past any logged plan day (`src/features/home/useHomeData.ts:54`).

**Recommendation:** Share explicit Logged / Partially completed / Completed semantics. Let users intentionally end a shortened session without representing every prescribed set as completed. This is a deterministic source finding; it was not reproduced through the UI.

### P1 — Match daily reporting effort to the coaching value it returns

**Finding:** Every daily field is mandatory except conditionally hidden workout performance. Required entries include weight, energy, stress, sleep, hunger, digestion, training status, nutrition score, calories, water, steps, protein, carbs, fats and a written note (`src/lib/checkin-validation.ts:29`). All begin unanswered (`src/features/checkin/model.ts:24`). The guide is honest that all fields are required (`src/features/program/CheckInGuideSheet.tsx:28`).

**Risk/hypothesis:** Even with health import and previous-value shortcuts, users without a scale or macro-tracking source may abandon or enter guessed/zero/copied values to finish. Actual completion time and abandonment were not measured. Existing explicit previous-value actions must not be misrepresented as silent auto-filling.

**Recommendation:** Decide required fields with the coach/service model, and test a short core check-in versus the full prescribed report. Consider an honest “not measured” answer, coach-configured requirements, optional notes, and separate quick morning and end-of-day capture if needed. If all fields are a fixed business requirement, make that commitment clear before Day 1 and improve supported import rather than quietly weakening the contract. Track first-check-in completion, per-stage abandonment, repeat completion time and proportion of imported versus manually entered values.

### P1 — Return an outcome, not only confirmation that data was stored

**Finding:** The daily receipt repeats six recorded values and routes to Home or Training (`src/features/checkin/components/CheckInReceipt.tsx:20`). The weekly recap shows weight observations and workout counts. There is no source-backed explanation of how those signals change the next recommendation.

**Recommendation:** Acknowledge one useful observation and the next agreed action after a check-in. Build a coach-reviewed weekly summary that links the observation to the action, e.g. an adjusted exercise, a changed meal target or a decision to maintain the plan. This can become a strong differentiator because it uses existing combined training, nutrition and wellbeing data. Avoid generic praise, automatic medical interpretations, or a chat interface without an accountable decision loop.

### P1 — Expand progression feedback from session counts to exercise outcomes

**Finding:** Training History summarizes total and this-week logs (`src/features/training/workout-history.tsx:271`) and expands individual sets. Previous-session assistance searches only the most recent ten earlier workout logs and matches by normalized exercise name (`app/(app)/logger.tsx:96`). No exercise-level trend/PR screen is present. The logger's free-text exercise entry (`src/components/logger/WorkoutOverviewSheet.tsx:36`) can also fragment history through naming differences.

**Recommendation:** Add stable exercise identity with aliases, an exercise history view, best completed set, comparable volume, and clear progression against the coach's targets. Make previous values available beyond ten sessions. Add exercise search/recent favorites before expanding into social or gamified features. Supersets, reordering and richer cardio metrics are later capability opportunities, not blockers for a focused coach-led strength MVP.

### P1/P2 — Make intake shorter, relevant and neutral

**Finding:** The assessment contains 87 questions in 10 sections; only six are explicitly required. The wizard renders `section.questions.map` with no answer-dependent branching (`src/components/questionnaire/QuestionnaireWizard.tsx:336`). It asks both success/failure follow-ups after prior-goal questions (`src/lib/questionnaire-data.ts:75`), and includes broad sensitive questions such as addictions and medication history (`src/lib/questionnaire-data.ts:188`). Copy contains “really bad eating day” (`src/lib/questionnaire-data.ts:175`), “half a cam” (`src/lib/questionnaire-data.ts:50`), and “acheive” (`src/lib/questionnaire-data.ts:129`).

**Recommendation:** Branch follow-ups, explain why sensitive answers help this service, mark optionality clearly, and ask the first-session essentials before deeper history. Replace judgmental or unclear wording. Preserve save/resume and section navigation. The existence of optional long-form intake is useful; the problem is its current unconditional breadth and wording.

### P2 — Give Progress a coherent destination and keep metric context

**Finding:** “View progress” in Home routes to Measurements (`app/(app)/(tabs)/index.tsx:115`), whose primary chart offers waist/chest/hips/thighs/arms (`src/features/measurements/MeasurementProgress.tsx:15`). Weight is a separate collapsed summary (`app/(app)/measurements.tsx:207`); the recent weight chart is limited to 14 days under Home details (`src/features/home/selectors.ts:46`). Photos and training records sit elsewhere.

**Recommendation:** Use a unified Progress destination with body weight, measurements, training and photos. Deep-link weight summaries to the weight trend, and workout summaries to training progression. Show a smoothed multiweek weight trend and clear source dates rather than relying on short-term endpoint change. Do not claim the existing chart is visually confusing without current screenshots.

### P2 — Turn Nutrition into something users can act on

**Finding:** Meal plans resolve to a Daily row set, or legacy Monday rows, with global template fallback (`src/hooks/usePlans.ts:249`). Nutrition renders targets, expandable prescriptions, supplements and notes; interactions mainly show/hide details (`src/features/nutrition/MealPlanDetails.tsx:92`). It has no consumption logging or meal substitutions. Current template fallback is not surfaced as explicitly as Training's template label.

**Recommendation:** Prioritize meal adherence and a coach-approved swap action, a grocery list, and a supported route for bringing actual intake into the check-in. Clearly distinguish assigned and fallback meal content. A full food database is a much larger commitment; decide whether the service should integrate existing trackers first.

## Personalization: accurate product positioning

The current mobile product is **coach-led with rule-based guidance**, not an independently adaptive AI coach. Workout resolution uses the user's active-plan pointer and assigned plan rows, then global templates (`src/hooks/usePlans.ts:150`). Meal plans use the active calorie/diet pointer and assigned/template content (`src/hooks/usePlans.ts:237`). The next-session selector chooses the first unlogged day in the current week (`src/hooks/usePlanProgress.ts:59`, `app/(app)/(tabs)/index.tsx:45`). Plan change visibility is based on update timestamps, not an explanation of what changed (`src/hooks/usePlanProvenance.ts:25`).

This is a defensible starting product if sold as a companion for a real coaching service. Its best future distinction is an understandable chain from daily observations → coach decision → plan change → measured result. No assertion is made about AI or automation in the separate coach/admin backend, which was outside this source review.

## Suggested review framing

The functional breadth and care around interrupted work exceed a basic prelaunch prototype. The logger and progressive setup are strengths. The product experience is less complete at the edges of the central coaching promise: getting a coach, receiving a reply, understanding changes, and seeing measurable progress. Grade the source-backed journey maturity separately from visuals, native correctness, production reliability and market claims. This review alone cannot establish a launch-ready overall score.

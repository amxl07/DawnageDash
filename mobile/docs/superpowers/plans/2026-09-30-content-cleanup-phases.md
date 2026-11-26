# Dawnage Phased Cleanup Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax. Implementation was authorized by the user and resumed on 2026-10-03. Phase status and evidence are tracked in ../../review/2026-10-03-cleanup-implementation/progress.md.

**Goal:** Remove unnecessary content in priority order, beginning with a basic cleanup and misleading wording, while preserving useful controls, saved data and clear recovery states.

**Architecture:** Keep the existing Expo Router screens, components and data flows. Start with display-only edits; handle assessment compatibility, layout simplification and conditional status presentation in separate phases. Keep the original 48 findings as the evidence register and use the coverage table below as the execution order.

**Tech stack:** Expo 57, React Native, TypeScript, React Query, Supabase, AsyncStorage and the existing Jest/React Native Testing Library suite. No new dependency is planned.

**Spec:** [Cleanup audit](../../review/2026-09-30-content-cleanup/README.md), [48 findings](../../review/2026-09-30-content-cleanup/findings.md), [accepted evidence and limits](../../review/2026-09-30-content-cleanup/evidence/README.md).

## Global constraints

- The user authorized implementation of all five phases without approval pauses. Mark phase tasks complete only after their implementation and verification gates pass.
- Preserve the current five tabs, workout suggestions, steppers, visible sets, Undo, exercise alternatives and the Morning/Your day grouping with its answered counter.
- Add no coach, messaging, voice, AI or other new product features. Retain actual client training/nutrition instructions.
- Preserve dates, units, scale meaning, required/optional distinctions, unfinished-work warnings, unsaved-change protection and retry actions.
- Reserve “Saved” alone for confirmed account persistence. Local drafts and pending delivery remain distinguishable.
- Preserve health/photo sharing choices and the first-submission consequence that starts Day 1.
- Preserve existing answers, historical labels, compatibility routes and profile/assessment overlap. Retiring a question does not authorize deletion of its saved answers.
- Do not shrink fonts or touch targets to fit more content. Remove redundant content and its empty spacing.
- Preserve existing uncommitted work. Keep each phase's changes separately reviewable.
- Test each phase when implemented. Phase 5 adds whole-app checks; it does not postpone testing of Phases 1–4.
- If a confirmed data-loss, incorrect-save-status or destructive-action defect is discovered during implementation, fix it before continuing that phase rather than scheduling it as later polish.

## Priority and sequence

| Phase | Scope | Why it comes here | Completion outcome |
| --- | --- | --- | --- |
| **1** | **Basic cleanup and critical wording** | Obvious unnecessary text and misleading claims; smallest implementation risk. | The current app reads more clearly without changing its workflows or data contracts. |
| **2** | **Remove unnecessary questions and repeated data entry** | The assessment is the largest burden: 87 defined questions and many unconditional follow-ups. | New/revised assessments ask relevant questions while old answers remain readable. |
| **3** | **Simplify everyday screen layouts** | After unnecessary content is removed, improve the hierarchy around the remaining useful content. | Home, check-in, training, nutrition, progress and photos are easier to scan. |
| **4** | **Make help and status messages contextual** | These changes affect what users understand about saving, permissions and completion, so require explicit state checks. | Normal screens are quiet; exceptions remain clear and actionable. |
| **5** | **Consistency, small housekeeping and final verification** | Finish only after the intended content and behavior have settled. | The complete cleanup is consistent across devices and existing flows. |

**Recommended order: 1 → 2 → 3 → 4 → 5.** Phase 1 is a complete first delivery. Do not expand it into a questionnaire rewrite or a visual redesign. Findings split across phases are completed only when all their listed portions are done.

## Phase 1 — Basic cleanup and critical wording

**Priority: first.** Remove the most obviously useless content and the claims most likely to mislead users. Preserve every current field, progress calculation, save/delivery state and permission flow.

### Task 1.1 — Remove unsupported service promises

**Finding:** 25. **File:** `mobile/app/(app)/weekly-feedback.tsx`.

- [x] Remove “your coach reads every word” from the weekly introduction.
- [x] Remove the fixed “detailed feedback within 48 hours” promise from the submitted receipt. Do not replace it with another unverified deadline.
- [x] Use the existing week number/date with a direct introduction; keep the Start action.
- [x] Keep a clear “Check-in submitted” confirmation and Done. Keep measurement/photo actions available without the “Also upload …” instruction making them sound mandatory.

**Done when:** intro and submitted states make no unsupported promise and still make the primary action obvious. Do not alter submission or acknowledgment logic.

### Task 1.2 — Delete obvious filler and repeated explanations

| Surface | Remove now | Keep |
| --- | --- | --- |
| Sign in/signup | Decorative account eyebrows such as “DAWNAGE DAILY”; generic benefit sentence; footer about adding phone/country later. | Branding, one clear title, labelled fields, validation, recovery and verification actions. |
| Setup | “A starting point, with room to evolve.” / “No perfect days required. Just a clearer picture of you.” | Goal distinctions and current start-choice disclosures. |
| Home | “Take a moment to reflect. Build a clear record of your day.” / “Revisit your record whenever you need to.” / ordinary “Your next step” eyebrow / duplicated Home-details subtitle. | Dated resume instructions, “Needs your attention,” pending/failed records. |
| Check In hub | Generic daily description and repeated saved-record explanation. | Date, Check in/View record, History, previous drafts and ability to choose an earlier date. |
| Workout | “Choose an exercise to view its sets. Your entries stay in place.” / explanatory paragraph beneath “Exercise complete” / generic review explanation. | Exercise list, actual sets, completion, next action, Undo and partial-workout warning. |
| Rest options | The paragraph explaining changes to the device clock. | Actual countdown, prescribed duration, pause/extend/skip, auto-start and errors. |
| Measurements | “Chart loads when it comes into view.” | Reserved chart loading area, current reading/date and accessible values. |
| Assessment | SMARTS lecture; “Be honest …”; generic section descriptions; unnecessary hydration helper; all-capital labels. | All existing questions and answer semantics in this phase; units and useful measurement/rating instructions. |

**Files:** `mobile/app/(auth)/login.tsx`; `mobile/src/features/onboarding/SetupStage.tsx`; `mobile/src/lib/today-action.ts`; `mobile/src/features/home/TodayBrief.tsx`; `mobile/src/features/home/HomeDetails.tsx`; `mobile/src/features/checkin/CheckInHub.tsx`; `mobile/src/components/logger/ExerciseSlide.tsx`; `mobile/src/components/logger/WorkoutOverviewSheet.tsx`; `mobile/src/components/logger/WorkoutSummary.tsx`; `mobile/src/components/logger/RestDock.tsx`; `mobile/src/features/measurements/MeasurementProgress.tsx`; `mobile/src/lib/questionnaire-data.ts`.

- [x] Apply the explicit removal list above; leave meaningful dynamic messages in place.
- [x] Remove empty wrappers/gaps left by those deletions.
- [x] Keep one direct screen/task title. Avoid replacing deleted prose with additional badges or icons.

**Done when:** the same tasks and controls remain available with less repeated text. No question deletion or data-persistence changes are included.

### Task 1.3 — Fix obvious labels, instructions and empty states

| Current | Phase 1 treatment |
| --- | --- |
| “Weekly feedback” in You | “Weekly check-in,” matching its destination. |
| “View full prescription” / “Hide prescription” | “View exercises” / “Hide exercises.” |
| Visible references to “Logs” | “Training history.” Keep the legacy redirect. |
| “Enter a finite nonnegative bar weight.” | “Enter a bar weight of 0 kg or more.” Keep validation unchanged; apply the equivalent target-load wording. |
| “Your day is still here” as a load-error headline | “Couldn't load today's summary,” with the existing retry. |
| “No workout plan yet” followed by the same statement again | Keep the title; “Your sessions will appear here when assigned.” Apply equivalent meal-plan wording. |
| “Plan assigned, but no days found” | “No sessions in this plan,” with concise existing recovery guidance. Do not claim someone is preparing it. |
| “Measurements / Track body measurements” and “Profile / Personal details” | Keep the clear row label; remove the redundant subtitle. |
| Empty Supplements section | Hide only when data has loaded successfully and is confirmed empty. Keep real supplements, their instructions, loading and error treatment. |

**Files:** `mobile/app/(app)/(tabs)/more.tsx`; `mobile/src/features/training/training-plan.tsx`; `mobile/app/(app)/logger.tsx`; `mobile/src/features/workout/useWorkoutSession.ts`; `mobile/src/components/logger/PlateCalculatorSheet.tsx`; `mobile/src/features/nutrition/nutrition-screen.tsx`; the Home error component above.

- [x] Apply these labels without renaming routes, stored keys, question IDs or API fields.
- [x] Guard the empty Supplements case; do not interpret a failed load as an empty result.
- [x] Correct ordinary capitalization and punctuation where meaning is unchanged. Do not guess the intended “half a cam” measurement method.

### Phase 1 checks and exit

- [x] Compare Home, signup/setup, Check In hub, workout overview/review/rest, Nutrition, You and Assessment before/after at the same fixture/date/viewport.
- [x] Confirm every current field, button and warning needed to complete the task is still present.
- [x] Exercise empty/nonempty/loading/error Nutrition states for the conditional section change.
- [x] Update affected existing copy assertions and capture selectors without weakening their behavioral checks. Add no tests that merely restate a string deletion.
- [x] Run mobile typecheck/lint and affected existing tests: account entry, hub, workout overview/summary/rest, plate calculator, weekly feedback, nutrition and questionnaire wizard.

**Deliverable:** a basic cleanup patch, comparison screenshots and a check log. No release/deployment is implied. Phase 1 can stand alone while later phases are developed.

## Phase 2 — Remove unnecessary questions and repeated data entry

**Priority: second, high impact.** This phase deliberately precedes decorative UI polish because it removes the largest amount of user work. It is separate from Phase 1 because questions and saved-answer meanings are connected.

### Task 2.1 — Establish compatibility before retiring questions

**Files to modify/review:** `mobile/src/lib/questionnaire-data.ts`; `mobile/src/components/questionnaire/QuestionnaireWizard.tsx`; `mobile/src/components/questionnaire/QuestionnaireSummary.tsx`; `mobile/app/(app)/profile.tsx`; `mobile/src/features/home/useHomeData.ts`; `mobile/src/lib/profile-data.ts`; `client/src/lib/questionnaire-data.ts`; `client/src/components/QuestionnaireWizard.tsx`; `client/src/components/QuestionnaireSummary.tsx`; `client/src/pages/Profile.tsx`; `shared/schema.ts`.

The web files are compatibility consumers, not a request to add coach features. Add a small catalog/visibility helper alongside the existing questionnaire data if needed; avoid a general form-framework rewrite.

- [x] Trace `answers`, `completed_sections`, completion status and the q14/q56/q64/q33 profile overlap through these consumers.
- [x] Separate the current question catalog used for historical readback from the new active-question selection. Retired questions remain renderable in history.
- [x] Retain IDs whose meaning is unchanged. Give substantively combined/reworded questions distinct IDs and explicit catalog/version handling; never reinterpret old text under a different question.
- [x] Preserve old keys when saving new answers. Do not bulk-delete assessment rows, reset completed sections, or migrate production data as part of a cosmetic removal.
- [x] Record the final storage/readback mapping in this phase's change description before implementing the active form. Both mobile and web readers must understand the chosen representation.

**Exit from this task:** a saved legacy record and a new assessment can both be displayed with their correct question labels and profile-linked answers. No version/storage format is assumed to exist already.

### Task 2.2 — Reduce the questionnaire and add relevant follow-ups

| Area | Concrete change |
| --- | --- |
| Goals | Replace 14 prompts with five: goal; prior attempt; what helped/got in the way, conditional on that attempt; support needed; why it matters. Remove maintenance planning from initial intake. This cleanup does not add a new maintenance feature. |
| Low-value personal questions | Retire q60 (broad addiction), q74 (dark circles), q76 (general memory) from routine intake. Preserve historical answers and relevant exercise/health limitations. |
| Training/nutrition history | Ask previous-attempt history once. Combine diet timing/duration details and avoid overlapping essays. Keep current routine, experience and limitations. |
| Eating/lifestyle | Replace good/bad eating and sacrifice wording with usual meals, practical difficulties and realistic changes. Preserve the meaning of old stored answers through the catalog handling above. |
| Follow-ups | Ask past-attempt, diet, surgery and supplement details only after a relevant answer. Ask detailed digestion questions only on a relevant path. |
| Repeated facts | Review known profile details instead of asking for identical facts again. Preserve q14/q56/q64/q33 synchronization; do not assume name/phone are already synchronized. |
| Wellbeing | Use a focused optional question about stress affecting the routine; retain symptoms/limitations that have a defined use. |

- [x] Implement this active question set with a pure, testable visibility rule for each parent/follow-up relation.
- [x] Keep hidden drafts recoverable if the user changes an earlier answer back. Exclude irrelevant hidden answers from the current response view; do not silently present them as current facts.
- [x] Calculate validation and completion from the relevant active path. Hidden fields cannot block progress.
- [x] Keep initial measurements distinct from later observations; any reused reading needs its date and user confirmation.

### Task 2.3 — Simplify assessment presentation and restore useful guidance

**Additional files:** `mobile/src/components/questionnaire/QuestionField.tsx` and its wizard/summary above.

- [x] Use short section titles and one understandable progress display; keep section navigation and Save draft.
- [x] Remove the visible “Profile section” group label while retaining the accessible label.
- [x] Render compact rating anchors matching numeric controls; remove the generic “Allocate stars” instruction.
- [x] Verify the intended measurement protocol against the project's actual guidance before correcting the ambiguous “half a cam” instruction. If the protocol is unavailable, record this as an unresolved content dependency instead of inventing a distance.
- [x] Verify all ten existing section destinations, especially the last two: the earlier web audit could not reach them through the overview sheet. Resolve any reproduced clipping without hiding sections to mask it.

### Phase 2 checks and exit

- [x] Legacy and revised answers remain readable on mobile and web under their correct labels.
- [x] A new user sees no retired questions; relevant health constraints still have a place.
- [x] Test Yes → No → Yes, hidden-field validation, restored drafts, partial saves, switching accounts and completion counts.
- [x] Verify shared Profile changes still update goal, injuries, allergies and workout availability correctly.
- [x] Run the existing wizard/profile/profile-recovery/home-assessment tests plus meaningful new tests for visibility and historical readback. Run web typecheck/build when compatibility consumers change.

**Deliverable:** a smaller relevant assessment, preserved historical answers, explicit catalog mapping and compatibility evidence. This phase is not complete if questions disappear from the UI but existing answers become unreadable.

## Phase 3 — Simplify everyday screen layouts

**Priority: third.** Improve the remaining information's hierarchy without adding features.

| Task | Changes | Main files |
| --- | --- | --- |
| 3.1 Home and training | Compact the weekly recap and metadata. Shorten “1 weight observation…” to “1 weigh-in this week.” Consolidate the completed-week training card. Keep dates, partial/unknown completion and pending-record qualifiers. | `mobile/src/features/home/weekly-recap-card.tsx`, `NextSessionCard.tsx`, `TodayBrief.tsx`, `HomeDetails.tsx`; `mobile/src/features/training/training-plan.tsx` |
| 3.2 Daily check-in | Keep the answered counter and Morning/Your day grouping. Reduce overlapping step labels/bar chrome. Remove the redundant “Your record” receipt heading. Shorten constant history ranges such as 3–3 without losing scale anchors. | `mobile/src/components/checkin/CheckInStageHeader.tsx`; `mobile/src/features/checkin/components/CheckInReceipt.tsx`, `HistoryCaption.tsx`; `mobile/src/features/checkin/history.ts` |
| 3.3 Workout | Shorten history provenance to a readable date/value, retaining source distinction. Consolidate Add exercise labels and idle rest labels. Hide the zero Incomplete sets metric; keep nonzero incomplete/invalid warnings. | `mobile/src/components/logger/CurrentSetEditor.tsx`, `WorkoutOverviewSheet.tsx`, `RestDock.tsx`, `WorkoutSummary.tsx` |
| 3.4 Nutrition | Keep cardio/steps guidance in Training and nutrition-specific guidance in Nutrition. Remove only duplicated placement. | `mobile/src/features/nutrition/nutrition-screen.tsx`; `mobile/src/features/training/training-plan.tsx` |
| 3.5 Measurements/photos | With one date and no comparison, use a compact baseline instead of a one-dot plot and disabled navigation. Keep chart values/dates for real comparisons. Shorten prefill wording and photo count to “N photos.” | `mobile/src/features/measurements/MeasurementProgress.tsx`; `mobile/src/components/measurements/MeasurementSheet.tsx`; `mobile/app/(app)/media.tsx` |

For each task:

- [x] Apply the stated layout reduction without changing the meaning of the underlying values.
- [x] Keep accessible labels, visible edit/review actions, units, dates and minimum touch sizes.
- [x] Compare compact/standard widths, larger text and the relevant empty/normal/expanded state.
- [x] Run the affected existing component/flow tests; add behavior tests for the one-observation chart and zero-versus-nonzero incomplete state.

**Deliverable:** cleaner everyday screens with the same useful functionality. Do not rewrite shared storage or reducers for a presentation change.

## Phase 4 — Show help and status only where useful

**Priority: fourth, careful implementation.** Phase 1 has already removed generic text. This phase handles statements whose correctness depends on state.

### Task 4.1 — Consistent saving and recovery presentation

**Files:** `mobile/src/components/ui/RecordStatus.tsx`; `StatusPill.tsx`; `mobile/src/features/checkin/components/DailyRecordHeader.tsx`; `CheckInReceipt.tsx`; `mobile/src/components/logger/WorkoutSummary.tsx`; `mobile/app/(app)/weekly-feedback.tsx`; `mobile/src/features/weekly/useWeeklyFeedbackController.ts`; `mobile/src/features/home/WeeklyReflection.tsx`.

| Actual condition | Display requirement |
| --- | --- |
| Uncommitted numeric input | It is not yet saved; do not show a saved indicator for that entry. |
| Draft persisted on device | “Draft saved on this device.” |
| Queued account delivery | “Waiting to sync,” with local preservation clear. |
| Account acknowledgment received | “Saved,” with the relevant record/date. Avoid repeated normal confirmations. |
| Local save failed | “Couldn't save,” with retry and keep-open guidance where necessary. |
| Sync failed | “Couldn't sync,” with retry; do not call it a local-save failure if the draft is safe. |
| Newer draft over a submitted record | Distinguish the newer unsent edits from the previously saved version. |
| Weekly report sent, draft cleanup failed | “Check-in sent” plus “We couldn't remove the saved draft from this device. Retrying won't send it again.” Keep the retry action. |

- [x] Use one current status location per task; preserve exceptional details and live announcements.
- [x] Replace visible “local cleanup,” “server record” and generic technical vocabulary with the state-specific wording above.
- [x] Preserve all acknowledgment, retry, conflict resolution and account boundaries; this phase changes presentation, not their truth conditions.

### Task 4.2 — Reminders, health/photo explanations and repeated onboarding help

**Files:** `mobile/app/(app)/settings.tsx`; `mobile/app/(auth)/login.tsx`; `mobile/src/features/onboarding/SetupStage.tsx`; `mobile/src/features/program/ProgramWelcome.tsx`; `CheckInGuideSheet.tsx`; `FirstCheckInNotice.tsx`; `mobile/src/features/health/health-review-sheet.tsx`; `mobile/app/health-access.tsx`; `mobile/src/components/media/PhotoCaptureSheet.tsx`; `PhotoSlot.tsx`.

- [x] For reminders, show label, switch and time/day in the confirmed normal state. Remove redundant normal captions/counts; keep denied, pending, failed and unavailable scheduling states.
- [x] Keep one timezone explanation. Show the pre-permission explanation when permission is needed, not every time an already-authorized reminder is enabled.
- [x] Shorten email verification guidance while retaining destination email, resend cooldown, recovery and different-email consequences.
- [x] State the Day 1 consequence at setup choice and immediately before first submission. Remove repeated explanations elsewhere only after those decision points remain clear. Keep Practice — nothing is saved.
- [x] Keep photo sharing/upload disclosure and optional-angle information once at capture; remove repeated partial-angle and alignment paragraphs.
- [x] Structure health access copy around what is read, optional access, explicit selection, sharing on submission and read-only behavior. Put field-specific rules beside the field; show only the platform's relevant access-management instructions.

### Task 4.3 — Nutrition totals and weekly reporting context

**Files:** `mobile/src/features/nutrition/MealPlanDetails.tsx`; `mobile/app/(app)/weekly-feedback.tsx`; `mobile/src/features/weekly/selectors.ts`.

- [x] Show the daily target and one planned-meals total. Remove the extra matching confirmation; retain mismatch and partial/missing-data explanations when relevant.
- [x] Use one “Macros not provided” line only when all macros are absent. Keep available values when only some are missing.
- [x] Show the actual weekly reporting date range once. Put observed-day/sample coverage beside prefilled averages rather than repeating technical window prose on each step.

### Phase 4 checks and exit

- [x] Exercise every row of the saving-state table with real fixture state transitions; prove retry after an acknowledged weekly submission does not resubmit.
- [ ] Verify reminders off/on/denied/pending/failed and confirm that a requested schedule is not presented as a confirmed native schedule.
- [ ] Test health cancellation, optional selection, existing-value replacement, partial-day data and missing values.
- [ ] Verify photo selection, partial upload failure, retry and exit protection still explain what has been uploaded.
- [x] Verify nutrition matching/mismatching/missing data and weekly zero/one/multiple recorded-day summaries.
- [x] Run existing record-status, check-in persistence/outbox, weekly recovery, reminder/settings, health review and photo tests affected by these changes.

**Verification status, 9 October:** All application changes and controlled test cases pass. The three unchecked integration items have passing component/service fixtures but still require actual native permissions, provider reads and picker/dismissal checks; see [native verification](../../review/2026-10-03-cleanup-implementation/native-verification.md). The Phase 4 native gate remains open.

**Deliverable:** fewer normal-state explanations, with visible and truthful exceptions. Native-only behavior requires native checks; browser fixtures do not count as device permission/delivery verification.

## Phase 5 — Consistency, small housekeeping and final verification

**Priority: last.** Do not invent new cleanup work or new features to fill this phase.

### Task 5.1 — Small source cleanup

**Finding:** 48. **Files:** `mobile/src/components/checkin/checkin-presentation.ts`; its existing test; `mobile/src/components/ui/RecordStatus.tsx`; `StatusPill.tsx` if their wording can safely share a source.

- [x] Confirm `getCheckInDailyPrompt` and its seven affirmations still have no production consumer; remove only that unused code and its now-irrelevant tests.
- [x] Consolidate duplicated status wording only where the components have the same semantics. Do not merge unlike error states merely to reduce files.
- [x] Keep old route redirects and historical record readers. Do not delete unrelated repository files, fixtures or documentation as part of app-content cleanup.

### Task 5.2 — Final whole-app review

- [x] Repeat the audit's main-screen set with fresh captures of the implemented result. Use consistent fixtures/dates and identify native-only coverage separately.
- [ ] Check 320 px and 390 px layouts, light/dark appearance, larger text, keyboard-open forms and sheet boundaries. Verify focus order and VoiceOver/TalkBack announcements on devices.
- [ ] Complete sign-in/setup, daily check-in/revisit, suggested workout logging/Undo/partial save, plan/history navigation, nutrition, weekly check-in, measurement/photo editing, Profile/Assessment and Settings.
- [x] Confirm no empty gaps remain after removing text; no CTA, field label, unit or recovery instruction is clipped.
- [x] Run the existing full mobile verification once after affected phase-level checks have passed. Run web checks if Phase 2 changed shared consumers.
- [x] Mark each original finding complete, deliberately retained with its reason, or unresolved with exact evidence. Do not report the whole plan complete while required native/compatibility checks remain open.

**Verification status, 9 October:** The new minimalist main-tab design is implemented. Browser captures cover 320/390 px, light/dark, 1.4× text, landscape and core forms. Native keyboard, system text, assistive technology and photo-picker portions of the two unchecked journey/layout items remain open. The browser/automated results and exact limits are recorded in [Phase 5](../../review/2026-10-03-cleanup-implementation/phase-5-report.md).

**Deliverable:** final screenshots, check results, completed finding register and an accurate list of any remaining limits. Publishing the app is outside this cleanup plan.

## Verification commands and evidence rules

Run commands from the `mobile` directory unless noted. These are execution instructions, not claims that tests were run for this planning update.

```sh
npm run typecheck
npm run lint
npm test -- --runTestsByPath src/features/auth/account-entry-screen.test.tsx src/features/checkin/CheckInHub.test.tsx src/screens/__tests__/tabs/nutrition.test.tsx
npm test -- --runTestsByPath src/components/logger/WorkoutOverviewSheet.test.tsx src/components/logger/WorkoutSummary.test.tsx src/components/logger/RestDock.test.tsx src/components/logger/PlateCalculatorSheet.test.tsx
npm test -- --runTestsByPath src/components/questionnaire/QuestionnaireWizard.test.tsx src/screens/__tests__/profile.test.tsx src/features/profile/profileSaveRecovery.test.ts
npm test -- --runTestsByPath src/screens/__tests__/weekly-feedback.test.tsx src/screens/__tests__/settings.test.tsx src/lib/reminders.test.ts src/features/health/health-review-sheet.test.tsx
```

Select the affected group for each task rather than running every group after every wording edit. Add the new visibility/readback/chart tests where those behaviors change. Before final delivery run `npm run verify`; from the repository root run `npm run check` and `npm run build` when web compatibility code changes. Investigate failures and distinguish pre-existing failures from cleanup regressions.

Keep before/after screenshots and check logs with the phase that produced them. The previous audit's web capture limitations are documented in its evidence index; do not treat those old captures as post-change validation.

## Complete finding coverage

The IDs refer to the original [48-item register](../../review/2026-09-30-content-cleanup/findings.md). Split rows deliberately separate basic wording from behavioral work.

| Finding | Phase(s) | Scope split |
| --- | --- | --- |
| 01 | 1 | Sign-in/signup filler and framing. |
| 02 | 1, 4 | Phone/country footer first; lifecycle explanation placement later. |
| 03 | 4 | Verification instructions and consequences. |
| 04 | 1 | Setup motivational footers. |
| 05 | 4 | Day 1 and practice disclosures at decision points. |
| 06 | 1 | Ordinary Home action detail. |
| 07 | 1, 3 | Decorative labels/subtitle first; remaining hierarchy later. |
| 08 | 3 | Recap counts, date and sparse-data wording. |
| 09 | 3 | Completed-week training card. |
| 10 | 1 | Check In hub repetition. |
| 11 | 3 | Daily progress presentation; keep answered counter. |
| 12 | 3, 4 | Historical-range formatting; draft/save-state wording. |
| 13 | 3, 4 | Receipt hierarchy; state-specific confirmation. |
| 14 | 3 | Workout suggestion source/date presentation. |
| 15 | 1 | Exercise-complete explanatory paragraph. |
| 16 | 1, 3 | Remove overview prose; consolidate Add exercise controls. |
| 17 | 1, 3 | Remove clock paragraph; compact idle rest controls. |
| 18 | 1, 3, 4 | Review filler; zero/nonzero incomplete display; saved receipt. |
| 19 | 1 | Plain validation language and Training history naming. |
| 20 | 1, 3 | View exercises label; compact plan metadata. |
| 21 | 1 | Truthful, shorter empty-plan states. |
| 22 | 1 | Hide confirmed-empty Supplements. |
| 23 | 3 | Duplicate cardio/steps placement. |
| 24 | 4 | Conditional meal totals and macro notices. |
| 25 | 1 | Remove unsupported service promises and mandatory-sounding follow-up. |
| 26 | 4 | Reporting window and prefill coverage. |
| 27 | 4 | Acknowledged weekly submission/draft cleanup wording. |
| 28 | 1, 3 | Remove lazy-rendering prose; one-observation presentation. |
| 29 | 3 | Measurement prefill/date wording. |
| 30 | 4 | Photo disclosure/alignment repetition. |
| 31 | 3 | Optional-angle photo count. |
| 32 | 4 | Normal versus exceptional reminder state. |
| 33 | 4 | Reminder timezone and permission explanation. |
| 34 | 1 | Consistent navigation labels and row subtitles. |
| 35 | 2 | Shared Profile/Assessment facts; keep read-only email explanation. |
| 36 | 2 | Assessment progress, title and rating-instruction presentation. |
| 37 | 1, 2 | Remove SMARTS lecture; version and shorten goal questions. |
| 38 | 2 | Conditional assessment follow-ups. |
| 39 | 1, 2 | Remove generic exhortation; combine/rephrase meaningful questions. |
| 40 | 2 | Retire low-value personal questions with historical preservation. |
| 41 | 1, 2 | Sentence case first; history-question consolidation later. |
| 42 | 1, 2 | Remove generic helpers; verify measurement protocol and rating anchors. |
| 43 | 2 | Focused wellbeing questions and relevant follow-ups. |
| 44 | 4 | Health access introduction. |
| 45 | 4 | Platform-specific health result/access guidance. |
| 46 | 4 | Shared state vocabulary and announcements. |
| 47 | 1, 4 | Specific load-error headline; broader state-specific reassurance. |
| 48 | 5 | Unused prompt utility; no visible-screen benefit claimed. |

## Planning handoff

This five-phase order supersedes the initial audit's four broad passes. The audit remains the source of findings and evidence. Begin future implementation with **Phase 1 only**, finish its listed checks, then continue in order under the user's implementation scope. Phase boundaries are test/review boundaries, not automatic requests for renewed permission when continuing work has already been authorized.

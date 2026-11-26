# Cleanup finding register

48 recommendations for the current mobile working tree. P1: first cleanup; P2: follow-up polish or conditional behavior; P3: optional housekeeping. Each item is source-grounded; visual coverage and exceptions are recorded in [the evidence index](evidence/README.md). Proposed wording is not implemented.

## 01 — Sign in / sign up

**P1 · Remove.** The brand eyebrow, welcome headline and benefit sentence compete with the form.

Current source: [app/(auth)/login.tsx:321](../../../app/(auth)/login.tsx#L321). Anchor: “DAWNAGE DAILY”.

**Recommendation:** Keep the logo, one direct title (Sign in / Create your account), labelled fields and actions. Remove DAWNAGE DAILY / YOUR DAWNAGE ACCOUNT / ACCOUNT RECOVERY and the generic benefit sentence.

**Preserve / limit:** Keep reset instructions, validation, resend cooldowns and verification status.

## 02 — Sign up

**P1 · Remove / relocate.** The signup footer explains fields that are not on this screen. The Your pace, your start card also front-loads the program lifecycle.

Current source: [app/(auth)/login.tsx:426](../../../app/(auth)/login.tsx#L426). Anchor: “Add or change your phone number and country anytime in Profile.”.

**Recommendation:** Remove the phone/country footer. Explain when Day 1 starts at the setup decision and first submission; remove the long signup lifecycle card.

**Preserve / limit:** Do not change registration or program-start behavior.

## 03 — Email verification

**P2 · Shorten.** One quick step, Verify your email, What happens next and two footer notes make one recovery task feel longer.

Current source: [app/(auth)/login.tsx:229](../../../app/(auth)/login.tsx#L229). Anchor: “One quick step”.

**Recommendation:** Use Verify your email + Open the link sent to [email], then return here. Keep Resend, its cooldown and Back to sign in. Put the different-email consequence beside that action; keep spam help compact.

**Preserve / limit:** Source review of this conditional state; not evidence that every note is simultaneously above the fold.

## 04 — Setup

**P1 · Remove.** Generic reassurance adds a footer after already self-explanatory goal choices.

Current source: [src/features/onboarding/SetupStage.tsx:40](../../../src/features/onboarding/SetupStage.tsx#L40). Anchor: “A starting point, with room to evolve.”.

**Recommendation:** Remove A starting point, with room to evolve and No perfect days required. Just a clearer picture of you. Keep brief option descriptions only where they distinguish the goals.

**Preserve / limit:** Warmth can remain in one heading; remove repetition, not all personality.

## 05 — Setup / first check-in

**P1 · Consolidate.** The Day 1 rule recurs in signup, setup steps, choice descriptions, Home welcome, the practice guide, first-check-in notice and receipt.

Current source: [src/features/onboarding/SetupStage.tsx:46](../../../src/features/onboarding/SetupStage.tsx#L46). Anchor: “Your first submitted check-in starts Day 1.”.

**Recommendation:** Explain once beside the setup start choice and again immediately before the first submission: Submitting this check-in starts Day 1 on [date]. Drafts do not start your program. Keep Practice — nothing is saved in the practice guide.

**Preserve / limit:** Those final decision-point disclosures are useful and must stay; remove the surrounding repeated reassurance.

## 06 — Home next action

**P1 · Remove.** Generic action detail repeats the Daily check-in title and Check in button.

Current source: [src/lib/today-action.ts:55](../../../src/lib/today-action.ts#L55). Anchor: “Take a moment to reflect. Build a clear record of your day.”.

**Recommendation:** For an ordinary new check-in, keep title and CTA without this sentence. Also remove Revisit your record whenever you need to from the normal saved state. Keep dated resume details and pending/failure instructions.

**Preserve / limit:** Do not apply a blanket hide to every action.detail.

## 07 — Home header / details

**P2 · Remove / shorten.** Normal eyebrow labels add a hierarchy level without changing the action.

Current source: [src/features/home/TodayBrief.tsx:69](../../../src/features/home/TodayBrief.tsx#L69). Anchor: “Your next step”.

**Recommendation:** Remove Your next step / Ready to continue / Your daily record when the heading is sufficient. Keep Needs your attention. Remove Your recent records and coaching profile below Progress & coaching in HomeDetails.

**Preserve / limit:** Keep the user's name and useful dates. Coach identity does not need blanket deletion.

## 08 — Home weekly recap

**P1 · Shorten.** The recap exposes technical counting and sync language around simple progress facts.

Current source: [src/features/home/weekly-recap-card.tsx:68](../../../src/features/home/weekly-recap-card.tsx#L68). Anchor: “1 weight observation this week. A change needs two dates.”.

**Recommendation:** Use 1 weigh-in this week. Keep the actual reading date. Replace normal synced-log wording with concise recorded/completed/partial counts. Preserve Unknown completion when applicable and data-unavailable/stale states.

**Preserve / limit:** Do not invent a trend from one date or call pending local workouts account-saved.

## 09 — Home completed training state

**P2 · Consolidate.** This week is logged, Your week, recorded and Every assigned session has a log state the same fact three times.

Current source: [src/features/home/NextSessionCard.tsx:17](../../../src/features/home/NextSessionCard.tsx#L17). Anchor: “Your week, recorded.”.

**Recommendation:** Use one sentence: All assigned sessions recorded, with Review plan. Keep a separate waiting-to-sync qualifier when needed.

**Preserve / limit:** Recorded does not mean every set was completed.

## 10 — Check In hub

**P1 · Remove / shorten.** The Today and History cards explain their labels and buttons again in body copy.

Current source: [src/features/checkin/CheckInHub.tsx:44](../../../src/features/checkin/CheckInHub.tsx#L44). Anchor: “Record how you feel”.

**Recommendation:** Remove the generic daily description and Revisit your check-in or update the details. Keep date + Check in / View record. Reduce the history card to History + Choose a date, preserving the ability to backfill a missed day.

**Preserve / limit:** Keep earlier drafts and their dates prominent.

## 11 — Daily check-in progress

**P2 · Consolidate.** Step count, answered count, stage heading and progress bar communicate overlapping progress.

Current source: [src/components/checkin/CheckInStageHeader.tsx:8](../../../src/components/checkin/CheckInStageHeader.tsx#L8). Anchor: “Step”.

**Recommendation:** Keep Morning / Your day and the requested answered counter. Use one quiet stage indicator; remove the extra textual Step x of y if the bar already communicates position. Retain section position in accessibility semantics.

**Preserve / limit:** The answered counter is intentional and useful; do not remove it or required fields.

## 12 — Daily check-in save state

**P2 · Shorten.** The newer-draft explanation is accurate but technical and long.

Current source: [src/features/checkin/components/DailyRecordHeader.tsx:18](../../../src/features/checkin/components/DailyRecordHeader.tsx#L18). Anchor: “The previously submitted version is”.

**Recommendation:** Use Editing a new draft · previous version saved / waiting to sync, matched to actual state. A pending numeric input may say Unsaved entry. Use one persistent status location. Shorten constant historical ranges such as Recent range 3–3 to Recently: 3, or place historical comparisons in optional detail. Keep rating endpoints; do not remove the meaning of the scale.

**Preserve / limit:** Never imply that typing an uncommitted number has been saved.

## 13 — Daily receipt

**P1 · Consolidate.** Daily check-in, Saved and synced, Your record and a separate Day 1 heading repeat completion.

Current source: [src/features/checkin/components/CheckInReceipt.tsx:29](../../../src/features/checkin/components/CheckInReceipt.tsx#L29). Anchor: “Your record”.

**Recommendation:** Use Check-in saved with date and key answers. For first submission incorporate Day 1 into that single heading. Remove the Your record eyebrow.

**Preserve / limit:** Queued state must still say Saved on this device and explain that delivery is pending.

## 14 — Workout set suggestions

**P1 · Shorten.** History provenance is valuable, but Suggested from plus a raw ISO date reads like generated system copy.

Current source: [src/components/logger/CurrentSetEditor.tsx:69](../../../src/components/logger/CurrentSetEditor.tsx#L69). Anchor: “Suggested from ${suggestion.date}”.

**Recommendation:** Use Last time · 12 Sep: 50 kg × 8, with Use suggestion. For prescription defaults use Target, never Last time. Keep units, explicit completion and the distinction between suggested and entered values.

**Preserve / limit:** Dates and source details can stay accessible or in the existing exercise detail view; do not silently log suggestions.

## 15 — Workout exercise completion

**P1 · Remove.** The sentence repeats Exercise complete and explains already visible navigation and editable sets.

Current source: [src/components/logger/ExerciseSlide.tsx:102](../../../src/components/logger/ExerciseSlide.tsx#L102). Anchor: “All sets are complete. You can continue or choose a set below to edit an entry.”.

**Recommendation:** Keep Exercise complete, Continue / Review and the visible set list. Remove this normal-state paragraph; retain Undo.

**Preserve / limit:** This is safe only while the set rows remain visibly actionable.

## 16 — Workout overview

**P1 · Remove / consolidate.** The sheet explains the list and repeats Add exercise as heading, field label and button.

Current source: [src/components/logger/WorkoutOverviewSheet.tsx:28](../../../src/components/logger/WorkoutOverviewSheet.tsx#L28). Anchor: “Choose an exercise to view its sets. Your entries stay in place.”.

**Recommendation:** Remove the reassurance sentence. Keep the named exercise list and counts. Use one Add exercise section with a labelled Exercise name field and Add button. Shorten no-match copy to No matches · add a custom exercise.

**Preserve / limit:** Do not remove suggestions, exercise selection, or custom-name support.

## 17 — Rest timer

**P1 · Remove / relocate.** The device-clock caveat is implementation detail in a routine training control.

Current source: [src/components/logger/RestDock.tsx:97](../../../src/components/logger/RestDock.tsx#L97). Anchor: “Rest uses your device clock”.

**Recommendation:** Remove it from normal Rest options. If necessary retain a short background-timer explanation in help. In idle state combine Rest and Rest after each set into a single label; keep the duration and Start action.

**Preserve / limit:** Keep active countdown, pause, extend, skip, prescribed rest and errors.

## 18 — Workout review / receipt

**P1 · Consolidate.** Session review + Review your workout + explanatory paragraph repeat the review task. Successful saving is also explained several ways.

Current source: [src/components/logger/WorkoutSummary.tsx:35](../../../src/components/logger/WorkoutSummary.tsx#L35). Anchor: “Check the completed and incomplete work before saving.”.

**Recommendation:** Use Review workout with Check your sets, then save only if needed. After confirmed sync use Workout saved. Hide the Incomplete sets metric when zero; preserve the partial-workout count and warning when nonzero.

**Preserve / limit:** Never remove partial/invalid-set warnings or the local-only saving distinction.

## 19 — Workout validation / old history

**P1 · Rewrite.** Finite nonnegative and Structured set editing are technical language. Some recovery copy still points to Logs although the destination is now Training history.

Current source: [src/components/logger/PlateCalculatorSheet.tsx:47](../../../src/components/logger/PlateCalculatorSheet.tsx#L47). Anchor: “Enter a finite nonnegative bar weight.”.

**Recommendation:** Use Enter a bar weight of 0 kg or more, with equivalent target validation. Call old text records Saved workout note · read-only. Replace visible Logs references with Training history.

**Preserve / limit:** Keep numeric validation and read-only legacy behavior; do not alter saved records.

## 20 — Training plan

**P2 · Rename / consolidate.** Prescription is less immediate than exercises; plan source, assignment and update metadata take several lines.

Current source: [src/features/training/training-plan.tsx:98](../../../src/features/training/training-plan.tsx#L98). Anchor: “View full prescription”.

**Recommendation:** Use View exercises / Hide exercises and Targets inside the exercise guide. Compact level, location, days and update information. Keep Assigned plan versus Training template explicit.

**Preserve / limit:** Do not remove target sets/reps, demos, alternatives or actual training instructions.

## 21 — Training / Nutrition empty states

**P1 · Shorten.** Empty-state body copy repeats the heading and offers generic contact instructions.

Current source: [src/features/training/training-plan.tsx:246](../../../src/features/training/training-plan.tsx#L246). Anchor: “No workout plan has been assigned yet. Please contact your coach.”.

**Recommendation:** No workout plan yet / Your sessions will appear here when assigned. Use the equivalent meal-plan wording. Replace Plan assigned, but no days found with No sessions in this plan and a concise recovery instruction.

**Preserve / limit:** Do not claim a plan is being prepared when that state is unknown.

## 22 — Nutrition supplements

**P1 · Hide when empty.** An empty Supplements section occupies space without giving the user a next action.

Current source: [src/features/nutrition/nutrition-screen.tsx:83](../../../src/features/nutrition/nutrition-screen.tsx#L83). Anchor: “Nothing has been prescribed yet.”.

**Recommendation:** Render the section only when it has content. Keep supplements and usage instructions when present.

**Preserve / limit:** Do not hide a loading/error state as if there were no supplements.

## 23 — Nutrition notes

**P1 · Consolidate placement.** Cardio and steps notes are also available on Training.

Current source: [src/features/nutrition/nutrition-screen.tsx:90](../../../src/features/nutrition/nutrition-screen.tsx#L90). Anchor: “profile.cardio_note”.

**Recommendation:** Keep cardio and steps guidance in Training; show nutrition-specific guidance on Nutrition. Remove the duplicate placement rather than deleting the instructions.

**Preserve / limit:** Applies only to duplicated fields, not distinct instructions written for a meal.

## 24 — Nutrition totals

**P1 · Contextual only.** Matching totals and their explanation can be repeated across the target, meal totals and expanded details.

Current source: [src/features/nutrition/MealPlanDetails.tsx:35](../../../src/features/nutrition/MealPlanDetails.tsx#L35). Anchor: “Matches daily target”.

**Recommendation:** Show Daily target and one planned-meals total. Omit Matches daily target in the normal matching state. Explain a mismatch or incomplete meal data only when present. If all macros are missing, use one Macros not provided line.

**Preserve / limit:** Meal-plan calories are prescribed, not eaten. Preserve that distinction and meaningful mismatches.

## 25 — Weekly check-in introduction / completion

**P1 · Remove unsupported promises.** Your coach reads every word and detailed feedback within 48 hours are fixed service promises with no supporting service commitment found in this review.

Current source: [app/(app)/weekly-feedback.tsx:42](../../../app/(app)/weekly-feedback.tsx#L42). Anchor: “full picture. You&apos;ll get detailed feedback within 48 hours.”.

**Recommendation:** Use Week [n] check-in and Check-in submitted. Remove those promises unless the real service explicitly guarantees them. Make follow-up measurement/photo actions optional, not an Also upload instruction.

**Preserve / limit:** Existing coach assignment and actual instructions remain; this plan adds no coach or messaging features.

## 26 — Weekly check-in form

**P1 · Shorten / relocate.** Every step carries a technical date-window paragraph; broad step descriptions repeat the first question.

Current source: [app/(app)/weekly-feedback.tsx:257](../../../app/(app)/weekly-feedback.tsx#L257). Anchor: “Daily-record window:”.

**Recommendation:** Show one date range, e.g. 8–14 Sep. Put Based on [n] recorded days beside each prefilled average. Remove generic How did the week go overall? when the first field asks the same question. Preserve Optional on the final feedback field.

**Preserve / limit:** Use actual report dates, not this example. Keep sample coverage and editable prefilled values.

## 27 — Weekly exceptional save state

**P1 · Rewrite.** The user sees local cleanup, cleared draft and sent status repeated across a card and sticky footer.

Current source: [app/(app)/weekly-feedback.tsx:143](../../../app/(app)/weekly-feedback.tsx#L143). Anchor: “Retry cleanup”.

**Recommendation:** Use Check-in sent, a short explanation such as We couldn't remove the saved draft from this device. Retrying won't send it again, and Retry. Keep one clear status. Apply the same vocabulary to Home’s Finish weekly cleanup / matching draft still needs local cleanup entry.

**Preserve / limit:** Conditional source finding. Preserve acknowledgment, the no-resubmission guarantee and recovery behavior.

## 28 — Measurements

**P2 · Remove.** Lazy-rendering mechanics do not help a user interpret a chart.

Current source: [src/features/measurements/MeasurementProgress.tsx:119](../../../src/features/measurements/MeasurementProgress.tsx#L119). Anchor: “Chart loads when it comes into view.”.

**Recommendation:** Use a quiet loading placeholder while the chart prepares; remove the implementation sentence. Keep selected date, units, comparison baseline, gaps and All values. With only one date for the selected metric and no comparison, show the baseline value and date instead of a large one-dot chart and disabled date-navigation buttons. Show the plot when there is a meaningful comparison; preserve accessible data.

**Preserve / limit:** Do not replace a loading chart with a fake trend or remove its accessible values.

## 29 — Measurement entry

**P2 · Shorten.** Recording date and prefill behavior are explained in a long sentence.

Current source: [src/components/measurements/MeasurementSheet.tsx:139](../../../src/components/measurements/MeasurementSheet.tsx#L139). Anchor: “Values are prefilled from your last entry”.

**Recommendation:** Use [date] · Prefilled from your last entry. Review before saving. For edits use Entry date cannot be changed. Keep units in field labels and previous-value hints where helpful.

**Preserve / limit:** Do not remove the prefill disclosure: old measurements must not look like newly measured facts.

## 30 — Progress photo empty state / editor

**P1 · Relocate / consolidate.** The empty state explains angle choice, upload timing and baseline creation; the editor repeats partial-angle reassurance.

Current source: [app/(app)/media.tsx:358](../../../app/(app)/media.tsx#L358). Anchor: “Choose only the angles you want.”.

**Recommendation:** Empty state: Add photos to start comparing your progress. In the editor retain one concise upload/sharing disclosure and Any angles are optional. Remove the extra Partial sets are fine card; the photo slots already show the count. Keep the alignment instruction once: the captured editor repeats Stand square to the camera in the intro and individual slots.

**Preserve / limit:** Consent, photo sharing, upload timing, failures and unsaved-photo protection remain.

## 31 — Progress photo history

**P2 · Shorten.** N/4 photos — add the rest when you can suggests an unfinished obligation although angles are optional.

Current source: [app/(app)/media.tsx:169](../../../app/(app)/media.tsx#L169). Anchor: “photos — add the rest when you can”.

**Recommendation:** Use N photos. Keep angle names, dates, Baseline and Compare. Explain the optional alignment overlay beside its toggle only.

**Preserve / limit:** Count selected/saved images honestly; do not imply a selected image has uploaded.

## 32 — Settings reminders

**P1 · Contextual only.** A reminder row can have its switch, Off/time, a scheduling caption and an aggregate schedule count.

Current source: [app/(app)/settings.tsx:145](../../../app/(app)/settings.tsx#L145). Anchor: “Scheduled on this device”.

**Recommendation:** For a confirmed normal schedule, show the label, switch and time/day. Remove No daily/weekly reminder scheduled when Off already says this and remove the normal aggregate count. Show a status message when permission or actual device scheduling differs from the requested setting.

**Preserve / limit:** Do not hide pending, denied, failed or unavailable scheduling states.

## 33 — Settings reminder explanation

**P2 · Shorten.** The screen and enable-reminder sheet repeatedly explain that reminders can be changed or turned off.

Current source: [app/(app)/settings.tsx:133](../../../app/(app)/settings.tsx#L133). Anchor: “Optional prompts, scheduled in this device”.

**Recommendation:** Keep one concise purpose sentence at the permission request. Show Times follow your device timezone beside scheduling controls. Consider showing the pre-permission explanation only when access is actually needed.

**Preserve / limit:** The last change is a separate behavior task; preserve explicit permission and system-settings recovery.

## 34 — You / navigation vocabulary

**P1 · Standardize.** The entry says Weekly feedback, its hint says Your weekly check-in, and the destination says Weekly check-in.

Current source: [app/(app)/(tabs)/more.tsx:24](../../../app/(app)/(tabs)/more.tsx#L24). Anchor: “Weekly feedback”.

**Recommendation:** Use Weekly check-in everywhere. Drop redundant row subtitles such as Measurements → Track body measurements and Profile → Personal details. Keep useful disambiguation such as Settings → Reminders and theme if it helps scanning.

**Preserve / limit:** Retain the current five-tab structure; no new Coach tab or navigation expansion.

## 35 — Profile

**P2 · Keep / simplify elsewhere.** This short read-only explanation has a real purpose; the larger issue is repeated data entry between Profile and Assessment.

Current source: [app/(app)/profile.tsx:394](../../../app/(app)/profile.tsx#L394). Anchor: “Email can't be changed here.”.

**Recommendation:** Keep the email restriction clear. Consolidate shared fields in a later form pass, starting with name/phone and the already-linked goal, injuries, allergies and workout availability.

**Preserve / limit:** Do not drop profile data or the q14/q56/q64/q33 synchronization contract as a cosmetic cleanup.

## 36 — Assessment headings / progress

**P1 · Consolidate.** Section x of 10, a progress bar, a sections-complete button, a save instruction and Section x in the title create repeated chrome before questions.

Current source: [src/components/questionnaire/QuestionnaireWizard.tsx:315](../../../src/components/questionnaire/QuestionnaireWizard.tsx#L315). Anchor: “sections complete · View sections”.

**Recommendation:** Use one title without Section n:, a compact completion indicator and View sections. Show Unsaved changes only after editing, while keeping Save draft and exit protection. Remove generic introductory phrases. Remove the visible Profile section label above Basic details / Assessment, while retaining its accessible group label. Also change Allocate stars to instructions matching the actual numeric rating controls, beside that group only.

**Preserve / limit:** Keep a single clear progress model and accessible section position.

## 37 — Assessment goal questions

**P1 · Remove / combine.** Fourteen goal questions include overlapping failure, success, feeling and history prompts. SMARTS is homework before the user can describe a goal.

Current source: [src/lib/questionnaire-data.ts:73](../../../src/lib/questionnaire-data.ts#L73). Anchor: “Ensure that your goal follows the SMARTS framework”.

**Recommendation:** Remove the SMARTS lecture. Reduce this section to five core prompts: goal, previous attempts, what helped or got in the way (conditional), support needed now, and why the goal matters. Move maintenance planning to a later relevant moment.

**Preserve / limit:** Form/schema change: preserve old q14–q27 answers and do not reuse retired IDs for different meanings.

## 38 — Assessment irrelevant follow-ups

**P1 · Contextual only.** The renderer displays every question in a section without branching on previous answers.

Current source: [src/components/questionnaire/QuestionnaireWizard.tsx:218](../../../src/components/questionnaire/QuestionnaireWizard.tsx#L218). Anchor: “section.questions.map”.

**Recommendation:** Hide past-goal follow-ups after No, diet-history follow-ups after No, surgery details after No and supplement details after No. Ask them only when relevant.

**Preserve / limit:** Define how hidden answers are preserved and excluded from new submissions; do not silently erase earlier answers or require hidden fields.

## 39 — Assessment eating / lifestyle wording

**P1 · Rewrite / combine.** Good/bad eating days, junk food, giving things up and Be honest create judgment and repeated essays.

Current source: [src/lib/questionnaire-data.ts:175](../../../src/lib/questionnaire-data.ts#L175). Anchor: “really bad eating day”.

**Recommendation:** Use What do you usually eat in a day? and What makes eating as planned difficult? Replace sacrifice prompts with What changes would feel realistic? Remove Be honest so we can understand you more.

**Preserve / limit:** Keep allergies, preferences, schedule and practical nutrition constraints.

## 40 — Assessment low-value personal questions

**P1 · Remove from general intake.** The broad addiction question including porn, dark circles and a general memory question do not have a demonstrated fitness-planning use in this app.

Current source: [src/lib/questionnaire-data.ts:188](../../../src/lib/questionnaire-data.ts#L188). Anchor: “Do you have any addiction that you are aware of?”.

**Recommendation:** Remove q60, q74 and q76 from routine fitness intake. Keep relevant health constraints and an optional place to describe anything affecting safe exercise. This is a product-scope judgment, not a medical assessment.

**Preserve / limit:** Preserve existing answers privately; do not delete injury, medication, surgery, allergy or other relevant health information by analogy.

## 41 — Assessment training / nutrition history

**P1 · Combine / shorten.** Goal history repeats in training history; diet history asks several separate time/count questions. Some labels shout in all caps.

Current source: [src/lib/questionnaire-data.ts:123](../../../src/lib/questionnaire-data.ts#L123). Anchor: “Have you lost a good amount of weight before?”.

**Recommendation:** Keep current routine, experience and limitations. Ask about previous attempts once; make weight-change details conditional and goal-neutral. Combine WHEN WAS IT / FOR HOW LONG into one concise follow-up. Use sentence case.

**Preserve / limit:** Avoid blanket claims that past weight changes or nutrition history are useless.

## 42 — Assessment helpers / rating meaning

**P1 · Correct / retain useful guidance.** Measurement guidance has a typo and uncertain protocol. Generic helper text is noisy, while rating descriptions are defined but not rendered by QuestionField's rating branch.

Current source: [src/lib/questionnaire-data.ts:50](../../../src/lib/questionnaire-data.ts#L50). Anchor: “half a cam above your belly button”.

**Recommendation:** Remove empty boilerplate and the hydration Think about it prose. Verify the intended measurement protocol before correcting half a cam. Keep compact scale anchors and units where the user chooses a number; do not remove them as clutter.

**Preserve / limit:** Do not invent a medical measurement protocol or claim currently unrendered rating descriptions are visible clutter.

## 43 — Assessment broad wellbeing intake

**P2 · Simplify / make contextual.** Several separate anxiety, agitation, illness, life-stress and digestion questions expand the general intake.

Current source: [src/lib/questionnaire-data.ts:263](../../../src/lib/questionnaire-data.ts#L263). Anchor: “List the 3 biggest stresses in your life”.

**Recommendation:** Use one optional prompt about stress affecting the routine, with targeted digestion follow-ups when relevant to nutrition. Retain actionable symptoms and limitations; retire questions with no defined use after mapping their consumers.

**Preserve / limit:** This requires a form-content decision and compatibility work, not a string deletion.

## 44 — Health import introduction

**P2 · Structure / shorten.** The permission introduction combines supported data, date rules, review, sharing, optional access and no-write behavior in dense paragraphs.

Current source: [src/features/health/health-review-sheet.tsx:9](../../../src/features/health/health-review-sheet.tsx#L9). Anchor: “Dawnage reads morning weight”.

**Recommendation:** Keep a short readable disclosure of what is read, that selected values are reviewed and shared on submission, and that access is optional and read-only. Put the before-noon morning-weight rule next to that field or in explanation of an unavailable weight.

**Preserve / limit:** Do not remove informed choice or hide sharing behind an unlabeled info icon.

## 45 — Health import result

**P2 · Platform-specific / contextual.** The result footer gives both iOS and Android settings paths and repeats selection behavior.

Current source: [src/features/health/health-review-sheet.tsx:70](../../../src/features/health/health-review-sheet.tsx#L70). Anchor: “Change or revoke access in Apple Health”.

**Recommendation:** Show only the current platform's access instructions, under a clear Manage access detail. Keep source, selected day, partial-day status, replacement warnings and the distinction between food intake and calories burned.

**Preserve / limit:** Native results reviewed from source only; web cannot validate native permission or data behavior.

## 46 — Shared save / recovery language

**P1 · Standardize.** Saved, synced, local, server and delivery terminology varies across surfaces.

Current source: [src/components/ui/RecordStatus.tsx:31](../../../src/components/ui/RecordStatus.tsx#L31). Anchor: “Saved and synced”.

**Recommendation:** Use a small state vocabulary: Draft saved on this device; Waiting to sync; Saved; Couldn't save / Couldn't sync, each with an action where needed. Use Saved alone only after server acknowledgment. Collapse repeated normal confirmations, not unresolved states.

**Preserve / limit:** Keep screen-reader announcements even when redundant visible text is removed.

## 47 — Shared errors / reassurance

**P2 · Rewrite.** Poetic error headlines delay the useful explanation.

Current source: [src/features/home/TodayBrief.tsx:79](../../../src/features/home/TodayBrief.tsx#L79). Anchor: “Your day is still here”.

**Recommendation:** Use Couldn't load today's summary with Retry. Across screens, lead with the specific failed action and retain only the reassurance that is true for that state.

**Preserve / limit:** Do not erase useful data-preservation warnings or pretend failures succeeded.

## 48 — Unused copy in source

**P3 · Optional dead-code cleanup.** Seven rotating check-in affirmations are defined, but getCheckInDailyPrompt has no production call site found; only its tests reference it.

Current source: [src/components/checkin/checkin-presentation.ts:4](../../../src/components/checkin/checkin-presentation.ts#L4). Anchor: “A quick honest check-in is enough.”.

**Recommendation:** Remove the unused prompt export/function and related tests in a separate housekeeping change if no external consumer exists.

**Preserve / limit:** These are not current visible UI clutter. Their removal will not make the screen shorter.

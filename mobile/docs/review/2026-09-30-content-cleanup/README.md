# Dawnage mobile content cleanup plan

**Recommendation: simplify the existing screens first, then shorten the assessment.** The main problem is repeated explanation and too many layers of status text. It does not require new features or a navigation redesign.

This is a proposed cleanup, not an implementation. No mobile application source was changed. The review covers the current working tree, including its pre-existing changes; it is not limited to the committed version.

## What should change first

| Priority | Change | Why it helps |
| --- | --- | --- |
| 1 | Remove duplicate helper paragraphs from check-in, workout completion, overview and normal saved states. | Makes the action and the user's data easier to find. |
| 2 | Remove empty Supplements, the device-clock note and generic motivational footers. | Removes content that does not help with the immediate task. |
| 3 | Replace technical language and inconsistent names: `finite nonnegative`, `local cleanup`, `Logs`, `Weekly feedback`. | Uses words the client can understand and find in navigation. |
| 4 | Remove the hard-coded 48-hour feedback promise and “reads every word” claim unless the actual service guarantees them. | Avoids setting expectations the app cannot substantiate. |
| 5 | Keep only the status that matters now: draft, pending, failed, or confirmed saved. | Reduces repeated reassurance while preserving confidence in saving. |
| 6 | Shorten the 87-question assessment and make follow-up questions conditional. | Removes the largest source of unnecessary reading and answering. |

Some of the recently added explanatory copy should be trimmed too. The suggested set values, explicit completion controls, visible sets and daily answered counter remain useful; their surrounding paragraphs are the cleanup candidates.

## Evidence and scope

The source inventory scans **251 production TypeScript/TSX files** in `mobile/app` and `mobile/src`. It contains **2,205 candidate literals**, including accessibility labels, errors, strings that are not rendered, and conditional states. This is **not** a count of 2,205 visible messages. The [inventory](copy-inventory.json) and [source hashes](source-manifest.json) document the inspected working tree.

The [48-item finding register](findings.md) gives each recommendation an exact source location, current wording, proposed treatment and preservation constraint. Native-only behavior and exceptional recovery states are identified as source review, not claimed as tested interactions. This is a content/UX cleanup review, not a security, medical, performance or accessibility-compliance certification.

See [visual evidence and coverage](evidence/README.md) for current-run screenshots and capture limits. All captured app data is fictional and intercepted locally. No live account or production database was used.

## Screen-by-screen decision

The numbered list follows a client's path through the app. “Health” below is an editorial assessment of the copy and task structure, not a runtime test result.

| Step | Surface | Content health | Cleanup direction | Findings |
| --- | --- | --- | --- | --- |
| 1 | Sign in, account creation, verification and password reset | Mostly clear; signup/verification over-explain | One title and form; place lifecycle details at the start decision. Keep verification and recovery instructions. | 01–03 |
| 2 | Setup, welcome and practice guide | Repetitive | Remove motivational footers and repeated Day 1 explanations; retain the actual start consequence and practice-not-saved notice. | 04–05 |
| 3 | Home and expanded progress | Useful hierarchy, verbose supporting copy | Keep next action, week record and concise recap; shorten normal status/helper text. | 06–09, 47 |
| 4 | Check In hub, date history, daily form and receipt | Useful controls; too much repeated framing | Keep stages, answered counter, dates and entry provenance. Trim hub prose and repeated receipt headings. | 10–13 |
| 5 | Workout logger, overview, rest, review and recovery | Core controls are useful; secondary copy is noisy | Keep suggestions, steppers, visible sets, Undo and completion. Remove redundant explanations and technical wording. | 14–19 |
| 6 | Training plan, exercise detail and history | Mostly useful | Plain labels, compact metadata and truthful empty states. Keep targets, notes, demos and template distinction. | 19–21 |
| 7 | Nutrition plan and meal details | Empty and duplicate sections add noise | Hide empty Supplements; avoid duplicate cardio/steps notes; show exceptions around totals only when relevant. | 21–24 |
| 8 | Weekly check-in and history | Needs cleanup | Remove unsupported promises, shorten date-window prose and simplify exceptional save wording. | 25–27 |
| 9 | Measurements, chart and entry | Mostly useful; some implementation copy | Remove lazy-loading prose and use a compact baseline for one observation; retain dates, units and prefill disclosure. | 28–29 |
| 10 | Progress photos, capture and comparison | Over-explained empty/editor states | Move disclosure to capture, state optional angles once, remove completion pressure. | 30–31 |
| 11 | You, Profile and Settings | Navigation is usable; redundant labels/status | Standardize Weekly check-in, drop obvious subtitles and consolidate normal reminder status. | 32–35 |
| 12 | Assessment, all 10 sections | Largest cleanup opportunity | Consolidate headings and shared facts; combine essays; branch follow-ups; retire low-value personal questions. | 36–43 |
| 13 | Health access and import | Important content, dense presentation | Keep informed choice; structure the explanation and show only the relevant platform's instructions. | 44–45 |
| 14 | Shared errors, saving, accessibility and native surfaces | Meaningful distinctions must survive cleanup | One consistent status vocabulary; shorter visible copy without removing semantics or recovery actions. | 46–48 |

## Concrete removals and rewrites

| Current wording / element | Proposed treatment |
| --- | --- |
| “Take a moment to reflect. Build a clear record of your day.” | Remove from the normal Home check-in card; the title and button already explain the action. |
| “A starting point, with room to evolve.” | Remove the setup footer. |
| “No perfect days required. Just a clearer picture of you.” | Remove the repeated setup reassurance. |
| “All sets are complete. You can continue or choose a set below to edit an entry.” | Remove; keep Exercise complete, the next action and the editable set rows. |
| “Choose an exercise to view its sets. Your entries stay in place.” | Remove from workout overview. |
| “Rest uses your device clock, including time in the background. Changing that clock changes the countdown.” | Remove from routine rest options. |
| Supplements / “Nothing has been prescribed yet.” | Hide the whole section when confirmed empty. |
| “Chart loads when it comes into view.” | Replace with a quiet loading placeholder. |
| “1 weight observation this week. A change needs two dates.” | “1 weigh-in this week.” Keep its date; don't invent a trend. |
| “View full prescription” | “View exercises.” |
| “Enter a finite nonnegative bar weight.” | “Enter a bar weight of 0 kg or more.” |
| “Retry cleanup” | “Retry,” beside a short, explicit explanation that the report was sent and retry will not send it again. |
| “N/4 photos — add the rest when you can” | “N photos.” Angles are optional. |
| “Weekly feedback” → “Your weekly check-in” → “Weekly check-in” | Use “Weekly check-in” consistently. |
| “No daily reminder scheduled” next to Off and an off switch | Remove the redundant normal caption. |
| “Your coach reads every word” / “detailed feedback within 48 hours” | Remove unless backed by the real service commitment. |

Do not substitute ellipses, icon-only controls or very small type for the removed paragraphs. The benefit should be less content, not harder-to-read content.

## Assessment: the biggest cleanup

There are **87 question definitions in 10 sections**; **6 are marked required**. Optional questions still create reading and scrolling burden. `QuestionnaireWizard` maps every question in the chosen section without checking prior answers, so a person who answers No to surgery, supplements or previous diets still sees the dependent questions.

### Remove from routine intake

- **q60**, the broad addiction question including “porn”: there is no demonstrated need for this in the general fitness setup. It asks for unusually personal information without explaining its use.
- **q74**, dark circles, and **q76**, the general memory question: no clear planning action is tied to either in the reviewed client app. Remove them from the ordinary fitness questionnaire. This is not a claim that these topics have no medical significance.
- The **SMARTS framework lecture** before the user can state their goal.
- Generic helpers such as “Be honest so we can understand you more,” “Understanding your habits,” and the long hydration instruction about whether the user has thought about it.
- Repeated section numbers and repeated progress explanations.

### Replace 14 goal questions with five core prompts

| Proposed prompt | Existing material | Treatment |
| --- | --- | --- |
| What would you like to achieve? | q14 | Keep required. |
| Have you worked toward this before? | q15 | Keep; controls the follow-up. |
| What did you try, and what helped or got in the way? | q16–q19, q21–q23 | One optional follow-up when the previous answer is Yes. |
| What support would help this time? | q20 | Keep, with direct wording. |
| Why does this goal matter to you? | q24, q25, q27 | One optional prompt; remove the success/failure emotional interrogation. |

Move q26, maintenance planning, to a point when the person is approaching the goal. Do not assign this work as a condition of starting.

This is a proposed new questionnaire version. Existing answers must remain readable under their original questions; do not silently merge old essays, reuse retired IDs for new meanings or wipe history.

### Make follow-ups conditional

| Earlier answer | Show only when relevant |
| --- | --- |
| Previous attempt: Yes | Previous approach/outcome/barriers. |
| Alcohol use: Yes | Frequency/quantity, phrased neutrally. |
| Previous weight change: Yes | Amount, timeframe and relevant difficulties. |
| Previous nutrition plan: Yes | What kind and how long; avoid three separate timing/count essays. |
| Previous surgery: Yes | Relevant details. |
| Supplements: Yes | Which ones and how they are used. |
| Digestive difficulty reported | More detailed symptom questions if these inform the actual service. |

Retain the ability to change an earlier answer. Hidden answers should not be lost silently or submitted as current facts without review. Hidden fields must not block section completion.

### Consolidate repeated facts

Profile and Assessment already synchronize **goal, injuries, allergies and workout days** through q14/q56/q64/q33. Preserve that behavior. Name and phone appear in both places but should not be assumed synchronized merely because their labels are similar. Choose one editable source of truth and let users review known information instead of retyping it.

Initial assessment weight/measurements and ongoing progress entries are not necessarily duplicates: they have different dates and purposes. Show existing values with their dates and require confirmation before treating them as a new observation. Do not erase the initial baseline to make the form shorter.

### Improve tone and useful guidance

Replace “a really good eating day” / “a really bad eating day” / “processed junk food” / “what will be very hard for you to give up” with neutral questions about usual meals, practical obstacles and realistic changes. Keep allergies, injuries, relevant medical limitations, medications, training access and availability.

Correct the “half a cam” measurement typo only after verifying the intended measurement method. Rating-scale meaning belongs beside the rating; `QuestionField` currently omits the defined descriptions in its rating branch. Those descriptions are not current visible clutter. Preserve or restore concise anchors rather than deleting their meaning.

## What should stay

| Keep | Reason |
| --- | --- |
| Morning / Your day grouping and answered counter | Helps users understand where they are and what remains. |
| Suggested versus entered values, target versus history, dates and units | Prevents old or prescribed values from looking like completed work. |
| Visible sets, Complete set, Undo, exercise alternatives and steppers | Functional controls, not unnecessary indication. |
| Partial-workout counts and invalid-set messages | Prevents incomplete data from looking complete. |
| Draft, waiting-to-sync, blocked and failed-save distinctions | Users need to know whether work is safe and available on their account. |
| Unsaved-change confirmations and retry actions | Avoids lost or duplicated work. |
| Required/optional field meaning and rating anchors | Makes forms answerable. |
| Plan targets, relevant notes, substitutions and exercise instructions | These directly affect the workout or meal. |
| Reporting dates, chart baselines, sample coverage and missing data | Makes progress claims honest. |
| All values, screen-reader labels and live announcements | Provides access beyond the visual presentation. |
| Photo sharing/upload disclosure and health access/replacement choices | Explains what happens to the user's information at the decision point. |
| Start-of-program consequence at first submission | Prevents accidentally starting the program. |
| Password reset, email verification and permission recovery instructions | Necessary task guidance. |

“Coach-related” is not a reason to erase a client's actual training instructions. This plan adds no coach, messaging or voice features and does not revive the earlier proposal for a Coach tab.

## Implementation sequence

The revised [five-phase execution plan](../../superpowers/plans/2026-09-30-content-cleanup-phases.md) supersedes the initial four broad passes. It maps every finding to its phase, lists the exact first-phase cleanup, and defines checks for each delivery.

| Phase | Focus | Result |
| --- | --- | --- |
| 1 | Basic cleanup and critical wording | Remove obvious filler, misleading promises, redundant labels and confirmed-empty Supplements while preserving workflows. |
| 2 | Unnecessary questions and repeated data entry | Shorten the assessment with historical-answer and Profile compatibility preserved. |
| 3 | Everyday screen layouts | Simplify hierarchy, metadata, progress indicators and sparse-data displays. |
| 4 | Contextual help and status | Show concise normal states and clear, actionable exceptions. |
| 5 | Consistency and final verification | Finish small source housekeeping and whole-app/device checks. |

Testing belongs to every phase. Phase 5 adds the final cross-app review. No app changes have been implemented by this plan.

## Acceptance checks for a future implementation

These checks are the plan; they have not been run as post-change tests because no app change was made.

- Compare the same normal, empty, expanded and saved views before/after at 390 px and 320 px, plus native larger text. Make the action easier to see without shrinking type or touch targets.
- Complete and edit a workout: accept a suggestion, adjust values, complete/undo, switch exercises, use the overview/rest timer and save a partial workout. Verify values and completion remain unchanged by copy cleanup.
- Complete daily check-in, visit history, edit a submitted record, leave/reopen a draft and exercise failed/local-only saving. Counter, dates and status must stay accurate.
- Check all reminder states: off, confirmed scheduled, permission denied, scheduling failure and unavailable preview. Do not equate requested settings with a successful native schedule.
- Check prescribed versus listed meal totals, missing macros and mismatches. No meal-plan value should be described as food consumed.
- Review charts with zero, one and multiple observations; keep dates, gaps and accessible values.
- Open photo/health flows and verify sharing information appears before the relevant action; cancellation, partial uploads and replacement choices must stay clear.
- Test each new assessment branch, old answer rendering, profile overlap updates, partial drafts and section completion with hidden follow-ups. Use meaningful behavior tests for these changes.
- Check VoiceOver/TalkBack reading order and announcements on native builds. Removing visible text must not remove labels, units or state semantics.
- Run existing lint/type checks and affected tests. Update capture scripts that assert exact copy; do not weaken their behavioral checks to make a rename pass.

## Suggested first delivery

Start with Phase 1 from the revised execution plan. Its scope is the basic cleanup only. Phase 2 then tackles the assessment, the largest source of unnecessary answering, before the layout and contextual-message refinements. Each phase produces a separately reviewable, tested result.

No new market research or new feature proposal is needed to justify these changes: the findings come from the current app's content and behavior definitions.

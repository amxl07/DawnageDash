# Complete feature and interaction specification

Scope: actual routes in `mobile/app`, shared primitives and active feature components, as inspected on 17 September 2026. This defines the proposed destination. It does not claim that every treatment below is implemented. All durations are maximum starting targets to validate on device. The shared [system](02-design-system.md) applies to every feature.

## Product structure

Keep five destinations: **Home, Check In, Plans, Logs, You**. Home answers “what next?”, Check In records today, Plans explains assigned work, Logs contains workout history, and You houses personal records/settings. Measurements, progress media and weekly feedback remain reachable from You/Home; do not add more bottom tabs.

There is no current chat/AI-coach screen. Coaching identity, prescriptions, nutrition guidance and assessment are existing content. Do not imply that a new chat service, readiness model or automated medical interpretation is part of this visual upgrade.

## 1. Launch, authentication and account recovery

**Sources:** `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/reset-password.tsx`.

- **Launch:** retain the static branded native splash. The app shell appears as soon as fonts/auth state allow; no cinematic delay before usable content. Match splash/background colors to avoid a white flash. Optional first-run artwork belongs after launch.
- **Sign in:** one quiet brand mark, a clear heading, persistent email/password labels, visible password control and one full-width primary action. Supporting links sit below the action. The keyboard must never cover the focused field or recovery link.
- **Feedback:** immediate touch tint; preserve action text while authenticating; block duplicate requests. Invalid credentials appear beside the form with a retry path. A network error retains the email and appropriate existing input state. Do not show success before the session is established.
- **Recovery:** show the requested email or confirmation context without exposing account existence beyond current service behavior. Resend/cooldown uses plain text; no ticking animation. Deep-link expired/invalid states explain the next action.
- **Motion:** form/route uses native navigation. A single ≤200 ms opacity reveal may bridge resolved auth state. No staggered input entrances, animated password characters, bouncing error or focus-moving celebration. Reduced motion is immediate.
- **Acceptance:** autofill/password managers, return-key behavior, large text, keyboard dismissal and recover/back links remain usable; failure never clears unrelated user input.

**Sign-up is also an existing feature in the login route.** Preserve its two stages: name/country/phone, then credentials. The country picker remains searchable/accessible according to its current behavior, and password visibility keeps a stable labelled target. Validate the current stage before continuing; Back retains values. Use the same 160 ms local transition, with the heading and focus established together. The verification-email receipt confirms the actual service response and provides the existing next action; it is distinct from an authenticated session. Do not add biometric sign-in or social login solely for visual variety.

## 2. Onboarding: start, rhythm and ready

**Source:** `app/(app)/onboarding.tsx`, `src/components/onboarding/TimezonePicker.tsx`, `VideoStep.tsx`.

**Composition:** one short title, one current task and the visible step position. Keep the existing three-stage structure. A seven-mark brand motif gives continuity with Home without introducing another data score. The optional introduction video and longer assessment do not compete with getting started.

| Stage | Interface | Motion / feedback | Edge states |
| --- | --- | --- | --- |
| Start | Existing focus selection: fat loss, muscle gain, performance or consistency | Optional one-time ≤800 ms line reveal away from controls; selected check/surface 160 ms; CTA immediately usable | No invented default goal; load/retry and per-stage save retain the chosen value |
| Rhythm | Existing explanation of the daily ritual; optional introduction video stays secondary | Clear visual examples with ≤160 ms local transitions; no permission prompt on entry | Video opens only by request and stops/closes on stage change or backgrounding |
| Ready | Existing goal/timezone review and “Open my Home” action | Brief ≤500 ms check once after actual setup save; Home becomes usable immediately | Saving/failure follows actual onboarding persistence; do not invent offline completion support |

Back preserves state. The implementation lives in `src/features/onboarding/SetupStage.tsx`; profile entry is in sign-up/profile, and notification scheduling stays in Settings. A forward transition may use ≤8 pt travel/160 ms opacity for non-input illustration only; never move a focused field beneath the keyboard. Focus the new title on screen-reader navigation. Reduced motion uses immediate content replacement. Video playback is user-initiated, with captions/transcript where content assets support them; missing captions are a content-production item, not a claim of present support.

## 3. Home: Today Brief

**Sources:** `app/(app)/(tabs)/index.tsx`, `src/features/home/TodayBrief.tsx`.

Keep the personal greeting/date/coach small enough that the next action appears early. The main action surface has a crisp title, one sentence and one CTA. Use coral in that CTA and a restrained directional mark; avoid filling the entire screen with color.

Action hierarchy is derived from actual existing state: resume interrupted work, resolve a blocked record when necessary, complete the daily check-in, perform the next assigned session, or review progress. Preserve the existing resolver's priorities unless separately specified. Do not let a graphics redesign silently change business logic.

Cached content stays visible during refresh. Profile, plan or local-record failures have independent retry affordances so one failure does not erase the whole screen. Pending delivery is a factual status row, not a celebratory metric. Header/profile/link controls gain touch-down tint with no navigation delay.

Home does not animate all cards on tab focus. A newly changed next action can crossfade its secondary summary over 160 ms without shifting the user's current scroll position. Accessible reading order remains greeting → action → status → week → training → recent record.

## 4. Home: weekly rhythm

**Source:** `src/features/home/WeekRecordStrip.tsx`.

Retain dated, individually accessible days. Visually group seven marks with a clear today outline. The large optional graphic is labelled **“Check-ins this week”** with an explicit count; it is not a readiness percentage. Days retain distinct empty/draft/queued/synced/blocked forms, with icons/text beyond color. Future days are visibly unavailable.

A newly synced day fills only its own mark over 200 ms. Do not restart the sequence on scroll, rerender or tab revisit. A queued record uses a small pending indicator, and the graphic does not claim server delivery. Tap opens the corresponding supported dated record with all exit guards. At 320 pt/large text, use a contained horizontally scrollable week strip with large targets or a wrapping labelled list; never squeeze targets into illegibility.

Rendering: SVG initially. Reuse Skia only if already justified by the chart pilot. Keep every day as a native button/label; canvas is decoration. Reduced motion shows the updated mark immediately.

## 5. Home: training and recent record

**Sources:** `NextSessionCard.tsx`, `RecentRecord.tsx` under `src/features/home`.

Training presents the actual assigned session, its provenance and one clear start/resume action. All logged, pending delivery, template and unavailable-plan states use different factual copy. Starting must not bypass an existing workout draft or overwrite a selected plan.

Recent Record emphasizes one dated observation and its unit. Keep the seven-day sleep mean's sample count. Fewer than two observations show points/text, not a fabricated trend. The chart allows tap-to-nearest and optional horizontal inspection with a fixed readable date/value label outside the plotting area. A native adjustable control and a “View values” list offer the same information without dragging.

During inspection: crosshair follows the selected real observation immediately; no interpolation is presented as a recorded value. Missing days remain gaps, axes do not bounce, and no green/red implication is assigned to weight change. Vertical scrolling must win until horizontal intent is established. This is the **first Skia pilot**, evaluated against the current SVG implementation.

## 6. Check-in: entry, date and draft

**Sources:** `app/(app)/(tabs)/check-in.tsx`, `src/features/checkin/components/DailyRecordHeader.tsx`.

The date/title/status header is stable. Today uses “Your daily check-in”; an older date is explicit. Date/history access remains a separate target, not a horizontal form-swipe gesture. Loading, invalid date, local-only entry, recovery and older-record editing each retain their existing route logic.

Show “Draft”, “Saving on this device”, “Saved on this device”, “Waiting to sync”, or the actual failure state where applicable. Avoid moving the entire form down on every keystroke: reserve a compact status area or keep its height stable when appropriate at large text. Never substitute visual animation for durable storage.

Changing date/account or leaving with pending edits uses the current guard and numeric flush protocols. A sheet focuses its heading on opening and returns focus to its date trigger. Do not replay input selection feedback when restoring a draft.

## 7. Check-in: Readiness

**Sources:** `CheckInForm.tsx`, `CheckInRatingScale.tsx`, `NumericEntry.tsx`.

**Hierarchy:** “How are you feeling?” with a short helper, Energy, Stress, and optional Weight. Retain the exact 1–10 values in two rows of five. Label endpoints and show the selected numeric value in text; meaningful wording must match each field's existing semantics.

Each rating tile is at least 44/48 pt. Press-down immediately changes its surface; selection commits on release, adds a check/strong boundary and updates the text together over 160 ms. A long press simply holds the pressed state. Selecting the existing answer does not haptic or replay an animation. Restoring an answer mounts in its selected state without a “new answer” animation.

Weight remains optional direct entry, with persistent unit and clear placeholder. Any previous weight is clearly dated and must be explicitly copied if that affordance exists. Never prefill today's subjective answers. Continue commits current numeric text and validates only this section. The primary action does not submit the check-in.

Invalid input remains visible and focused; error text is persistent. Do not shake the value, spin digits or reintroduce a ruler. Reduced motion retains all pressed/selected/error feedback through color, shape and text.

## 8. Check-in: Recovery

**Source:** `CheckInForm.tsx`, numeric commit provider and rating controls.

Sleep uses direct numeric entry plus existing 6/7/8/9-hour quick choices. Quick choice indicates explicit selection, not a recommendation. Hunger retains 1–10; digestion retains actual options and accessible labels. Present each as an open field block rather than a nested dashboard.

Quick choices use the same 160 ms selected treatment. Numeric typing is native and instantaneous. Keyboard Next/Done follows existing commit behavior; unsuccessful blur/refocus does not lose the raw invalid text. Continue or Back is reachable when the keyboard opens. At compact height, actions enter the single scroll flow rather than compete with a second dock.

Step changes update the step title/progress and focus predictably. Use ≤160 ms opacity only for the new section after the existing commit/validation decision. There is no requirement to delay rendering or await an animation callback. Reduced motion changes content immediately.

## 9. Check-in: Training and nutrition

**Source:** `CheckInForm.tsx`, `OptionalCheckInFields.tsx`.

Show workout status first, conditional performance only when relevant, then nutrition adherence. The “Additional details” disclosure contains optional calories, water, steps and macros. The collapsed summary can say “2 details added” based on actual populated values; it never implies required completion.

Disclosure chevron rotates 160 ms. Content appears immediately or with 160 ms opacity; do not animate height around a focused numeric field. Before collapsing, run the existing numeric flush. If invalid, keep the section open, reveal/focus the correct field and retain the error. Repeated validation must re-reveal the same field correctly.

Conditional performance retains its current restrained treatment; cancellation never silently wipes unrelated fields. Colors represent selection, not moral judgments about nutrition. No calorie ring with an assumed target; use assigned targets only if the data contract actually provides them.

## 10. Check-in: Review, save and receipt

**Sources:** `check-in.tsx`, `CheckInReceipt.tsx`, review blocks in `CheckInForm.tsx`.

Review uses three grouped summaries, each with a labelled Edit action. Hide absent optional values but preserve meaningful zero. Notes are optional. The sole final action says “Save check-in” or the existing clear update wording. It performs full validation and the real save path.

While saving, keep the action label/context and prevent duplicate submission. On a fresh result, a small check path can draw over 300 ms and settle within 500 ms total. The actual result text appears immediately. **Queued:** “Saved on this device” and a pending delivery explanation. **Synced:** a confirmed saved receipt with date. **Blocked/failed:** retain edits and show the actual correction/retry action. Do not use the same success color/wording for every state.

Receipt replay is keyed to a new result identity, never route mount, retry start, or reopening an existing record. Screen readers hear the factual result once. Reduced motion shows the final icon. Edit and return actions remain usable during the finite decoration.

## 11. Workout: start, recovery and session context

**Source:** `app/(app)/logger.tsx`.

Keep the compact date/session title and Overview link. Session details are secondary. Loading, recovered draft, choose-existing-log, unavailable plan/history and preserved legacy text remain explicit states. A draft recovery decision never hides inside a progress animation.

The main header names the current exercise with readable wrapping, “Exercise 1 of 3”, and a completed-set count. There is one current editor and one primary local action. Do not make Finish permanently compete with Complete set; review/finish belongs to Overview or the appropriate completion state.

Previous/Next remain visible alternatives to swiping. Existing swipe thresholds, velocity handoff, edge resistance and guard behavior are preserved. Physical-device inspection should check a swipe under keyboard and data load, but source alone does not establish a current jank defect.

## 12. Workout: current set editor

**Sources:** `CurrentSetEditor.tsx`, `ExerciseSlide.tsx`.

Use an elevated, restrained set surface: set kind/number, target, large direct input, one completion button, dated previous values, then optional effort/details. At 390 pt weight/repetitions can sit side by side; below 360 or at large text, stack them. Duration-tracked exercises use the correct seconds/time input rather than a weight-shaped placeholder.

Weight/reps/duration/RPE inputs remain native text controls with actual validation. Units stay visible. “Use previous values” is explicit and reversible; the previous date and exercise context are legible. Copy and Undo receive touch tint, not another large animated panel. Bodyweight and blank/zero rules remain unchanged.

Completing captures the stable set ID. Commit immediately, show a local check and retain a compact “Set 1 complete · Undo” summary. The next editor occupies the same visual anchor and may fade in over ≤160 ms. Do not auto-focus a new keyboard, auto-scroll the whole screen, or auto-advance to the next exercise. Fast repeat taps must not accidentally complete the next set.

One light haptic belongs to completion. If rest auto-start is enabled, it shares that event silently. Reduced motion performs the same state change without travel.

## 13. Workout: completed sets, effort and exercise completion

**Sources:** `ExerciseSlide.tsx`, `CompactSetRow.tsx`, `CurrentSetEditor.tsx`.

“Sets” opens a concise list with set kind, recorded values, complete/incomplete status and an explicit Edit target. Completed rows do not expand into a second full editor. Editing selects that stable ID and closes the list as currently implemented. Removing/restoring a set preserves the correct identity and related Undo behavior.

Effort/options is secondary and follows the shared disclosure treatment. Make RPE terminology understandable using existing help copy; do not force an answer merely for a visually complete card. Add a set remains inside the sets context.

When all sets for the exercise are complete, replace the editor with an anchored factual summary and **“Next exercise”**. The final exercise offers review. A check transition lasts ≤160 ms; no confetti after every set/exercise. A user can still inspect/edit previous work. Reduced motion is immediate.

## 14. Workout: rest

**Sources:** `RestDock.tsx`, `useRestTimer.ts`.

Use a compact bottom surface with a plain tabular time, thin progress track, and explicit Pause/Resume, +time and Skip/Finish controls as supported. It must visually read as a secondary tool. Use glass only on supported iOS when contrast and cost pass; solid is complete and equally intentional.

Preserve absolute timestamps, pause state, persistence and independent display subscriptions. Digits update once per meaningful time change without rolling or pulsing. A progress fill may interpolate linearly between display samples; it never becomes the clock. Pause freezes the displayed progress; changing duration recomputes from the authoritative timer model.

At compact height, large text or keyboard visibility, preserve the existing inline dock rule. Only one owner adds keyboard/safe-area offsets. The expiry notification/haptic occurs once when supported; background delivery follows actual notification permission behavior. Do not promise a background visual timer can keep running.

## 15. Workout: Overview, details and tools

**Sources:** `WorkoutOverviewSheet.tsx`, logger route and exercise prescription/tool components.

Overview is an explicitly titled sheet with a stable handle/header, close target and exercise rows. Each row shows position and completed/total count. Selecting returns to that exercise without losing session edits. Adding an exercise keeps the name route-owned so dirty exit protection remains valid. The keyboard-aware input and explicit snap sizing stay intact.

Exercise prescription, substitution and plate calculator remain secondary focused tasks. Show actual prescription data, current equipment/units and clear apply/cancel. Calculated plates are a representation of the entered load, not a promise about equipment availability. No spinning plates or complex 3D UI are needed to explain arithmetic.

Sheets use existing Gorhom transitions; selected row tint is immediate. On opening, focus the title; on close, restore the trigger. No simultaneous sheet animation and custom full-page zoom. Reduced-motion and hardware-back behavior follow the shared contract.

## 16. Workout: review, save and delivery

**Source:** `WorkoutSummary.tsx`, logger submission/draft paths.

Review shows completed exercises/sets and explicitly identifies incomplete/excluded entries. Optional notes stay secondary. Partial sessions are supported through the existing contract; a progress ring must not coerce the user to falsify completion.

Save communicates preparing/sending, local queue, synced receipt and blocked/failure states separately. Retain corrections and retries. The finite receipt treatment matches check-in, keyed to a fresh result. Do not celebrate merely opening a summary. Exit/Done never silently bypasses unsaved edits.

## 17. Plans: workout prescription

**Sources:** `app/(app)/(tabs)/plans.tsx`, `src/components/plans/PlanDayCard.tsx`, `ExercisePrescriptionSheet.tsx`.

Workout/Nutrition remains a clearly labelled segmented control. The chosen segment's text and fill stay readable during transition. Plan metadata/coach provenance appears before day cards. Each day has a title, concise exercise count/summary and one start/view action. Expand one day without animating every exercise row.

Keep the existing 160 ms chevron/≤200 ms content treatment as the shared disclosure model. Long exercise prescriptions wrap. Superset/rest/tempo information uses clear labels if present in the actual prescription; missing data stays absent. Start routes through existing draft/session guards. Empty/unassigned/stale/error states show actual availability and retry.

Consolidate the duplicated exercise list: currently the day cards and a separate permanent “Exercise details” card both list exercises. Use one day-level list with a details/prescription action per exercise; retain every prescription, alternative and video-link destination. This removes visible density before adding motion.

## 18. Plans: nutrition, supplements and coach notes

**Source:** plans route and active nutrition components.

Use readable meal sections with portion/quantity information and optional notes. Macro targets receive one clear summary when assigned, not a dashboard full of competing rings. Supplements and coach notes are secondary disclosures. Preserve exact units, wording and provenance; motion never converts a prescription into an automated health recommendation.

Switching plan type is immediate or a 160 ms local opacity transition with cached content retained. Do not animate numbers from zero on every visit. Empty nutrition plans explain that assignment is pending; errors do not become empty-state illustrations. External documents/links have descriptive targets and retain current link handling.

## 19. Logs: server history and local drafts

**Sources:** `app/(app)/(tabs)/logs.tsx`, active log-card components.

Local drafts and server history have explicit labels. Each card shows date, session name and factual totals, with draft/queued/blocked state distinguished. Resume is the principal local-draft action. History filters/search, where currently supported, keep native typing and immediate result state.

Expandable details use the shared 160 ms chevron/opacity treatment, matching Plans. Long lists do not stagger on scrolling or reanimate when returning from a log. Existing summary metrics use readable plain numbers at large text; animated odometers are optional for infrequent updates only. An empty history invites a workout; a failed fetch offers retry while retaining available local records.

## 20. Measurements and historical charts

**Sources:** `app/(app)/measurements.tsx`, active `LineChart`, `MetricCard`.

Distinguish adding a measurement from inspecting history. A dated editor uses direct numeric inputs, persistent units and an explicit save. Preserve the current measurement schema, validation and account/date association. Avoid rotary controls and ambiguous swipe-to-save.

Show the selected metric, date range and unit above one readable chart. Use actual points and gaps, date/value inspection and a list alternative. Sparse data receives helpful factual copy. Range/metric selection uses 160 ms feedback, while the selected observed value updates immediately. Loading retains cached data and the chart footprint. Do not automatically animate the whole line from zero on every scroll or re-entry.

Correct the current chart adapter before rendering changes: nullable measurement values currently pass through `num()` to zero, and index-based `W0/W1` labels imply equally spaced weeks. Treat absent/unparsable measurements as missing observations, retain legitimate zero according to the field's validation rules, and use actual recorded dates/elapsed spacing. Preserve the five existing series, dash patterns, baseline/latest summary, history and visibility controls. Do not alter the global numeric helper for unrelated consumers.

## 21. Progress media: capture, upload and gallery

**Source:** `app/(app)/media.tsx` and active media components.

The gallery groups by date and real category. Capture/pick is explicit; permission is requested at the action that needs it. Preparation/upload progress is determinate only when measured; otherwise use an honest preparing state. Keep retry/cancel capabilities aligned with the current uploader and never invent a percentage.

Thumbnails use Expo Image caching with a ≤160 ms decode crossfade. Reserve the aspect ratio to avoid layout jumps. A failed image has a readable placeholder/retry. A new upload does not rearrange the gallery beneath a finger; place it in a stable pending slot, then reconcile to the dated record.

Do not auto-play video or animate body photos for spectacle. Keep visibility/sharing descriptions aligned with actual coach access; do not introduce new sharing behavior as a visual-only change.

## 22. Photo viewer and optional comparison

**Source:** active `PhotoViewer.tsx`.

The full-screen viewer has a neutral solid background, clear date and accessible close. Pinch/pan can follow the finger with bounded release, but buttons provide next/previous/close alternatives. Avoid an elaborate shared-element transition until source thumbnail geometry, focus and fallback behavior are proven. A simple native presentation or 160 ms opacity is sufficient.

Repair platform-safe focus handling before enriching this surface. On web, use guarded DOM focus; native uses supported accessibility focus APIs. On close return to the originating thumbnail. The current unguarded `findNodeHandle` call is a source-level web risk described in the audit.

**Optional later enhancement:** two-photo comparison with explicit date labels and a tap-toggle alternative to a divider. This is not asserted to exist now. No morphing, relighting, beautifying or inferred physique score. Preserve actual image aspect ratios and equal scaling.

## 23. Weekly feedback

**Source:** `app/(app)/weekly-feedback.tsx`.

Use a clear week range, a concise explanation and the current question groups. Keep ratings/notes easy to scan and leave optional fields clearly optional. Reuse check-in choice/input/disclosure feedback instead of introducing a new interaction language.

Preserve the actual five stages and 18 fields: Overview (2), Nutrition (5), Training (6), Wellbeing (4), optional Feedback (1), as defined in `src/components/weekly/steps.ts`. Current daily-derived steps/water/stress averages are explicitly labelled editable prefills; retain that provenance. This existing weekly summary behavior must not become silent carry-forward of today's subjective check-in answers. Coordinate stage replacement, scroll position and heading focus so the new section does not appear at the previous section's bottom while an animated scroll catches up.

Validation expands/reveals the first invalid section, focuses it and announces once. The current web focus path must be hardened. Save result distinguishes actual persistence states supported by this feature; daily-check-in outbox capabilities must not be assumed to exist here. No streak or celebration before accepted submission. Draft/exit behavior follows actual current persistence and must be documented if extended.

## 24. Profile and coaching assessment

**Sources:** `app/(app)/profile.tsx` and active assessment components.

Profile is a concise identity summary plus labelled editable sections. Assessment is a secondary, clearly resumable task with an honest progress count derived from the schema. Break long content into logical groups; preserve existing values and validation rather than invent new onboarding requirements.

Basic profile retains name, immutable email, phone, country, timezone, goals, injuries, allergies, workout frequency, medical conditions, assigned coach and program dates. The assessment's ten sections remain: basic details, body measurements, goals, lifestyle commitment, training history, nutrition history, medical background, daily activity, sleep/recovery, and stress/gut health. Keep section overview, save section, save draft, resume position and final summary; each must have the same readable saved/failed/dirty state. A section transition uses 160 ms opacity only after validation establishes the next content/focus.

Edit mode has explicit Save/Cancel and clear dirty state. Inputs remain native. Section changes may use 160 ms opacity; save errors persist inline. Avoid animating a completion percentage until data is accepted. Keep sensitive answers out of analytics and decorative previews. Long text, units and keyboard navigation are first-class.

## 25. Settings, reminders and You

**Sources:** `app/(app)/settings.tsx`, `app/(app)/(tabs)/more.tsx` and reminder components.

You groups Progress, Coaching and Preferences with clear row labels, familiar icons and large targets. Each row receives immediate touch tint. Theme changes update semantic colors without a full-screen wipe or flash. System/light/dark remains explicit.

Reminder switches/time choices show actual enabled state, permission status and selected local time/timezone. Native controls should feel native, including failure rollback if scheduling fails. Do not show a switch as successfully enabled when the platform denied permission. Existing schedule semantics and identifiers remain authoritative.

Account/session actions are visually separate. Sign-out retains existing pending-work protections. Settings do not become a showcase of toggles for every animation. A later haptics preference may be added only with complete persistence/system behavior; reduced-motion and transparency preferences are already system concerns.

## Cross-feature state coverage

Every implementation slice must explicitly render and review:

| State | Required result |
| --- | --- |
| Default / pressed / selected | Clear hierarchy and immediate visible feedback; no color-only state |
| Loading / refreshing | Cached content retained; accurately sized placeholder for absent data; no artificial delay |
| Empty / sparse | Different from failed; no invented observations or scores |
| Offline / queued / synced / blocked | Actual capability and delivery state; no assumption that every feature has an outbox |
| Invalid / failed / retrying | Input retained, one focused error path, clear retry and no premature success |
| Keyboard / large text | Single inset owner, growing controls, natural scroll, accessible action |
| Reduced motion / transparency | Complete static experience and solid materials; no hidden required animation |
| Background / resume / interruption | Absolute timer, stable IDs, drafts and pending requests survive; old animation callbacks cannot change data |

## Optional ideas after the core quality gate

These are **new product work**, not current features: a private two-photo comparison, opt-in workout/rest Live Activities, a small Home widget showing the next action, and Siri/Shortcuts entry to a draft. Each requires its own native/data/privacy specification and verification. None should delay the simpler daily flows or be presented as unlocked merely by installing Skia.

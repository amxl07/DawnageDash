# Journey specifications

Companion to the [master design](../../superpowers/specs/2026-09-15-premium-experience-design.md). Requirement IDs connect this document to the implementation roadmap and release checks.

## Shared interaction rules

**J01 — One identity and reporting date per editor.** Every editor is scoped to authenticated user and an explicit device-local reporting date. Date parsing rejects malformed/future check-in targets. Midnight, refresh, and travel never silently move active input into another record.

**J02 — Three kinds of safety.** Draft saved means the current edit generation was written locally. Queued means an explicit submission is durable locally and awaits delivery. Synced means the server acknowledged persistence. None means a coach read it.

**J03 — Preserve agency.** Direct typing is always available for numeric instruments. Swipes have visible button alternatives. Optional tutorials, reminders, assessment sections, and advanced controls never become hidden prerequisites.

**J04 — Every important state has a designed screen.** Loading, cached refresh, empty, partial, offline, failed save, recovery, and account change are first-class states. A query error does not mean no record exists.

**J05 — Preserve privacy in presentation.** No example appears to be a real client's data. Coach identity comes from the existing permitted RPC. No fabricated coach messages, response estimates, contact details, or read receipts.

## Onboarding and account access

### O01. Account entry

Use one restrained brand area, a clear sign-in form, and a secondary Create account action. Preserve the existing two signup stages:

1. Name, country, phone.
2. Email, password, confirmation.

Keep metadata keys full_name, phone_number, country, and role: client. The existing trigger owns user-row creation. Do not add a second mobile-side insert. Keep the current password policy unless the auth provider and web contract change separately.

Use correct autofill/content types, visible password controls, persistent field labels, inline errors, and a stable primary button above the keyboard. Keep nonsecret entered data after a failed request; never persist passwords.

| State | Screen behavior |
| --- | --- |
| Signing in | Busy labeled button; inputs remain visible; prevent duplicate requests |
| Invalid credentials | Clear form-level error; preserve email; do not reveal account existence beyond provider behavior |
| Network unavailable | Explain connectivity; retry without losing input |
| Rate limited | Show provider-safe retry guidance; no fabricated countdown |
| Verification sent | Show the email destination and next step; use actual supported resend behavior only |
| Unconfirmed email | Distinct explanation from incorrect password |
| Unknown role | Resolve authorized account role or show retry/sign-out; never briefly expose client content |
| Coach/admin account | Existing ClientOnlyGate, with correct destination explanation |

### O02. Password recovery

Preserve dawnage://reset-password and the existing recovery-pending lifecycle. The recovery states are verifying link, ready for password, saving, complete, expired/invalid, and cancelled.

Do not expose a functional password-change submission until a valid recovery session exists. A successful reset ends with explicit confirmation and the existing sign-out behavior. Verify cold launch, warm launch, interrupted reset, current Supabase redirect configuration, and actual link format.

### O03. Goal — persisted stage 0

Header: “What are you working toward?” Use four full-width selection rows: Fat loss, Build muscle, Performance, Consistency. Each has a short supporting explanation, recognizable icon, and checkmark/selected semantics.

Hydrate profile_data.primary_goal before presenting an unanswered state. Selection does not auto-advance. Continue saves the chosen key and advances the persisted milestone only after acknowledgment. Optional introduction video is a secondary row with a poster, loading/failure state, and accessible textual summary.

Coach identity may appear as a small supporting element when known. Unavailable lookup does not block setup or imply that no coach is assigned.

### O04. Coaching rhythm — persisted stage 1

Show three concise pieces of the actual service:

- Report your day so the coach has context.
- Follow your assigned training and nutrition plan.
- Review the week and actual plan updates.

A small static example of the new Daily Record may illustrate the workflow, explicitly marked Example. There are no fake streaks or health numbers presented as personal results. Optional walkthrough remains accessible later.

Back changes the current page locally; it never lowers an already acknowledged onboarding milestone.

### O05. Setup review — persisted stage 2

Show goal and detected/saved timezone with Edit actions. Explain the next destination and the separate assessment. Finish writes the merged profile patch and marks onboarding_step as 3 after persistence.

Where supported by the existing users update, save profile_data and onboarding_step in the same row update to avoid a half-finished final stage. This does not provide atomic JSON merging across simultaneous clients; that limitation remains explicit.

Read/save failures retain the current choices and offer retry. Never interpret a failed onboarding read as a new account at step zero. Existing users with step 3 or higher bypass the setup screens.

The UI says reminders follow device-local time, because that is what the current scheduler implements. Profile timezone does not silently redefine reporting dates.

### O06. First value and reminders

First Home shows Record your first check-in as the primary action. Existing assigned plans can appear; missing plans are described honestly.

After the first acknowledged check-in, offer an optional reminder setup: time choice, purpose, then the OS request. Denial leaves the app usable. Repeated prompts stop after refusal; Settings provides a deliberate way back.

Queued first submissions do not produce copy saying the coach has received the record.

### O07. Detailed assessment

Keep assessment outside the three-stage onboarding gate. Preserve all ten stable sections and q1–q87 IDs:

| Section | Question count |
| --- | --- |
| Basic details | 7 |
| Body measurements | 6 |
| Goals | 14 |
| Lifestyle commitment | 7 |
| Training history | 11 |
| Nutrition history | 10 |
| Health and medical background | 13 |
| Daily activity | 3 |
| Sleep and recovery | 5 |
| Stress and gut | 11 |

The required IDs remain q1, q2, q3, q4, q7, q14. Other answers remain optional. Retain JSON-string encoding for answers and completed_sections.

Add a section overview with Not started, In progress, Complete, and Resume. Keep unfinished text while editing and require Save draft or deliberate discard before controlled exit. Resume the exact acknowledged server draft; do not call memory-only answers saved. Offline save failure retains the editor and its answers. The summary is editable. Merely visiting or skipping an optional question does not erase an existing answer.

Preserve the overlap between Profile and assessment q14/q56/q64/q33. A shared profile patch must retain primary_goal and unrelated JSON keys.

### Onboarding acceptance

- O-A1: New client completes the three milestones; returning client skips them.
- O-A2: Failed progress read shows recovery, not a restart at zero.
- O-A3: Kill/reopen and Back preserve acknowledged progress and selected values.
- O-A4: Saving Profile after setup preserves primary_goal and unrelated keys.
- O-A5: Video failure, notification denial, unavailable coach, and missing plan do not block completion.
- O-A6: Recovery cold/warm/expired/interrupted paths have distinct outcomes.
- O-A7: Assessment resumes exact acknowledged unfinished answers without changing IDs or encoding.

## Home — Today Brief

### H01. Composition

At 390-point width, use this reading order:

| Region | Visible content | Interaction |
| --- | --- | --- |
| Header | Date, greeting, small coach identity, Profile access | Profile and actual coach identity/details only |
| Primary action | One title, short context, large clear action | Resolved from known state |
| Day and week | Today's record or quiet empty state, seven local dates | Open saved day or backfill; future dates unavailable |
| Next session | Assigned plan day, focus, exercise count, actual update indication | Resume or open the relevant plan/session |
| Progress | Up to two factual observations with coverage | Open deeper history |
| Supporting work | Assessment progress or incomplete setup detail | Resume existing secondary journey |

Avoid repeating the same call to action in three separate cards. The primary action is visually strongest. Week/history controls and current plan information remain discoverable without competing at equal weight.

### H02. Next-action priority

Resolve only from known successful data or durable local state:

1. Recover an active workout draft.
2. Resume the most recently edited unfinished check-in within retention, showing its original reporting date.
3. Complete today's check-in if there is neither a synced nor queued submission.
4. Review an unseen actual plan update.
5. Open the next available assigned session.
6. Review the saved day or recent history.

A queued submission occupies the day and stays visibly pending; it is not treated as absent. A failed submission keeps its relevant Retry/Edit affordance. Data still loading produces a stable loading action region, not a false “no plan” decision.

An unresolved failure in one section does not disable unrelated available actions.

### H03. Truthful progress

Use separate concepts:

- Reported workouts: check-ins explicitly marked Done, with the period stated.
- Logged sessions: actual workout records, with their own period and coverage.
- Reported weight change: two actual observations and their dates.
- Seven-day average: observations whose local dates fall in the last seven calendar days, with observation count.
- Recent range: up to fourteen prior reported observations, not a claim of fourteen consecutive days.

Missing observations are not zero. Weight changes are neutral. Do not show progress against 10,000 steps, six workouts, or 56 sleep hours unless a real contract supplies that assigned target. Do not turn a free-text coach note into an inferred numeric goal.

Keep legacy derived metrics intact for unaffected consumers where required; introduce explicitly named screen selectors and labels for the redesigned Home.

### H04. Coach and plan states

Assigned coach: display the permitted name/avatar. Unassigned: quiet accurate copy. Unavailable lookup: retry or omit identity with no invented replacement.

Plan changes remain unread until the populated relevant plan is actually viewed. Opening Home does not mark them seen. A next unlogged plan day is labeled Next session, not “Scheduled today.”

A template-only viewable plan cannot promise that the assigned-plan logger has exercises available. Resolve that distinction before showing Start workout.

### H05. Home states

| State | Behavior |
| --- | --- |
| No check-ins | First-record action; no fabricated charts |
| One observation | Show the observation; no trend claim |
| Sparse history | Show actual dates/counts and gaps |
| Measurement failure | Preserve check-in, plan, and week content |
| Plan failure | Local plan error/retry; do not label it no plan |
| Cached refresh | Retain content and display quiet refreshing/stale status |
| Queued check-in/workout | Overlay pending local record and expose its status |
| All planned sessions logged | Show accurate weekly summary or plan access; no invented extra workout |
| Midnight/foreground return | Refresh Home's date; active editors retain their target date |
| Account switch | Remove prior account content immediately and restore only the new account's state |

### Home acceptance

- H-A1: Every priority branch uses the intended route and date.
- H-A2: Opening Home never acknowledges a plan update.
- H-A3: Seven entries spread over a month are never labeled a seven-day average.
- H-A4: Missing measurements cannot prevent check-in.
- H-A5: Queued work survives relaunch and appears as pending.
- H-A6: No-data, unavailable coach, missing plan, and all-done states contain no invented information.

## Check-in — Daily Record

### C01. Layout and field contract

Keep the existing single-scroll order. A compact Day Record at the top shows date and save state; it contains only a few answered values and can collapse visually. At large text it becomes ordinary scroll content. Optional section-jump controls scroll/focus within the same document; they do not create nested scrolling.

Use the current field labels. The following table specifies storage and controls, not a new question set.

| Field | Payload key | Control | Required rule |
| --- | --- | --- | --- |
| Morning weight | morning_weight | 20–400 kg, 0.1; ruler and typing | Optional |
| Energy | energy_level | Direct 1–10 selection | Required |
| Stress | stress_level | Direct 1–10 selection | Required |
| Sleep | sleep_hours | 0–24 h, 0.5; ruler and typing | Required |
| Hunger | hunger_level | Direct 1–10 selection | Required |
| Digestion | digestion | Normal / Bloated / Constipated / Diarrhea | Required |
| Workout | workout_status | Done / No / Cardio / Rest | Required |
| How did it go? | workout_performance | Direct 1–10 selection | Required only for Done/Cardio |
| Nutrition score | nutrition_score | Direct 1–10 selection | Required |
| Calories | calorie_intake | Direct integer, 0–20,000 kcal | Optional |
| Water | water_liters | 0–20 L, 0.25; ruler and typing | Optional |
| Steps | daily_steps | Direct integer, 0–200,000 | Optional |
| Protein | protein | Direct nonnegative grams | Optional |
| Carbs | carbs | Direct nonnegative grams | Optional |
| Fats | fats | Direct nonnegative grams | Optional |
| Notes (optional) | notes | Multiline text | Optional |

Stored workout enums remain done/no/cardio_day/rest_day. Stored digestion enums remain none/bloated/constipated/diarrhea. Performance becomes null for No/Rest according to the existing mapper. Preserve null versus zero and trim notes according to the current payload mapping.

The registry declares nonnegative macro controls and whole-number increments, but the current submission validator does not enforce every registry constraint. Preserve current submission behavior during extraction. Any new macro-bound or integer enforcement is an explicit F01 contract decision, with legacy-value handling recorded; the table is not permission to silently reject previously accepted records.

Do not add macro totals, goals, or inferred answers. Optional macros may be visually grouped with a clearly labeled disclosure; collapsing it never clears values, and any error expands it. All fields remain available in Review.

### C02. The entry interaction

Weight, sleep, and water use the refined numeric instrument from the design-system document. An unset value remains unset until typing or explicit Use previous value. Never seed today's answer just because the history has a value.

Calories, steps, and macros use direct entry because clients commonly arrive knowing those totals. Ratings retain 1–10 with named endpoints where the existing question defines them. Do not reinterpret a numeric scale with new emotional or clinical wording.

Previous-value actions identify the source date. They copy one eligible objective field only. An undo affordance restores that field's immediate previous value; subjective fields are untouched.

### C03. Personal context

Retain the existing neutral Recent range caption with a minimum of three observations. An optional date-qualified delta may say “0.3 kg above previous entry · 12 Sep.”

The target day is excluded from its own historical comparison. Backfilling 10 September never uses observations from 11 September onward. Do not call a previous entry yesterday unless its date is exactly the prior local date.

Show at most one short contextual line per field and two observations in the final receipt. No ranking, “best weight,” praise/scolding, or goal interpretation appears.

### C04. Submission and receipt

Keep a stable submit area with visible save status and one primary action. Review is optional. A mandatory extra confirmation sheet is not added to every daily submission.

On Submit:

1. Commit any focused numeric draft using the same normalization as blur.
2. Validate the complete form with the existing rules.
3. Expand/scroll/focus the first invalid field and announce its error if invalid.
4. Snapshot the edit generation and target date.
5. Durably store submission intent before attempting network delivery.
6. Show synced receipt, queued receipt, or actionable failure based on the actual result.

The receipt contains date, reported values, optional neutral observations, and status. Actions: Edit this day and Return Home. It persists as the selected day's record rather than vanishing into a toast.

Copy:

| Condition | Copy |
| --- | --- |
| Draft durable | Draft saved on this device |
| Draft write failed | Latest changes are not saved on this device |
| Submission queued | Saved on this device · waiting to sync |
| Submission synced | Saved and synced |
| Permission/auth failure | Could not sync this record. Your local entry is preserved. |
| Existing-day edit | Updating your record for [date] |

### C05. Editor lifecycle

~~~mermaid
stateDiagram-v2
    [*] --> Hydrating
    Hydrating --> Editing: resolve scoped draft, queue, server
    Hydrating --> LoadError: required source unavailable
    LoadError --> Hydrating: retry
    Editing --> DraftWriting: edit
    DraftWriting --> DraftDurable: storage acknowledged
    DraftWriting --> DraftError: storage failed
    DraftError --> DraftWriting: retry
    DraftDurable --> Editing: next edit
    Editing --> Validating: submit
    DraftDurable --> Validating: submit
    Validating --> Editing: invalid
    Validating --> Delivering: durable intent stored
    Delivering --> Queued: offline or retryable transport failure
    Delivering --> Synced: server acknowledged
    Delivering --> SyncError: auth, permission, validation, conflict
    Queued --> Delivering: eligible retry
    SyncError --> Editing: inspect or edit
    Synced --> Editing: edit this day
~~~

Presentation and persistence can overlap, so the controller should model edit generation and delivery status separately rather than forcing all UI into one enum.

Existing-row edits receive the same draft protection as new entries. A server response that arrives after newer user edits cannot replace them. Cleanup after a submitted generation cannot erase a newer draft.

On explicit exit or date switch, flush the latest draft before navigating. If local persistence fails, keep the editor and offer Retry or a deliberate discard choice. On backgrounding, attempt immediate flush; abrupt process termination before storage acknowledgment cannot be guaranteed safe and must not have been labeled saved.

Retain the current three-day expiry behavior for legacy drafts during the initial migration; show the saved-at age where available. Do not silently expand retention or delete queued submissions. A revised retention policy needs an explicit privacy/product decision before changing that behavior.

### C06. Backfill, queues, and fallback

The selected date remains visible while editing a past day. Future dates are rejected. At midnight, an open record stays attached to its original date; an explicit new-day action is offered after save/exit.

Queued records are selectable and editable. A newer same-user/date submission durably supersedes the previous local intent. Storage mutations are serialized and delivery is coordinated per logical record, always within its account; permanent failures are not endlessly retried.

Both single-scroll and wizard consume the same form model, field registry, validation, history, and persistence. Keep the existing feature flag until the new presentation passes the rollout gate. A feature switch cannot discard a draft.

### Check-in acceptance

- C-A1: All 16 fields round-trip, including zero/null, macros, notes, enums, and conditional performance.
- C-A2: Submit while a numeric input is focused uses its current typed value.
- C-A3: Ruler visual preview and commit agree at bounds; cancel and vertical scrolling work.
- C-A4: Existing-row edits survive acknowledged draft writes and exit.
- C-A5: Submit/clear races preserve a newer generation.
- C-A6: Backfill captions use only earlier observations.
- C-A7: Online permission errors remain errors; offline submission remains visibly queued after restart.
- C-A8: Wizard fallback enforces identical rules and preserves the same draft.

## Workout — Workout Focus

### W01. Entry and hydration

Preserve the distinction between Resume draft, Open saved log, and Start assigned workout. Use the actual assigned plan, not a template-only fallback the logger cannot load.

A pre-session summary shows plan day, exercise count, actual coach notes, and any existing draft. Changing plan day cannot replace entered work without Save draft / Discard / Keep editing.

Hydration resolves against user, date, and optional logId. An explicit logId selects that owned log. Without one, multiple server records for the date require a chooser/recovery path instead of silently picking or overwriting one. No new multi-session creation policy is introduced.

Do not mark initialization complete while a required plan/server read is still unresolved. Late asynchronous responses are discarded when scope or edit generation changes.

### W02. Active exercise and current set

Reading order:

1. Session title and exercise position, with explicit exit.
2. Exercise name and actual prescription.
3. Previous reported set summary with date.
4. Compact completed sets.
5. One expanded current-set editor.
6. Compact future sets and Add set.
7. Previous/Next exercise and overview access.
8. Rest dock outside the main content flow when space permits.

Weight and reps get the most space. RPE and advanced actions are available through a clearly named Details control. Duration exercises show seconds rather than weight/reps. At large text, the current set stacks vertically; other rows remain tappable summaries.

Completing a set changes its explicit completed flag. Focus moves to the next incomplete set without automatically scrolling the screen away while the user is correcting a field. A completed set can be reopened and marked incomplete.

### W03. Validation and comparison policy

Preserve string storage and legacy readers. Drafts can retain incomplete typing. The proposed new-entry completion rules require coach/product confirmation during the contract checkpoint:

- Strength reps: a positive whole number for a newly completed set.
- Weight: blank is allowed for bodyweight; otherwise finite and nonnegative.
- Duration: positive finite seconds for a newly completed duration set.
- Optional RPE: retain existing accepted values until the shared product range/precision is confirmed; do not silently enforce a new scale.
- Workout title: nonempty and no more than the database's 100-character limit.

Historical unusual values are displayed and preserved until explicitly edited; they are not silently coerced to zero or marked complete. Incomplete sets remain saved as incomplete.

Compare only like-for-like recorded data with visible dates. Current previous-value lookup covers limited history, so call it Previous session. Do not claim an all-time personal record from ten fetched logs. Warmup and incomplete sets do not qualify for a new comparison claim.

### W04. Copy, substitute, and edit

Copy previous values targets the chosen set and clearly identifies overwritten fields. Prefer filling empty fields; if replacing entered values, show the exact replacement and offer Undo. Never auto-mark a copied set complete.

Keep existing substitution and prescription views. A substitution changes the client's logged exercise; it does not edit the coach's plan. Do not add new substitution-provenance fields to the wire format in this release.

Removing a set offers undo while editing. Deleting a saved workout, if not already supported, is outside this core slice. Reordering exercises is deferred until identity and accessible controls are deliberately specified.

### W05. Rest dock

A running dock shows remaining time, exercise/set context where available locally, Pause/Resume, Skip, and Extend. Tapping its body opens the existing detailed timer controls.

Use actual prescribed rest when available. A local preference may enable automatic rest after set completion; it is explicit and off until chosen unless existing behavior already establishes a preference. A fallback custom timer is labeled as the client's timer, not a coach prescription.

Keep the absolute deadline and account-scoped persisted timer. The dock alone subscribes to ticks; the entire logger does not rerender each second. Backgrounding recomputes remaining time from the deadline. Timer completion feedback fires once.

Internal timer accuracy does not guarantee a background notification. Background alerts, widgets, and Live Activities are separately scoped native work.

### W06. Finish and saved record

Finish opens a review showing exercises, completed and incomplete sets, and volume only where the existing formula has valid inputs. Preserve incomplete work and make its status clear.

Remove the misleading screen-open Duration metric from the redesigned receipt. Persisted workout timing requires an explicit content-contract extension and all-consumer compatibility, so it is deferred.

Save uses a locked submitted snapshot and existing generation-aware cleanup. If the client edits during delivery, those edits remain a draft rather than disappearing under the saved receipt.

Queued and synced receipts use the same truthful status vocabulary as check-in. Returning to Logs or Home shows the saved/pending record. The coach web reader must render it correctly before the workflow is considered production-ready.

### W07. Exit and interruptions

X, Android Back, navigation removal, plan-day change, and date change all pass through the same save/discard decision. Disable iOS interactive back only where the custom horizontal exercise gesture requires it; retain a clear explicit exit.

The choices are Keep editing, Save draft and leave, and Discard local changes. Discarding edits to a saved log restores the server baseline; it does not delete the saved workout. If saving the draft fails, do not leave under a false saved state.

After a process restart, resume the acknowledged draft and absolute rest timer. Account switching hides the old session immediately and never flushes its queue with another account's credentials.

### Workout acceptance

- W-A1: Plan-first and log-first network order hydrate the same intended session.
- W-A2: Explicit logId is respected and multiple date records do not overwrite arbitrarily.
- W-A3: New typing is not replaced by late hydration.
- W-A4: Every exit path preserves or deliberately discards the latest generation.
- W-A5: Completing/copying/removing sets preserves explicit completion and Undo behavior.
- W-A6: Strength, bodyweight, duration, warmup, incomplete, and legacy cases remain understandable.
- W-A7: Timer pause/resume/restart stays accurate and fires completion once.
- W-A8: Editing while Save completes cannot lose newer input.
- W-A9: A queued workout remains visible and recoverable after relaunch.
- W-A10: Mobile V2 and legacy content render safely in both mobile and the coach web app.

## Secondary surfaces affected

Plans, Logs, You, Profile, measurements, photos, weekly feedback, auth, and settings inherit shared token/component changes and require regression checks. They do not all receive a new feature scope.

Plans needs truthful loading/error/empty distinction and consistent Next session wording. Logs needs pending-record representation and correct saved-log routing. Profile needs JSON-key preservation and assessment entry. Photo release dependencies remain in the production-quality specification.

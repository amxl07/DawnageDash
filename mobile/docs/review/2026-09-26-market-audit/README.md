# Dawnage mobile: prelaunch product, code and market review

Review date: 26 September 2026. Surface: the current working tree in `mobile/`, including uncommitted changes.

This review evaluates Dawnage as a client app for a human coaching service. It should be compared primarily with coached experiences such as Trainerize, Everfit, Future and FITTR. Standalone training and nutrition apps provide useful benchmarks for individual tasks, but have different business models.

The review covers the route tree and every major feature domain, with deeper source inspection of authentication, onboarding, check-ins, workouts, persistence, plans, nutrition, progress, coaching, health integrations and native surfaces. It is a codebase-wide review, not a claim of exhaustive line-by-line verification or a penetration test. `mobile-2/` is a separate SparkyFitness-compatible prototype and is outside the assessed product. Web/backend code is considered where shared contracts and authorization affect the mobile app.

Inventory: 415 TypeScript/TSX files under `app/` and `src/`; 252 non-test files containing 24,431 lines and 163 test files. Tests and line counts indicate investment, not correctness by themselves. Source inspection found no applicable project `AGENTS.md` in this app or its ancestors.

## Main assessment

Dawnage has a substantial foundation for a coached-fitness MVP. The most valuable next investment is making the daily coaching cycle trustworthy and useful: a client records something, sees that it reached the coach, understands the coach's response, and can act on it easily.

The current implementation devotes considerable care to input controls, drafts, recovery and visual consistency. Its main weaknesses are the amount of mandatory daily reporting, an incomplete client-visible coaching response, uneven persistence guarantees, and limited practical adaptation when a prescribed day does not fit the client's circumstances.

**Provisional overall grade: 6.5/10.** This is a promising coached-fitness MVP, with a stronger implementation foundation than its currently completed service experience. I would continue toward a controlled pilot after the reliability fixes, rather than regard it as ready for a broad paid launch.

| Dimension | Grade | Reason |
| --- | --- | --- |
| Architecture and implementation foundations | 7.5/10 | Clear feature separation, shared primitives, pure models, careful persistence work; inconsistent contracts and some large controllers remain |
| Workflow usability | 6/10 | Strong logger and initial setup; demanding daily form, fragmented progress and passive waiting states |
| Coaching/personalization experience | 5.5/10 | Real coach-assigned content and useful client signals; response visibility and practical adaptation are incomplete |
| Reliability and trust | 6/10 | Thoughtful saved/synced distinctions, but cold-offline access, draft expiry, replay scheduling and completion semantics need work |
| Public-launch readiness | 5/10 | Account/privacy lifecycle, deployed authorization assurance and native acceptance evidence are outstanding |
| Rendered visual polish and native feel | Not yet independently graded | Source tokens and accessibility intent are encouraging; a live capture/device check is required to grade the actual appearance and behavior |

The overall grade is a rounded editorial judgment, not a weighted arithmetic index. A 5 denotes a useful but materially incomplete MVP; 7 denotes a coherent product with remaining release gaps; 9 denotes a highly refined, validated experience in the chosen category. These are not market percentiles, measured retention, or claims about native performance. The source-supported grades have medium confidence; production/native behavior has lower confidence.

## What is already worth keeping

- A coherent theme and component system, light/dark appearances, platform-specific controls, minimum target sizes, and reduced-motion/reduced-transparency handling.
- Three-stage initial setup instead of forcing the entire assessment before entry. The longer coaching assessment remains separately accessible.
- A Home screen that chooses a next action and supports continuing unfinished activity.
- A capable workout logger: prescribed sets, actual reps/load, previous performance, exercise substitutions, rest timing, overview, plate calculation, partial-save handling and recovery.
- Check-in drafts, dated history, explicit previous-value reuse, validation, and a distinction between local save and server sync.
- Measurement charts with recorded-date selection, missing-value handling, comparisons, and accessible text alternatives.
- Health imports with user review, source information, and explicit replacement decisions. These are already in source; adding “Apple Health integration” is not a new-feature recommendation.
- iOS widget/Live Activity code with restrained payloads. Its existence is not proof of a successful signed-device build or Android parity.

## Product and UX priorities

### 1. Reduce the daily reporting burden

The current validator requires **15 fields on a rest/no-training day and 16 on a workout/cardio day**, including morning weight, subjective ratings, digestion, calories, water, steps, all three macros and written notes. The form spans four stages. See `src/lib/checkin-validation.ts:29`, `src/components/checkin/CheckInForm.tsx:110`, and `src/features/checkin/config/fields.ts`.

This is a confirmed product rule; the resulting abandonment rate has not been measured. It is particularly demanding for someone who has not weighed themselves, does not track macros, is travelling, or is still waiting for a coach. Required notes can encourage meaningless filler rather than useful context. Reusing yesterday's values is explicit, which is good, but it should not become a shortcut to inaccurate current-day reporting.

**Recommended experiment:** let coaches choose a small required daily set appropriate to the program. Keep the full form available for clients who need it. Distinguish “not measured” from zero; collect longer reflections weekly or when something changes. Use existing health import and workout records as reviewable suggestions. Do not silently turn planned meals into consumed meals or overwrite manual answers.

Prototype a 30–60 second routine as a design target, then measure actual completion time and coach usefulness. It is not an established market benchmark. Preserve the full protocol for programs that have a justified need for it.

### 2. Make the coach's response visible

`app/(app)/weekly-feedback.tsx:42` promises detailed feedback within 48 hours. The current history card renders the client's submitted answers (`src/features/weekly/WeeklyFeedbackHistoryCard.tsx:33`), and the coach card shows identity/status (`src/components/coach/CoachStatusCard.tsx:39`). A mobile response thread or direct contact action was not found. Collecting a WhatsApp number in the assessment does not implement messaging.

**Recommended flow:** Submitted → Awaiting review → Reviewed → Coach response → Client acknowledges the next action. Show actual timestamps and an agreed response window. Separate “synced” from “read by coach”; never infer coach review from upload success. If coaching currently happens externally, show an explicit contact route and explain where feedback arrives. Only retain the 48-hour promise if the service can support it.

This requires coordinated dashboard/backend work, not just a mobile card.

### 3. Give nutrition an everyday action

Nutrition currently presents prescribed calories, meals, supplements and notes. It explicitly distinguishes listed meal totals from the prescribed target, including mismatches, which is useful. However, the daily check-in asks for actual calories/macros without a mobile food diary or consumption workflow to obtain them. See `src/features/nutrition/nutrition-screen.tsx:78` and `src/features/nutrition/MealPlanDetails.tsx:18`.

Start with actionable meal details and coach-approved substitutions: quantities, familiar household measures, preparation alternatives and “I ate something different.” A small meal-confirmation workflow with adjustable portions may solve more immediate friction than a large food database. Keep prescription and intake separate in both wording and storage. Resolve calorie mismatches in the coach authoring workflow, while continuing to expose unresolved discrepancies honestly to clients.

### 4. Show progress that matches the user's goal

The source offers fat loss, muscle gain, performance and consistency as starting goals. Home's weekly recap emphasizes workout counts and morning weight, and “View progress” routes into body measurements. Workout history has limited summary analysis. See `src/features/onboarding/SetupStage.tsx:10`, `src/features/home/weekly-recap-card.tsx:45`, and `app/(app)/(tabs)/index.tsx:115`.

Create a unified progress view with a goal-relevant primary measure: strength/reps for performance, training consistency for habit building, and appropriately contextualized body trends for body-composition goals. Connect it to the coach's interpretation and next review. Keep weight fluctuations neutral and distinguish sparse observations from a reliable trend. Measurement charts already exist; this recommendation is about interpretation and organization.

### 5. Make the first week and plan-waiting state concrete

Setup explains that a coach will connect and assign plans, and allows starting check-ins beforehand. Training and nutrition can then show “No plan yet; contact your coach,” while the mobile coach card has no contact action. See `src/features/onboarding/SetupStage.tsx:43` and the plan empty states.

For invited coaching clients, make the coach/invitation status clear and state what happens next. Show a useful checklist with the next real action, expected assignment timing where known, and contact/help. For users who find the app independently, explain how to obtain coaching. Avoid requiring extensive reporting merely to discover that no service has been connected. The app should not invent assignment dates or coach availability.

### 6. Use the same meaning of “complete” everywhere

`src/hooks/usePlanProgress.ts:24` marks a plan day complete when a version-2 log has that day number; it does not inspect set completion. `src/components/plans/PlanDayCard.tsx:27` then displays “Complete” and offers “Repeat Day.” Home's recap separately recognizes partial logs. A partial save can therefore send conflicting messages and advance the apparent next session.

Use a shared definition for Not started, In progress, Partially logged, Completed and Awaiting sync. Keep storage/delivery state separate from exercise completion. Verify the same partial workout across logger, Home, Training, history and the coach dashboard.

### 7. Refine the assessment and its language

The separate coaching assessment has 87 questions across 10 sections, with six explicitly marked required. It is **not** the initial onboarding gate. Follow-ups are not answer-dependent, and copy includes “really bad eating day,” unclear wording, and typographical errors. See `src/components/questionnaire/QuestionnaireWizard.tsx:336` and `src/lib/questionnaire-data.ts`.

Preserve optional save/resume, branch irrelevant follow-ups, and explain why sensitive information is requested. Use neutral wording such as “a day when eating was different from your usual routine.” Let a coach request the detail that actually informs this client's program. Test the initial assessment separately from the recurring daily burden.

## Code structure and reliability

The broad organization is sound: Expo Router routes, reusable primitives, domain features, hooks, and pure model/selectors. A rewrite or a new state-management library is not justified by this review.

```text
mobile/
  app/                 routes, layouts, account screens, screen composition
  src/features/        check-in, workout, home, training, nutrition, health,
                       native surfaces, profile, onboarding, weekly feedback
  src/components/ui/   shared controls, typography, sheets and screen layout
  src/components/      domain presentation and some legacy orchestration
  src/hooks/           data queries, mutations, drafts, plans and reminders
  src/lib/             persistence, Supabase, validation, dates, shared helpers
  src/theme/           palettes, sizing, typography, motion and appearance
  scripts/             verification and controlled web capture
  .maestro/            native journey scenarios requiring device execution
../shared/             cross-client photo and database-related contracts
```

Five primary tabs lead to 16 destinations including the public Health rationale utility; a seventeenth non-layout route file is a legacy logs redirect. Training exposes Plan and History views. This is a client application; coach/admin work is in the web dashboard.

There is increasing overlap between `components/<domain>`, `features/<domain>`, `hooks`, and `lib`. Some route files still own hundreds of lines of orchestration. Migrate gradually toward a feature owning its model, data access, controller, UI and tests; retain shared primitives in `components/ui` and genuinely cross-feature infrastructure in `lib`. Keep route files focused on navigation and composition. Consolidate duplicated completion/status definitions before moving files cosmetically.

Concrete maintenance priorities: share one workout-completion selector; centralize acknowledged writes; generate client database types from the controlled schema; add stable exercise identifiers rather than relying only on names; and give sync an application-level owner. Large files such as Profile (555 lines), PhotoCaptureSheet (530) and CheckInForm (467) merit extraction when a responsibility changes, not arbitrary splitting to hit a line-count target. Update stale navigation/development documentation after the current changes settle.

The strongest technical findings and their evidence are in [code-review.md](code-review.md). The most material are:

| Priority | Finding | User consequence | Recommended correction |
| --- | --- | --- | --- |
| Before pilot | Cold offline launch depends on network-only account/setup gates | Saved local activity may be unreachable when the app is reopened offline | Design scoped offline access for a previously authenticated client; retain server authorization for network operations |
| Before pilot | Workout drafts expire after 24 hours; check-in drafts after 3 days | A user returning to unfinished work can lose it | Retain until explicit discard/submission, or provide a recoverable archive and a clearly communicated policy |
| Before pilot | Queue replay depends on particular screens being mounted | Opening Home after reconnecting may leave records pending | Mount an account-scoped sync coordinator that retries when online/active and keeps existing idempotency safeguards |
| Before pilot | Partial logs count as completed plan days | Next-session guidance and progress conflict | Share a completion model across all consumers |
| Before public release | Measurement fetch-then-write lacks atomic uniqueness and returned-row confirmation | Concurrent records can duplicate; a no-op update may be reported as saved | Add a reviewed database constraint/atomic write and verify the acknowledged owned row |
| Before public release | Registration exists without a discoverable account deletion/privacy-policy flow | Users cannot manage sensitive account data through the expected controls | Implement documented deletion/request handling and accessible policy/support entries |
| Verify before public release | Broad user-row reads and row-level update policies may expose coach-only fields or permit protected-field changes | Privacy and authorization could depend on unverified database protections | Test least-privilege column access and protected role/assignment fields with disposable staging accounts |

The database-dependent risks describe repository contracts; deployed constraints, grants and policies were not inspected. They are not confirmed production exploits. The auth session currently uses AsyncStorage; assess secure native credential storage with a tested migration and sign-out behavior. Do not treat AsyncStorage alone as proof of a remote vulnerability.

One additional shared-contract mismatch deserves checking: the mobile water control supports hundredths/quarter-litres while repository SQL uses one decimal place. Align frontend precision, database storage and the dashboard before claiming exact round-trip preservation.

## Current market comparison

Research used 23 live official/publisher sources, accessed 26 September 2026. The table summarizes advertised offerings, not hands-on competitor quality testing. Regional access, subscription entitlements and current checkout pricing were not verified. No ratings, downloads or retention figures were used as a proxy for quality.

| Comparator | Relevant current offering | Dawnage's relative position and priority |
| --- | --- | --- |
| [ABC Trainerize](https://www.trainerize.com/features/) | Coach programs, training/nutrition, habits, messaging and branded apps | Dawnage has much of the record/plan foundation but a weaker visible communication loop. A custom branded app is not sufficient differentiation. |
| [Everfit](https://everfit.io/training/) | Coach programming, exercise alternatives, progress, form checks and accountability forms; nutrition tools | Dawnage's logger is substantial. Connect the collected form/workout information to coach action; do not expand forms merely for feature parity. |
| [Future](https://future.co/) | Dedicated coaching, active plan refinement and schedule changes; broader health coaching also advertised | Compare the clarity of ongoing service, not just screens. Dawnage must make coach attention visible. |
| [FITTR](https://www.fittr.com/coaching/fitness-and-nutrition/) | Personalized training, lifestyle nutrition and weekly coach calls | Relevant if India is the target market. Food familiarity and coach access are expected foundations. |
| [Healthify](https://www.healthifyme.com/in/) | AI-supported/photo nutrition tracking, with premium human coaching advertised in its store description | Dawnage should first solve accurate low-effort intake and coach-approved food flexibility. Photo AI alone is not a distinctive position. |
| [Fitbod](https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543) | Adaptive sessions, equipment/goal tailoring and explanations through Workout Insights | Dawnage's personalisation is primarily human-assigned. Build approved alternatives and a traceable coach decision, rather than imply an adaptive engine already exists. |
| [Freeletics](https://www.freeletics.com/en/) | Training adjusted to time, location, equipment and goals | A whole-session fallback for a disrupted day is more useful than a rigid plan. Individual exercise substitution already exists in Dawnage. |
| [Hevy / Hevy Coach](https://hevycoach.com/) | Detailed logging/analysis, a coach dashboard, program assignment and client chat | Execution speed, reliable recovery and exercise-level progress are appropriate benchmarks. Coach-to-client app linkage is already offered. |
| [MacroFactor](https://macrofactor.com/macrofactor/) | Dynamic nutrition targets, weight trends, logging, data export; current homepage also presents Workouts | Dawnage can make progress interpretation part of the coach relationship. Do not claim trend charts or photo logging as new market capabilities. |

See [market-research.md](market-research.md) for the exact feature sources, publisher excerpts, failed retrievals and limitations. That report also verifies [Apple's privacy/account-deletion requirements](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) and [Google Play's requirements](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en). These apply to the account/privacy gaps above; this is not a complete store-policy assessment.

## Standout product direction

Recommended positioning: **personal coaching that adapts to real life and explains what changed.** This is a product hypothesis, not a claim that no competitor offers similar features.

| Opportunity | Smallest useful version | Why it fits Dawnage | Validation and dependencies |
| --- | --- | --- | --- |
| Traceable coach decisions | A weekly response attached to actual check-ins, with one next action and a reason for changing or retaining the plan | Builds on data already collected and makes the human service tangible | Track review turnaround, client comprehension and follow-through; needs dashboard/backend support |
| “My day changed” alternatives | Client selects less time, different equipment or travel; app offers an alternative already approved by the coach | Helps clients execute an existing plan under constraints | Pilot completion and perceived usefulness; version prescriptions and preserve actual logs |
| Local meal flexibility | Coach-approved swaps expressed in familiar foods and household portions, with vegetarian/eggetarian options if relevant | Could fit the food/coaching context in the repository | Confirm the target market first; validate portions, allergens and nutritional estimates with the coaching team |
| A meaningful weekly progress story | Training, adherence and body observations summarized with data sufficiency, followed by a coach-reviewed interpretation | Turns records into evidence of progress | Measure whether clients can explain their progress and next step; avoid diagnosis or unsupported causality |
| A supportive return after missed days | A short re-entry check-in and manageable next action instead of an intimidating backlog | Fits long-term adherence and makes draft recovery matter | Test with clients returning after gaps; do not automatically alter training intensity without a supported protocol |

Begin with the first two. Food-photo AI, generic chatbots, social feeds, leaderboards, autonomous diet changes and broad wearable expansion add substantial scope and already have strong competitors. They need a demonstrated user problem before investment. AI, if later used, should assist a coach with a reviewable draft grounded in the client's actual records; it should not invent observations or independently handle pain/injury decisions.

## Pilot and acceptance plan

1. Resolve data-loss/access issues and establish account/privacy controls appropriate to the release stage.
2. Run a small formative pilot with roughly 8–12 representative clients and 2–3 coaches across iOS/Android, new/returning users, and users with/without health integrations. This sample helps discover friction; it cannot establish population retention or superiority.
3. Observe first setup, finding today's task, a full check-in, logging/interrupting a workout, changing a meal, locating feedback and understanding progress. Include one-handed use, large text, VoiceOver/TalkBack, denied permissions, cold offline launch, app termination and reconnecting.
4. Measure median/p90 task times, completion/errors, repeated-input burden, unrecovered data, coach review time, and whether a client can name the next recommended action. Treat 30–60 second check-ins and a startable workout within a couple of deliberate taps as hypotheses to test, not universal rules.
5. Follow a two-week diary period to learn whether the routine remains useful after novelty wears off. Collect coach workload alongside client satisfaction so a faster mobile experience does not create an unsustainable service.

Do not send raw weight, health readings, food entries, photos or free-text notes into product analytics. Use minimally necessary event metadata and consent-appropriate measurement.

## Evidence and companion reports

- [Technical review](code-review.md): conditions, source references, strengths and release risks.
- [Workflow review](flow-review.md): feature inventory and source-based UX findings.
- [Market research](market-research.md): current official sources, comparison and policy requirements.
- [Fresh verification and visual-audit limits](validation.md): passing static checks, incomplete checks and every attempted journey.
- `evidence/verification.log`: fresh local verification output; do not infer success from the presence of the file.
- `evidence/capture.log`: fresh capture attempt; only successfully inspected current screenshots count as visual evidence.

No application source was changed for this review. No production credentials, client records, database mutations, coach messages or deployments were used.

**Verification result:** TypeScript and the static UI contract checks passed. Lint did not finish before the review processes were stopped, so the chained Jest suite was not reached. A fresh visual capture could not be completed: after a delayed server start, the isolated browser remained blank waiting for the local bundle. No prior screenshots were used to fill that gap. The UI/UX recommendations above are therefore grounded in workflow source, and rendered visual polish/native feel remain ungraded. See [validation.md](validation.md) for exact limits.

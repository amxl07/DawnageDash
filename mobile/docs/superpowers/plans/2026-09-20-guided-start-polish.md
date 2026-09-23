# Guided start and daily UI polish

> Execute the agreed design in this session, using focused implementation and review agents for independent work.

**Goal:** Make joining Dawnage, choosing when to start, completing a first check-in, and logging a workout understandable and visually distinctive.

**Architecture:** Reuse the existing email authentication, users.profile_data JSON, onboarding milestones, query cache, check-in editor and workout session. Add presentation and small pure journey selectors; retain existing submission/draft/outbox behavior. Work from checkpoint `7e8a9c2` on `feat/checkin-single-scroll`.

**Tech stack:** Expo 57, React Native, React Query, existing theme tokens, Reanimated, react-native-svg.

**Spec:** The user-approved five-part review in this conversation, including the clarification that the first submitted daily check-in starts Day 1. Clients can begin before coach assignment or wait for their coach.

## Constraints

- No Supabase project, schema, provider settings or deployed function changes. No release or push.
- Coach connection and program start are independent. A draft, tutorial, account creation or coach assignment must not start Day 1.
- Preserve date identity, queued delivery, interruption recovery, editable historical records, and current 1–10 data scales.
- Never report an unknown program state as confirmed absence. Pending first check-ins remain visibly pending.
- Use the current dark/coral and pearl/slate light tokens, 44+ point controls, scalable text, keyboard-safe layouts and reduced-motion behavior.
- Do not use unverified plan pointers as proof that a personal plan is ready.
- Keep existing checkout unchanged; the user asked to checkpoint and continue this app.

## Task 1 — Clear account entry and verification

**Files:** `app/(auth)/login.tsx`, focused `src/features/auth/` components/helpers/tests, existing auth tests where necessary.

- [x] Simplify account creation to name, email and password; preserve authentication policy, accessible password visibility and autofill. Contact details remain editable in Profile.
- [x] Give account entry a deliberate brand composition and explain coach connection versus starting the program.
- [x] Provide verification resend with duplicate/rate-limit protection, change-email recovery, and clear continuation instructions. Do not assume a verification screen is necessary when signup returns an authenticated session.
- [x] Test invalid submissions, resend failures/retries and recovery without live auth calls. Preserve password reset behavior.

## Task 2 — Onboarding, welcome Home and first check-in (root)

**Files:** `src/features/onboarding/{setup-model,useSetupController,SetupStage}.*`, `app/(app)/onboarding.tsx`, new `src/features/program/` presentation/model, `src/features/home/TodayBrief.tsx`, `app/(app)/(tabs)/index.tsx`, `app/(app)/(tabs)/check-in.tsx`, check-in presentation components.

**Interface:** `SetupValues.startPreference: 'start_now' | 'wait_for_coach' | null`, persisted as `profile_data.start_preference`. The final setup step requires an explicit choice. Choosing start routes to today's check-in; waiting routes Home. Both save only profile preferences and onboarding milestones.

- [x] Add failing tests for preference hydration/persistence and preventing completion without a choice. Preserve unrelated profile data.
- [x] Replace the abstract introduction with a concise explanation of check-ins versus set logging and coach connection. Add an explicit final start-or-wait choice and accurate plan copy.
- [x] Add a decorative Dawnage sunrise visual using palette tokens; avoid synthetic data or fake progress.
- [x] Add a pure `resolveProgramStatus` selector. Inputs are known history, pending submission dates, profile start date, readiness and today; output discriminates unknown/not-started/pending/active. Cover empty history, a draft without submission, queued first submission, existing start date and an existing check-in.
- [x] Render a first-use Home surface with coach status, an explicit start action, and a check-in guide that cannot write data. Preserve recovery actions as higher priority. Show the normal daily Home once started.
- [x] Clearly explain the first check-in consequence at entry and review, include its reporting date, and use an explicit Day 1 submit label only when first-use status is known. Keep queued receipts distinct from server confirmation.
- [x] Replace generic rating anchors with metric-specific descriptions while retaining all ten values; add short guidance for sleep, training status and nutrition. Keep optional fields collapsed.
- [x] Test onboarding navigation, Home waiting/active/unknown/pending states, preview isolation, first-submit labels and existing delivery behavior.

## Task 3 — Guided workout and verification

**Files:** `app/(app)/logger.tsx`, `src/components/logger/{ExerciseSlide,CurrentSetEditor,RestDock}.*`, focused logger tests.

- [x] Make exercise instructions discoverable, distinguish targets from actual entries, and explain the set → rest → next-set sequence.
- [x] Put bodyweight guidance by the weight field. Preserve advanced disclosure, editable previous values and explicit completion.
- [x] Make finishing a partial workout discoverable without hunting in Overview; use the existing review/save flow.
- [x] Improve the visual hierarchy of current-set, completion and rest states with existing tokens/motion. Keep the primary action reachable with small screens and keyboards.
- [x] Finish focused behavior suites, TypeScript, lint and UI contracts. Current screenshots were attempted with fixture-only local data; capture did not produce a populated frame.

## Review and progress

Shared interfaces: Task 1 owns auth only. Task 2 owns program/setup/Home/check-in. Task 3 owns logger. Theme primitives and the database contracts stay shared and unchanged. Tasks do not require each other's source edits.

- Checkpoint: complete (`7e8a9c2`). Existing source and evidence preserved; generated browser profiles excluded.
- Task 1: implemented. Account fields and mode changes lock during authentication; verification resend remains recoverable and ignores late feedback after leaving.
- Task 2: implemented. Explicit start/wait choice, practice guide, program-aware Home, first-submit guidance, descriptive rating anchors and inline sleep help. Saved receipts prove presence; refreshing empty queries do not prove absence. Weekly draft recovery remains visible before program start.
- Task 3: implemented. Target/actual set hierarchy, bodyweight hint, exercise guide, visible Finish review action, active-rest progress and a wrapping compact/large-text header.
- Verification: complete for source checks. Twenty relevant suites pass across the final focused runs, including authentication races, onboarding persistence/routing, program status, Home recovery, check-in editor/integration, forms and workout logging. TypeScript, full lint, UI contracts (192 source files) and diff checks passed. Independent source review has no outstanding findings. Fresh visual capture was attempted twice, but Chrome/Metro never produced a populated frame; native and visual sign-off remain outstanding.


## Visual acceptance before release

Use a real device or a working simulator to check both themes at normal and enlarged text sizes: signup keyboard/autofill, the verification return path, all three setup stages, the practice sheet, waiting Home, the first check-in review/receipt, and a workout from first set through rest and Finish. Test background/resume and an offline first submission without creating a second record. The source tests cannot establish final visual quality or native keyboard/screen-reader behavior.


## Review fixes

- Preserve submitted-receipt evidence and distinguish refreshing empty queries from known absence.
- Keep weekly draft resume and retry independent of empty-progress visibility.
- Place sleep-night guidance beside the actual input.
- Lock account entry modes while Supabase can still publish a session; cover late verification resends separately.
- Wrap workout header actions on compact screens and with enlarged text.
- Correct missing theme/text references surfaced by independent review and component checks.


## Final verification evidence

- The integrated 19-suite run exposed two failing suites (a missing Text import and deferred-auth test harness behavior). Both were corrected.
- Check-in form, workout screen, RestDock and ExerciseSlide reruns passed; the final account-entry screen rerun passed all 8 cases. The other 15 suites passed in the integrated run.
- `node node_modules/typescript/bin/tsc --noEmit`: passed on the final source and test changes.
- `node scripts/lint.mjs`: passed; the account entry files were also checked after the final test-harness correction.
- `node scripts/verify-ui-contracts.mjs`: passed for 192 source files.
- `node --check scripts/capture-redesign.mjs` and `git diff --check`: passed.
- No current native/device or populated screenshot validation is claimed. No live authentication requests, Supabase writes/configuration changes, cloud builds, push or deployment were performed for this polish pass.

The requested pre-implementation checkpoint is committed as `7e8a9c2`. The new polish changes remain uncommitted for review in the same feature branch.

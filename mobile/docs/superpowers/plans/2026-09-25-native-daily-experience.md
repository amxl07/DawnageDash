# Native daily experience implementation plan

> Execute each task in order using subagent-driven development, with focused verification and review before progressing. The user has approved all six recommendations and continuous implementation.

**Goal:** Refine Dawnage's visual hierarchy and daily workflows, then add reviewed health imports and useful native surfaces.

**Architecture:** Keep the existing Expo Router, shared theme, reporting-date model and outbox. Derive weekly summaries from recorded observations. Native integrations sit behind platform adapters with explicit availability, permission and failure states; the main app remains usable when those integrations are unavailable.

**Tech stack:** Expo SDK 57, React Native 0.86, TypeScript, React Query, Jest, Swift/HealthKit/WidgetKit/ActivityKit and Android Health Connect as supported by verified dependencies.

**Spec:** The six recommendations approved in this conversation, expanded into the acceptance criteria below.

## Global constraints

- Apple-like, restrained, Dawnage branding; preserve light/dark themes, reduced motion and minimum touch targets.
- Every applicable daily check-in field remains required. Unanswered ratings stay null; imports never imply completion or submission.
- Preserve reporting dates, drafts, invalid numeric input, delivery and recovery behavior.
- Preserve all existing working-tree edits; work in the user's current feature branch. No commit may sweep in prior changes.
- Do not restart or change the user's existing Metro server.
- No live account data or health records in tests, screenshots or logs. Test fixtures are fictional.
- Native absence, declined access and no records must have honest states. Device/build limitations must remain explicit.

### Task 1: Visual hierarchy and adaptive week strip

Files: `src/features/home/WeekRecordStrip.tsx`, `TodayBrief.tsx`, `src/components/checkin/CheckInFieldBlock.tsx`, `src/components/ui/InlineAction.tsx` and relevant call sites/tests.

- [x] Give secondary section actions a neutral style while keeping primary actions and errors clear.
- [x] Make field/row titles subordinate to page headings; use concise daily check-in heading copy.
- [x] Fit all seven dates at ordinary phone widths using measured available width and platform touch-target minimums. Retain horizontal scrolling with a visible affordance at narrow widths or large text; bring today into view when overflow exists.
- [x] Test date selection, disabled future dates, sizing/overflow logic, and focused Home/check-in regressions. Review diff before Task 2.

### Task 2: Nutrition summaries

Files: `src/features/nutrition/MealPlanDetails.tsx`, nutrition screen tests.

- [x] Keep independent meal disclosures and calmer meal titles.
- [x] Replace repeated paragraphs with concise listed-versus-target summary and a details disclosure for protein/explanation.
- [x] Missing calories and target differences remain visible without expanding. Missing is not zero; partial totals are explicitly partial. A prescribed plan is never described as consumed food.
- [x] Test matched/different/missing/zero amounts and independent expansion. Review diff before Task 3.

### Task 3: Compact precise ratings

Files: `src/components/checkin/CheckInRatingScale.tsx`, associated tests and browser journey selectors if needed.

- [x] Reduce repeated vertical helper text and control chrome while retaining direct selection of all ten values and full touch targets.
- [x] Prefer a compact single-row control only where it fits; preserve a clear two-row alternative on smaller layouts and at large text. Do not trade accuracy for a decorative slider.
- [x] Preserve null/unanswered, endpoint meanings, screen-reader exact values/actions, haptics, reduced motion and existing required validation.
- [x] Test every exact selection, no default answer, accessibility bounds and adaptive layout; verify complete check-in integration.

### Task 4: Weekly progress recap

Files: new focused recap selector/component under `src/features/home`, `useHomeData.ts`, `types.ts`, Home route/tests as needed.

- [x] Show a compact dated seven-day recap with recorded check-in consistency, completed workouts, and observed weight direction when at least two distinct dates support it. Waist may be included only if real observations are already available without duplicating misleading summaries.
- [x] Exclude drafts, future dates and invalid observations. Deduplicate reporting dates and session IDs; distinguish pending delivery if used.
- [x] Show observation counts and exact date window. Unavailable/stale sources must not appear as zero activity. Reuse existing weekly feedback rather than adding another questionnaire.
- [x] Test sparse records, duplicates, midnight/week boundaries, unavailable sources and empty state; integrate below the weekly strip without duplicating the existing weight card.

### Task 5: Reviewed health-data import

Files: new `src/features/health` adapters/model/UI/tests, check-in editor integration, native package/config files.

- [x] Verify current package APIs and compatibility from source/documentation before selecting dependencies.
- [x] Add explicit read-only Apple Health and Health Connect access to supported weight/steps/nutrition/water measurements. Request only types actually used. Do not equate active energy burned with calories eaten.
- [x] Query the selected local reporting day, normalize kg/litres/kcal/grams correctly, aggregate overlapping activity using platform aggregation, and retain source/date attribution in the review UI.
- [x] Present a review sheet; apply only user-selected valid values through the editor. Existing entries require an explicit replacement choice. Never save or submit automatically. Reject stale results after date/account changes.
- [x] Explain unsupported build/device, unavailable provider, denied/empty access and retryable errors. Do not claim iOS read permission was granted from a successful authorization request alone.
- [x] Verify normalization, partial permissions, cancellation, date changes, preservation of manual entries, required validation, config and autolinking. Document native acceptance steps.

### Task 6: Workout Live Activity and quick-access widget

Files: new `src/features/native-surfaces` model/adapters/tests, workout lifecycle integration, iOS widget target/config, settings integration if needed.

- [x] Implement a real iOS workout/rest Live Activity using a verified compatible API. Use timestamp-based rest countdowns that continue outside the JS foreground loop. Update with session/exercise/rest changes, end on completion/discard, reconcile on app recovery, and clear on sign-out.
- [x] Add a restrained quick-access Home/Lock Screen widget linking to check-in and training. If dynamic data is shown, date/expiry and account clearing must be implemented; otherwise use honest static shortcuts with no stale status claims.
- [x] Deep links use the configured development/preview/production scheme and auth-aware existing routes. Do not expose health measurements or personal identifiers on the Lock Screen.
- [x] Native absence, disabled Live Activities and unsupported OS fall back cleanly. Android receives supported in-app behavior and health import; do not claim iOS-only surfaces exist on Android.
- [x] Test lifecycle/coalescing/stale-session protection, cleanup, links and plugin generation. Run all source tests, TypeScript, lint, UI contracts and available browser journeys. Attempt native toolchain checks and report evidence separately from source verification.

## Execution record

- Initial state: feature branch `codex/native-ui-modernization` with existing authorized uncommitted refinements. The user requested continuous execution, so no repeated design/phase approvals are needed.
- Initial native acceptance limitation: last pass had no usable current iOS Simulator or connected Android device; recheck before final verification.

- Completion: all six phases implemented and source-reviewed. All 163 current test suites have passing evidence across the full run and affected reruns; final TypeScript, lint, UI contracts, 20 guided browser captures, widget runtime bundle, native generation, and iOS/Android/web production JavaScript exports passed. See `../../research/2026-09-25-native-daily-experience/verification.md`.
- Native acceptance boundary: full Xcode/iPhone SDK and Android SDK/Java are unavailable on this host. Native binary compilation and real-device Health/WidgetKit/ActivityKit checks remain documented acceptance work; JavaScript and prebuild checks do not establish those results.

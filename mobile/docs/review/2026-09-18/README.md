# Dawnage mobile: current-state review

Reviewed 18 September 2026, Asia/Kolkata. Scope: the current `mobile/` working tree, including uncommitted and untracked implementation files. This is a review; application source, dependencies, database configuration and Git state were not changed.

## Recommendation

**Prioritize reliability, targeted cleanup and real-device usability testing before another broad UI redesign.** Keep the refined athletic direction and the current guided daily flows. The next quality improvement should make saving, recovery, plan selection and progress information dependable.

The app has a substantial design system and functioning product flows. It also has specific integration defects, a public-photo storage contract, retired UI code and incomplete native release evidence. A new graphics framework will not resolve those issues. Avoid a rewrite: preserve the useful recovery architecture and correct the boundaries around it.

## Scope and evidence

The review covered route/layout entry points; auth and onboarding; Home; daily check-in and workout entry, editing, drafts and delivery; Plans and Logs; Measurements, Photos, weekly feedback, Profile and Settings; theme/motion primitives; dependencies, assets, test infrastructure and release configuration. The storage SQL was inspected because the mobile photo feature depends on it. Other mobile repositories were not re-audited.

| Evidence | What it establishes |
| --- | --- |
| Current production TypeScript census | 190 app/src files, 23,425 lines, excluding entry JS, JSON and assets. 122 test files contain 18,532 lines; two test-support files contain 24 lines. These are maintenance measures, not quality scores. |
| Entrypoint/import tracing | All 18 route/layout files, static imports, re-exports and literal dynamic imports/requires were checked for cleanup candidates. Test-only references were distinguished from app consumers. |
| Fresh source comparison | All 324 paths in the previous baseline plus change manifest match their recorded SHA-256 hashes. All three recorded platform export bundles also match. The manifest is a defined inventory, not a claim that every workspace file was hashed. |
| Previous verification, 17 September | Recorded TypeScript/lint checks, 904 passing test outcomes across the full run plus 13 corrected-suite reruns, 64 contrast checks and iOS/Android/web JavaScript exports. These are prior results, not a freshly rerun suite. |
| Fresh focused reproductions | Installed PostgREST client with an injected failing fetch reproduces the offline-classification defect. Stubbed PostgREST responses reproduce an acknowledged zero-row check-in update. Installed React Query reproduces the shared measurement-order conflict. No live backend was contacted. |
| Fresh visual capture | Two isolated browser attempts did not produce accepted screenshots: the first timed out at Chrome debugger startup; the retry timed out at `Runtime.evaluate`. Current visual observations are therefore unverified. Older captures were not reused as current visual evidence. |
| Native evidence | An installed release/development build, physical-device performance, native keyboard/gesture behavior, VoiceOver/TalkBack and live backend authorization remain unverified in this review. |

The prior verification is recorded in [premium-motion/verification.json](../../redesign/evidence/premium-motion/verification.json). Passing component tests and fixture journeys do not exercise every SDK response shape or database permission boundary; the findings below demonstrate that gap.

Fresh reproduction outputs are saved in [delivery-boundary-results.json](evidence/delivery-boundary-results.json) and [measurement-cache-results.json](evidence/measurement-cache-results.json). The delivery reproduction was independently rerun during review; its JSON output matched. The [harness](evidence/reproduce-delivery-boundaries.cjs.txt) and [instructions](evidence/README-delivery-boundaries.md) preserve the injected-fetch scenario. [Source comparison](evidence/source-comparison.json) records the checked inventory.

The [browser attempt log](evidence/browser-capture-attempt.log) records the capture limitation. The recommendations below come from source/integration evidence and the existing design system, rather than a new visual or physical-device audit.

## Findings to address first

### 1. Progress photos use a public storage contract — release priority

**Evidence:** `src/lib/photos.ts:72–75` obtains a permanent `getPublicUrl`; `src/hooks/useProgressPhotos.ts:59–68` persists those URL values. The checked-in `sqlmigrationfiles/create_storage_bucket.sql:3` provisions `public = true`; lines 8–10 allow bucket-wide reads.

**Impact:** If deployed as checked in, someone with a photo URL can access the object outside the intended client/coach access flow. Database row authorization does not make public storage URLs private. The actual deployed bucket and policy state was not queried, so this is a confirmed source-contract problem, not a claim of a verified live disclosure.

**Next action:** Implement private storage, owner/authorized-coach policies and short-lived access URLs together with the coach/web consumer and existing-record migration. Verify two test accounts cannot read each other's objects. Do not change only the bucket flag: existing mobile/web URL consumers must migrate together. Keep photo release gated until that contract is verified.

### 2. Actual SDK network failures do not automatically retry — high priority

**Evidence:** `src/lib/delivery-errors.ts:69–75` recognizes a raw `TypeError` with an exact transport message. The installed PostgREST adapter instead catches a failed fetch and returns a plain error object such as `{ message: 'TypeError: Network request failed', code: '' }`. Its source is `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts:443–454`. The app throws that object; the classifier falls through to `unknown, retryable: false` at line 120.

**Fresh reproduction:** A raw TypeError is retryable. The same failure passed through the installed SDK produces a blocked outbox item. A subsequent automatic flush performs zero persistence calls and retains the blocked item (`src/lib/asyncOutbox.ts:365–368`).

**Impact:** A user can save a daily check-in or workout while offline, reconnect, and still need manual recovery. The intent remains stored; this finding is about incorrect delivery classification and automatic recovery, not immediate local data loss.

**Next action:** Normalize transport/status information at the real persistence boundary, preserving the distinction between retryable transport/server failures and permission/validation/conflict failures. Add adapter-to-outbox tests using installed-SDK response shapes and run an airplane-mode/reconnect journey on both platforms. Do not make every unknown error retryable.

### 3. Check-in updates can acknowledge zero changed rows — high priority

**Evidence:** `src/features/checkin/persistence.ts:35–39` checks only the update error and returns success at line 58. It does not request or validate the updated owned row. `src/lib/asyncOutbox.ts:193–204` clears the corresponding durable intent after that success.

**Trigger:** The row found by the first lookup disappears or becomes inaccessible before the subsequent update. PostgREST can return a successful 204 response with zero matching rows.

**Fresh reproduction:** The real persistence adapter with the installed SDK and stubbed responses returns `{ updated: true }`; the outbox reports `synced` and becomes empty despite no acknowledged updated row.

**Next action:** Require a returned row/identity before confirming synchronization and releasing the durable intent. The workout adapter already checks the returned owned ID in `src/lib/workoutPersistence.ts:26–33,52–55`; use that established approach. Test concurrent deletion, ownership/session changes and ordinary successful updates.

### 4. Measurements share a cache key with opposite ordering — high priority

**Evidence:** `src/hooks/useDashboardData.ts:42–49` fetches ascending measurements; `src/hooks/useMeasurements.ts:20–27` fetches descending measurements under the same `['bodyMeasurements', userId]` key. Measurements mounts both hooks (`app/(app)/measurements.tsx:71–72`). Home also fetches the ascending version, although its view does not use measurement data.

**Impact:** A refresh can put ascending rows into a consumer expecting newest-first. `measurements.tsx:140` takes `rows[0]` as current and passes it as the previous measurement at line 458. The form can therefore prefill from the oldest record, label it “last,” and calculate “since last time” against it. History/baseline labels can reverse. The newer chart/comparison helpers sort their own data; this finding does not imply their plots reverse.

**Fresh reproduction:** Two observers using the installed QueryClient and the exact shared-key/order contracts confirm that an ascending refetch replaces the descending observer's data.

**Next action:** Give measurements one canonical query and documented order. Replace the two aggregate `useDashboardData()` consumers with the daily-check-in query they actually need; remove Home's unused measurement subscription/refetch. Test Home → Measurements → Add after refresh with clearly different oldest/newest values. Preserve edits when background data changes while a form is open.

### 5. Plans conflates missing data with failure and blocks independent content — important

**Evidence:** `app/(app)/(tabs)/plans.tsx:62` reads only plan data/loading, although `usePlans.ts:181,218` throws query errors. With an assigned pointer and a failed initial plan request, lines 204–210 show “Plan assigned, but no days found” and suggest contacting the coach. Separately, the training-progress error return at lines 103–113 removes the entire page before the Training/Nutrition switch.

**Impact:** A network/backend failure can be blamed on an unfinished coach plan; a workout-history failure can prevent opening a healthy nutrition plan.

**Next action:** Keep the page shell and section switch mounted. Handle plan, progress and meal errors independently with accurate retry actions. Follow the existing Home section-state pattern. Test initial failures, stale data, retry and switching to an unaffected section.

### 6. Template-plan actions do not match workout entry behavior — important

**Evidence:** `src/hooks/usePlans.ts:219` can return `source: 'template'`. Plans labels it “Assigned plan”/“Assigned by” and enables Start without checking that source (`plans.tsx:152–161,194–199`). The logger requests only user-owned rows (`src/features/workout/useWorkoutSession.ts:60`). With no such rows and no prior record/draft, `workout-entry.ts:34` selects a blank workout.

**Impact:** Someone can view a template's exercises, tap Start, and arrive at a custom workout asking for the first exercise. The template is also represented as a coach assignment.

**Next action:** Use the same provenance distinction already implemented on Home. Either make template starts explicitly supported through the whole entry/save contract or present a clear preview/assignment state. Test the active-pointer + global-template + no-user-rows case.

### 7. Weekly autofill is not necessarily this week's data — important

**Evidence:** `app/(app)/weekly-feedback.tsx:163–174` averages the last seven records without a reporting-date window and treats missing observations as zero. `src/components/weekly/steps.ts:44,54` asks about “this week.”

**Impact:** Seven sparse records can span months. An 8,000-step observation plus a missing observation becomes 4,000. A visually polished form can therefore offer misleading coach-facing answers.

**Next action:** Define the reporting window and timezone explicitly; average observed values only; show the covered dates/sample count. Test sparse dates, null values, an empty week and week boundaries. Existing weekly test fixtures omit dates, so extend the data contract rather than adding another visual snapshot.

### 8. Weekly history omits the questions — small, valuable UX fix

**Evidence:** `app/(app)/weekly-feedback.tsx:87–100` groups answers by section but renders values alone. A Training entry can read “Yes / Yes / No / No / 8000”; filtering missing answers makes position unreliable.

**Next action:** Render question labels and units alongside saved answers using the existing field definitions. A saved entry should make sense without reopening the form or remembering question order.

## Unnecessary code and dependencies

The following are verified cleanup candidates for this app, not a recommendation to delete recovery safeguards or every file with few imports.

### Retired modules: 14 files, 1,809 production lines

| Area | Unreachable production files |
| --- | --- |
| Old dashboard | `src/components/dashboard/CheckInHistorySheet.tsx`, `ConsistencyGrid.tsx`, `StreakHero.tsx`, `TodayActionCard.tsx`, `WeekStrip.tsx`; `src/lib/streak.ts` |
| Old workout UI | `src/components/logger/SetEditor.tsx`, `RestTimer.tsx`, `CircularTimer.tsx` |
| Old check-in UI | `src/components/checkin/Celebration.tsx`; `src/features/checkin/components/CheckInPanel.tsx`, `TickRuler.tsx`, `rulerMath.ts`; `src/features/checkin/config/featureFlags.ts` |

Remove their dedicated obsolete tests and stale documentation references in the same small change. The old single-scroll flag has tests describing a rollback no production code consumes. Preserve relevant behavior tests against the current implementation. Fully unreachable source mostly costs maintenance and test time; its deletion is not automatically a runtime bundle reduction.

Additional unused exports are `src/components/ui/Stepper.tsx`, `Stagger.tsx`, and `SameAsYesterdayChip` in `CheckInForm.tsx:487`. Remove their barrel entries as appropriate.

**Keep active components:** `SwipeableSlide`/`swipeDecision`, `PlanDayButton`, `MetricCard`, the current `CheckInForm`, and the rest-timer provider/hook used by RestDock. Their names can look historical, but their consumers are active.

### Fonts: measurable exported-asset opportunity

`app/_layout.tsx:1–7` imports the Inter and Poppins family barrels. Poppins bold is loaded before the splash gate opens even though no current view consumes it. Typography uses Inter/system fonts (`src/theme/tokens.ts:46–78`).

The hash-matched export evidence includes all 18 Inter and all 18 Poppins TTF variants. Their unique raw installed asset sizes total **9,249,512 bytes**. Keeping the existing four Inter weights through individual weight imports would require **1,373,004 bytes**, reducing this raw exported asset surface by approximately **7.88 MB**. This is not a measured compressed-download, memory or native-binary saving. Re-export after cleanup to measure actual shipped changes. Inter bold may also be removable after checking all typography consumers.

### Dependency cleanup

| Candidate | Evidence and action |
| --- | --- |
| `react-native-gifted-charts` | Only `BarChart.tsx`/`DonutChart.tsx` import it. Those wrappers have no consumers but remain exported through the charts barrel, while active LineChart uses SVG. Remove wrappers/exports/unneeded types first, then remove the package and measure export size. |
| `@hookform/resolvers`, `react-hook-form` | No source/config consumer; remove together. Current forms use other mechanisms. |
| `expo-blur` | No app import, config plugin reference or dependent package found in the lockfile. Remove the unused native dependency after checking the build. |
| Direct `zod` dependency | No app consumer. Tooling still depends on Zod transitively, so removing the direct declaration will not necessarily remove the package from node_modules. |
| `@expo-google-fonts/poppins` | No rendered font consumer; remove with root loading and stale font tokens. |

**Retain required packages:** `@expo/ui`, `expo-symbols`, `expo-constants` and `react-native-screens` have Router/Expo requirements. WebView is used by onboarding's VideoStep. `test-renderer` is a Testing Library peer. Absence of a direct component import is insufficient evidence to uninstall these.

### Smaller housekeeping

- `package.json:70` exposes `reset-project`, but `scripts/reset-project.js` is missing. Remove the stale command rather than recreating a destructive starter reset flow.
- Unreferenced starter images (`react-logo*`, `expo-badge*`, `tutorial-web`, `tabIcons/*`, `logo-glow.png`) are repository cleanup candidates. Icons/splashes declared in `app.json`, `glyph.png` and `wordmark.png` remain needed. Do not claim unreferenced files contribute to the shipped app.
- Consolidate the current implementation/release status into one maintained index. Historical plans and evidence are useful, but claims such as “thin routes” and the old rollback description no longer describe all current code. Archive history clearly; keep OSS attribution and validation evidence.
- Establish a reviewable saved source baseline before refactoring. The working tree contains a broad mix of tracked and untracked prior changes; do not reset or mass-delete them.

## Architecture: simplify in place

The main maintainability hotspots are weekly feedback (782 lines), Profile (555), photo capture (525), check-in form (523), Measurements and login (463 each), and questionnaire wizard (408). Line count alone is not a defect. The risk is that data loading, identity, form state, recovery, submission and rendering are interleaved, making fixes harder to reason about.

Start by extracting weekly reporting-window selectors, labeled history presentation and submission/draft orchestration. Establish a canonical measurement query. Then consider smaller view/controller boundaries in Profile and photo capture when touching their behavior. Avoid replacing the whole state architecture.

Preserve stable set IDs, account/date ownership checks, numeric commit protection, draft persistence, delivery receipts, Undo, pending-save guards and timestamp-based rest recovery. Check-in and workout outboxes already share `createAsyncOutbox`; separate domain adapters reflect different record identities and are purposeful.

## Release preparation and testing

1. **Make SDK and database boundaries part of tests.** Prioritize the reproduced error-envelope, zero-row update and shared-cache cases. Add plan failure/provenance and dated weekly-autofill cases. Many existing tests are valuable; a higher count alone will not close these gaps.
2. **Automate the existing verification command.** `package.json:80` has a usable typecheck/lint/Jest/UI-contract sequence, but no checked-in CI workflow was found. Add a mobile-scoped job using a reproducible install, then a production export and carefully maintained smoke journeys.
3. **Prepare a real-device build.** `eas.json:5` requests a development client, while `package.json` has no `expo-dev-client`; the current preview iOS profile is simulator-only (`eas.json:12`). `APP_VARIANT` is set but not consumed by the static app config. Set up the intended device build/profile and environment explicitly, and verify an immutable build rather than assuming Expo Go/export is the release app. This is a configuration/readiness gap, not a build failure reproduced here.
4. **Add actionable production diagnostics.** No configured crash/error-reporting or product event instrumentation was found in app code/dependencies. Use sanitized delivery failure categories, save/retry latency, queue age and stage completion/abandonment; avoid collecting raw fitness answers or photos. Add app-specific recovery at useful route/provider boundaries; Expo Router's generic fallback is not a production support system.
5. **Run the native matrix.** Verify the same installed build on a compact iPhone and a mid-range Android: typing and keyboard dismissal, sheets, Android back, font scaling, VoiceOver/TalkBack, Reduce Motion/Transparency, workout swipes, background/rest timer, process restart, offline/reconnect and account switching. The Maestro README currently records syntax validation only; the YAML files are not proof those journeys ran.

## What UI/UX work is worth doing next?

Keep the guided check-in stages, one active set editor, explicit review/Undo, restrained motion and semantic light/dark tokens. Prioritize accurate error messages and partial recovery as part of interface quality.

Once the correctness fixes are in place:

- Test daily check-in and a full workout with 5–8 representative users on their phones. Observe hesitation, extra taps, keyboard reachability and save-state understanding. Set completion-time goals after measuring a baseline; no completion-time claim was established by this review.
- Fix weekly history labels and consider a small Home resume/due action for weekly feedback, whose drafts already exist but are less discoverable than daily drafts.
- Replace universal “Weight lost”/“Waist reduction” progress framing with neutral change labels or goal-aware presentation. Onboarding offers muscle gain, performance and consistency too; desired gain should not be presented as failed weight loss.
- Refine compact-screen density, large text and one-handed input based on native observations. Keep any defaulting explicit and truthful; avoid silently inventing subjective check-in values.
- Profile before adopting Skia, more glass or new motion libraries. Reanimated and SVG already support the current interaction and chart requirements. Add a new graphics dependency only for a specific measured limitation or a tested product benefit.

## Suggested sequence

| Order | Work | Acceptance |
| --- | --- | --- |
| 1 | Fix photo access contract; SDK delivery classification; check-in acknowledgment; measurement query ownership | Cross-account photo denial in staging; offline → reconnect delivery; no synced receipt for zero-row writes; correct latest measurement after navigation/refetch |
| 2 | Fix Plans failure/provenance behavior and weekly reporting/history | Healthy sections remain usable on partial failure; Start opens the exercises shown; sparse weekly observations are accurate and saved answers are labeled |
| 3 | Remove verified dead code/dependencies/fonts; extract only the affected responsibilities; establish CI | Active-route behavior unchanged; focused regressions plus normal verification pass; actual export/native dependency changes measured |
| 4 | Install a stable device build and run short usability sessions | Native keyboard, accessibility, interruption and recovery checks recorded; prioritize the observed friction for the next UI pass |

An initial effort split of roughly **50% correctness/release work, 25% targeted cleanup and 25% device/usability work** is more useful than another open-ended redesign. Revisit that split after the first device sessions. No additional screens, graphics engine or broad state-management rewrite is needed to start this work.

# Mobile technical review — 26 September 2026

This is a read-only review of the current working tree, including uncommitted health import, native surfaces, navigation, and daily-flow changes. Application files were not changed. No secrets, production data, or live Supabase settings were accessed. Historical review reports were not used as proof. The parent review owns executable verification and visual/market evaluation; this document does not claim the current test suite or a native build passes.

**Technical assessment: 6.5/10 for public-release readiness; approximately 7.5/10 for architecture and implementation foundations.** This is a substantial, carefully engineered client, with unusually thoughtful recovery logic for an early release. The remaining concerns involve whether saved work remains available, reliably reaches the coach, and has a defensible privacy lifecycle. A strong test count and polished screens do not settle those questions.

## Prioritized findings

### 1. P1 — Cold launch offline blocks access to the locally saved work

**Confirmed control-flow defect; exact device reproduction remains to be run.** `app/_layout.tsx:28` creates a memory-only QueryClient. `src/hooks/useOnboarding.ts:12` reads onboarding state from Supabase and has no persisted cache. `src/features/onboarding/routing.ts:12` returns `setup-recovery` on that query's error, and `app/(app)/_layout.tsx:75` gates the entire authenticated application behind its recovery screen.

A returning client with an existing session and a saved workout can force-close the app, lose connectivity, and reopen it. The local draft remains on disk, but the client cannot reach the editor. Cached warm-session behavior may conceal this in testing. Preserve a previously verified, account-scoped onboarding/access snapshot sufficient for restricted offline access; authenticate network operations normally when connectivity returns. Verify with a cold process, persisted session, airplane mode, and an unfinished workout/check-in.

### 2. P1 — Public account creation has no visible privacy or account-deletion path

**Confirmed product/release gap in mobile source.** `src/features/auth/account-entry.ts:85` supports signup. The current `src` and `app` source has no privacy policy, terms, account deletion, or support destination. Profile's account action ends at “Sign out” (`app/(app)/profile.tsx:525`); Settings exposes appearance/reminders, and `app/health-access.tsx` explains health access but is not a full privacy policy.

The app collects health observations, body photographs, injuries/allergies/medical conditions, and shares selected information with a coach. Publish the actual privacy/retention policy and provide reachable support and account deletion, including cloud photos and local sensitive state. Confirm store submission requirements against current policy in the market/release review. This finding is not a claim that a store submission has already been rejected.

### 3. P2 — Drafts described as saved silently expire

**Confirmed destructive behavior.** Workout drafts expire after 24 hours (`src/hooks/useWorkoutDraft.ts:21`); opening an expired draft deletes it (`:53`). Home discovery hides it after the same interval (`:76`). Daily check-in drafts expire after three days and are removed on read (`src/hooks/useCheckInDraft.ts:9`, `:52`). The workout exit action says “Save draft & exit” (`app/(app)/logger.tsx:148`) and shared status says “Saved on this device” (`src/components/ui/RecordStatus.tsx:29`) without communicating that deadline.

An unfinished workout saved yesterday can disappear when resumed a little more than 24 hours later. Retain user-authored drafts until successful delivery or explicit discard, or use a visible archive/expiry policy that preserves a recovery opportunity. Submitted outbox entries are separate and were not observed to use these TTLs.

### 4. P2 — Delivery retries depend on opening particular screens

**Confirmed scheduling gap.** Check-in replay exists only in `src/hooks/useCheckInMutation.ts:35`, which is mounted by the editor (`src/features/checkin/useCheckInEditor.ts:51`). Workout replay is mounted in the logger (`app/(app)/logger.tsx:118`) and workout history (`src/features/training/workout-history.tsx:254`). The root has no account-owned sync coordinator. Home's `src/features/home/useHomeLocal.ts:19` and the Check In hub read queues but do not flush them.

After submitting offline and closing the app, a client can reopen online, stay on Home or browse a training plan, and leave their record waiting indefinitely. The durable payload is safe, but coach delivery depends on navigation. Mount replay once at the authenticated application boundary, trigger it on launch/foreground/reconnect, and retain existing per-account/revision guards. No background execution entitlement is needed to solve the foreground-launch case.

### 5. P2 — Measurement saves are less reliable than the hardened record writers

**Confirmed no-op acknowledgment defect; concurrent-creation risk is backed by the repository schema.** `src/hooks/useMeasurements.ts:55` treats an UPDATE response without an error as success without selecting an owned row or checking affected rows. A row deleted between the lookup and update, or filtered from UPDATE by RLS, can yield zero affected rows without an API error. `src/components/measurements/MeasurementSheet.tsx:93` then gives success feedback and closes the editor. The questionnaire writer has the same acknowledgment pattern (`src/components/questionnaire/QuestionnaireWizard.tsx:180`).

Additionally, measurements use fetch-then-insert (`src/hooks/useMeasurements.ts:46`). The shipped table definition has no unique `(user_id,date)` constraint (`../sqlmigrationfiles/supabase_migration.sql:116`; `../shared/schema.ts:105`), and the later uniqueness migration only addresses daily check-ins (`../sqlmigrationfiles/fix_database_issues.sql:212`). Two devices can both observe no measurement row, insert duplicates, and cause later `maybeSingle()` calls to fail. Deployed constraints were not queried.

Use the owned-row acknowledgment standard already present in check-in/photo/profile persistence. Establish one explicit server contract for same-day measurements, with safe migration of duplicates and an atomic write where appropriate. Validate no-row updates and simultaneous writes with disposable staging accounts.

### 6. P2 — Tokens and sensitive local payloads use unencrypted application storage

**Confirmed implementation choice; security exposure depends on device/backup threat model.** `src/lib/supabase.ts:16` uses AsyncStorage for persistent access/refresh tokens. Outboxes (`src/lib/asyncOutbox.ts:90`) and profile recovery data including medical conditions (`src/features/profile/profileSaveRecovery.ts:5`, `:61`) also use plain JSON AsyncStorage. `src/contexts/AuthContext.tsx:97` clears authentication on sign-out but does not purge sensitive drafts, recovery journals, or query data.

This is not evidence of a remote leak, nor does account-scoped storage itself imply cross-account UI disclosure. For a health/photo product, move credentials to platform-protected storage, define the protection and backup strategy for sensitive local records, and offer an explicit device-data lifecycle that preserves unsent work deliberately rather than accidentally. Keep deletion separate from ordinary sign-out if preserving unfinished work is the chosen product behavior.

### 7. P2 — Water input precision disagrees with the checked-in database contract

**Confirmed repository contract mismatch; deployed column type unverified.** The water control accepts quarter-litres with two decimal places (`src/features/checkin/config/fields.ts:55`), while `../sqlmigrationfiles/supabase_migration.sql:69` and `../shared/schema.ts:79` define `water_liters` as a decimal with one fractional digit. No later water-column type change was found.

With that schema, a valid entry of 2.25 L persists as 2.3 L. The save response only acknowledges identity (`src/features/checkin/persistence.ts:42`) so the receipt can initially show a different number from later history. Align input precision and the database schema, and verify a fractional round trip rather than only mocking the persistence response.

## Backend verification that remains a public-release gate

The mobile UI's role gate is not a security boundary. It reads user-editable metadata (`src/contexts/AuthContext.tsx:122`). The Supabase authorization contract must independently prevent a client from changing roles, assignment, package status, or other server-owned profile fields.

The repository includes broad own-row UPDATE policies (`../sqlmigrationfiles/supabase_migration.sql:39`), admin access based on `public.users.role` (`../sqlmigrationfiles/enable_admin_role.sql:9`), and older coach policies based on user metadata. A later migration drops some duplicate policies without documenting the remaining complete policy definition. No column-protection migration was found in the inspected SQL. Consequently, neither a working exploit nor safe deployed authorization can be established from this source review.

There is also data-minimization evidence to resolve: mobile fetches `users.select('*')` (`src/hooks/usePlans.ts:140`), while the shared schema labels `coach_note` as the coach's private notes (`../shared/schema.ts:31`). Use a restricted client profile projection, and enforce confidentiality on the backend rather than only omitting a field from the UI.

Before public release, run a disposable-account staging matrix for client A/client B, assigned/unassigned coach, expired session, revoked assignment, role changes, forbidden profile-column changes, and private photo reads. Verify the applied private-photo migration and short-lived signed-URL behavior. Do not interpret this document as production penetration-test evidence.

## Strengths to preserve

- **The record state model is honest.** Draft, queued, synced, and blocked are separate states. Storage is written before the network operation in `src/lib/asyncOutbox.ts:305`. Revisions, per-target serialization, canonical identities, and retained failures protect newer edits and ambiguous workout recovery.
- **Editors handle difficult races deliberately.** Check-in account/date identity is explicit; numeric text is committed before navigation/submission. Workout saves track edit generations and repair drafts when editing races acknowledgment (`src/features/workout/workoutSave.ts:95`). Historical free-text logs are protected rather than overwritten by empty structured content.
- **Profile recovery is stronger than an ordinary multi-request form.** A durable prepare/acknowledge journal spans auth, user profile, and questionnaire changes (`src/features/profile/profileSaveRecovery.ts:57`, `app/(app)/profile.tsx:229`). It preserves unsynced medical/profile changes through partial failures.
- **Health import is thoughtfully bounded.** Explicit optional permission review; no writes to health providers; import is reviewed before submission; existing form values are not preselected for replacement; account/date/timezone/revision changes invalidate stale results. HealthKit denial ambiguity and Health Connect missing nutrient zeros are handled explicitly. Native results stay in memory until the user selects values.
- **Native surfaces minimize sensitive disclosure.** Widget shortcuts have no health values; Live Activity payloads omit exercise titles, identifiers, and measurements (`src/features/native-surfaces/model.ts:34`). Activity ownership is serialized, orphan reconciliation is explicit, and unavailable native modules fall back safely. The rest clock uses absolute timestamps rather than trusting background JS ticks.
- **Photo display is materially privacy-conscious.** Canonical owner paths, short-lived signed URLs, viewer-scoped cache identity, zero query cache lifetime, expiration checks, and refresh on focus (`src/hooks/usePrivatePhotoUrl.ts:16`; `../shared/progress-photos.ts:51`). Actual storage/RLS deployment remains outside this review.
- **A maintainable foundation exists.** Feature modules, shared UI tokens, platform-specific native controls, pure reducers/selectors, explicit error states, live reduced-motion/transparency settings, and small build-variant configuration boundaries. The inventory contains 252 implementation files and 163 test files under `src`/`app`; that count describes scope, not test execution or coverage.

## Important secondary work

- Weekly draft recovery is inconsistent with check-in/workout recovery: a storage read exception is treated as absence, and malformed data is deleted (`src/hooks/useWeeklyFeedbackDraft.ts:105`, `:119`). Preserve/quarantine unreadable drafts and expose a retry path before allowing a replacement to overwrite them.
- Daily history fetches every row in ascending order without pagination (`src/hooks/useDashboardData.ts:16`). With a finite server row cap, older rows can crowd out current records; long-term history/recap calculations will silently be incomplete. Bound recent queries and paginate the archive.
- Rest completion feedback runs from JS/app foreground (`src/components/logger/useRestTimer.ts:202`, `:223`). The current implementation provides no native local rest-end notification. A locked/backgrounded phone can display a native countdown on supported iOS devices, but completion haptics are not a reliable cross-platform background alert. Treat a native rest alert as a product enhancement, not as already delivered behavior.
- Direct Supabase access and unchecked casts remain spread across hooks and larger screens. Generate database types from a controlled schema and centralize writes/acknowledgments before expanding features. This would have exposed the water precision and measurement writer inconsistencies earlier.
- Current telemetry is deliberately sparse and omits native crash capture (`src/lib/telemetry.ts:14`). That is a privacy-conscious default, but native-crash and startup observability must be a deliberate release decision for a native-heavy SDK upgrade.

## Inspection coverage and limits

Reviewed root/auth/app navigation and configuration; auth signup/reset/session handling; all data access hooks; outbox/check-in/workout/profile persistence; workout reducer/session/content models; weekly controller/drafts/selectors; onboarding and questionnaire writes; measurement/photo capture/display paths; home selectors/local discovery; plan/nutrition resolution; reminders/rest clock; every health import and native-surface module; theme/accessibility architecture; Jest configuration, scripts, and test inventory; selected shared schema/photo helpers and SQL contracts. The parent reviewer covers detailed screen appearance and market positioning.

This was not a line-by-line review of every presentational component or every test. No full suite, live API mutation, release build, store submission, physical-device permission dialog, HealthKit/Health Connect data round trip, or WidgetKit/ActivityKit lifecycle was executed by this reviewer. Fresh parent-run verification and device evidence must be appended before calling the application release-ready.

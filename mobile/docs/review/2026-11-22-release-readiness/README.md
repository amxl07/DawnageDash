# Release readiness review — 22 November 2026

Scope: the live Supabase database (read-only introspection), the web dashboard (`client/`, both `main` and this branch), and the client app (`mobile/`). Audience assumption, confirmed by the owner: **the app is for clients only. Coaches and admins stay on the web dashboard.** So the dashboard is now the coach's only window into everything the app writes.

Nothing was changed. Every finding below was checked against the live DB or the source. None were exploited.

## Verdict

**Do not publish yet.** Ten launch blockers. Five are security holes that are already live today. Shipping the app makes them worse, because the app binary carries the public key. The other five break the coach↔client loop or will get the app rejected.

The app's own engineering is solid. TypeScript is clean, and offline delivery, drafts and error classification are careful. The problems are the backend, the deployed dashboard, and store compliance.

---

## 1. Launch blockers

### B1. Anyone can make themselves admin (live, critical)
- `handle_new_user()` copies `raw_user_meta_data.role` into `users.role`. A sign-up that sends `role: 'admin'` creates an admin.
- The `users` policy "Users can update own data" has no `WITH CHECK` and no column limit. Any signed-in client can run `update users set role='admin'` on their own row.
- `is_admin()` reads `users.role`. An admin can read every table, including `client_payments`, `coach_payouts` and `payment_transactions`.

**Fix:** ignore metadata role in the trigger (always `'client'`). Add a `BEFORE UPDATE` trigger that rejects changes to `role`, `coach_id`, `can_edit_global_templates` and the `package_*` columns unless the caller is an admin, or a coach acting on their own client.

### B2. Coach access depends on a field the user can edit (live, critical)
- "Coaches can view all clients" and "Coaches can update clients" check `auth.jwt() -> user_metadata ->> role = 'coach'`.
- Any user can run `supabase.auth.updateUser({ data: { role: 'coach' } })`. They can then read **every** client's profile (email, phone, `profile_data`) and rewrite any client's `coach_id` to themselves.
- After that, `is_coach_of()` opens that client's check-ins, measurements, workout logs, plans and questionnaire.
- `VITE_COACH_ACCESS_KEY` is checked only in the browser (`client/src/pages/Login.tsx:126`). It ships in the JS bundle and protects nothing.
- Real coaches can also take any client from another coach, because the update policy has no ownership check.

**Fix:** authorize from `users.role` (or `app_metadata` via a custom access-token hook), never `user_metadata`. Limit coach updates to `coach_id = auth.uid()` rows, plus unassigned clients for the claim flow. Make the claim an RPC that sets `coach_id` atomically. Move coach sign-up to an admin invite.

### B3. Four tables have RLS switched off, with full anon access (live, critical)
`workout_plans`, `meal_plans`, `weekly_progress_photos` and `food_items` have `relrowsecurity = false`, and `anon` holds SELECT/UPDATE grants. Anyone holding the public key can read, edit or delete every client's plans and photo records. The app binary contains that key.

**Fix, in order, or the app breaks:**
1. `weekly_progress_photos` has **no owner policies** today. It has only coach and admin SELECT. Turning on RLS alone would break photo upload in the app. Add owner SELECT/INSERT/UPDATE (with `WITH CHECK`) first. The prepared `sqlmigrationfiles/2026-09-19_private_progress_photos.sql` already does this.
2. `food_items` has zero policies. Add `select to authenticated using (true)` before enabling RLS.
3. `workout_plans` and `meal_plans` already have policies, so enabling RLS is safe.
4. Revoke `anon` from every table that has no anonymous use.

### B4. Progress photos are public and listable (live, critical)
The `progress_photos` bucket has `public = true`, and a `Public Access` SELECT policy covers the whole bucket. That is 1,679 objects. The insert policy uses deprecated `auth.role()` and does not check the path, so any user can upload into another user's folder. There is no file-size limit or MIME allowlist.

The private-bucket migration is written but not applied. When it is applied, **coaches lose photo access until each one is granted** in `progress_photo_coach_access`. Plan that operator step.

### B5. The deployed dashboard cannot read what the app writes (data loss)
This assumes Vercel deploys `main`. Verify which branch is live.
- **Workouts:** the app saves `{version: 2, exercises: […]}`. `main`'s `WorkoutLogDialog.parseExercisesFromLog` only accepts arrays, so a coach sees an empty workout. **Saving it overwrites the client's log** with an array.
- **Photos:** the app stores object paths (`<uid>/<date>/front_…jpg`). `main`'s `Media.tsx` renders `<img src={url}>`, so coaches get broken images.

Both are fixed on this branch: `client/src/lib/workout-record.ts`, `WorkoutLogDialog.tsx`, `PrivatePhotoThumbnail.tsx` and `usePrivatePhotoUrl.ts`. Part of that work is **uncommitted**. It must be committed, reviewed, merged and deployed **before** the first client installs the app.

### B6. 13.5% of existing photos fail the shared photo check
`shared/progress-photos.ts:28` accepts only lowercase `.jpg`. Live data has 1,430 photo references, and **193 fail**: `.jpeg`, `.png`, and paths like `side_(left)_….jpeg`. They will not show in the app, or on the dashboard once B5's fix ships. Saving a week that already contains one of them also fails.

**Fix:** a one-line regex change to `\.(jpe?g|png)$` (case-insensitive). Mirror it in the SQL `progress_photo_reference_path` function and the CHECK constraint in the private-photo migration.

### B7. Both apps use Supabase's retiring legacy key
`.env` and `mobile/.env` hold the legacy JWT `anon` key (`eyJ…`). Supabase is "deprecating the `anon` and `service_role` keys by the end of 2026" ([migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)). A store binary stays on phones for months.

**Fix:** create a publishable key (`sb_publishable_…`), which the guide names for "mobile and desktop apps". Put it in the EAS `production` environment and the web env, and ship. Keep the legacy key active until no installed build uses it.

### B8. No in-app account deletion and no privacy policy
The app lets users sign up (`src/features/auth/account-entry.ts:85`) but has no delete-account flow and no privacy-policy link anywhere.
- Apple requires apps that allow account creation to let users start deletion in the app ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app)).
- Google Play requires in-app and web deletion.
- HealthKit and Health Connect apps also need a privacy policy.

The client can't delete an auth user, so this needs backend work: an Edge Function that uses the service role to call `auth.admin.deleteUser`. FKs already cascade from `users`. Also delete the user's storage folder, and sign out every session first.

### B9. Two clients are locked out of the app
Two `role = 'client'` users have **no `user_metadata.role`**. `src/features/onboarding/routing.ts:9` sends a null role to `role-recovery`, and "Try again" just re-reads the same empty metadata. They can never get in.

One more account is `admin` in `users` but `coach` in metadata, so the dashboard routes it as a coach.

**Fix:** backfill the metadata now. The real fix is B2's: read role from a trusted source.

### B10. Duplicate rows break app saves for affected days
There are no unique constraints. Live duplicates:

| Table | Duplicate groups |
| --- | --- |
| `daily_check_ins` (user, date) | 61 groups, 154 rows |
| `weekly_check_ins` (user, week) | 21 |
| `workout_logs` (user, date) | 18 |
| `body_measurements` (user, date) | 8 |
| `weekly_progress_photos` (user, date) | 6 |

`persistCheckIn` and `usePhotoMutation` use `.maybeSingle()` on (user, date). On a duplicated day PostgREST returns "multiple rows", and the app classifies that as a permanent `unknown` failure, so that day can never be edited. With two writers (web + app) and select-then-insert logic, new duplicates will keep appearing.

**Fix:** dedupe, keeping the newest `updated_at`. Then add `unique (user_id, date)` on `daily_check_ins`, `weekly_progress_photos` and `body_measurements`, and switch the saves to `upsert(..., { onConflict: 'user_id,date' })`. Multiple workouts per day are intentional, so give workout logs a client-generated idempotency key instead.

---

## 2. Fix before or right after launch

| # | Issue | Evidence | Fix |
| --- | --- | --- | --- |
| H1 | Coaches don't see app submissions live | `supabase_realtime` publishes only `users`, `daily_check_ins`, `body_measurements` and `workout_templates`. `CoachClientsPage.tsx:59-72` subscribes to `weekly_check_ins` and `weekly_progress_photos`, which never fire. `workout_logs` isn't published either. | Add those tables to the publication (RLS applies to realtime). |
| H2 | Every client write refetches every coach's whole client list | The same subscriptions have no `filter`. | Filter, or debounce the invalidation. App usage will raise write volume a lot. |
| H3 | Blind to native crashes | `docs/release/2026-09-19-hardening.md` says native crash collection is disabled. | Enable Sentry native crash handling in production dev-client builds. Keep the health-data scrubbing. |
| H4 | `SECURITY DEFINER` functions have no `search_path` and anon can execute them | `handle_new_user`, `is_admin`, `is_coach_of`, `auto_set_package_start_date` | `set search_path = ''`, then `revoke execute ... from anon, public` where not needed. |
| H5 | Duplicate, overlapping policies | e.g. two INSERT and two UPDATE policies on `daily_check_ins`, three SELECT on `workout_logs`. Everything is `TO public`. | Consolidate to one per command, `TO authenticated`, using `(select auth.uid())`. |
| H6 | Auth emails will throttle at launch | Default Supabase SMTP is heavily rate-limited, so sign-up verification and password reset will fail under load. Not verifiable from the DB. | Custom SMTP (Resend, Postmark or SES). Add `dawnage://reset-password` to the Auth redirect allow-list (`src/lib/password-reset.ts:13`). |
| H7 | Sign-up verification lands on the website | `signUp` has no `emailRedirectTo`. | Point it at the app scheme, or a universal or app link. |
| H8 | Storage insert/update | INSERT checks `auth.role()` only. UPDATE has no `WITH CHECK`. | Covered by the prepared private-photo migration. |
| H9 | Device acceptance still pending | README and hardening doc: every native journey is "Pending device run". | Run the matrix on a small iPhone, a current iPhone and a mid-range Android before submitting. |

---

## 3. Backend improvements that would lift the app

Ordered by impact on the client experience. Each is additive.

1. **Remote push notifications.** Add a `device_tokens` table, an Edge Function that sends Expo push, and Database Webhooks:
   - coach edits plan or note → client push "Your coach updated your plan"
   - check-in missed by 8pm local → reminder
   - weekly feedback due → reminder

   Today reminders are local-only, so the coach can't reach the client.
2. **Coach ↔ client messaging.** A `messages` table with RLS (client ↔ assigned coach), realtime, and a dashboard inbox. It is the #1 gap in the September market review.
3. **Two-way weekly feedback.** Add `coach_reply` and `replied_at` to `weekly_check_ins` (coach UPDATE limited to those columns), show the reply in the app, and push on reply.
4. **Idempotent sync.** Add a `client_mutation_id uuid unique` to the app-written tables and use upsert, so the offline outbox can retry safely without duplicates.
5. **Server-side validation.** Add CHECK constraints: ratings 1–10, `sleep_hours` 0–24, positive weights. Convert `workout_logs.content` from text to `jsonb` with a version check. Never trust the client alone.
6. **Account lifecycle Edge Functions.** Delete account (B8) and data export (JSON + photos zip).
7. **Storage hygiene.** Bucket `file_size_limit` and `allowed_mime_types`. Serve thumbnails through image transformations so the coach dashboard stops loading full-size photos.
8. **Scheduled jobs (pg_cron).** Weekly coach digest (who missed check-ins, weight trend flags), streak computation, and cleanup of orphaned storage objects.
9. **Coach-edit audit log.** A trigger-based `audit_events` table records coach edits to client data.
10. **Operations.** Separate staging project, PITR backups, `supabase db advisors` in CI. Note that since 2026-10-30, new tables are not auto-exposed to the Data API, so every new table needs explicit `GRANT`s plus RLS ([changelog](https://supabase.com/changelog)).
11. **Abuse protection.** CAPTCHA on sign-up (Supabase Auth supports Turnstile and hCaptcha), plus leaked-password protection.

---

## 4. Platform: "latest and most advanced" iOS / Android

### Baseline the app must meet
- **Expo SDK 58** was released 15 Oct 2026: React Native 0.88, "built for iOS 27" ([changelog](https://expo.dev/changelog/sdk-58)).
  - "iOS 27 requires the UIKit scene-based life cycle", and SDK 58 prebuild generates it.
  - The new Expo Go "will support only SDK 58", so `npm start` (Expo Go) stops working for this SDK 57 app. Use the dev client.
  - Other breaking changes: R8 on by default for Android release builds, and foreground notifications shown by default (check the reminders).
  - Recommendation: upgrade to SDK 58 *after* the blockers, as its own release, not mixed in.
- **Android:** Play requires target API 36 for apps and updates since 31 Aug 2026 ([Play](https://developer.android.com/google/play/requirements/target-sdk)). The app's RN catalog targets **36** ✅. `predictiveBackGestureEnabled: false` should be checked on an Android 16+ device.
- **Apple** usually requires the newest Xcode SDK for submissions each spring. Treat iOS 27 SDK support as needed in the first half of 2027 (not verified).

### iOS 27 features worth adopting
- **HealthKit workout zones.** HR and power zones are computed by HealthKit (`zoneGroupsByType`, live `didUpdateWorkoutZone`) ([WWDC26 207](https://developer.apple.com/videos/play/wwdc2026/207/)). Use them to show time-in-zone on cardio days and send it to the coach.
- **Live Activities everywhere.** They now appear in the Dynamic Island in landscape, StandBy, the Watch Smart Stack, CarPlay and the Mac menu bar, with buttons backed by `LiveActivityIntent` ([WWDC26 223](https://developer.apple.com/videos/play/wwdc2026/223/)).
  - The app already has a Live Activity. Add "+30 s" and "Next set" buttons.
  - Use SDK 58's `staleDate` so a dead timer doesn't linger.
- **App Intents / Siri.** Add intents such as "Log my weight 82.4", "Start today's workout" and "Did I check in today?". The same intents power Shortcuts, Spotlight and interactive widget buttons. SDK 58 ships `expo-app-intents`.
- **Widgets.** The new `systemExtraLargePortrait` family. Make the existing check-in widget interactive with a one-tap "weight" or "done" action.
- **Liquid Glass.** `expo-glass-effect` reports it as available on the iOS 27 SDK, so the existing glass surfaces light up after the SDK 58 upgrade.
- **On-device Foundation Models** (iOS 27; per Sahha, Apple Intelligence features need iPhone 15 Pro or later). Draft a private, on-device summary of the client's week before weekly feedback. No health data leaves the phone.
- **Apple Watch companion** for set logging and the rest timer. This is the biggest native lift: it needs a watchOS target built on EAS.

### Android 17 features worth adopting
- **Live Updates "Metric Style"** shows up to three values on the lock screen, AOD and status bar, for fitness and timer apps ([Android Authority](https://www.androidauthority.com/android-17-live-updates-metric-style-template-3669117/)). Use it for exercise, set and rest countdown, matching the iOS Live Activity.
- **Health Connect** gains distance and calories in 17 QPR1, and data now shows whether it came from verified hardware ([release notes](https://developer.android.com/about/versions/17/release-notes)). Prefer watch-sourced steps for the check-in.
- **Android widgets.** SDK 58 adds an Android implementation of `expo-widgets`. The app currently sets `enableAndroid: false`.
- **Material 3 Expressive** controls via `@expo/ui` Compose: the SDK 58 DateRangePicker and Image.

### Product features that matter more than platform features
Carried from the [September market review](../2026-09-26-market-audit/). Coach-led apps in 2026 compete on how visible the coach is and how fast logging is. AI workout builders are mostly still beta ([coachway](https://coachway.io/articles/best-ai-coaching-apps/)).

In order:
1. Coach messaging and two-way feedback (backend items 1–3)
2. Remote push
3. Faster set logging: prefilled from last time, steppers, PR detection
4. Plan-first meal check-off that fills in the macros the check-in asks for
5. Form-check video attached to a set, for the coach to review on the dashboard

---

## 5. Suggested order

1. **DB security** (B1–B4, H4, H5): one migration, applied in a quiet window. Test with three accounts (client, coach, other client) plus anon before and after.
2. **Dashboard** (B5, B6): commit, review and deploy this branch's web changes plus the regex fix. Confirm a coach can open and save an app-written workout and see app photos.
3. **Data** (B9, B10): backfill roles, dedupe, add unique constraints, switch the app to upsert.
4. **Store compliance** (B7, B8, H3, H6, H7): publishable key, delete-account function, privacy policy, SMTP, redirect URLs, Sentry native.
5. **Device acceptance** (H9), then submit.
6. **After launch:** SDK 58, push and messaging, then the iOS 27 / Android 17 features above.

## Verification status
- Mobile `tsc --noEmit`: clean.
- Mobile Jest: see the session output. This report does not claim a pass.
- Web branch build: not run in this review.
- All DB facts come from read-only queries against the live project on 2026-11-22.

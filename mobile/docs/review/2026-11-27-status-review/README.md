# Status review — 27 November 2026

Re-run of every test, a check of the live backend, and a review of dashboard changes that affect the app. Baseline: `main` = `97f74c0` (no new commits since).

## Verdict

The code, database and dashboard are in good shape. **The app cannot be built in the cloud yet.** Two configuration problems would stop every EAS build, and there has never been an iOS or production build.

## Test results

| Check | Result |
|---|---|
| Mobile typecheck | Pass |
| Mobile lint | Pass, 0 errors. 10 warnings, all in test files. |
| Mobile UI contracts | Pass, 255 files |
| Mobile Jest | 1,407 / 1,407 pass. The full run had 2 timeouts, caused by a parallel EAS packaging job; both files pass when rerun alone. |
| Dashboard typecheck | Pass |
| Dashboard production build | Pass |
| Shared + dashboard unit tests | 7 / 7 pass |
| Live permission checks (client, coach, other coach, anon, admin; rolled back) | 38 / 39 as expected. See M1. |
| Live dashboard and `/privacy` | HTTP 200. Vercel deploy of `97f74c0` succeeded. |

## Release blockers (app)

### R1. Every EAS build would fail at JavaScript bundling

The root `.easignore` uploads only `shared/progress-photos.ts` and excludes `mobile/src/testing`. Commit `97f74c0` added imports of `shared/assessment-save`, `shared/profile-save`, `shared/questionnaire` (plus its two dependencies), and `@/testing/NativeControlGallery` (from `app/_layout.tsx`).

Proof:
- `eas build:inspect --stage archive` on the current tree is missing 5 imports.
- With the fix below, all 252 reachable files resolve and no `.env` or key files are included.

Fix (verified in a scratch worktree, not applied):
```diff
 !/shared
-/shared/*
-!/shared/progress-photos.ts
 ...
-/mobile/src/testing
```

### R2. The EAS production environment has no backend configuration

| Environment | Variables |
|---|---|
| `production` | `EXPO_PUBLIC_PRIVACY_URL` only |
| `preview` | URL, key and privacy link |

`app.config.ts` deliberately stops a production build without `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Set them, ideally with the new publishable key once it is created.

No environment has `EXPO_PUBLIC_SENTRY_DSN`, so the native crash reporting added on 22 November sends nothing.

### R3. Never built for iOS or production

The only EAS build ever made is an Android preview from 19 September (`8ec16a7`). It predates health access, widgets, account deletion and the redesign. Every device-acceptance row in `docs/release/2026-09-19-*.md` is still "Pending device".

## Dashboard and backend: nothing critical

- **Backend logs:**
  - No database errors and no failed requests from real users in the last 24 hours. The only 4xx responses were the deliberate private-photo tests.
  - Coaches are loading signed photos successfully.
- **Plans:**
  - All 123 clients with an assigned workout plan resolve to rows the app can load.
  - All 55 clients with an assigned meal plan do too.
  - The 34 workout pointers with an empty `subCategory` correctly match rows with no sub-category.
- **Account deletion:** every foreign key to a user either cascades or is set to null, so deletion cannot be blocked.
- **Payments:** the admin business pages tolerate payments whose client was deleted (optional chaining, no crash).
- **Dashboard and app save rules agree:**
  - Dashboard saves of check-ins, measurements and photos all update an existing row first, so the new one-per-day rules cannot reject them.
  - Profile saves merge `profile_data` rather than overwrite it.
  - Photo uploads use the signed-in user's own folder.
- **Workout logs:** all 275 logs written in the last 4 months are the legacy JSON-array format, which the app reads. No log in the database is in the app's v2 format yet, which means no client has saved a workout from the app.

## Medium / low findings

| ID | Finding | Impact | Suggested fix |
|---|---|---|---|
| M1 | Clients can insert and update their own `workout_plans` and `meal_plans` rows (policy "Coaches and Users can manage …"). | A client using the API directly could change their own plan. Pre-existing. | Limit write policies to `is_coach_of(user_id) or is_admin()`. Clients keep SELECT. |
| M2 | Clients can update every column of their own `users` row except role and the template permission. That includes `coach_id`, `package_duration`, `package_start_date` and `coach_note`. They can also read `coach_note`, the coach's private note shown only on the coach table. | Integrity and privacy, API-only. Pre-existing. | Extend the existing guard trigger to those columns, and move `coach_note` to a coach-only table. |
| M3 | The dashboard weekly form inserts without `week_start_date` (91 such rows). | The app falls back to `created_at`, so there's no failure. The uniqueness rule simply doesn't apply to these rows. | Set `week_start_date` in `WeeklyFeedback.tsx`. |
| L1 | If a weekly submission's response is lost and the client retries, the app shows "Couldn't submit" (unique violation) even though the report was saved. | Confusing message; the data is safe. | Treat `23505` as success and refetch history. |
| L2 | Sign-up has no `emailRedirectTo`, so the verification link opens the dashboard website. | UX only. | Point it at the app scheme or a universal link. |
| L3 | Supabase performance advisor: 68 policies call `auth.uid()` per row and 145 overlapping permissive policies; the `users.coach_id` foreign key has no index. | Fine at the current 152 users. | Consolidate the policies (H5 of the 22 November review). |
| L4 | Each photo is re-signed on every focus and refresh (about 10 signing calls per photo per day). | Minor load. | Batch with `createSignedUrls` and keep results until near expiry. |
| L5 | The `npm start` scripts use Expo Go, which no longer supports SDK 57 and can't load the native health or widget modules. | Local testing needs a development build. | Use `npm run start:dev` with an EAS development build. |

## Owner actions still open (from 22 November)

In the Supabase dashboard:
- Publishable key
- Custom SMTP
- `dawnage://reset-password` redirect URL
- Leaked-password protection

In the store consoles:
- App Store privacy labels
- Play Data safety form
- Health Connect declaration

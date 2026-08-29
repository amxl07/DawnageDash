# DawnAge Mobile (Expo) — Project Brief

React Native (Expo) app for iOS/Android reimplementing the **client-facing** experience of the DawnAge web app only. Coach/Admin experiences are explicitly out of scope. Lives entirely in `/mobile`; nothing outside it may be modified (see Hard Constraints).

## Resolved choices
- **WhatsApp**: excluded entirely from the mobile app. No wa.me button, no replacement chat affordance. Web keeps its button untouched. Omit `EXPO_PUBLIC_WHATSAPP_*` env vars.
- **Theme**: support **both light and dark** themes (dark uses the design tokens below; derive a light palette consistent with the brand).

## Hard constraints
1. Never modify anything affecting the web app or its Vercel deployment: `client/`, `server/`, `shared/`, `vite.config.ts`, `vercel.json`, `tailwind.config.ts` (read-only), root `package.json`, existing build/start scripts. If a shared-code change seems necessary, stop and explain first.
2. All new work in top-level `/mobile` with its own `package.json`, lockfile, `node_modules`. **No workspace hoisting** — web is React 18, Expo SDK is React 19; full isolation is required.
3. Client scope only. Do not port: AdminDashboard, AdminCoachesPage, AdminClientsPage, AdminBusinessPage, AdminPayoutsPage, CoachClientsPage, CoachClaimPage, TemplateBuilderPage, the viewedUserId/viewedCoachId impersonation system, AdminSidebar/CoachSidebar, lib/admin-business-utils.ts, lib/admin-utils.ts, lib/coach-utils.ts, n8n Google-Sheets sync.
4. WhatsApp excluded (resolved above).
5. No formal security review deliverable; ordinary good practice only (no hardcoded secrets, env vars, respect RLS, don't weaken auth).
6. **Additive-only DB changes**, and only after explicit user confirmation before running any migration. Never drop/alter existing columns/tables.
7. Work in phases; **stop after each phase** and wait for "continue" — especially before anything touching the DB or app-store submission.

## Ground truth (VERIFIED in Phase 0, 2026-07-17)

- **No backend API.** `server/routes.ts` registers zero routes (7 lines, returns bare http server). `lib/queryClient.ts` has an `apiRequest` helper that is **never called** anywhere. `vercel.json` = `vite build` + static rewrite to index.html, no serverless functions. **The only production data path is direct supabase-js calls from the browser**, RLS is the security boundary.
- **Auth = Supabase Auth** (email/password). Role read from `user.user_metadata.role` (`client`/`coach`/`admin`) throughout (`App.tsx`, `Plans.tsx`). Session persisted by supabase-js in localStorage with explicit `storageKey: sb-<ref>-auth-token`; `clearCorruptAuthData()` clears it on invalid-refresh-token errors. A Postgres trigger `handle_new_user()` inserts/updates `public.users` from `raw_user_meta_data` (full_name, phone_number) on signup — the app does not insert the users row itself. Password recovery: hash `type=recovery` + supabase `PASSWORD_RECOVERY` event → `passwordRecoveryPending` flag in sessionStorage → mobile must replace with deep link.
- **`shared/schema.ts` is NOT authoritative.** Confirmed mismatches vs `sqlmigrationfiles/`:
  - `weekly_check_ins` exists **only** in `create_weekly_check_ins.sql` (absent from schema.ts). All columns TEXT (even numeric-looking ones: step_count, water_intake, stress_level). Structure: week_start_date + 5 steps (overview: overall_feeling/weekly_wins; nutrition: adherence/digestion/enjoying_meals/hunger_levels/questions; training: progress/enjoying/missed_sessions/joint_pain/step_count/questions; wellbeing: recovery_issues/water_intake/stress_level; summary: overall_experience/feedback). Own-row RLS for select/insert/update.
  - `users`: migrations add `country` (TEXT), `onboarding_step` (INTEGER default 0), `profile_data` (JSONB default {}) — none in schema.ts. `fix_phone_number_schema.sql` **drops `country_code`** (schema.ts still declares it); phone is stored as one combined `phone_number` (`${countryCode}${phoneNumber}` at signup, Login.tsx:131).
  - `daily_check_ins`: `remove_day_number_from_daily_checkins.sql` drops `day_number` (schema.ts still has it); `fix_database_issues.sql` adds **UNIQUE (user_id, date)** — one check-in per day is DB-enforced.
  - `progress_photos` table (single photoUrl + dietType/calories/ingredients — meal-photo shaped) is **never queried by the client**; legacy. Progress photos actually use `weekly_progress_photos` (date + front/back/side_left/side_right URLs).
- **Timezone already has a home — NO migration needed.** Deep read (2026-07-19) found Profile.tsx reads/writes `users.profile_data.timezone` (JSONB). Mobile stores the auto-detected IANA timezone there. Reminders are local-time triggers anyway, so no timezone math is required.
- **Storage**: one public bucket `progress_photos` (create_storage_bucket.sql); public read, authenticated insert, owner update. Uploads happen in `PhotoUploadCard.tsx` after canvas-based `compressImage()` (browser-only — replace with expo-image-manipulator).
- **Tables the client app actually touches** (grep of `.from('...')`): users, workout_templates, workout_plans, meal_templates, meal_plans, onboarding_questionnaire, workout_logs, weekly_check_ins, daily_check_ins, body_measurements, weekly_progress_photos, food_items.
- **Plans.tsx client vs coach**: client is **read-only**. All mutations (confirm plan, copy-to-clients, template pushes, editable plan components) are gated on `isCoach` / `viewedUserId`. Client resolution path: `users.active_workout_plan` / `active_meal_plan` JSON pointers → user's own `workout_plans`/`meal_plans` rows → fall back to coach-private then global `workout_templates`/`meal_templates`. Mobile builds the read view only (`EditableWorkoutPlan isReadOnly`, MealPlan, SupplementsPlan, TrainingNote equivalents).
- **Workout logs**: `workout_logs.content` is a JSON **array** `[{ exercise: "<name>", sets: [{ setNumber, reps, weight, rpe }] }]` (all strings); legacy rows may use an object format (`Exercise/Sets/Reps/Weight/Duration/Rest/VideoLink`) or plain strings — renderers must tolerate all three. **Flat straight sets only — no superset/circuit support in the schema.** Mobile keeps straight sets and flags the limitation. Reducer-driven `WorkoutLogDialog.tsx` (756 lines) + `useWorkoutDraft` (localStorage draft) + `usePreviousWorkoutData`. `components/workout-mobile/` (MobileWorkoutCarousel/ExerciseSlide/RestTimer) is the UX reference.
- **Measurements / Media / Weekly Feedback are three separate routes/pages** on web (`/measurements`, `/media`, `/weekly-feedback`), not one wizard. Decision for mobile: keep them as three destinations under the More tab, but apply the shared principles (prefill from last entry, trend delta on submit) to each. Revisit a combined "weekly ritual" wizard as a possible later enhancement, not Phase 4 scope.
- **WhatsApp references** (all excluded from mobile): `OnboardingFlow.tsx` (WhatsAppCard, wa.me link, env `VITE_WHATSAPP_NUMBER`/`VITE_WHATSAPP_DEFAULT_MESSAGE`), `Dashboard.tsx:173-246` (two "Activate WhatsApp AI" buttons), `Login.tsx:430-456` (phone field labeled "WhatsApp Number" — mobile keeps the phone field, drops the WhatsApp label/copy), `questionnaire-data.ts:39` (q7 "Your WhatsApp Number" — keep as a phone question), MISC/WHATSAPP_*.md docs.
- **Misc folders**: `data/` = raw food nutrition text dump for the food DB import; `scripts/` = one-off TS/Python generators for SQL imports (food data, check-in sync) — ops tooling, ignore; `MISC/` = setup/integration docs incl. `design_guidelines.md` (authoritative for design tokens); `Payout.txt` = commission-policy Q&A notes for the admin payout feature (out of scope); `migrations/` folder is absent/empty despite drizzle.config.ts — drizzle-kit isn't the applied-migration source of truth, `sqlmigrationfiles/` is.
- Web stack (confirmed): React 18 + Vite + wouter + TanStack Query + shadcn/Radix + Tailwind + Recharts + Framer Motion + react-hook-form/zod + lucide-react. 19 pages, ~10k lines in pages/ alone.
- **Deep-read additions (2026-07-19)**: web check-in forms do NOT write macros/notes (DB supports them; dashboard reads macros — they arrive via the WhatsApp/n8n pipeline); mobile adds them as optional inputs. `package_start_date` auto-sets on first check-in (client fallback + DB trigger). Onboarding gate = `users.onboarding_step < 3` (2 YouTube videos + WhatsApp card; mobile replaces the card with timezone + finish). Questionnaire lives under Profile → Detailed Assessment, saved to `onboarding_questionnaire` via check-then-upsert. `index.css` already defines a full **light theme** — mobile's light palette mirrors it. Login has a coach-signup tab gated by `VITE_COACH_ACCESS_KEY` — excluded from mobile. Weekly feedback is insert-only, week number = count+1, `week_start_date` always null. Full verified shapes and formulas: see `mobile/plans/01-data-contracts.md` (authoritative for the data layer).

## Target architecture
- `mobile/` at repo root. Expo managed workflow + TypeScript (`npx create-expo-app`, TS template). Use `npx expo install` for Expo-managed native packages.
- **Navigation: Expo Router** (chosen: deep linking for password reset + notification taps is first-class; file-based tabs/stacks). Bottom tabs + stack per tab.
- **Styling**: NativeWind mirroring the design tokens; small `mobile/src/components/ui/` primitive set (Button, Card, Input, Badge, ProgressBar). Safe areas, native modals/sheets, platform motion.
- **Data layer**: copy/adapt `client/src/lib/` pure-TS modules (checkin-utils, date-utils, workout-constants, countryCodes, questionnaire-data) and the TanStack Query hook logic; reuse `$inferSelect` row types from shared/schema.ts **but correct them per Ground Truth** (weekly_check_ins hand-written type; users type with country/onboarding_step/profile_data, no country_code; daily check-in without day_number).
- **Auth/storage**: supabase-js with AsyncStorage adapter per current official RN docs; port AuthContext minus impersonation; drop `detectSessionInUrl` on native.
- **Images**: expo-image-picker/expo-camera + expo-image-manipulator → upload to `progress_photos` bucket.
- **Charts**: one RN charting library used consistently (evaluate victory-native vs react-native-gifted-charts in Phase 3).
- **Animation**: Reanimated + Gesture Handler (no Framer Motion). **Icons**: lucide-react-native. **Forms**: react-hook-form + zod. **Drafts**: AsyncStorage equivalent of useWorkoutDraft. **Haptics**: expo-haptics.
- **Offline workout logging**: local-first set logging with sync-on-reconnect (Phase 5).
- `eas.json` with development/preview/production profiles; `mobile/README.md` with env vars + run/build instructions.

## Design system (from MISC/design_guidelines.md — carry over exactly)
Background #0B0B0C · Card #131416 · Border #1F1F23 · Text #FFFFFF / secondary #A1A1A8 · Primary accent #F04E45 · Success #00D26A · Highlight #F6C85A. Fonts: Inter (headings/UI), Poppins (body/metrics) via @expo-google-fonts. Large rounded cards, generous padding, soft accent glow on progress bars. Light theme: derive brand-consistent counterpart (Phase 8 polish).

## Screens (client scope) & sources
- **Auth** — Login.tsx (632 l), ResetPassword.tsx. Signup: full name, email, password, phone + country code (combined into phone_number). Recovery via deep link, not hash.
- **Onboarding** — OnboardingFlow.tsx, QuestionnaireWizard.tsx + questionnaire-data.ts → `onboarding_questionnaire` (answers/completedSections JSON, status), `users.onboarding_step`. Capture IANA timezone (auto-detect + override) → needs new `users.timezone` column (propose in Phase 2, confirm before migrating). WhatsApp card dropped.
- **Dashboard** — Dashboard.tsx, useDashboardData.ts. Read-only aggregation of daily_check_ins + body_measurements (+ plans). WhatsApp buttons dropped.
- **Check-Ins** — CheckIns.tsx, CheckInForm.tsx, CheckInDialog.tsx, checkin-utils.ts. Fields: morning weight, sleep hours, workout status (done/no/cardio_day/rest_day) + performance 1-10, nutrition score 1-10, calories, water, steps, macros, energy/hunger/stress 1-10, digestion (none/bloated/constipated/diarrhea), notes. UNIQUE(user_id,date) — must show edit state if today exists. Feel: <60s, single screen, streak counter, tap-first inputs (emoji scales, steppers), optional notes, haptic + celebration on submit, immediate trend payoff, encouraging missed-day copy.
- **Measurements** — Measurements.tsx, MeasurementDialog.tsx. chest/waist/hips/thighs/arms + derived stats + trend chart.
- **Media** — Media.tsx, PhotoUploadCard.tsx, PhotosUploadDialog.tsx → weekly_progress_photos (4 angles), bucket `progress_photos`, native compression, pose-guide overlay per angle.
- **Weekly Feedback** — WeeklyFeedback.tsx, ClientWeeklyFeedbackView.tsx → weekly_check_ins (all-TEXT columns; distinct from daily).
- **Plans** — Plans.tsx (1244 l). Client read-only view of workout plan hierarchy (level→type→sub-category→day), meal plan (calories/diet type), supplements, training/nutrition notes.
- **Workout Logs** — WorkoutLogs.tsx, WorkoutLogDialog.tsx, workout-mobile/. Straight sets only (schema limit). Steppers, previous-session reference, rest timer, fast exercise search w/ recents, post-workout summary + PR celebration, offline-resilient logging.
- **Profile** — Profile.tsx. Edit personal info incl. `country` (TEXT) and profile_data fields.
- **Reminders** — expo-notifications DAILY/WEEKLY triggers (local time, no tz math), contextual pre-permission screen, settings for daily time + weekly day/time, idempotent rescheduling, re-verify on foreground, deep link on tap. Structure for future server push without building it.

## Navigation
Bottom tabs: Home (Dashboard) · Check In · Plans · Logs · More. More: Measurements, Media, Weekly Feedback, Profile, Settings/Reminders, Sign out.

## Phases (stop after each; wait for "continue")
0. ✅ Discovery & audit (this document is the output).
1. Scaffolding: Expo+TS in mobile/, NativeWind + tokens, Expo Router tab shell + placeholders, Supabase client w/ AsyncStorage session, eas.json, README.
2. Auth & onboarding (incl. timezone capture; propose users.timezone migration and WAIT for confirmation).
3. Daily loop: Dashboard + Check-Ins.
4. Body tracking: Measurements + Media (three-destinations decision above).
5. Plans (read view) + Workout Logging (the big one).
6. Weekly Feedback, Profile. (WhatsApp: excluded.)
7. Reminders.
8. Visual polish pass (light+dark, micro-animations, empty/loading/error states).
9. Verification: runs on iOS + Android; root `npm run build` still green/unchanged; final summary.

## Env vars (mobile/.env)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
Same values as web `.env` (anon key only, never service role). WhatsApp vars omitted (excluded).

## Working rules
Read source files before rebuilding; ask rather than invent business rules; running todo list per phase; typecheck (+lint) before calling a phase done.

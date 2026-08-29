# Data Contracts — verified against the live codebase (2026-07-19)

Everything in this file was read directly from `client/src/` and `sqlmigrationfiles/`. It is the single source of truth for the mobile app's data layer. Do NOT trust `shared/schema.ts` where it conflicts with this file.

## Supabase access pattern (the only backend)

- All reads/writes are direct `supabase-js` calls. There is no REST API. RLS enforces per-user access (`auth.uid() = user_id` on every client-scope table).
- Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same values as web `VITE_*`; anon key only).
- Auth: Supabase email/password. Role in `user.user_metadata.role`; mobile app serves `role === 'client'` only — if a coach/admin signs in, show a "please use the web dashboard" screen and sign out.
- Signup (Login.tsx:133): `supabase.auth.signUp({ email, password, options: { data: { full_name, phone_number: countryCode+number, country, role: 'client' } } })`. Email verification is ON → show "check your email" state after signup. A DB trigger `handle_new_user()` creates/updates the `public.users` row from this metadata — the app never inserts users rows.
- Password reset: `resetPasswordForEmail(email, { redirectTo })`. On web the redirect lands with `#type=recovery` and supabase fires a `PASSWORD_RECOVERY` auth event. On mobile: use an app deep link (`dawnage://reset-password`) as `redirectTo` (must be added to Supabase Auth → URL Configuration → Redirect URLs — flag this to the user in Phase 2), handle the link with `expo-linking` + `supabase.auth` session-from-URL, then `supabase.auth.updateUser({ password })`, then sign out and return to login (web signs out after reset; keep that behavior).

## Tables the client app touches (verified shapes, snake_case as returned by supabase-js)

### users (1 row per auth user; RLS: own row; created by DB trigger)
Columns the mobile app uses:
- `id` uuid, `email`, `full_name`, `phone_number` (single combined string, e.g. "+91807..."), `country` (TEXT — full country name), `avatar_url`, `role` ('client'|'coach'|'admin'), `coach_id`
- `active_workout_plan` TEXT — JSON `{ level, workoutType, subCategory?, daysPerWeek }` or null
- `active_meal_plan` TEXT — JSON `{ calories, dietType }` or null
- `package_type`, `package_duration` (months, 3|6), `package_start_date` (date, auto-set on first check-in)
- `cardio_note`, `steps_note`, `supplements_note` (legacy), `supplements_data` TEXT — JSON `[{ id, name, serving, timing }]`
- `training_note`, `nutrition_note` (plain text, coach-written, client read-only)
- `onboarding_step` INTEGER default 0 (>= 3 means onboarding videos done)
- `profile_data` JSONB default {} — `{ timezone?, goal?, injuries?, allergies?, workoutDays?, medicalCondition? }`
- **`country_code` DOES NOT EXIST** (dropped by migration; schema.ts is stale). **`timezone` column does not exist — timezone lives in `profile_data.timezone`. No migration needed.**

### daily_check_ins (RLS: own rows; **UNIQUE (user_id, date)** — DB-enforced, one per day)
`id, user_id, date (YYYY-MM-DD), morning_weight (numeric→string), sleep_hours, workout_status ('done'|'no'|'cardio_day'|'rest_day'), workout_performance (1-10 int), nutrition_score (1-10 int), calorie_intake (int), water_liters, daily_steps (int), protein, carbs, fats, energy_level, hunger_level, stress_level (1-10 ints), digestion ('none'|'bloated'|'constipated'|'diarrhea'), notes (text), created_at, updated_at`.
- `day_number` was DROPPED — do not read/write it. Day numbers are computed client-side by `processCheckInHistory` (days since first check-in).
- Numeric decimals come back as **strings** from supabase-js — always `parseFloat(x?.toString() || '0')`.
- Write pattern (CheckInDialog.tsx): fetch by `(user_id, date)` `.maybeSingle()` → if exists `update().eq('id', id)` else `insert()`. Date string is built from LOCAL device time, zero-padded (`yyyy-MM-dd`) — keep local, never UTC/toISOString.
- Web forms do NOT write `protein/carbs/fats/notes` but the DB has them and Dashboard reads macros (they arrive via the WhatsApp/n8n pipeline). Mobile: include optional macros + notes inputs; writing them is additive and safe.
- After save, if `users.package_start_date` is null, set it to today (fallback for DB trigger `trg_auto_set_start_date`) — port this from CheckInForm.tsx:131-150.

### body_measurements (RLS: own rows; NO unique constraint — use the fetch-then-update/insert pattern)
`id, user_id, date, chest, waist, hips, thighs, arms (all numeric→string, cm), created_at`.
Weight is NOT stored here — weight metrics on the Measurements screen come from daily_check_ins.

### weekly_check_ins (raw-SQL-only table; RLS: own select/insert/update; ALL non-id columns are TEXT)
`id, user_id, created_at, week_start_date (date, currently always null — the web insert never sets it),
overall_feeling, weekly_wins, nutrition_adherence ('Yes'|'No'|'Mostly'), digestion, enjoying_meals ('Yes'|'No'), hunger_levels ('No hunger'|'Mild hunger'|'High hunger'|'Cravings'), nutrition_questions, training_progress ('Yes'|'No'|'Stalled'), enjoying_training, missed_sessions, joint_pain ('Yes'|'No'), step_count, training_questions, recovery_issues ('Yes'|'No'), water_intake, stress_level, overall_experience, feedback`.
- Insert-only from the client (no edit UI). Week number = `existing_count + 1`, computed client-side.
- Keep `stress_level`, `water_intake`, `step_count` as strings when writing.

### weekly_progress_photos (RLS via fix_database_issues.sql; no unique constraint)
`id, user_id, date, front_url, back_url, side_left_url, side_right_url, created_at`.
- Fetch-by-(user_id,date)-then-update/insert pattern. Baseline = oldest row = "Week 0"; week N = index from oldest.
- Storage: public bucket **`progress_photos`**. Path: `${userId}/${dateStr}/${label}_${Date.now()}.jpg`. Upload compressed JPEG (web: max 1200×1600, quality 0.75 — replicate with expo-image-manipulator), `upsert: true`, `contentType: 'image/jpeg'`, then `getPublicUrl()` and store the URL in the row. Max source file 10MB.
- The `progress_photos` TABLE (singular) is legacy — never touch it.

### workout_logs (RLS: own rows; no unique constraint — fetch-by-date pattern like check-ins)
`id, user_id, date, title (varchar 100), content (TEXT JSON), created_at, updated_at`.
**content is a JSON ARRAY** (WorkoutLogDialog.tsx:486): 
```json
[{ "exercise": "Bench Press", "sets": [{ "setNumber": 1, "reps": "8", "weight": "60", "rpe": "7" }] }]
```
All set values are strings. Older rows may contain a legacy object format (`Exercise/Sets/Reps/Weight/Duration/Rest/VideoLink` keys) or plain strings — the history renderer must tolerate all three (see WorkoutLogs.tsx `renderExerciseContent`).

### workout_plans (user-assigned copies; client READ-ONLY)
`id, user_id, level, workout_type, sub_category (nullable), days_per_week, day_number, focus, exercises (TEXT JSON), notes, created_at, updated_at`.
**`created_at` / `updated_at` verified present 2026-08-29** (they were missing from
this list). `meal_plans` has them too. They are what makes plan provenance
possible — "your coach updated this 3 days ago".
`exercises` JSON: `[{ id?, name (or legacy "exercise"/"Exercise"), sets: number, reps: string, videoLink?, notes? }]` — note `sets` here is a TARGET COUNT (number), unlike logs. Legacy key casing varies; normalize with `ex.Exercise || ex.exercise || ex.name`.

### workout_templates (global when coach_id IS NULL; client fallback read)
Same shape as workout_plans minus user_id, plus `coach_id` (null = global), `template_name`.

### meal_plans (user-assigned; client READ-ONLY)
`id, user_id, diet_type, calories_target, day_of_week ('Daily' in current data; legacy 'Monday'), meal_type ('Breakfast'|'Mid Morning Snack'|'Lunch'|'Evening Snack'|'Dinner'), description, calories, protein, carbs, fats`.

### meal_templates (global when coach_id IS NULL)
`id, coach_id, name, calories_target, diet_type, content (TEXT JSON)`:
```json
{ "breakfast": {"name","calories","protein","carbs","fats"}, "mid_morning_snack": {...}, "lunch": {...}, "evening_snack": {...}, "dinner": {...} }
```

### onboarding_questionnaire (RLS: own rows; one row per user, no DB constraint — check-then-update/insert by user_id)
`id, user_id, answers (TEXT JSON — keyed q1..q87), completed_sections (TEXT JSON array of section ids), status ('in_progress'|'completed')`.
Questions/sections come verbatim from `client/src/lib/questionnaire-data.ts` (10 sections, 87 questions; types: text, number, select, radio, textarea, rating). Copy that file unchanged.

### food_items — food database. The client app only references it once (coach feature); OUT OF SCOPE for mobile v1.

## Client-side plan resolution (Plans screen + Workout Log day picker)

For a **client** (no coach context, `effectiveCoachId` is null):
1. Read `users.active_workout_plan`. If null → empty state "No workout plan has been assigned yet. Please contact your coach."
2. Parse `{level, workoutType, subCategory, daysPerWeek}` and query `workout_plans` filtered by user_id + all four fields (`sub_category` uses `.is('sub_category', null)` when empty). Order by day_number, **deduplicate by day_number keeping highest id**.
3. If no user rows → same query against `workout_templates` with `.is('coach_id', null)` (global). (The coach-private-template middle step never applies to a client.)
4. Meal: `users.active_meal_plan` → if null, empty state. Else query `meal_plans` by user_id + calories_target + diet_type; prefer `day_of_week='Daily'`, fallback 'Monday' rows, one meal per meal_type; if none → global `meal_templates` `.maybeSingle()` and parse `content`.
5. WorkoutLogDialog uses the SAME resolution but only user `workout_plans` (no template fallback) for the day picker.

## Key derived-metric formulas (port verbatim)

- `processCheckInHistory` (lib/checkin-utils.ts): builds a day-by-day array from first check-in to today, marking gaps 'missed'; dayNumber = 1-based from first check-in; returns newest-first. `calculateWeeklyAverages`: 7-day windows from first check-in.
- Dashboard metrics (useDashboardData.ts): currentWeight = latest morning_weight; totalWorkouts = count(workout_status==='done'); avgNutritionScore, avgEnergyLevel = all-time means; weightTrend = last7.last − last7.first; nutritionBreakdown = mean of last 7 logs having any macros; weekly comparison grouped by ISO week starting Monday.
- CheckIns metrics: avgNutrition/avgPerformance over last 7 rows; consistency = tracked/totalElapsedDays; weightLost = first − latest.
- Measurements: totalWeightLost & avgWeeklyLoss from check-in weights (weeks = calculateWeeklyAverages length); waistReduction = oldest.waist − newest.waist; week numbering: oldest = Week 0 (baseline).
- Workout status normalization (multiple legacy spellings): done|completed|yes → done; cardio_day|cardio → cardio; rest_day|rest → rest; no|missed|other → no.

## Onboarding gate (Dashboard.tsx:113)

If `users.onboarding_step < 3` → show onboarding instead of dashboard. Web steps: 0 = intro video (YouTube QX3_LQxnMXI), 1 = how-it-works video (zmyQxmksUuc), 2 = WhatsApp activation card (EXCLUDED on mobile). Mobile: steps 0 and 1 keep the videos (use `react-native-webview` YouTube embed or `expo-web-browser` link), step 2 becomes a simple "You're all set" completion card whose button sets `onboarding_step = 3`. Each Continue writes `onboarding_step` via `users.update`.

## Explicitly excluded from mobile
Coach/admin anything (incl. coach signup tab + `VITE_COACH_ACCESS_KEY`), viewedUserId/viewedCoachId impersonation (mobile always acts as the signed-in user — everywhere the web reads `viewedUserId || user.id`, mobile uses `user.id`), all Copy-to-client dialogs, plan confirm/reset mutations, template editing, WhatsApp buttons/cards/links, n8n sync, `progress_photos` legacy table, `food_items`.

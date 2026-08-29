# Phase 6 — Weekly Feedback + Profile

Web sources: `pages/WeeklyFeedback.tsx`, `components/ClientWeeklyFeedbackView.tsx`, `pages/Profile.tsx`.

## 6a. Weekly Feedback (`(app)/weekly-feedback.tsx`)
Multi-step wizard, exact web steps/fields/option values (contract §weekly_check_ins):
0. Welcome: "Hi {first name}! 👋 Ready for your Week {count+1} check-in?" + Start button + collapsible history (accordion of past submissions W{n}, submitted date, grouped sections Overview/Nutrition/Training/Wellbeing/Feedback — port ClientWeeklyFeedbackView).
1. Weekly Overview: overall_feeling (multiline), weekly_wins (multiline).
2. Nutrition: nutrition_adherence (Yes/No/Mostly), digestion (text), enjoying_meals (Yes/No), hunger_levels (4 options), nutrition_questions (multiline).
3. Training: training_progress (Yes/No/Stalled), enjoying_training (Y/N), missed_sessions (Y/N), joint_pain (Y/N), step_count (numeric→string), training_questions.
4. Wellbeing & Summary: recovery_issues (Y/N), water_intake (numeric→string), stress_level (1–10 ScalePicker→string), overall_experience (multiline).
5. Feedback: feedback (optional, with the "helps us improve" note).
- Progress bar "Step n of 5"; Back preserved; single `insert` on submit (all values strings, no week_start_date — web parity). Submit disabled + spinner in flight.
- **Draft persistence is mandatory here.** The table is insert-only with no server-side draft, so a five-step form with no local draft means an interrupted session loses everything the user wrote — and these are long free-text answers. Persist answers to AsyncStorage (`weekly-feedback-draft:{userId}`) on every step change, restore on open with a "Picked up where you left off" note, and clear on successful insert. Same pattern as `useWorkoutDraft`.
- Ergonomics: multiline fields grow to ~6 lines then scroll; `KeyboardAvoidingView` + sticky Next bar inside the safe area; Y/N and multi-option answers are `accessibilityRole="radio"` rows with `accessibilityState.selected`; step transitions 250ms slide+fade, plain fade under reduced motion; the history accordion is a `FlatList`.
- Success screen: `notificationAsync(Success)` + "Thanks {name}!" + the reminder card ("also upload weigh-ins, measurements and progress pictures — detailed feedback within 48 hours") with buttons deep-linking to Measurements and Media. Mobile upgrade over web: prefill step_count/water_intake/stress_level defaults from this week's daily check-in averages (rounded, editable) — additive UX, same stored shape.

## 6b. Profile (`(app)/profile.tsx`)
Two segments: **Basic Details | Detailed Assessment** (assessment = the Phase-2 questionnaire component).
Basic Details (port Profile.tsx exactly):
- Read `users` row + questionnaire answers. Display/edit: name, phone, country (editable); email read-only; goal (q14), injuries (q56), allergies (q64), workoutDays (q33 select of the 4 options) — prefer questionnaire answers, fallback `profile_data`; timezone (from `profile_data.timezone`, editable with the Phase-2 picker); Program Details read-only: start date (`package_start_date`, DD-MM-YYYY) and end date (start + `package_duration` months).
- Save: `auth.updateUser({ data: { full_name } })`; `users.update({ full_name, phone_number, country, profile_data })` (merge profile_data: timezone/goal/injuries/allergies/workoutDays/medicalCondition); sync q14/q56/q64/q33 back into `onboarding_questionnaire.answers` when a row exists (web parity).
- Also here (More tab): Sign out (with confirm dialog), app version, link to Settings (reminders — Phase 7 placeholder until then).
- Profile form ergonomics: `phone-pad` for phone, the Phase-2 FlatList+search sheets for country and timezone, blur validation with inline messages, sticky Save bar, and a dirty-state guard so navigating away from unsaved edits prompts first (§03.B.4).

## Acceptance criteria
- A submitted weekly check-in appears correctly on the web app (coach view) — cross-check field-for-field.
- History accordion matches web ordering/numbering. Profile edits round-trip to web (name/phone/country/goal), questionnaire sync verified in DB.
- **Draft test**: fill steps 1–3, force-quit the app, reopen → answers restored; submit → draft cleared.
- Empty states (no feedback yet, no questionnaire yet), skeletons on load, error+retry. §03 quick check passes; one screen traversed with a screen reader (name it). Both themes; `tsc` clean.

**STOP. Post summary. Wait for "continue".**

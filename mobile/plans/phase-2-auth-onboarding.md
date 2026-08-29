# Phase 2 — Auth & Onboarding

Web sources to read before coding: `client/src/pages/Login.tsx`, `pages/ResetPassword.tsx`, `components/ProtectedRoute.tsx`, `components/OnboardingFlow.tsx`, `components/QuestionnaireWizard.tsx`, `hooks/useOnboarding.ts`, `lib/questionnaire-data.ts`, `lib/countryCodes.ts`.

## 2a. Login / Signup (`(auth)/login.tsx`)
- Sign-in: email + password → `signInWithPassword`. Errors inline, in plain words ("That email or password doesn't match" — never the raw Supabase string). "Forgot?" link.
- **Form ergonomics (§03.C)**: `keyboardType="email-address"` + `autoCapitalize="none"` + `autoComplete="email"`; password field gets a show/hide eye toggle and `autoComplete="current-password"`; `onSubmitEditing` chains email → password → submit; `KeyboardAvoidingView` throughout; submit button shows an in-place spinner and is disabled in flight.
- Sign-up, 2 steps like web: Step 1 = full name, country (searchable list from `countryCodes.ts` with flags; selecting sets the dial code, which stays editable), phone number (digits only, `keyboardType="phone-pad"`). **The country picker is ~250 rows — it must be a `FlatList` inside a `Sheet` with a debounced search field (§03.D), never a mapped `ScrollView`.** Step 2 = email, password (min 6, show/hide toggle, `autoComplete="new-password"`), confirm password. Validate on blur, not per keystroke; errors render under the offending field. Submit → `signUp` with metadata `{ full_name, phone_number: code+number, country, role: 'client' }` → show "Check your email" verification screen. **No coach tab, no access key, no WhatsApp copy** — label the phone field just "Phone Number" with helper "Used by your coach to contact you".
- Client-only gate: after any successful sign-in, if `user_metadata.role` is 'coach' or 'admin', show a screen "This app is for clients — coaches use the web dashboard" with a sign-out button.
- Forgot password: email input → `resetPasswordForEmail(email, { redirectTo: 'dawnage://reset-password' })` → confirmation screen. **Tell the user in the phase summary they must add `dawnage://reset-password` to Supabase Auth → URL Configuration → Redirect URLs** (and confirm before testing).
- Reset screen (`(auth)/reset-password.tsx`): reached via deep link. Handle the link with expo-linking; establish the recovery session per current Supabase RN docs (`PASSWORD_RECOVERY` event / token in link params — verify against docs, this API shifts). New + confirm password → `updateUser({ password })` → sign out → success screen → login. Set/clear `passwordRecoveryPending` (AsyncStorage-backed) in AuthContext so an interrupted recovery resumes.

## 2b. Route guard
`(app)/_layout.tsx`: loading → splash/spinner; no user → redirect login; `passwordRecoveryPending` → reset screen. Fetch `users.onboarding_step` (port `useOnboarding`); if `< 3` → redirect `(app)/onboarding`.

## 2c. Onboarding (`(app)/onboarding.tsx`)
3 steps with a progress bar labelled "Step n of 3" (a bare bar with no numbers gives no sense of length). Each Continue writes `users.onboarding_step` (optimistic, port useOnboarding). Back returns to the previous step without re-writing. Step transitions: 250ms slide+fade with the standard easing, collapsing to a plain fade under reduced motion.
- Step 0: "Welcome to Dawnage" — intro video (YouTube `QX3_LQxnMXI`; embed via `expo-web-browser` open or `react-native-webview` — prefer WebView embed, install with `npx expo install react-native-webview`). **Never autoplay with sound**; show the poster frame with a play affordance. Continue stays enabled regardless of watch state (web parity — the web does not gate on playback). The WebView needs a fixed 16:9 container so the page doesn't reflow when it loads, and a skeleton behind it while it does.
- Step 1: "How It Works" — video `zmyQxmksUuc`.
- Step 2 (replaces the web's WhatsApp card): **timezone + finish**. Auto-detect IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), show it **already filled in as a confirmation, not a question** ("We'll use **Asia/Kolkata** for your reminders" + a small "Change" link) — the detected value is right ~99% of the time and asking outright adds a decision for no reason. The Change link opens the searchable picker (FlatList + search, same primitive as the country picker). Save to `users.profile_data.timezone` — merge, don't clobber other profile_data keys (read-modify-write). Finish button sets `onboarding_step = 3` → dashboard, with a `notificationAsync(Success)` haptic and a brief "You're all set" state.
- Note in UI copy that the detailed assessment lives in Profile (web parity: the questionnaire is NOT part of this gate).

## 2d. Questionnaire (built now, surfaced in Profile in Phase 6)
Port `QuestionnaireWizard` + `QuestionnaireSummary` as `src/components/questionnaire/`: 10 sections from the copied `questionnaire-data.ts`; per-section validation of `required`; save-draft + next both upsert `onboarding_questionnaire` (check-by-user_id then update/insert, `answers` and `completed_sections` as JSON strings, status 'completed' when all 10 done); resume at first incomplete section; completed → summary view with Edit. Inputs: text/number → Input, textarea → multiline, select → sheet picker, radio → radio rows (`accessibilityRole="radio"` + `accessibilityState.selected`), rating → tappable number row (min..max, `accessibilityRole="adjustable"` per §03.A.3).
**Wizard ergonomics**: section list is a `FlatList`; a persistent "Section n of 10 · m questions left" header; save-draft is also automatic on section change so a backgrounded app never loses answers; validation errors scroll the first offending field into view rather than only showing a banner.

## Acceptance criteria
- Full round trip on a real device/simulator against the real Supabase project: sign up (receives verification email), verify, sign in, land in onboarding, complete it (timezone visible in DB `profile_data`), reach tab shell; sign out; sign back in skips onboarding.
- Password reset deep link works from a real email on at least one platform (document the other).
- Coach credentials (if the user supplies a test coach account) hit the client-only gate.
- Questionnaire saves/resumes correctly (verify a row in `onboarding_questionnaire`).
- **§03 quick check passes** for every new screen: labels/roles on all controls, right keyboards, blur validation, keyboard avoidance, FlatList for the country and section lists, skeleton/error/empty states, both themes, reduced motion.
- One auth screen traversed with VoiceOver or TalkBack — name it in the summary.
- `npx tsc --noEmit` clean. Root `git status` clean outside mobile/.

**STOP. Post summary (including the Supabase redirect-URL action item). Wait for "continue".**

# Phase 1 — Scaffolding

Goal: an app that boots to a themed 5-tab shell with a working Supabase session layer. No features yet.

## Steps
1. **Create the app.** `mobile/` already contains `PROJECT_BRIEF.md` and `plans/`, and `create-expo-app` refuses a non-empty target. So: scaffold to a sibling and merge.
   ```
   cd <repo-root>
   npx create-expo-app@latest .mobile-scaffold     # TypeScript + Expo Router template
   rsync -a --exclude node_modules .mobile-scaffold/ mobile/
   mv .mobile-scaffold/node_modules mobile/node_modules   # or re-run npm install in mobile/
   rm -rf .mobile-scaffold
   ```
   **`mobile/.env`, `mobile/.env.example` and `mobile/.gitignore` already exist** (created during environment prep). `rsync` will overwrite `.gitignore` with the Expo template's — after the merge, confirm `.env` is still listed in it and re-add the line if not. Never overwrite or print `mobile/.env`.
   Then run the template's `reset-project` script (or clear the example screens by hand) so `app/` holds only layouts. Confirm `PROJECT_BRIEF.md` and `plans/` survived. Verify `mobile/package.json`, `mobile/node_modules` and a lockfile exist, and that the root `package.json` was not touched — `git status` must show only additions under `mobile/`. Add `.mobile-scaffold` to nothing; it must not exist by the end of the step.
2. **Install deps**:
   - `npx expo install expo-font @expo-google-fonts/inter @expo-google-fonts/poppins react-native-svg @react-native-async-storage/async-storage react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated expo-haptics expo-linking expo-status-bar`
   - `npm install @supabase/supabase-js @tanstack/react-query lucide-react-native react-hook-form zod @hookform/resolvers date-fns`
   - NativeWind per its current official Expo guide (nativewind + tailwindcss dev dep + babel/metro config). If NativeWind fights the SDK version, fall back to a plain `StyleSheet` theme module built from `02-design-system.md` tokens and say so in the summary — do not burn days on styling infra.
3. **Theme**: implement `src/theme/` per `02-design-system.md` — `colors.ts` with the **exact measured light+dark values in that file** (they are contrast-corrected; do not substitute the web's `index.css` values back in), plus `spacing`, `radius`, `icon`, `type` and `motion` token objects. `useTheme()` follows `useColorScheme()` with an AsyncStorage override (`theme-preference`: system|light|dark) — wire the override **now**, not in Phase 8; Phase 7's Settings screen just binds a UI to it.
   Also export from the theme module:
   - `useMotion()` — returns the duration/easing/spring tokens already collapsed for reduced motion (reads Reanimated's `useReducedMotion()`), so no screen ever has to remember the check. This is why it belongs in Phase 1: every later phase inherits it for free.
   - `useSpacing()` / the raw token objects for non-Tailwind consumers (charts, Reanimated styles, tab bar, StatusBar).
   Load Inter+Poppins in root `_layout.tsx`, hold splash until loaded.
4. **Supabase client** `src/lib/supabase.ts`: `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })` per current Supabase RN docs (check docs, the adapter shape shifts). Include the web's `clearCorruptAuthData()` equivalent (clear `sb-*-auth-token` keys from AsyncStorage on invalid-refresh-token errors). Add an `AppState` listener to start/stop auto-refresh as the official RN guide recommends.
5. **AuthContext** `src/contexts/AuthContext.tsx`: port the web one MINUS viewedUserId/viewedCoachId/impersonation. State: `user, session, loading, signOut, passwordRecoveryPending` (recovery flag wired in Phase 2). Same getSession + onAuthStateChange + corrupt-token recovery flow.
5b. **UI primitives (foundation set)**: build `Screen`, `Card`, `Button`, `Skeleton`, `EmptyState`, `ErrorState` now, to the contract in `02-design-system.md` §9 — theme-driven, 44pt targets, pressed feedback, accessibility props, disabled state. Later phases add the rest (`Input`, `Stepper`, `ScalePicker`, `SegmentedControl`, `Chip`, `Sheet`, `Select`, `ProgressBar`, `Badge`, `Toast`) as they need them, to the same contract. Starting with these six means no phase has an excuse to hand-roll a loading or empty state.
6. **Router shell**: root `_layout.tsx` (QueryClientProvider → AuthProvider → theme/safe-area providers, GestureHandlerRootView) with an `(auth)` group and an `(app)` group; `(app)/(tabs)/_layout.tsx` = bottom tabs **Home · Check In · Plans · Logs · More** (lucide icons: LayoutDashboard, CheckCircle2, ClipboardList, Dumbbell, Menu), styled per theme (dark tab bar on dark), each tab with an `accessibilityLabel`. Tab bar sits inside the bottom safe area; screens receive a matching `contentInset`. All five screens are placeholders showing the screen name. `more.tsx` is a static list (Measurements, Media, Weekly Feedback, Profile, Settings, Sign out) linking to placeholder stack screens. Redirect logic: no session → `(auth)/login` placeholder; session → tabs.
7. **Config**: `app.json` — name "Dawnage", `scheme: "dawnage"`, dark/light `userInterfaceStyle: "automatic"`, `orientation: "portrait"`, icons/splash placeholders (brand background #0B0B0C), bundle ids `com.dawnage.app` (flag in summary that the user may want different ids). `eas.json` with `development` (dev client, internal), `preview` (internal APK/simulator), `production` profiles. `.env.example` with the two `EXPO_PUBLIC_SUPABASE_*` vars. `.gitignore` covers `.env`, `node_modules`. Copy `client/src/assets/logo.png` → `mobile/assets/logo.png`.
8. **README.md**: prerequisites, env setup (where to find the Supabase values), `npx expo start`, EAS build commands, project layout.

## Acceptance criteria
- `npx tsc --noEmit` clean; `npx expo start` boots **in Expo Go on a physical device** (there is no usable iOS simulator on this machine — see KICKOFF-PROMPT environment prep) showing the themed tab shell in both light and dark.
- Flipping the device theme live re-themes the shell; the AsyncStorage override forces a theme when set.
- `useMotion()` returns collapsed values when the OS "Reduce Motion" setting is on — verify by toggling it on the device.
- The six foundation primitives render in both themes; `Button` has a visible pressed state, a disabled state, and an accessible label.
- With no `.env`, the app shows a clear "missing configuration" message instead of crashing.
- Tab bar and screen content respect safe areas on a notched device and on Android's gesture nav bar.
- `git status` at repo root: only `mobile/` (+ nothing else) changed; `.mobile-scaffold/` is gone; `PROJECT_BRIEF.md` and `plans/` intact.
- Summary states: SDK version installed, navigation choice confirmation (Expo Router), NativeWind status, physical devices tested on, any deviations.

**STOP. Post summary. Wait for "continue".**

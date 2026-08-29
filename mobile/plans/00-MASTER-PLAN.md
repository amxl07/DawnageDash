# DawnAge Mobile — Master Execution Plan

This plan set is written to be executed by a coding model (e.g. Opus-class) with minimal judgment calls. To start a phase in a fresh session, use the prompt in `KICKOFF-PROMPT.md`. Read this file first, then the phase file you are executing, plus `01-data-contracts.md`, `02-design-system.md` and `03-ux-standards.md` (all three always in context). `../PROJECT_BRIEF.md` holds the full background.

## What is being built
A React Native (Expo, managed) iOS+Android app in `/mobile` that reimplements the **client** experience of the existing DawnAge web app: auth, onboarding, dashboard, daily check-ins, measurements, progress photos, weekly feedback, plans (read-only), workout logging, profile, local reminders. Light + dark themes. No coach/admin features. No WhatsApp.

## Non-negotiable rules (violating any of these = stop and ask)
1. **Never modify anything outside `/mobile`**: not `client/`, `server/`, `shared/`, `vite.config.ts`, `vercel.json`, `tailwind.config.ts`, root `package.json`, `package-lock.json`, or any file at repo root. Copy FROM them freely; never write to them. Exception: none. If a change outside /mobile seems required, stop and explain.
2. `/mobile` has its own `package.json`, lockfile, `node_modules`. **No npm/pnpm workspaces, no hoisting** (web pins React 18; Expo needs React 19).
3. **No database schema changes.** Deep read confirmed none are needed (timezone lives in `users.profile_data`). If you believe you need one anyway, stop and ask.
4. Client scope only; the exclusion list is at the bottom of `01-data-contracts.md`.
5. No hardcoded secrets. Env via `EXPO_PUBLIC_*` in `mobile/.env` (gitignored) with a committed `mobile/.env.example`.
6. **Stop at the end of every phase**: post the phase summary and wait for the user to say "continue". Never start the next phase unprompted.
7. Use `npx expo install <pkg>` for anything with native code (keeps versions matched to the SDK); plain `npm install` only for pure-JS libs.
8. **`03-ux-standards.md` is binding on every phase.** Accessibility, touch targets, list virtualisation, form keyboards, loading/error/empty states, reduced motion and both-theme support ship *with* each screen — they are not deferred to Phase 8. Phase 8 verifies them; it is not where they first appear.
9. Don't invent business rules. Every formula, field list, and JSON shape you need is in `01-data-contracts.md` or the referenced web source file — read the web file if in doubt. If genuinely ambiguous, ask.

## Phase order & files
| Phase | File | Deliverable |
|---|---|---|
| 1 | `phase-1-scaffolding.md` | Expo+TS app, NativeWind themes, Expo Router tab shell, Supabase client + AuthContext, eas.json, README |
| 2 | `phase-2-auth-onboarding.md` | Login/signup/reset (deep link), route guard, onboarding videos + questionnaire, timezone capture |
| 3 | `phase-3-dashboard-checkins.md` | Dashboard (read-only, charts) + the fast daily check-in flow (chart library decided here) |
| 4 | `phase-4-measurements-media.md` | Measurements + progress photos (camera, compression, pose guides) |
| 5 | `phase-5-plans-workoutlogs.md` | Plans read view + the full workout logger (drafts, offline queue, rest timer, PRs) |
| 6 | `phase-6-weeklyfeedback-profile.md` | Weekly feedback wizard + profile editing |
| 7 | `phase-7-reminders.md` | Local notifications (daily + weekly), settings, deep links |
| 8 | `phase-8-polish.md` | Polish + full audit against `03-ux-standards.md` (a11y, motion, both themes, identity, perf) |
| 9 | `phase-9-verification.md` | Device verification, web-build regression check, final report |

## Working conventions
- Directory layout:
```
mobile/
  app/                    # Expo Router routes only (thin files that render screens)
    (auth)/login.tsx, reset-password.tsx
    (app)/(tabs)/index.tsx, check-in.tsx, plans.tsx, logs.tsx, more.tsx
    (app)/measurements.tsx, media.tsx, weekly-feedback.tsx, profile.tsx, settings.tsx, onboarding.tsx
    _layout.tsx
  src/
    components/ui/        # primitives (see 02-design-system.md)
    components/<feature>/ # feature components
    contexts/AuthContext.tsx
    hooks/                # ported TanStack Query hooks
    lib/                  # supabase.ts + files copied from client/src/lib (checkin-utils, date-utils, workout-constants, countryCodes, questionnaire-data)
    theme/               # colors.ts (light+dark), spacing/radius/type/motion tokens, useTheme(), useReducedMotion
    types/db.ts           # row types hand-written per 01-data-contracts.md
  plans/                  # these documents
  assets/                 # logo etc. (copy client/src/assets/logo.png)
  .env.example  eas.json  README.md
```
- Copy `client/src/lib/{checkin-utils,date-utils,workout-constants,countryCodes,questionnaire-data}.ts` into `mobile/src/lib/` verbatim (they are DOM-free); adapt imports only.
- TanStack Query for all server state, same query keys as web where sensible. AsyncStorage replaces localStorage/sessionStorage.
- Every screen: loading state, error state (with retry), empty state. Numbers formatted like web (kg, L, h, /10, steps with locale separators).
- Before declaring any phase done: `npx tsc --noEmit` clean inside mobile/, app boots in Expo Go without redbox, and the phase's acceptance criteria all pass.
- Keep a running todo list per phase; report deviations honestly in the phase summary.

## Escalation points (flag to the user rather than powering through)
- Supabase Auth redirect-URL config for password reset (Phase 2) — requires a dashboard change the user must make.
- Anything that behaves differently against the real database than the contract says (report the discrepancy, don't guess).
- The offline sync design in Phase 5 if conflicts with the fetch-then-update pattern arise.
- EAS credentials/app-store anything (Phase 9+) — user decision.

# Phase 9 — Verification Before Done

1. **Device matrix**: run the app via Expo Go or an EAS-built dev client on a **physical iOS device AND a physical Android device**. (There is no usable iOS simulator or Android emulator on this machine — macOS 12.7.6 with Command Line Tools only, no JDK. See KICKOFF-PROMPT environment prep. Physical devices are the matrix.) Smoke-test the full journey on each: sign in → dashboard → submit a check-in → edit it → add a measurement → upload one photo → view plans → log a workout (incl. one airplane-mode save) → submit weekly feedback → edit profile → set a reminder and receive it. Record any platform-specific issues.
2. **Cross-app integrity**: everything written by mobile is verified visible and correct on the WEB app (check-in row, measurement, photo set, weekly feedback, workout log, profile change) — the coach experience must be unaffected.
3. **Web regression proof**: at repo root run `npm run build` — must succeed; `git status` must show NOTHING changed outside `mobile/`. State both results explicitly with output.
4. **Mobile hygiene**: `npx tsc --noEmit` clean; `npx expo-doctor` (or `expo doctor`) passes; `.env` not committed; README accurate from a clean-clone perspective (follow it yourself).
4b. **UX regression check**: re-run the `03-ux-standards.md` quick check on the three highest-traffic screens after all the phase-8 changes, and confirm the Phase-8 hex-grep is still empty.
5. **Final report** to the user:
   - What was built (per phase, one line each) and how it deviates from the web (intentional list: no WhatsApp, no coach features, macros+notes added to check-in, onboarding step 3 replaced, offline outbox, reminders, **corrected light-theme palette (the web's light values failed WCAG on mobile — see `02-design-system.md` [FIX] entries), grey-bg/white-card light surfaces, week strip on the dashboard, "same as yesterday" check-in prefill, ghost-overlay progress photos, "log this day" from Plans**).
   - Assumptions made and open questions.
   - What still needs THEIR input before EAS build/submission: Apple/Google developer accounts & credentials, final bundle identifiers, app icons/store assets sign-off, Supabase redirect URL confirmation, TestFlight/internal-track choices. **Do not run `eas build` or any submission step without explicit instruction.**

**STOP. This is the end of the plan. Wait for the user.**

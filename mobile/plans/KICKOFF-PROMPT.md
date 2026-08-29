# Kickoff Prompt (paste into a new session to execute a phase)

Use this exact prompt, changing only the phase number/filename. Run ONE phase per instruction; the plan is phase-gated on purpose.

---

You are executing a pre-written, fully specified implementation plan for the DawnAge mobile app. Do not re-plan, re-architect, or second-guess the plan — your job is faithful execution.

Read these files completely, in this order, before doing anything else:
1. `mobile/plans/00-MASTER-PLAN.md` — the rules. The "Non-negotiable rules" section is binding; rule 1 (never modify anything outside `/mobile`) and rule 6 (stop at the end of the phase and wait for me to say "continue") are the two most violated by careless execution — do not violate them.
2. `mobile/plans/01-data-contracts.md` — the authoritative data layer. Where it conflicts with `shared/schema.ts` or your intuition, the contract wins.
3. `mobile/plans/02-design-system.md` — theme tokens and primitives. Every colour value in it was contrast-measured; do not substitute the web's values back in.
4. `mobile/plans/03-ux-standards.md` — the mobile UX rules (accessibility, touch, forms, lists, states, theming). Binding on every phase, including this one. Its per-phase checklist is part of your acceptance criteria.
5. `mobile/plans/phase-N-<name>.md` — the ONLY phase you are executing today: **Phase N**.

Then execute Phase N exactly as written:
- Keep a running todo list of the phase's steps and work through them in order.
- When a phase step says "read the web source file", actually read it (`client/src/...`) before writing the mobile version — copy behavior, don't guess it. You may READ any file in the repo; you may WRITE only inside `mobile/`.
- Before claiming the phase is done, verify every item in the phase's "Acceptance criteria" section AND the per-phase quick check at the bottom of `03-ux-standards.md`, then run `npx tsc --noEmit` inside `mobile/`. Report actual results, including failures — never claim success you didn't verify.
- Also run `git status` at the repo root and confirm nothing outside `mobile/` changed.
- If you hit anything the plan calls an escalation point, anything ambiguous, or anything where reality contradicts the contracts: STOP and ask me instead of improvising.

Finish by posting the phase summary described in the phase file, then stop and wait for my "continue". Do not begin the next phase.

---

## Phase order reference
1. phase-1-scaffolding.md
2. phase-2-auth-onboarding.md
3. phase-3-dashboard-checkins.md
4. phase-4-measurements-media.md
5. phase-5-plans-workoutlogs.md
6. phase-6-weeklyfeedback-profile.md
7. phase-7-reminders.md
8. phase-8-polish.md
9. phase-9-verification.md

## Before Phase 1 — one-time environment prep (human, ~15 min)

Verified on this machine 2026-08-27: **Node v22.16.0 ✓, npm 10.9.2 ✓, macOS 12.7.6, no Xcode (Command Line Tools only), no Java/Android Studio, no watchman.**

Consequences — read these before starting, they shape the whole workflow:

1. **You cannot run an iOS simulator on this Mac.** macOS 12 caps out at Xcode 14.2, far below what current Expo SDKs need. This is not a blocker: develop on a **physical device with Expo Go** over the LAN, and use **EAS Build (cloud)** for any native/dev-client/store build — EAS does not care what macOS version you run.
2. **Android emulator also unavailable** (no JDK/Android Studio). Same answer: physical Android device + Expo Go, or install Android Studio later if you want an emulator.
3. **Install watchman** — `brew install watchman`. Metro works without it but file watching on macOS is flaky at this repo's size.
4. **Have both a real iOS device and a real Android device** with Expo Go installed, on the same Wi-Fi as the Mac. Several acceptance criteria (haptics, camera, notifications, offline) cannot be verified any other way.
5. **Create `mobile/.env`** with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, copying the values from the repo-root `.env` keys `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Anon key only — never `SUPABASE_SERVICE_ROLE_KEY`.
6. **Have a real test client account** (role `client`) with some existing check-ins, a plan assigned, and ideally one legacy-format workout log — cross-checking mobile against web is an acceptance criterion in almost every phase.
7. **`mobile/` is not empty** — it already holds `PROJECT_BRIEF.md` and `plans/`. `create-expo-app` refuses to scaffold into a non-empty directory, so Phase 1 must scaffold into a temp sibling and move the generated files in, preserving those two. Phase 1 says how.
8. **Before Phase 2**: add `dawnage://reset-password` to Supabase Dashboard → Auth → URL Configuration → Redirect URLs.
9. **Before Phase 9**: decide bundle identifiers and have Apple/Google developer accounts ready if you intend to ship.

## Tips for the human operator
- Fresh session per phase is fine — the docs carry all needed context; the built code in `mobile/` carries the rest.
- Before Phase 2, add `dawnage://reset-password` to Supabase Dashboard → Auth → URL Configuration → Redirect URLs, and have `mobile/.env` filled with the Supabase URL + anon key (same values as the web `.env`).
- Phase 5 is the largest; expect it to take several sessions. If a session ends mid-phase, restart with the same prompt plus: "Phase 5 is partially complete — inspect `mobile/` first, then continue from where it left off."
- Have a real test client account ready; several acceptance criteria require cross-checking mobile writes against the web app.

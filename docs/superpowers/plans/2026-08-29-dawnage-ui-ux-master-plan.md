# Dawnage Mobile UI/UX Implementation Plan Suite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved calm, coach-led, production-grade Dawnage mobile UI/UX while retaining Expo SDK 54 and Expo Go compatibility.

**Architecture:** Execute a preflight plus four implementation plans and a final hardening pass. Preflight captures the untouched baseline and records license boundaries; foundations establish test, responsive-layout, safe-area, accessibility-preference, navigation, surface, and motion contracts; feature plans then migrate screens onto those contracts; final hardening verifies the integrated experience on physical devices and automated flows.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, React 19.1, Expo Router 6, TypeScript 5.9, Reanimated 4.1, React Native Gesture Handler 2.28, React Query 5, Supabase, Gorhom Bottom Sheet 5, Expo Blur/Haptics/Image, Jest Expo, React Native Testing Library, Maestro.

**Spec:** `docs/superpowers/specs/2026-08-29-dawnage-fitness-ui-ux-design.md`

## Global Constraints

- Keep Expo SDK 54, React Native 0.81, React 19, and Expo Router 6.
- Remain compatible with Expo Go and the documented iOS 15.1 baseline.
- Use the installed Reanimated, Gesture Handler, Safe Area Context, Expo Blur, Expo Haptics, Gifted Charts, and Gorhom Bottom Sheet packages.
- Do not add Skia, migrate styling systems, replace Expo Router, or upgrade to Expo 56/57.
- Keep Home, Check In, Plans, Logs, and More as the five primary tabs.
- Preserve Dawnage's black/white/red light and dark themes, Inter/Poppins typography, and 4/8 spacing system.
- Use semantic theme colors only; no new hex literals outside `mobile/src/theme/`.
- Every interactive target is at least 44x44pt or represented by one larger parent action.
- Every gesture has an equivalent visible control.
- Respect Reduced Motion and Reduced Transparency.
- Treat GPL, AGPL, and unlicensed repositories as pattern references only; independently implement their ideas.
- Do not apply a database migration or widen RLS as part of these plans.
- Preserve existing uncommitted work. Never use `git reset --hard`, `git checkout --`, or broad staging.

---

## Plan files and dependency order

1. `2026-08-29-dawnage-ui-foundations-motion.md`
   - Test harness, responsive-layout contract, top safe area, screen shell, reduced transparency, card surfaces, and motion corrections.
2. `2026-08-29-dawnage-home-checkin.md`
   - Home hierarchy, accessible week/history views, adaptive metrics, check-in validation, focus, and draft status.
3. `2026-08-29-dawnage-plans-workout-logger.md`
   - Plan hierarchy, reducer extraction, adaptive set editor, velocity-aware navigation, timer polish, offline status, and workout summary.
4. `2026-08-29-dawnage-progress-coach.md`
   - Measurements, progress photos, weekly feedback, More/Profile organization, and authorized coach-state presentation.
5. `2026-08-29-dawnage-release-hardening.md`
   - Deterministic lint/test commands, Maestro smoke flows, license ledger, physical-device matrix, visual evidence, and release gates.

Before Plan 1, execute the Phase 0 subset in Plan 5 in this order: Task 5 Steps 1–2, the baseline half of Task 5 Step 4, then Tasks 1–2. Plans 2 through 4 depend on Plan 1 and can then be executed independently. Return to the remaining Plan 5 tasks only after all selected feature plans are integrated.

## Working-tree precondition

The current repository contains pre-existing modified and untracked mobile files, including several components that these plans intentionally refine. Before execution:

- [ ] Run `git status --short` and retain the output in the task notes.
- [ ] Confirm that the existing changes are either committed to a user-approved baseline or intentionally remain in the active worktree.
- [ ] Do not create an isolated worktree from `HEAD` unless that worktree also contains the approved in-progress mobile baseline.
- [ ] Stage only the exact files named by each task and verify with `git diff --cached --name-only` before every commit.

## Completion sequence

- [ ] Complete the Plan 5 Phase 0 subset in its declared order: validation-matrix structure, untouched baseline captures, deterministic lint, then the license ledger.
- [ ] Complete and review Plan 1; run its focused tests, full mobile tests, typecheck, and lint.
- [ ] Complete and review Plan 2; verify Home and Check In on compact and large-text states.
- [ ] Complete and review Plan 3; verify a full online and offline workout lifecycle.
- [ ] Complete and review Plan 4; verify measurements, photos, feedback, and coach fallbacks.
- [ ] Complete Plan 5; do not call the initiative production-ready until every release gate has evidence.

## Coverage map

| Specification requirement | Owning plan |
|---|---|
| Expo 54 / Expo Go and dependency constraints | All plans; enforced by Plans 1 and 5 |
| Safe-area top correction and responsive modes | Plan 1 |
| Active-tab reselect and shared sheet behavior | Plan 1 |
| Theme, surfaces, Reduced Transparency | Plan 1 |
| Purposeful motion and current motion corrections | Plan 1 |
| Home hierarchy, week strip, consistency history, adaptive metrics | Plan 2 |
| Four-step Check In, autosave, validation, focus, retry | Plan 2 |
| Plan hierarchy and provenance | Plan 3 |
| Adaptive logger, prior results, details/substitutions, warmups, plate utility, gestures, rest timer, finish summary | Plan 3 |
| Measurements, photos, weekly feedback, More/Profile | Plan 4 |
| Coach identity and authorization fallbacks | Plan 4 |
| Loading, empty, partial, offline, save-pending, and failed states | Plans 2–4 |
| Automated, accessibility, physical-device, performance, and visual QA | Plan 5 |
| Open-source pattern/license ledger | Plan 5 |

## Final integrated verification

Run from `mobile/` after all five plans:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform web
```

Expected: all commands exit 0. Then execute the Maestro smoke suite and the physical-device matrix defined in Plan 5. A successful web export is a bundle/route smoke check only; it does not replace iOS or Android validation.

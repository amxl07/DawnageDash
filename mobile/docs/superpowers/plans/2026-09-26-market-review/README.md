# Dawnage market-review implementation plan (master)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute **one phase file at a time, in order**. Never start a task marked **🔒 OWNER GATE** until the owner has replied "approved" to that specific task in the conversation.

**Goal:** Take the Dawnage client app from "excellent chassis, thin product" (C+) to market-competitive:
- close the launch blockers
- make the coach present
- make daily logging fast
- give Nutrition and Progress a job
- ship the standout features

**Architecture:**
- Keep Expo Router, React Query, the Supabase client, the theme tokens and the offline outbox exactly as they are.
- New logic lives in **pure, unit-tested modules** under `src/features/<area>/`. Screens only compose them.
- Database changes are **additive SQL files** in `mobile/plans/sql/`. The owner applies them.
- Work outside `mobile/` (web `client/`, `shared/`, Supabase) is **🔒 OWNER GATE** only.

**Tech stack:** Expo 57.0.24, React Native 0.86.3, React 19.2.3, expo-router 57 (`expo-router/unstable-native-tabs`), @tanstack/react-query 5, @supabase/supabase-js 2, Reanimated 4, jest-expo + @testing-library/react-native 14.

**Spec:** [`../../specs/2026-09-26-market-review-findings.md`](../../specs/2026-09-26-market-review-findings.md). Findings are referenced by ID (F1a … F8, X1 … X8).

---

## Phase files (execute in this order)

| # | File | Findings | Needs owner gate? | Effort |
|---|---|---|---|---|
| 0 | this README, section "Phase 0" | — | no | S |
| 1 | [phase-1-launch-blockers.md](phase-1-launch-blockers.md) | F1a–F1e | **yes** (DB, web, shared, device) | M |
| 2 | [phase-2-coach-loop.md](phase-2-coach-loop.md) | F2, X1 | **yes** (one SQL file) | L |
| 3 | [phase-3-fast-workout-logging.md](phase-3-fast-workout-logging.md) | F4, F6 | no | L |
| 4 | [phase-4-faster-check-in.md](phase-4-faster-check-in.md) | F3 | no (sleep import needs a device) | M |
| 5 | [phase-5-plan-first-nutrition.md](phase-5-plan-first-nutrition.md) | F5, F3, X3 | no | M |
| 6 | [phase-6-progress.md](phase-6-progress.md) | F7 | no | M |
| 7 | [phase-7-navigation-copy-cleanup.md](phase-7-navigation-copy-cleanup.md) | F8 | no | M |
| 8 | [phase-8-standout-features.md](phase-8-standout-features.md) | X2, X4–X8 | partly (X2 needs SQL + storage) | L |

Dependencies:
- Phase 7 needs Phases 2 and 6, because it turns the Coach and Progress screens into tabs.
- Phase 5 Task 5.3 changes the check-in adherence step that Phase 4 touched.
- Phase 8 X4 and X2 need Phase 2.
- Phases 3, 4, 5 and 6 are otherwise independent.

## Global Constraints (every task implicitly includes these)

1. **Scope:** edit only files inside `mobile/`.
   - Any change to `client/`, `shared/`, `sqlmigrationfiles/`, root config, the Supabase project, EAS or app-store settings is a **🔒 OWNER GATE**: write the change as a file or diff, show it, and wait for "approved".
2. **Database:** additive only.
   - New tables, columns, functions and policies go into `mobile/plans/sql/<date>_<name>.sql`.
   - Never `DROP` or `ALTER … DROP` an existing column or table.
   - The implementer **never** runs SQL against the live project. The owner does.
3. **Check-in rule (owner decision):** every applicable daily check-in field stays **required**.
   - Automation may only **pre-fill values the user can see and edit before submitting**.
   - Never auto-submit.
   - Never carry forward subjective ratings: energy, stress, hunger, digestion, nutrition score, workout performance.
4. **Privacy:** Lock Screen and widget content may not include exercise names, measurements or coach text **unless the user has opted in** (Phase 8 X8).
5. **Theme:**
   - No hex colour literals outside `src/theme/` (enforced by `npm run verify:ui`). Use `useTheme().colors`.
   - Use the type variants from `src/theme/tokens.ts` via `<Text variant=…>`.
6. **Motion:** use `useMotion()` from `@/theme` for custom motion. Never check Reduce Motion yourself.
7. **Touch targets:** every interactive element is at least `HIT_SLOP_MIN` (44pt iOS, 48dp Android), reached with padding before `hitSlop`.
8. **Accessibility:**
   - Every `Pressable` has `accessibilityRole` and `accessibilityLabel`.
   - State changes the user must hear use `accessibilityLiveRegion="polite"` or `AccessibilityInfo.announceForAccessibility`.
   - Charts pass a `summary` string.
9. **Dates:**
   - Reporting dates are local `YYYY-MM-DD` from `localDateString()` / `parseLocalDate()` in `@/lib/dates`.
   - Never use `toISOString().slice(0,10)` for a reporting date.
10. **Numbers from Supabase** may be strings. Wrap with `num()` from `@/types/db` or `Number()` + `Number.isFinite`.
11. **Units:** kilograms only (lb is deferred).
12. **Dependencies:** add no new npm package unless the task says so and the owner approved it.
13. **Copy:**
    - Plain, short, second person, no exclamation marks, no guilt ("You missed…"), no medical claims.
    - Sentence case for buttons ("Save workout").
14. **Tests:**
    - jest-expo with `@testing-library/react-native` v14. `render`, `fireEvent.*` and `renderHook` are **async**, so always `await` them.
    - Mock `@/lib/supabase` the same way `src/features/home/useHomeData.test.tsx` does.
    - Test behaviour and contracts, not style constants.
15. **Commits:**
    - One commit per task: `git add <only the files in the task>` then `git commit -m "<type>(mobile): <summary>"`.
    - Never `git add -A`. The working tree contains the owner's unrelated uncommitted work.

## Commands

All commands run from `mobile/`:

| Purpose | Command |
|---|---|
| One test file | `npx jest path/to/file.test.ts --runInBand` |
| One test by name | `npx jest path/to/file.test.ts -t "name fragment" --runInBand` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| UI contracts (hex literals etc.) | `npm run verify:ui` |
| Everything (run at the end of each phase) | `npm run verify` |
| Web export smoke test | `npx expo export --platform web` |

## Review Focus (failure modes no single task's happy-path test covers)

Each line has an owning task that must include the named test.

1. **A pre-filled value is saved silently.** If the user taps "Complete set" or "Submit" without seeing a suggested value, the value must still be visible on screen afterwards. It must never go straight to the server without being rendered first.
   - Owned by Phase 3 Task 3.2 (test: "completing an empty set with a suggestion shows the applied values in the row") and Phase 5 Task 5.3 (test: "meal-log fill only changes fields after the button press").
2. **Offline send of a coach message.** A failed send must keep the typed text in the composer and show a retry.
   - Owned by Phase 2 Task 2.4 (test: "keeps the draft text when sending fails").
3. **Midnight rollover.** Meal-log entries, suggestions and "today" badges must use the reporting date passed in, not `new Date()` at render time.
   - Owned by Phase 5 Task 5.1 (test: "reads and writes the log for the given date key only").
4. **A client with no coach.** Every coach surface must render a calm "no coach yet" state and never an error or a crash.
   - Owned by Phase 2 Task 2.4 (test: "shows the unassigned state and hides the composer").
5. **Legacy workout content.** PR and progress calculations must ignore legacy string/object logs and malformed numbers instead of throwing.
   - Owned by Phase 3 Task 3.6 (test: "ignores legacy and malformed logs").

---

## Phase 0: Baseline (do this before Phase 1)

**Files:** none changed.

- [ ] **Step 1: Confirm the owner has committed their in-progress work.**
  The git repository root is the parent folder (`DawnageAIDash/`), so paths outside `mobile/` are written as `../client/...` and `../shared/...`.
  Run (from `mobile/`): `git status --short -- . | wc -l`. It is slow on this machine; allow up to 2 minutes.
  Expected: the owner confirms that any listed files are theirs. If more than 0 lines show and the owner has not confirmed, **stop and ask**. Do not commit, stash or discard their changes yourself.
- [ ] **Step 2: Create the work branch.**
  Run: `git checkout -b feat/market-review`
- [ ] **Step 3: Record the baseline.**
  Run: `npm run verify 2>&1 | tail -30`
  Expected: PASS. If it fails, write the failing suite names into `docs/superpowers/plans/2026-09-26-market-review/BASELINE.md`, commit that file alone (`git add` it, `git commit -m "docs(mobile): record verify baseline"`), and do not "fix" unrelated failures.
- [ ] **Step 4: Read the spec** (`../../specs/2026-09-26-market-review-findings.md`) end to end.

## Not in this plan (and why)

| Item | Why it is excluded | How to do it instead |
|---|---|---|
| Visual identity pass (the "generic look" part of the C+ design grade) | Needs the owner's taste decisions, not step-by-step execution | After Phase 7, run `/impeccable shape` with the owner, then write a separate plan |
| Everything in the spec's "Deliberately deferred" table (lb units, supersets, Siri/App Intents, push, Watch…) | Listed with reasons and revisit triggers in the spec §5 | Its own plan when the trigger happens |
| Splitting `app/(app)/logger.tsx` | Heavily covered by recovery tests; refactoring adds risk without user value now | Revisit after Phase 8 |

## Owner decisions this plan assumes (change them here, not in code)

| Decision | Assumed value | Where it matters |
|---|---|---|
| Check-in fields | All required (fill automatically, never make them optional) | Phases 4, 5 |
| Coach channel | In-app text messages first; voice/video later | Phase 2, Phase 8 X2 |
| Role model for new coaches | New sign-ups are always `client`; an admin promotes coaches | Phase 1 Task 1.3 |
| Meal-log storage | On the device only (AsyncStorage), no new table | Phase 5 |
| GLP-1 mode switch | Client toggles it in Settings; stored in `users.profile_data.glp1` | Phase 8 X7 |
| Tab set after Phase 7 | Today · Training · Nutrition · Progress · Coach | Phase 7 |

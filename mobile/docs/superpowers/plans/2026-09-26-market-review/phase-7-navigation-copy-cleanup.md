# Phase 7: Navigation, copy and Home cleanup implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. **Requires Phases 2 and 6** (the Coach and Progress screens). No owner gate, but Task 7.1 changes navigation and **must be checked on a device** before release (Phase 1 Task 1.6 checklist rows 1–5 and 11–13).

**Goal:** Spend the five tabs on what clients return to (F8), cut helper copy, and make Home readable to the next developer:
- Today · Training · Nutrition · Progress · Coach.
- Check-in starts from Today, widgets and notifications.
- Account and settings live behind the avatar.

**Architecture:**
- Route files move with `git mv`.
- Route knowledge is centralised in `src/features/coach/routes.ts` and `src/features/progress/routes.ts` (created in Phases 2 and 6), so moving a screen into the tab bar changes one constant.
- Home's derived state moves into a `useHomeModel()` hook with **no behaviour change**.

**Tech stack:** `expo-router/unstable-native-tabs` (`NativeTabs.Trigger`, `.Label`, `.Icon` with `sf`/`md`, `.Badge`), `expo-router/js-tabs` for web.

**Spec:** [F8](../../specs/2026-09-26-market-review-findings.md#f8-p2-too-many-words-and-the-navigation-is-uneven).

---

### Task 7.1: New tab set

**Files:**
- Move: `app/(app)/(tabs)/check-in.tsx` → `app/(app)/check-in.tsx`
- Move: `app/(app)/(tabs)/more.tsx` → `app/(app)/account.tsx`
- Move: `app/(app)/coach.tsx` → `app/(app)/(tabs)/coach.tsx`
- Move: `app/(app)/progress.tsx` → `app/(app)/(tabs)/progress.tsx`
- Modify: `src/features/coach/routes.ts`, `src/features/progress/routes.ts` (the constants)
- Modify: `src/components/navigation/AppTabs.tsx`, `src/components/navigation/AppTabs.web.tsx`
- Modify: `app/(app)/_layout.tsx:413` (add `'/account'` to the `nativeHeader` list)
- Modify: `app/(app)/account.tsx` (header, archetype, Messages row href)
- Modify: `src/features/checkin/CheckInEditorScreen.tsx:262` (`'/(app)/(tabs)/check-in'` → `'/(app)/check-in'`)
- Modify: `app/(app)/(tabs)/index.tsx` ("History" route; avatar → account)
- Modify: `src/features/home/TodayBrief.tsx:60` (avatar label)
- Update tests: `src/screens/__tests__/tabs/check-in.test.tsx`, `more.test.tsx`, `navigation.test.tsx`, `index.test.tsx`; `src/features/coach/AskCoachButton.test.tsx`; `src/features/checkin/components/CheckInCompletion.test.tsx`; `.maestro/*.yaml`

**Interfaces:**
- Produces:
  - `COACH_PATHNAME = '/(app)/(tabs)/coach'`
  - `PROGRESS_PATHNAME = '/(app)/(tabs)/progress'`
  - Account route `'/(app)/account'`
  - Check-in hub route `'/(app)/check-in'`

- [ ] **Step 1: Update tests to the new routes first**
  1. `navigation.test.tsx`: expect the triggers in the order `index, plans, nutrition, progress, coach`, with labels `Today, Training, Nutrition, Progress, Coach`. Expect the check-in badge on `index`.
  2. `check-in.test.tsx`:
     - Change its import to `'../../../../app/(app)/check-in'`.
     - Change the expected `replace('/(app)/(tabs)/check-in')` to `replace('/(app)/check-in')`.
  3. `more.test.tsx`:
     - Rename it to `account.test.tsx` with `git mv`.
     - Import `'../../../../app/(app)/account'`.
     - Expect the Messages row to push `'/(app)/(tabs)/coach'`.
     - Mock `PageHeader` in its `@/components/ui` mock as `({ title }: { title: string }) => <MockNativeText>{title}</MockNativeText>`.
  4. `AskCoachButton.test.tsx`: expected pathname `'/(app)/(tabs)/coach'`.
  5. `index.test.tsx`:
     - The "History" action pushes `{ pathname: '/(app)/check-in', params: { history: '1' } }`.
     - The avatar pushes `'/(app)/account'`.
     - The avatar's label is now "Open your account".

  Run `npx jest src/screens src/features/coach src/components/navigation --runInBand`. Expected: FAIL.
- [ ] **Step 2: Move the files**

```bash
git mv "app/(app)/(tabs)/check-in.tsx" "app/(app)/check-in.tsx"
git mv "app/(app)/(tabs)/more.tsx" "app/(app)/account.tsx"
git mv "app/(app)/coach.tsx" "app/(app)/(tabs)/coach.tsx"
git mv "app/(app)/progress.tsx" "app/(app)/(tabs)/progress.tsx"
git mv src/screens/__tests__/tabs/more.test.tsx src/screens/__tests__/tabs/account.test.tsx
```
- [ ] **Step 3: Update the route constants**
  - `src/features/coach/routes.ts`: `export const COACH_PATHNAME = '/(app)/(tabs)/coach';`
  - `src/features/progress/routes.ts`: `export const PROGRESS_PATHNAME = '/(app)/(tabs)/progress';`
- [ ] **Step 4: Native tabs** (`AppTabs.tsx`). Replace the five `NativeTabs.Trigger` blocks with:

```tsx
      <NativeTabs.Trigger name="index" accessibilityLabel={checkIn.needsCheckIn ? 'Today, check-in not done yet' : 'Today'} testID="tab-today" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        {checkIn.needsCheckIn ? <NativeTabs.Trigger.Badge>•</NativeTabs.Trigger.Badge> : null}
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans" accessibilityLabel="Training plan and workout history" testID="tab-training" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Training</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nutrition" accessibilityLabel="Nutrition plan and today's meals" testID="tab-nutrition" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Nutrition</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" accessibilityLabel="Progress, trend, strength and photos" testID="tab-progress" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach" accessibilityLabel={unread ? `Coach, ${unread} unread` : 'Coach messages'} testID="tab-coach" disableAutomaticContentInsets={Platform.OS === 'ios'}>
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
        {unread ? <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge> : null}
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} md="chat" />
      </NativeTabs.Trigger>
```
  At the top of `AppTabs()` add:

```tsx
  const { user } = useAuth();
  const unread = unreadFromCoach(useCoachMessages().data ?? [], user?.id ?? '').length;
```
  with imports `useAuth` (`@/contexts/AuthContext`), `unreadFromCoach` (`@/features/coach/coach-messages`) and `useCoachMessages` (`@/features/coach/useCoachThread`).
  In `navigation.test.tsx`, mock `@/features/coach/useCoachThread` with `{ useCoachMessages: () => ({ data: [] }) }` and `@/contexts/AuthContext` with `{ useAuth: () => ({ user: { id: 'u' } }) }`.
- [ ] **Step 5: Web tabs** (`AppTabs.web.tsx`). Make the same change with `Tabs.Screen`:
  - `index` titled "Today" with the check-in badge. The `House` icon stays.
  - `plans`, `nutrition`: unchanged.
  - `progress` titled "Progress" with lucide `TrendingUp`.
  - `coach` titled "Coach" with lucide `MessageCircle` and `tabBarBadge: unread ? String(unread) : undefined`.
  - Remove the `check-in` and `more` screens. Remove the unused `CheckCircle2` and `UserRound` imports.
- [ ] **Step 6: Account screen** (`app/(app)/account.tsx`):
  - Rename the component to `AccountScreen`.
  - Change `archetype="root"` to `archetype="child"`.
  - Replace the `<Text variant="h1" …>You</Text>` header with `<PageHeader title="You" onBack={() => router.back()} />`, importing `PageHeader` from `@/components/ui`.
  - Change the Messages row href to `COACH_PATHNAME` (import from `@/features/coach/routes`).
  - Replace the Progress group's two rows (Measurements, Progress photos) with one row: `{ icon: TrendingUp, label: 'Progress', href: PROGRESS_PATHNAME, hint: 'Trend, strength, photos and measurements' }`. Import `TrendingUp` from `lucide-react-native`. Progress now has its own tab; keep the row so the account screen still lists everything the client can reach.
  - In `app/(app)/_layout.tsx:413`, add `'/account'` to the `nativeHeader` path array.
- [ ] **Step 7: Fix the remaining references**
  - `CheckInEditorScreen.tsx:262`: `router.replace('/(app)/check-in')`.
  - `app/(app)/(tabs)/index.tsx`:
    - The "History" `router.push({ pathname: '/(app)/check-in', params: { history: '1' } })`.
    - `onProfile={() => router.push('/(app)/account')}`.
  - `TodayBrief.tsx:60`: `accessibilityLabel="Open your account"`.
  - Run `grep -rn "(tabs)/check-in\|(tabs)/more\|'/(app)/coach'\|'/(app)/progress'" src app` and fix every hit that isn't in a test that was already updated.
- [ ] **Step 8: Maestro flows.** In `.maestro/*.yaml`:
  - Replace taps on the "Check In" or "You" tab with taps on `home-today-action` (check-in) or the "Open your account" button (account).
  - Rename any `tab-home` id to `tab-today`.

  Run `npx jest src/__tests__/maestro-contract.test.ts --runInBand`.
- [ ] **Step 9: Regenerate typed routes and verify.** Run `npx expo start --offline`, wait for "Waiting on", stop with Ctrl+C. Then run `npm run verify`. Expected: PASS.
- [ ] **Step 10: Commit**

```bash
git add app src .maestro
git commit -m "feat(mobile): tabs become Today, Training, Nutrition, Progress and Coach"
```
- [ ] **Step 11: 🔒 Device check (owner).** Run checklist rows 1–5 and 11–13 of `docs/release/2026-09-26-device-acceptance.md` again. Also check:
  - The Coach tab badge clears after opening the thread.
  - Tapping a daily reminder still opens the check-in editor.
  - The iOS check-in widget still opens the editor. Its link targets `daily-check-in`, which did not move.

---

### Task 7.2: Copy pass (fewer, plainer words)

**Files and exact replacements** (update any test that asserts the old string in the same commit):

| File | Before | After |
|---|---|---|
| `src/lib/today-action.ts:55` | `Take a moment to reflect. Build a clear record of your day.` | `About two minutes: weight, sleep and how the day went.` |
| `src/components/logger/WorkoutSummary.tsx:35` | `Check the completed and incomplete work before saving.` | `Check your sets, then save.` |
| `src/features/nutrition/nutrition-screen.tsx:49` | `No meal plan has been assigned yet. Please contact your coach.` | `Your coach hasn't assigned a meal plan yet.` |

- [ ] **Step 1: Find the tests that assert the old strings.**
  Run: `grep -rn "Take a moment to reflect\|Check the completed and incomplete work\|Please contact your coach" src .maestro`. Change each expectation to the "After" text. Run those tests. Expected: FAIL.
- [ ] **Step 2: Make the three replacements** in the source files.
- [ ] **Step 3: Give the empty meal plan a next step.** In `nutrition-screen.tsx`, give the `EmptyState` a way to reach the coach:
  - Add `actionLabel="Message your coach"` and `onAction={() => router.push(coachHref())}`.
  - Add `const router = useRouter();` (from `expo-router`) and import `coachHref` from `@/features/coach/routes`.
  - Mock `expo-router`'s `useRouter` in `nutrition.test.tsx` if it isn't already mocked.
- [ ] **Step 4: Run.** `npx jest src/lib src/components/logger src/features/nutrition src/screens --runInBand`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/lib/today-action.ts src/lib/today-action.test.ts src/components/logger/WorkoutSummary.tsx src/components/logger/WorkoutSummary.test.tsx src/features/nutrition/nutrition-screen.tsx src/screens .maestro
git commit -m "fix(mobile): shorten helper copy and link the empty meal plan to the coach"
```

---

### Task 7.3: Move Home's derived state into `useHomeModel` (no behaviour change)

**Files:**
- Create: `src/features/home/useHomeModel.ts`
- Modify: `app/(app)/(tabs)/index.tsx`

**Interfaces:**
- Consumes: exactly the modules `index.tsx` imports today for these calculations.
- Produces: `useHomeModel(today: string)`, returning `{ data, local, profile, rows, plan, provenance, assigned, pending, needsAttention, pendingDays, trainingCurrent, nextSession, queuedToday, action, program, sessionInHero, showWelcome, showDailySummary, week, weeklyIsOptional }`.

- [ ] **Step 1: Confirm the safety net.** Run `npx jest src/screens/__tests__/tabs/index.test.tsx src/features/home --runInBand`. Expected: PASS. These tests are the behaviour contract for the refactor.
- [ ] **Step 2: Create the hook.**
  - Move, **unchanged**, every line in `HomeScreen` from `const data = useHomeData(today);` through the `const weeklyIsOptional = …;` line into the hook below, **except** these, which stay in the screen because they need `router`:
    - `const router = …`
    - `const { colors } = …`
    - `openCheckIn`
    - `openTraining`
    - `refresh`
    - `weeklyReflection`
    - the Phase 2 coach-message lines
  - The moved lines include the `sunday` / `week` calculation.
  - Keep the imports those lines need.

```ts
// src/features/home/useHomeModel.ts
// (imports: exactly those the moved lines use — useHomeData, useHomeLocal, usePlanProvenance,
//  buildWeekRecords, actionReadiness, isBlocked, pendingRecordRoute, prioritizedPending,
//  queuedPlanDays, calendarDaysEnding, localDateString, parseLocalDate, resolveTodayAction,
//  resolveProgramStatus)

/** Everything Home derives from its data. Pure composition; the screen owns navigation. */
export function useHomeModel(today: string) {
  // ⟵ paste the moved lines here, unchanged
  return { data, local, profile, rows, plan, provenance, assigned, pending, needsAttention, pendingDays, trainingCurrent, nextSession, queuedToday, action, program, sessionInHero, showWelcome, showDailySummary, week, weeklyIsOptional };
}
```
  The paste marker above is an instruction to move existing code verbatim, not a placeholder. The lines are `index.tsx` lines 35–80 as of commit `70c11b0`, plus any edits Phases 2 and 6 made inside that range.
- [ ] **Step 3: Use it in the screen.** In `HomeScreen`, replace the moved lines with:

```tsx
  const { data, local, profile, rows, pending, needsAttention, pendingDays, trainingCurrent, nextSession, queuedToday, action, program, sessionInHero, showWelcome, showDailySummary, week, weeklyIsOptional, assigned, plan } = useHomeModel(today);
```
  Remove imports from `index.tsx` that are now unused (`npm run lint` lists them).
- [ ] **Step 4: Run the same tests.** `npx jest src/screens/__tests__/tabs/index.test.tsx src/features/home --runInBand && npm run typecheck && npm run lint`. Expected: PASS, with **no test changes**. If a test needs changing, the refactor changed behaviour; undo and retry.
- [ ] **Step 5: Commit**

```bash
git add src/features/home/useHomeModel.ts "app/(app)/(tabs)/index.tsx"
git commit -m "refactor(mobile): move Home derivations into useHomeModel"
```

**Deliberately not in this phase:** splitting `app/(app)/logger.tsx`. It is covered by recovery and interruption tests, and Phase 3 already changed it. A refactor adds risk without user value now. Revisit if Phase 8 X5 makes it grow further.

**Phase 7 exit:** `npm run verify` passes. The owner has re-run the device checklist rows listed in Task 7.1 Step 11.

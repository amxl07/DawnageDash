# Expo Router Test-Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Expo Router from bundling Jest suites as application routes while preserving all nine route-screen test suites.

**Architecture:** Keep `mobile/app` as a routes-only directory and move route-screen tests into `mobile/src/screens/__tests__`. Add a filesystem contract test that rejects future test/spec files under the route tree. Production routes and their default exports remain unchanged.

**Tech Stack:** Expo SDK 54, Expo Router 6, React Native 0.81, Jest 29 with `jest-expo`, TypeScript 5.9

**Spec:** `docs/superpowers/specs/2026-08-31-daily-checkin-interaction-design.md`

## Global Constraints

- Do not change production route names, route groups, default exports, or navigation behavior.
- Do not add default exports to test files and do not expose Jest globals to the runtime bundle.
- Keep all nine existing route-screen suites running under Jest.
- Treat the `expo-notifications` Expo Go warnings as a separate development-client limitation.
- Use `apply_patch` for file edits and preserve unrelated worktree changes.

## File Structure

- Create `mobile/src/test/router-boundary.test.ts`: recursively verifies that `mobile/app` contains no test/spec modules.
- Move tab-route tests to `mobile/src/screens/__tests__/tabs/`:
  - `check-in.test.tsx`
  - `index.test.tsx`
  - `logs.test.tsx`
  - `more.test.tsx`
  - `plans.test.tsx`
- Move pushed-screen route tests to `mobile/src/screens/__tests__/`:
  - `measurements.test.tsx`
  - `media.test.tsx`
  - `profile.test.tsx`
  - `weekly-feedback.test.tsx`
- Modify only the moved suites' imports/requires of their production route modules.

---

### Task 1: Enforce a routes-only `app` directory and relocate route tests

**Files:**
- Create: `mobile/src/test/router-boundary.test.ts`
- Create: `mobile/src/screens/__tests__/tabs/check-in.test.tsx`
- Create: `mobile/src/screens/__tests__/tabs/index.test.tsx`
- Create: `mobile/src/screens/__tests__/tabs/logs.test.tsx`
- Create: `mobile/src/screens/__tests__/tabs/more.test.tsx`
- Create: `mobile/src/screens/__tests__/tabs/plans.test.tsx`
- Create: `mobile/src/screens/__tests__/measurements.test.tsx`
- Create: `mobile/src/screens/__tests__/media.test.tsx`
- Create: `mobile/src/screens/__tests__/profile.test.tsx`
- Create: `mobile/src/screens/__tests__/weekly-feedback.test.tsx`
- Delete: `mobile/app/(app)/(tabs)/check-in.test.tsx`
- Delete: `mobile/app/(app)/(tabs)/index.test.tsx`
- Delete: `mobile/app/(app)/(tabs)/logs.test.tsx`
- Delete: `mobile/app/(app)/(tabs)/more.test.tsx`
- Delete: `mobile/app/(app)/(tabs)/plans.test.tsx`
- Delete: `mobile/app/(app)/measurements.test.tsx`
- Delete: `mobile/app/(app)/media.test.tsx`
- Delete: `mobile/app/(app)/profile.test.tsx`
- Delete: `mobile/app/(app)/weekly-feedback.test.tsx`

**Interfaces:**
- Consumes: Node `fs`/`path`, Jest, and the existing production route default exports.
- Produces: a route tree containing only runtime modules and a regression test that returns the exact relative paths of any future offenders.

- [ ] **Step 1: Write the failing route-boundary test**

Create `mobile/src/test/router-boundary.test.ts` with a recursive scanner that does not require a new glob dependency:

```ts
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_ROOT = join(__dirname, '../../app');
const TEST_MODULE = /\.(?:test|spec)\.[jt]sx?$/;

function findTestModules(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return findTestModules(absolute);
    return TEST_MODULE.test(entry.name) ? [relative(APP_ROOT, absolute)] : [];
  });
}

describe('Expo Router route boundary', () => {
  it('keeps Jest test modules outside app', () => {
    expect(findTestModules(APP_ROOT).sort()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and verify the diagnosed failure**

Run from `mobile/`:

```bash
npx jest src/test/router-boundary.test.ts --runInBand
```

Expected: FAIL with the nine current test files listed below `(app)`; this is the automated reproduction of the Expo Router boundary defect.

- [ ] **Step 3: Relocate the five tab-route suites**

Move each file with `apply_patch`, preserving its contents and changing only its production route import:

```ts
// src/screens/__tests__/tabs/check-in.test.tsx
const CheckInScreen = require('../../../../app/(app)/(tabs)/check-in').default;

// src/screens/__tests__/tabs/index.test.tsx
import DashboardScreen from '../../../../app/(app)/(tabs)/index';

// src/screens/__tests__/tabs/logs.test.tsx
import LogsScreen, { LogCard } from '../../../../app/(app)/(tabs)/logs';

// src/screens/__tests__/tabs/more.test.tsx
import MoreScreen from '../../../../app/(app)/(tabs)/more';

// src/screens/__tests__/tabs/plans.test.tsx
import PlansScreen from '../../../../app/(app)/(tabs)/plans';
```

Keep the late `require` in the check-in suite after its React Native mocks. Do not convert it to a top-level import.

- [ ] **Step 4: Relocate the four pushed-screen suites**

Move each file with `apply_patch`, preserving its contents and changing only its route import:

```ts
// src/screens/__tests__/measurements.test.tsx
import MeasurementsScreen from '../../../app/(app)/measurements';

// src/screens/__tests__/media.test.tsx
import MediaScreen from '../../../app/(app)/media';

// src/screens/__tests__/profile.test.tsx
import ProfileScreen from '../../../app/(app)/profile';

// src/screens/__tests__/weekly-feedback.test.tsx
const WeeklyFeedbackScreen = require('../../../app/(app)/weekly-feedback').default;
```

Keep the late `require` in the weekly-feedback suite after its mocks. Do not convert it to a top-level import.

- [ ] **Step 5: Run the boundary and relocated suites**

Run from `mobile/`:

```bash
npx jest \
  src/test/router-boundary.test.ts \
  src/screens/__tests__/tabs/check-in.test.tsx \
  src/screens/__tests__/tabs/index.test.tsx \
  src/screens/__tests__/tabs/logs.test.tsx \
  src/screens/__tests__/tabs/more.test.tsx \
  src/screens/__tests__/tabs/plans.test.tsx \
  src/screens/__tests__/measurements.test.tsx \
  src/screens/__tests__/media.test.tsx \
  src/screens/__tests__/profile.test.tsx \
  src/screens/__tests__/weekly-feedback.test.tsx \
  --runInBand
```

Expected: 10 suites PASS; there are no module-resolution changes beyond the route import paths.

- [ ] **Step 6: Verify type safety and the Expo production bundle**

Run from `mobile/`:

```bash
npm run typecheck
ROUTE_EXPORT_DIR="$(mktemp -d /tmp/dawnage-route-export.XXXXXX)"
CI=1 npx expo export --platform ios --output-dir "$ROUTE_EXPORT_DIR"
```

Expected: typecheck passes; the iOS export completes without missing-default-export warnings for test files and without evaluating a Jest global. The separate Expo Go notification warning is not a failure of this task.

- [ ] **Step 7: Commit the route-boundary correction**

```bash
git add -A -- \
  mobile/src/test/router-boundary.test.ts \
  mobile/src/screens/__tests__/tabs/check-in.test.tsx \
  mobile/src/screens/__tests__/tabs/index.test.tsx \
  mobile/src/screens/__tests__/tabs/logs.test.tsx \
  mobile/src/screens/__tests__/tabs/more.test.tsx \
  mobile/src/screens/__tests__/tabs/plans.test.tsx \
  mobile/src/screens/__tests__/measurements.test.tsx \
  mobile/src/screens/__tests__/media.test.tsx \
  mobile/src/screens/__tests__/profile.test.tsx \
  mobile/src/screens/__tests__/weekly-feedback.test.tsx \
  'mobile/app/(app)/(tabs)/check-in.test.tsx' \
  'mobile/app/(app)/(tabs)/index.test.tsx' \
  'mobile/app/(app)/(tabs)/logs.test.tsx' \
  'mobile/app/(app)/(tabs)/more.test.tsx' \
  'mobile/app/(app)/(tabs)/plans.test.tsx' \
  'mobile/app/(app)/measurements.test.tsx' \
  'mobile/app/(app)/media.test.tsx' \
  'mobile/app/(app)/profile.test.tsx' \
  'mobile/app/(app)/weekly-feedback.test.tsx'
git commit -m "fix(mobile): keep tests outside expo routes"
```

Expected: the commit contains nine relocations, their route-import adjustments, and the new boundary regression test; it contains no production route edits.

# Dawnage UI/UX Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed Dawnage UI uplift into a reproducible, legally bounded, accessible, performant, and release-gated mobile experience.

**Architecture:** Keep verification close to the Expo app: Jest covers deterministic UI contracts, a small Node script enforces architectural UI constraints, Maestro exercises the primary user journeys, and a checked-in validation matrix records physical-device evidence. Treat privacy and source-license posture as release gates rather than runtime features. This phase may fix UI defects found by the gates, but it must not introduce a database migration, Expo SDK upgrade, styling-system rewrite, or Skia dependency.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.9, Jest with `jest-expo`, React Native Testing Library, ESLint flat config with `eslint-config-expo`, Maestro, Node.js validation scripts, Supabase dashboard/SQL inspection for the read-only photo-bucket audit.

**Spec:** `docs/superpowers/specs/2026-08-29-dawnage-fitness-ui-ux-design.md`

## Execution Split

- **Phase 0, before feature changes:** Task 5 Steps 1–2, the baseline half of Task 5 Step 4, then Task 1 and Task 2.
- **Phase 6, after Plans 1–4:** Task 3, Task 4, the remaining Task 5 steps, Task 6, and Task 7.

## Global Constraints

- Run only the Phase 6 subset after the four feature plans linked from the master plan pass their local test commands.
- Preserve all pre-existing working-tree changes. Stage only files named by the current task.
- Do not copy code or assets from GPL, AGPL, unlicensed, or restricted demo repositories.
- Do not add `@shopify/react-native-skia`, upgrade Expo, migrate the styling system, or replace Expo Router.
- Do not put test credentials, Supabase keys, screenshots containing real user data, or photo URLs in git.
- A privacy audit failure blocks progress-photo release. It does not authorize changing the bucket, RLS policies, URL model, or database schema in this UI plan.
- “Pass” means command output and physical-device evidence were observed, not assumed.
- Run `npm`/`npx`/`maestro` commands from `mobile/`; run `git` commands from the repository root unless a step says otherwise.

---

## Task 1: Make lint and aggregate verification deterministic

**Files:**

- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`
- Create: `mobile/eslint.config.js`
- Create: `mobile/jest.config.js`
- Create: `mobile/src/test/setup.ts`
- Create: `mobile/src/lib/dates.test.ts`
- Verify: `mobile/tsconfig.json`

- [ ] **Step 1: Record the current failing lint behavior**

Run:

```bash
cd mobile
npm run lint
```

Expected before this task: lint either prompts to install/configure ESLint or fails because no checked-in flat configuration exists. Save the exact output in the implementation-session notes; do not accept an interactive configuration mutation.

- [ ] **Step 2: Install the Expo-compatible lint dependencies**

Run:

```bash
cd mobile
npx expo install eslint eslint-config-expo -- --save-dev
npm install --save-dev @types/node
```

Expected: `package.json` and `package-lock.json` change; no Expo or React Native runtime dependency changes.

Also install the deterministic test harness dependencies:

```bash
cd mobile
npx expo install jest-expo -- --save-dev
npm install --save-dev jest@^29.7.0 @testing-library/react-native @types/jest
```

Expected: all four packages are direct `devDependencies`; no runtime dependency changes.

- [ ] **Step 3: Add the checked-in flat configuration**

Create `mobile/eslint.config.js`:

```js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', '.expo/**'],
  },
]);
```

- [ ] **Step 4: Add stable scripts without changing the scripts established by the foundations plan**

Ensure `mobile/package.json` contains these entries:

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "verify": "npm run typecheck && npm run lint && npm test && npm run verify:ui"
  }
}
```

Do not remove the existing `start`, `android`, `ios`, `web`, or `reset-project` scripts. `verify:ui` is added in Task 4; the aggregate command is expected to fail with “Missing script: verify:ui” until that task lands.

Create `mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
};
```

Create `mobile/src/test/setup.ts` with Reanimated's `setUpTests()` and stable mocks for Expo Haptics. Create `mobile/src/lib/dates.test.ts` to test real `localDateString` and `parseLocalDate` behavior, including `new Date(2026, 7, 29, 0, 30)` formatting as `2026-08-29`. Do not add a no-op smoke test.

- [ ] **Step 5: Run lint and type checking, fixing only diagnosed issues**

Run:

```bash
cd mobile
npm run lint
npm run typecheck
npm test -- src/lib/dates.test.ts
npm test
```

Expected: all four commands exit 0. If a lint finding is unrelated to the UI uplift, correct the smallest local issue and keep behavior unchanged; do not weaken or disable a rule globally to hide it.

- [ ] **Step 6: Commit the deterministic toolchain**

```bash
git add mobile/package.json mobile/package-lock.json mobile/eslint.config.js mobile/jest.config.js mobile/src/test/setup.ts mobile/src/lib/dates.test.ts
git commit -m "chore(mobile): make UI verification deterministic"
```

---

## Task 2: Check in the open-source pattern and license ledger

**Files:**

- Create: `mobile/docs/oss-ui-pattern-ledger.md`
- Test: `mobile/src/__tests__/oss-ledger.test.ts`

- [ ] **Step 1: Write the failing completeness test**

Create `mobile/src/__tests__/oss-ledger.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

const ledger = fs.readFileSync(
  path.resolve(__dirname, '../../docs/oss-ui-pattern-ledger.md'),
  'utf8',
);

const requiredReferences = [
  'FitnessApp',
  'Flexify',
  'Kenko',
  'LiftLog',
  'PerfectGymCoach',
  'SwiftLift',
  'demos / reactiive',
  'fitness_workout_app_flutter_3_ui',
  'liftosaur',
  'skulpt',
];

describe('open-source UI pattern ledger', () => {
  it.each(requiredReferences)('records %s', (name) => {
    expect(ledger).toContain(`| ${name} |`);
  });

  it('states the independent-implementation boundary', () => {
    expect(ledger).toContain('independent implementation');
    expect(ledger).toContain('No source or assets copied');
  });
});
```

- [ ] **Step 2: Run the test to prove the ledger is absent**

Run:

```bash
cd mobile
npm test -- --runInBand src/__tests__/oss-ledger.test.ts
```

Expected: FAIL with `ENOENT` for `docs/oss-ui-pattern-ledger.md`.

- [ ] **Step 3: Create the ledger with all ten audited repositories**

Create `mobile/docs/oss-ui-pattern-ledger.md` with this table and the explanatory paragraph below it:

```md
# Open-source UI pattern ledger

Dawnage uses an independent implementation of the concepts listed here. No source or assets copied from the reference repositories are shipped by this project. Before any future direct reuse, re-check the source file's current license and record the exact file, commit, license, and retained notice in this ledger.

| Reference | Observed posture | Concepts reviewed | Dawnage implementation boundary |
| --- | --- | --- | --- |
| FitnessApp | No clear root license found | Friendly onboarding rhythm, workout grouping, photo-progress framing, empty-state composition | Visual reference only; no source, assets, colors, or typography copied |
| Flexify | MIT | Offline-first logging, search/filter, exercise reorder, persistent timers | Concepts reimplemented against Dawnage data and components; preserve MIT notice if direct code is ever introduced |
| Kenko | GPLv3 | Editorial plan cards, large set ordinals, drag feedback, spatial transitions | Independently reimplemented concepts only; no source or assets copied |
| LiftLog | AGPLv3; Expo 57 / React Native 0.86 | Native controls, compact insights, safe-area behavior, test posture | Independently reimplemented information hierarchy only; no source copied and no stack upgrade |
| PerfectGymCoach | GPLv3; Kotlin Compose | Full-screen rest state, completion choreography, haptics, adaptive panes | Independently reimplemented state concepts only; no source or decorative morphing copied |
| SwiftLift | GPLv3; SwiftUI/iOS 17 | Restrained native rhythm, safe-area usage, concise numeric progress | Independently reimplemented concepts only; no source copied and no iOS-only architecture adopted |
| demos / reactiive | Restricted demo/source redistribution terms; app-use conditions require case-by-case review | Non-Skia counters, list motion, sheets, swipe actions, timers, selection indicators | Independently implemented with Reanimated; no demo source or assets copied; no Skia patterns adopted |
| fitness_workout_app_flutter_3_ui | No clear root license found | Meal, sleep, progress-photo, calendar, and workout screen grouping | Visual reference only; no source, assets, or visual system copied |
| liftosaur | AGPLv3 | Current-set hierarchy, previous results, adaptive inputs, warmups, persistent timers | Independently reimplemented interaction concepts only; no source or assets copied |
| skulpt | GPLv3; Expo 57 / React Native 0.86 | Centralized layout, sheets, local-first boundaries | Independently reimplemented concepts only; no source copied, no FlashList/Unistyles migration, and no stack upgrade |

## Maintainer rule

Design inspiration does not grant code reuse. Any row that changes from concept-only reference to direct reuse requires legal review and a new ledger entry identifying the exact imported material and its notice obligations.
```

If the repository names differ from the local folder names, keep the table identifiers above because the test and approved design specification use those canonical audit labels.

- [ ] **Step 4: Run the ledger test**

Run:

```bash
cd mobile
npm test -- --runInBand src/__tests__/oss-ledger.test.ts
```

Expected: PASS, 10 repository rows tested plus the reuse boundary assertion.

- [ ] **Step 5: Commit the ledger**

```bash
git add mobile/docs/oss-ui-pattern-ledger.md mobile/src/__tests__/oss-ledger.test.ts
git commit -m "docs(mobile): record UI reference license boundaries"
```

---

## Task 3: Add stable end-to-end selectors and Maestro smoke flows

**Files:**

- Modify: `mobile/app/(auth)/login.tsx`
- Modify: `mobile/app/(app)/(tabs)/index.tsx`
- Modify: `mobile/app/(app)/(tabs)/check-in.tsx`
- Modify: `mobile/app/(app)/(tabs)/plans.tsx`
- Modify: `mobile/app/(app)/logger.tsx`
- Modify: `mobile/app/(app)/measurements.tsx`
- Modify: `mobile/app/(app)/media.tsx`
- Create: `mobile/.maestro/config.yaml`
- Create: `mobile/.maestro/helpers/sign-in.yaml`
- Create: `mobile/.maestro/onboarding.yaml`
- Create: `mobile/.maestro/home-checkin.yaml`
- Create: `mobile/.maestro/workout-interruption.yaml`
- Create: `mobile/.maestro/progress.yaml`

- [ ] **Step 1: Add test IDs only where visible labels are not unique**

Use visible text and accessibility labels as the primary Maestro selectors. Add these stable `testID` values to the outer interactive element only when duplicate labels or generated copy would make selection ambiguous:

```text
login-email
login-password
home-today-action
checkin-next
checkin-save
plan-current-day
logger-finish
measurement-add
photo-add-current-week
```

The same element must retain a human-readable `accessibilityLabel`; a test ID must never replace accessibility semantics.

- [ ] **Step 2: Configure Maestro**

Create `mobile/.maestro/config.yaml`:

```yaml
flows:
  - "*.yaml"
```

Create `mobile/.maestro/helpers/sign-in.yaml`:

```yaml
appId: com.dawnage.app
---
- launchApp:
    clearState: true
- assertVisible: "Welcome back"
- tapOn:
    id: "login-email"
- inputText: ${DAWNAGE_E2E_EMAIL}
- tapOn:
    id: "login-password"
- inputText: ${DAWNAGE_E2E_PASSWORD}
- tapOn: "Sign in"
- extendedWaitUntil:
    visible: "Home"
    timeout: 20000
```

Do not put default credential values in YAML. The implementation-session README or CI secret store supplies `DAWNAGE_E2E_EMAIL` and `DAWNAGE_E2E_PASSWORD`.

- [ ] **Step 3: Create the onboarding smoke flow**

Create `mobile/.maestro/onboarding.yaml` for a dedicated account whose `onboarding_step` is zero:

```yaml
appId: com.dawnage.app
name: Onboarding completes with a goal and timezone
---
- launchApp:
    clearState: true
- tapOn:
    id: "login-email"
- inputText: ${DAWNAGE_E2E_ONBOARD_EMAIL}
- tapOn:
    id: "login-password"
- inputText: ${DAWNAGE_E2E_ONBOARD_PASSWORD}
- tapOn: "Sign in"
- extendedWaitUntil:
    visible: "What are you working toward?"
    timeout: 20000
- tapOn: "Build strength"
- tapOn: "Continue"
- assertVisible: "Your weekly rhythm"
- tapOn: "Continue"
- assertVisible: "Your timezone"
- tapOn: "Finish setup"
- extendedWaitUntil:
    visible: "Home"
    timeout: 20000
```

Seed/reset this account before the run; do not mutate a real user's onboarding state. If the final goal label differs, select one visible option from `GOALS` and keep the three-step assertions.

- [ ] **Step 4: Create the Home/check-in smoke flow**

Create `mobile/.maestro/home-checkin.yaml`:

```yaml
appId: com.dawnage.app
name: Home and check-in preserve progress
---
- runFlow: helpers/sign-in.yaml
- assertVisible: "Home"
- tapOn:
    id: "home-today-action"
- assertVisible: "Recovery"
- tapOn:
    id: "checkin-next"
- assertVisible: "Training"
- stopApp
- launchApp
- assertVisible: "Training"
- tapOn: "Home"
- assertVisible: "Home"
```

This test intentionally stops before saving so it can run repeatedly without fabricating daily production data. The Jest integration test from the Home/check-in plan remains the save/retry authority.

- [ ] **Step 5: Create the interrupted-workout flow**

Create `mobile/.maestro/workout-interruption.yaml`:

```yaml
appId: com.dawnage.app
name: Workout draft and timer survive interruption
---
- runFlow: helpers/sign-in.yaml
- tapOn: "Plans"
- tapOn:
    id: "plan-current-day"
- assertVisible: "Start workout"
- tapOn: "Start workout"
- assertVisible: "Set 1"
- tapOn: "Start rest timer"
- stopApp
- launchApp
- assertVisible: "Resume workout"
- tapOn: "Resume workout"
- assertVisible: "Rest"
```

Seed the E2E account with an assigned current plan and no active workout before running this flow. If the UI copy differs after the feature plan, update selectors to the final visible copy and keep the behavioral assertions unchanged.

- [ ] **Step 6: Create the progress and permission flow**

Create `mobile/.maestro/progress.yaml`:

```yaml
appId: com.dawnage.app
name: Measurements and photo permission entry points
---
- runFlow: helpers/sign-in.yaml
- tapOn: "More"
- tapOn: "Measurements"
- assertVisible: "Measurements"
- tapOn:
    id: "measurement-add"
- assertVisible: "Add measurements"
- tapOn: "Cancel"
- tapOn: "Back"
- tapOn: "Progress photos"
- assertVisible: "Progress photos"
- tapOn:
    id: "photo-add-current-week"
- assertVisible: "Save photos"
- assertVisible: "Photos upload only when you tap Save photos."
```

The flow validates permission-entry UI and disclosure without uploading media. Camera/library system-dialog handling remains part of the physical-device matrix because simulator permission UI varies by platform.

- [ ] **Step 7: Run the flows locally**

With a development build installed and the E2E environment variables exported in the shell, run:

```bash
cd mobile
maestro test .maestro/home-checkin.yaml
maestro test .maestro/onboarding.yaml
maestro test .maestro/workout-interruption.yaml
maestro test .maestro/progress.yaml
```

Expected: all three flows exit 0. If `maestro` is unavailable, install it using the official Maestro installation instructions outside this repository; do not add an unrelated npm package named `maestro`.

- [ ] **Step 8: Commit selectors and smoke flows**

```bash
git add mobile/app/'(auth)'/login.tsx mobile/app/'(app)'/'(tabs)'/index.tsx mobile/app/'(app)'/'(tabs)'/check-in.tsx mobile/app/'(app)'/'(tabs)'/plans.tsx mobile/app/'(app)'/logger.tsx mobile/app/'(app)'/measurements.tsx mobile/app/'(app)'/media.tsx mobile/.maestro
git commit -m "test(mobile): cover primary UI journeys with Maestro"
```

---

## Task 4: Enforce architectural UI contracts in source

**Files:**

- Modify: `mobile/package.json`
- Create: `mobile/scripts/verify-ui-contracts.mjs`
- Create: `mobile/src/__tests__/ui-contract-script.test.ts`

- [ ] **Step 1: Write the failing script-level test**

Create `mobile/src/__tests__/ui-contract-script.test.ts`:

```ts
import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('UI contract verifier', () => {
  it('accepts the checked-in app source', () => {
    const mobileRoot = path.resolve(__dirname, '../..');
    expect(() =>
      execFileSync(process.execPath, ['scripts/verify-ui-contracts.mjs'], {
        cwd: mobileRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to prove the verifier is missing**

Run:

```bash
cd mobile
npm test -- --runInBand src/__tests__/ui-contract-script.test.ts
```

Expected: FAIL because `scripts/verify-ui-contracts.mjs` does not exist.

- [ ] **Step 3: Add the verifier**

Create `mobile/scripts/verify-ui-contracts.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['app', 'src'];
const allowedColorFiles = new Set([
  path.join(root, 'src/theme/colors.ts'),
  path.join(root, 'src/theme/tokens.ts'),
]);

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

const files = sourceRoots.flatMap((directory) => collect(path.join(root, directory)));
const failures = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file);

  if (/from\s+['\"]@shopify\/react-native-skia['\"]/.test(source)) {
    failures.push(`${relative}: Skia is outside the approved architecture`);
  }

  if (!allowedColorFiles.has(file) && /#[0-9a-fA-F]{3,8}\b/.test(source)) {
    failures.push(`${relative}: move hard-coded colors into semantic theme tokens`);
  }

  for (const match of source.matchAll(/<BlurView[\s\S]{0,600}?intensity=\{(\d+)\}/g)) {
    if (Number(match[1]) > 20) {
      failures.push(`${relative}: BlurView intensity ${match[1]} exceeds the cap of 20`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`UI contracts passed for ${files.length} source files.`);
```

This script enforces only mechanically reliable constraints. Accessibility, touch targets, safe-area behavior, and motion intent remain covered by component tests and the physical matrix.

- [ ] **Step 4: Add the package script**

Add to `mobile/package.json`:

```json
{
  "scripts": {
    "verify:ui": "node scripts/verify-ui-contracts.mjs"
  }
}
```

- [ ] **Step 5: Run the verifier and correct violations at their source**

Run:

```bash
cd mobile
npm run verify:ui
npm test -- --runInBand src/__tests__/ui-contract-script.test.ts
```

Expected: both commands exit 0. A hard-coded source color should be replaced with an existing semantic token or a clearly named token in `src/theme/colors.ts`; do not add file-path exceptions for ordinary UI code.

- [ ] **Step 6: Commit the source contracts**

```bash
git add mobile/package.json mobile/scripts/verify-ui-contracts.mjs mobile/src/__tests__/ui-contract-script.test.ts mobile/src/theme/colors.ts mobile/src/theme/tokens.ts
git commit -m "test(mobile): enforce UI architecture contracts"
```

Only stage the two theme files if the verifier required a token addition.

---

## Task 5: Create the reproducible device, state, accessibility, and performance matrix

**Files:**

- Create: `mobile/docs/ui-validation-matrix.md`
- Create: `mobile/docs/ui-release-evidence/.gitkeep`
- Modify: `mobile/.gitignore`

- [ ] **Step 1: Create a private-by-default evidence directory**

Add to `mobile/.gitignore`:

```gitignore
# Local UI validation evidence may contain account data or device metadata.
docs/ui-release-evidence/*
!docs/ui-release-evidence/.gitkeep
```

Create the empty tracked file `mobile/docs/ui-release-evidence/.gitkeep`. Screenshots, videos, ETTrace files, and screen-reader recordings stay local unless they are separately reviewed and sanitized.

- [ ] **Step 2: Create the validation matrix**

Create `mobile/docs/ui-validation-matrix.md` with these sections and rows:

```md
# Dawnage mobile UI release validation matrix

## Build under review

| Field | Recorded value |
| --- | --- |
| Git commit | Record the full commit SHA used for the build |
| Expo build | Record development/preview build identifier |
| Supabase environment | Record non-production or production without credentials |
| Reviewer/date | Record name and ISO date |

## Device and text matrix

| ID | Device | OS | Width class | Font scale | Required routes | Result | Evidence note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IOS-COMPACT | iPhone SE (3rd generation) or equivalent | Supported iOS | Compact, 320–375pt | 1.30 | Login, Home, Check-in, Plans, Logger, Measurements, Photos, More | Not run | Record clipping, scroll, keyboard, and target findings |
| IOS-NOTCH | Current notched/Dynamic-Island iPhone | Supported iOS | Regular phone | Default | All primary routes | Not run | Confirm top content clears system geometry |
| IOS-LARGE-TEXT | Current notched/Dynamic-Island iPhone | Supported iOS | Regular phone | Largest practical accessibility size | Check-in, Plans, Logger, sheets, errors | Not run | Confirm wrap/scroll without hidden actions |
| ANDROID-COMPACT | Compact Android phone or emulator | Supported Android | 320–359dp | 1.30 | Login, Home, Check-in, Plans, Logger, Measurements, Photos, More | Not run | Confirm status/navigation insets and keyboard |
| ANDROID-MID | Mid-range physical Android device | Supported Android | Regular phone | Default | Full workout plus dashboard scroll | Not run | Record gesture and frame-delivery findings |
| ANDROID-LARGE | Large Android phone | Supported Android | Regular phone | Default and 1.30 | Home, Plans, Logger, Photos | Not run | Confirm readable max width and no stretched controls |
| WIDE | Supported tablet/emulator or 768dp-wide web viewport | Supported target | Wide, at least 768dp | Default and 1.30 | Home, Plans, Logs, Measurements | Not run | Confirm centered readable content and valid list/detail composition |

## State matrix

| State | Setup | Required assertions | Result | Evidence note |
| --- | --- | --- | --- | --- |
| Loading | Throttle first API response | Stable skeleton footprint; no layout jump into unsafe area | Not run | Record route and duration |
| Empty | E2E account with no check-ins or plan | One clear next action; no misleading chart or coach identity | Not run | Record fixture identity without credentials |
| Partial | Plan present, incomplete metadata and sparse history | Fallback labels, no crashes, truthful status | Not run | Record omitted fields |
| Slow | Network conditioner at high latency | Buttons expose pending state and remain non-duplicating | Not run | Record network profile |
| Offline | Disable connectivity after loaded state | Draft remains available; retry/status is visible | Not run | Record reconnection result |
| Failed save | Force request failure | Error is announced; input remains intact; retry works | Not run | Record operation |
| Interrupted check-in | Stop app on step 2 | Reopen to the same step with draft content | Not run | Record elapsed time |
| Interrupted workout | Stop app during rest timer | Reopen with workout draft and timestamp-correct timer | Not run | Record remaining time |

## Accessibility review

| Check | Pass condition | Result | Evidence note |
| --- | --- | --- | --- |
| Screen reader | VoiceOver and TalkBack reach controls in visual order with useful names, values, states, and hints | Not run | Record route and issue IDs |
| Touch targets | Every interactive target is at least 44×44pt/dp, including chart/series controls and photo actions | Not run | Record measured exceptions |
| Focus after validation | First invalid field receives focus and its error is announced | Not run | Check every check-in step and measurement form |
| Reduced Motion | State changes remain understandable with restrained opacity or immediate updates | Not run | Confirm no required information depends on motion |
| Reduced Transparency | Tabs and sheets use solid semantic surfaces with no readability loss | Not run | Record iOS setting and screenshots locally |
| Contrast | Body text, controls, selected states, and focus indicators meet approved semantic-token targets | Not run | Record token pair and measurement |

## Motion and performance review

| Scenario | Pass condition | Result | Evidence note |
| --- | --- | --- | --- |
| Home cold render | No decorative continuous animation; content settles without a visible top jump | Not run | Record device/build |
| Dashboard scroll | No animated chart values during scroll; no repeated list entrance animation | Not run | Record dropped-frame observation/profile |
| Long histories | Only visible rows render; ordinary refresh does not replay entrance animation | Not run | Exercise Logs, measurement history, photo history, and feedback history |
| Chart visibility | Expensive chart content is deferred until its section is expanded or visible where practical | Not run | Record first-render and scroll behavior |
| Photo memory | Grid/list thumbnails render at slot size; full display images mount only in the viewer/comparison state | Not run | Record memory warning or decode findings |
| Logger swipe | Swipe follows the finger, decides with distance/velocity, and cannot trigger twice | Not run | Record slow and fast swipe cases |
| Rest timer | Progress is monotonic, survives backgrounding, and completion feedback fires once | Not run | Record foreground/background timestamps |
| Sheets | Open/close can be interrupted without visual corruption; content clears bottom inset | Not run | Record sheet names |
| Android mid-range workout | Primary logging gestures remain responsive with no sustained visible jank | Not run | Attach local profile filename only |

## Privacy release gate

| Check | Pass condition | Result | Evidence note |
| --- | --- | --- | --- |
| `progress_photos` bucket | Supabase storage bucket reports `public = false` | Not run | Record query time and reviewer; never paste a key or photo URL |
| Read authorization | User A cannot read User B's photo object or metadata | Not run | Record sanitized account IDs and HTTP outcome |
| UI disclosure | Before first capture, copy states who can access the photo and when upload occurs | Not run | Record exact final copy |
| URL lifetime | The app does not persist or display a permanently public object URL | Not run | Record implementation path |

## Release sign-off

Release is blocked while any required row is `Not run` or `Fail`, or while an unresolved P0/P1 defect exists. Record every defect with route, device, font scale, state, reproduction steps, expected result, actual result, and owning implementation plan.
```

- [ ] **Step 3: Execute the matrix against one immutable build**

Use the same commit and build identifier for all rows. For each row:

1. Change `Not run` to `Pass`, `Fail`, or `Blocked`.
2. Put concise reproduction/evidence notes in the table.
3. Create a defect before proceeding when the result is `Fail`.
4. Fix P0/P1 defects under the owning feature plan, rebuild, and re-run every affected row.

Do not claim WCAG or complete screen-reader compliance from simulator inspection alone.

- [ ] **Step 4: Capture the untouched baseline, then the approved comparison evidence**

Before Plan 1 modifies UI, capture the untouched baseline for Home, Check-in step 1, Plans, Logger, Measurements, Photos, and More on one iOS and one Android target. After Plans 1–4, capture the implemented result at the same data state and dimensions, plus the remaining matrix variants:

- compact phone/default font;
- compact phone/font scale 1.30;
- notched iPhone/default font;
- compact Android/font scale 1.30;
- light and dark theme where both are supported.

Name local files using `<commit>-<platform>-<device>-<font-scale>-<route>-<theme>.png`. Keep them in `mobile/docs/ui-release-evidence/`, which is ignored by git. The checked-in table records only sanitized findings.

- [ ] **Step 5: Commit the matrix structure**

```bash
git add mobile/.gitignore mobile/docs/ui-validation-matrix.md mobile/docs/ui-release-evidence/.gitkeep
git commit -m "docs(mobile): define UI release validation matrix"
```

Do not commit a result marked `Pass` until the named reviewer actually ran it on the stated build.

---

## Task 6: Audit progress-photo privacy without expanding the UI scope

**Files:**

- Verify: `mobile/src/lib/photos.ts`
- Verify: `mobile/src/hooks/useProgressPhotos.ts`
- Verify: `mobile/app/(app)/media.tsx`
- Modify: `mobile/docs/ui-validation-matrix.md`

- [ ] **Step 1: Confirm the client-side storage behavior**

Run:

```bash
cd mobile
rg -n "progress_photos|getPublicUrl|createSignedUrl|storage\.from" src/lib/photos.ts src/hooks/useProgressPhotos.ts app/'(app)'/media.tsx
```

Expected before remediation: the implementation identifies the `progress_photos` bucket and the exact URL method in use. Record whether it uses `getPublicUrl` or `createSignedUrl` in the privacy evidence note.

- [ ] **Step 2: Inspect the bucket and policies read-only**

In the Supabase SQL editor for the environment tied to the immutable test build, run:

```sql
select id, name, public
from storage.buckets
where id = 'progress_photos';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;
```

Expected pass condition: the bucket exists with `public = false`, and policies restrict photo paths to the owning user plus the explicitly authorized coach relationship. Do not copy secrets, signed URLs, object names, or unsanitized policy data into the repository.

- [ ] **Step 3: Test cross-account denial**

Using two dedicated non-production accounts, upload one synthetic image as User A and attempt to read its object and metadata as User B.

Expected: User B receives a denied/not-found result and cannot enumerate User A's objects. Then confirm the authorized User A flow and the explicitly authorized coach flow still work.

- [ ] **Step 4: Apply the release decision**

Update the four privacy rows in `mobile/docs/ui-validation-matrix.md` with `Pass`, `Fail`, or `Blocked` and sanitized evidence.

If the bucket is public, the app uses permanent public URLs, or cross-account access succeeds:

- mark the progress-photo feature `Blocked`;
- disable its production entry point through the existing deployment feature-control mechanism if one exists;
- open a separate security remediation plan covering private storage, signed URLs, RLS, migration/backfill, cache invalidation, and rollout;
- do not perform that migration under this UI implementation plan.

If no feature-control mechanism exists, block the entire mobile release until the security remediation is approved and completed.

- [ ] **Step 5: Commit only sanitized audit results**

```bash
git add mobile/docs/ui-validation-matrix.md
git commit -m "docs(mobile): record progress photo privacy gate"
```

Expected: the commit contains no credential, object URL, object path, or real user data.

---

## Task 7: Run the integrated release gate

**Files:**

- Verify: `mobile/package.json`
- Verify: `mobile/docs/ui-validation-matrix.md`
- Verify: all files changed by the master implementation plan

- [ ] **Step 1: Verify repository hygiene**

Run from the repository root:

```bash
git status --short
git diff --check
git log --oneline -12
```

Expected: no whitespace errors, no generated `dist`/coverage/evidence files staged, and commits correspond to the focused plan tasks. Pre-existing user changes must still be identifiable and must not be silently included in implementation commits.

- [ ] **Step 2: Run the complete automated suite**

Run:

```bash
cd mobile
npm ci
npm run verify
npx expo export --platform web --output-dir dist-ui-check
```

Expected:

- dependency installation succeeds from the lockfile;
- TypeScript exits 0;
- ESLint exits 0 without creating configuration;
- every Jest suite exits 0;
- UI contract verification exits 0;
- Expo export exits 0 with no missing module, route, or serialization error.

Remove the generated `dist-ui-check/` directory after inspection using a safe, explicit path. It is build output and must not be committed.

- [ ] **Step 3: Run the Maestro smoke suite on iOS and Android**

Run once against the approved iOS build and once against the approved Android build:

```bash
cd mobile
maestro test .maestro
```

Expected: sign-in helper and all four top-level flows complete without selector ambiguity or unhandled native dialogs.

- [ ] **Step 4: Review the manual gate for completeness**

Run:

```bash
cd mobile
rg -n "\| (Not run|Fail|Blocked) \|" docs/ui-validation-matrix.md
```

Expected for a releasable build: no output. If any row is unresolved, report the exact rows and do not claim release readiness.

- [ ] **Step 5: Perform final design and motion review**

Confirm against the approved specification:

- top content clears the status bar, notch, and Dynamic Island without double insets;
- compact-width and font-scale 1.30 layouts do not clip primary actions;
- blur is capped and has a reduced-transparency fallback;
- reduced motion removes stagger and nonessential travel;
- only the approved functional animations remain;
- the Home hierarchy prioritizes the next action, streak/week context, coach update, then metrics;
- check-in and workout interruptions restore without data loss;
- photo privacy disclosure matches the verified storage behavior;
- no GPL, AGPL, unlicensed, or restricted demo code/assets entered the app.

- [ ] **Step 6: Record the final release verdict**

Append one line beneath `## Release sign-off` in `mobile/docs/ui-validation-matrix.md` using one of these exact formats:

```text
Verdict: PASS — <full commit SHA> — <reviewer> — <YYYY-MM-DD>
Verdict: BLOCKED — <full commit SHA> — <reviewer> — <YYYY-MM-DD> — <defect IDs>
```

Replace the bracketed fields with observed values. `PASS` is allowed only when automated checks, Maestro on both platforms, every required matrix row, and the privacy gate pass.

- [ ] **Step 7: Commit the verified matrix if it changed**

```bash
git add mobile/docs/ui-validation-matrix.md
git commit -m "docs(mobile): record UI release verdict"
```

Do not create this commit when the matrix still contains guessed or unexecuted results.

---

## Completion Criteria

- Deterministic typecheck, lint, Jest, and UI-contract commands all pass.
- The open-source ledger covers all ten audited repositories and states the independent-implementation boundary.
- Maestro covers sign-in, check-in persistence, interrupted workout/timer recovery, measurements, and progress-photo permission entry.
- Compact iOS, notched iOS, compact Android, font scale 1.30, largest practical accessibility text, Reduced Motion, and Reduced Transparency have observed results.
- Loading, empty, partial, slow, offline, failed-save, and interrupted states have observed results.
- The progress-photo privacy gate passes or the release is explicitly blocked.
- No critical clipping, accessibility, data-loss, gesture, licensing, privacy, or sustained-jank defect remains.
- Final verification is tied to an immutable commit/build and records an honest PASS or BLOCKED verdict.

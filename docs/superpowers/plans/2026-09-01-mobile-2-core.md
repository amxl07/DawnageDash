# Mobile 2 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished `mobile-2` Expo development-build app with demo and Sparky-compatible connected modes across Today, Diary, Add, Insights, and You.

**Architecture:** Expo Router owns navigation while a session provider selects a demo or connected `FitnessRepository`. TanStack Query consumes the repository, Zod validates connected responses, and semantic tokens power an original adaptive design system.

**Tech Stack:** Expo SDK 56, React Native 0.85, TypeScript, Expo Router, TanStack Query, SecureStore, NetInfo, Zod, React Native SVG, Jest, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-01-mobile-2-core-design.md`

## Global Constraints

- Create all application code under `mobile-2/`; preserve `mobile/` and `SparkyFitness/` unchanged.
- Do not import from or copy source/assets out of `SparkyFitness/`.
- Use an Expo development build with `expo-dev-client`; Expo Go is not the supported runtime.
- Keep credentials in SecureStore and require HTTPS outside development.
- Use kebab-case source filenames, strict TypeScript, semantic theme colors, and accessible touch targets.
- Implement every behavioral unit test-first and verify the expected red failure before production code.

---

### Task 1: Scaffold and verification harness

**Files:**
- Create: `mobile-2/package.json`
- Create: `mobile-2/app.config.ts`
- Create: `mobile-2/eas.json`
- Create: `mobile-2/tsconfig.json`
- Create: `mobile-2/eslint.config.js`
- Create: `mobile-2/jest.config.js`
- Create: `mobile-2/jest.setup.ts`
- Create: `mobile-2/.env.example`

**Interfaces:**
- Produces: scripts `start`, `android`, `ios`, `test`, `typecheck`, `lint`, `check`, and `export`.

- [ ] Generate the Expo SDK 56 Router scaffold and remove its sample routes and assets.
- [ ] Install development-client, query, storage, networking, schema, SVG, haptics, and testing dependencies with Expo-compatible versions.
- [ ] Configure strict aliases so `@/*` resolves to `mobile-2/src/*`.
- [ ] Configure Jest with Expo preset and deterministic SecureStore/NetInfo mocks.
- [ ] Run `npm test -- --runInBand` and confirm the empty harness exits successfully.

### Task 2: Domain contracts and repositories

**Files:**
- Create: `mobile-2/src/domain/models.ts`
- Create: `mobile-2/src/domain/schemas.ts`
- Create: `mobile-2/src/domain/date.ts`
- Create: `mobile-2/src/data/api-error.ts`
- Create: `mobile-2/src/data/server-url.ts`
- Create: `mobile-2/src/data/fitness-repository.ts`
- Create: `mobile-2/src/data/connected-fitness-repository.ts`
- Create: `mobile-2/src/data/demo-fitness-repository.ts`
- Test: `mobile-2/src/data/__tests__/server-url.test.ts`
- Test: `mobile-2/src/data/__tests__/connected-fitness-repository.test.ts`
- Test: `mobile-2/src/data/__tests__/demo-fitness-repository.test.ts`

**Interfaces:**
- Produces: `normalizeServerUrl(input: string): string`, `validateServerUrl(input: string, isDevelopment: boolean): string`, `FitnessRepository`, `createConnectedFitnessRepository(session, fetchImpl)`, and `createDemoFitnessRepository()`.

- [ ] Write URL-policy tests that reject malformed/public HTTP URLs and accept HTTPS plus development LAN URLs; run them and confirm missing-module failure.
- [ ] Implement URL normalization and validation; run URL tests until green.
- [ ] Write connected repository tests asserting Bearer authorization, `X-Meal-Model-Version: 2`, response validation, and correct summary/search/add endpoints; verify red.
- [ ] Implement `ApiError`, Zod schemas, and connected repository; run focused tests until green.
- [ ] Write a demo repository test proving that an added entry increases daily calories and appears in the matching meal; verify red.
- [ ] Implement deterministic mutable demo data; run focused tests until green.

### Task 3: Session, repository, and network providers

**Files:**
- Create: `mobile-2/src/session/session-types.ts`
- Create: `mobile-2/src/session/session-storage.ts`
- Create: `mobile-2/src/session/session-context.tsx`
- Create: `mobile-2/src/data/repository-context.tsx`
- Create: `mobile-2/src/query/query-client.ts`
- Create: `mobile-2/src/query/query-provider.tsx`
- Test: `mobile-2/src/session/__tests__/session-storage.test.ts`
- Test: `mobile-2/src/session/__tests__/session-reducer.test.ts`

**Interfaces:**
- Produces: `useSession()`, `useFitnessRepository()`, `AppProviders`, and session actions `enterDemo`, `saveServer`, `signIn`, `signOut`.

- [ ] Write storage tests proving that sessions round-trip and sign-out deletes the SecureStore item; verify red.
- [ ] Implement session serialization/storage and run tests until green.
- [ ] Write reducer tests for restore, demo, connected, and sign-out transitions; verify red.
- [ ] Implement the provider and reducer, including server validation and sign-in requests; run focused tests until green.
- [ ] Wire NetInfo to TanStack Query's online manager and expose a compact connection state hook.

### Task 4: Original design system and navigation shell

**Files:**
- Create: `mobile-2/src/theme/colors.ts`
- Create: `mobile-2/src/theme/theme.tsx`
- Create: `mobile-2/src/components/ui/app-text.tsx`
- Create: `mobile-2/src/components/ui/app-button.tsx`
- Create: `mobile-2/src/components/ui/surface.tsx`
- Create: `mobile-2/src/components/ui/status-banner.tsx`
- Create: `mobile-2/src/components/ui/progress-ring.tsx`
- Create: `mobile-2/src/components/ui/nutrient-bar.tsx`
- Create: `mobile-2/src/components/ui/screen-state.tsx`
- Create: `mobile-2/app/_layout.tsx`
- Create: `mobile-2/app/index.tsx`
- Create: `mobile-2/app/welcome.tsx`
- Create: `mobile-2/app/connect.tsx`
- Create: `mobile-2/app/sign-in.tsx`
- Create: `mobile-2/app/(tabs)/_layout.tsx`
- Test: `mobile-2/src/components/ui/__tests__/nutrient-bar.test.tsx`

**Interfaces:**
- Consumes: `AppProviders`, `useSession()`.
- Produces: themed primitives and authenticated/demo tab navigation.

- [ ] Write a component test proving nutrient progress clamps visually to 100 percent while preserving the real textual value; verify red.
- [ ] Implement adaptive tokens and UI primitives; run the component test until green.
- [ ] Build root routing, welcome, connection, and sign-in screens with native stack titles, keyboard-safe forms, and explicit errors.
- [ ] Build five-tab navigation with platform-aware icons and accessible labels.

### Task 5: Today, Diary, Add, Insights, and You

**Files:**
- Create: `mobile-2/src/features/summary/summary-hooks.ts`
- Create: `mobile-2/src/features/summary/hero-summary.tsx`
- Create: `mobile-2/src/features/summary/metric-strip.tsx`
- Create: `mobile-2/src/features/diary/meal-section.tsx`
- Create: `mobile-2/src/features/diary/diary-entry-row.tsx`
- Create: `mobile-2/src/features/food/food-search-row.tsx`
- Create: `mobile-2/src/features/food/use-food-search.ts`
- Create: `mobile-2/app/(tabs)/index.tsx`
- Create: `mobile-2/app/(tabs)/diary.tsx`
- Create: `mobile-2/app/(tabs)/add.tsx`
- Create: `mobile-2/app/(tabs)/insights.tsx`
- Create: `mobile-2/app/(tabs)/settings.tsx`
- Test: `mobile-2/src/features/summary/__tests__/summary-hooks.test.ts`
- Test: `mobile-2/src/features/diary/__tests__/meal-section.test.tsx`

**Interfaces:**
- Consumes: `FitnessRepository`, theme primitives, and session state.
- Produces: query keys, `useDailySummary(date)`, `useMealTypes()`, `useFoodSearch(term)`, and `useAddFoodEntry()`.

- [ ] Write calculation/query-key tests for empty data, over-goal data, and date-specific cache isolation; verify red.
- [ ] Implement summary hooks and helpers; run focused tests until green.
- [ ] Write a meal-section component test for populated and empty meals; verify red.
- [ ] Implement Today and Diary with loading, error, empty, refresh, and offline states; run tests until green.
- [ ] Implement debounced food search, meal selection, quantity input, add mutation, success haptics, and query invalidation.
- [ ] Implement Insights from the current seven-day demo/summary model and You with connection details and sign-out.

### Task 6: Documentation and completion gate

**Files:**
- Create: `mobile-2/README.md`
- Create: `mobile-2/docs/native-roadmap.md`
- Modify: `mobile-2/package.json`

**Interfaces:**
- Produces: reproducible EAS/local run instructions and separated native follow-on scope.

- [ ] Document EAS development builds for the current macOS 12 machine, local Android prerequisites, environment variables, demo mode, server expectations, and licensing boundary.
- [ ] Run `npm test -- --runInBand` and require zero failures.
- [ ] Run `npm run typecheck` and require exit code 0.
- [ ] Run `npm run lint` and require exit code 0.
- [ ] Run `npx expo install --check` and require no dependency mismatch.
- [ ] Run `npm run export` and require a successful Android/iOS bundle export.
- [ ] Review `git diff -- mobile-2 docs/superpowers/specs/2026-09-01-mobile-2-core-design.md docs/superpowers/plans/2026-09-01-mobile-2-core.md` against every spec requirement.

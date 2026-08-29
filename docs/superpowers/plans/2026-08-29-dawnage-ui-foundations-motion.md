# Dawnage UI Foundations and Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish deterministic mobile tests, correct safe-area and responsive-layout behavior, accessible material fallbacks, and GPU-friendly motion primitives used by every feature screen.

**Architecture:** Keep layout arithmetic as pure functions in the theme layer, expose device-dependent values through one hook, and keep `Screen` as the only normal full-screen inset owner. Accessibility preferences are read once through a small hook; shared UI primitives consume semantic tokens and the normalized motion contract.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, Reanimated 4.1, React Native Safe Area Context 5.6, Expo Blur 15, Jest Expo, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-dawnage-fitness-ui-ux-design.md`

## Global Constraints

- Keep Expo SDK 54, React Native 0.81, React 19, and Expo Router 6.
- Remain compatible with Expo Go and iOS 15.1.
- Do not add Skia or migrate the styling/navigation systems.
- Use semantic theme colors; no new hex literals outside `mobile/src/theme/`.
- `root`, `child`, and `editor` screens receive safe-area top plus base spacing; `sheet` receives local spacing only.
- Compact means width below 360dp or font scale at/above 1.30; wide means width at/above 768dp.
- Interactive targets remain at least 44x44pt.
- Reduced Motion and Reduced Transparency are first-class paths.
- Preserve the current dirty working tree; stage only task-owned paths.
- Run `npm`/`npx` commands from `mobile/`; run `git` commands from the repository root.

---

### Task 1: Deterministic mobile test harness (satisfied by Release Hardening Task 1)

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`
- Create: `mobile/jest.config.js`
- Create: `mobile/src/test/setup.ts`
- Create: `mobile/src/lib/dates.test.ts`

**Interfaces:**
- Consumes: Expo SDK 54 and the existing `@/*` TypeScript alias.
- Produces: `npm test`, `npm run test:watch`, and `npm run typecheck` commands used by every later task.

- [x] **Step 1: Install Expo-compatible test dependencies**

This task is satisfied by Release Hardening Task 1 so lint, Jest, and aggregate verification land atomically. Do not repeat the installation in a later foundations task.

Run from `mobile/`:

```bash
npx expo install jest-expo -- --save-dev
npm install --save-dev jest@^29.7.0 @testing-library/react-native @types/jest
```

Expected: `package.json` and `package-lock.json` change; `npx expo install --check` reports no invalid Expo package versions.

- [x] **Step 2: Add scripts and Jest configuration**

Add these scripts to `mobile/package.json`:

```json
{
  "test": "jest --runInBand",
  "test:watch": "jest --watch",
  "typecheck": "tsc --noEmit"
}
```

Create `mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/.maestro/'],
};
```

- [x] **Step 3: Configure stable native mocks**

Create `mobile/src/test/setup.ts`:

```ts
import { setUpTests } from 'react-native-reanimated';

setUpTests();

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
```


Do not create the no-op `src/test/smoke.test.ts`; the release-hardening task creates a real `src/lib/dates.test.ts` contract test instead.

- [x] **Step 4: Add and run a real date-helper test**

Create `mobile/src/lib/dates.test.ts`:

```ts
import { localDateString, parseLocalDate } from './dates';

describe('local date helpers', () => {
  it('formats a local date without UTC rollover', () => {
    expect(localDateString(new Date(2026, 7, 29, 0, 30))).toBe('2026-08-29');
  });

  it('parses a date-only string at local midnight', () => {
    expect(parseLocalDate('2026-08-29')).toEqual(new Date(2026, 7, 29));
  });
});
```

Run:

```bash
npm test -- src/lib/dates.test.ts
npm run typecheck
npx expo install --check
```

Expected: all three commands exit 0.

- [x] **Step 5: Commit through Release Hardening Task 1**

```bash
git add mobile/package.json mobile/package-lock.json mobile/jest.config.js mobile/src/test/setup.ts mobile/src/lib/dates.test.ts
git diff --cached --check
git commit -m "test(mobile): add Expo-compatible test harness"
```

### Task 2: Define safe-area and responsive-layout contracts

**Files:**
- Modify: `mobile/src/theme/layout.ts`
- Create: `mobile/src/theme/layout.test.ts`
- Create: `mobile/src/hooks/useResponsiveLayout.ts`
- Create: `mobile/src/hooks/useResponsiveLayout.test.ts`
- Modify: `mobile/src/theme/index.ts`

**Interfaces:**
- Consumes: `EdgeInsets`, `spacing`, and `Platform.OS`.
- Produces: `ResponsiveMode`, `getResponsiveMode(width, fontScale)`, `contentMaxWidth(mode)`, `useResponsiveLayout()`, and corrected `screenContentPadding(archetype, insets, platform?)`.

- [ ] **Step 1: Write failing layout tests**

Create `mobile/src/theme/layout.test.ts`:

```ts
import { contentMaxWidth, getResponsiveMode, screenContentPadding } from './layout';

const insets = { top: 47, right: 0, bottom: 34, left: 0 };

describe('screenContentPadding', () => {
  it('adds the top safe area to full-screen archetypes', () => {
    expect(screenContentPadding('root', insets, 'ios').paddingTop).toBe(63);
    expect(screenContentPadding('child', insets, 'ios').paddingTop).toBe(63);
    expect(screenContentPadding('editor', insets, 'ios').paddingTop).toBe(63);
  });

  it('keeps sheet content local to its sheet', () => {
    expect(screenContentPadding('sheet', insets, 'ios').paddingTop).toBe(16);
  });

  it('keeps the full Dynamic Island safe-area inset', () => {
    expect(screenContentPadding('root', { ...insets, top: 59 }, 'ios').paddingTop).toBe(75);
  });
});

describe('responsive layout', () => {
  it.each([
    [320, 1, 'compact'],
    [390, 1.3, 'compact'],
    [390, 1, 'regular'],
    [768, 1, 'wide'],
  ] as const)('maps %p/%p to %p', (width, fontScale, expected) => {
    expect(getResponsiveMode(width, fontScale)).toBe(expected);
  });

  it('caps wide reading width', () => {
    expect(contentMaxWidth('wide')).toBe(720);
    expect(contentMaxWidth('regular')).toBeUndefined();
  });
});
```

Create `mobile/src/hooks/useResponsiveLayout.test.ts` with a mocked `useWindowDimensions()` and assert the hook returns `mode`, `isCompact`, `isWide`, `horizontal`, and `maxContentWidth` consistently.

- [ ] **Step 2: Run the tests to verify failure**

Run:

```bash
npm test -- src/theme/layout.test.ts src/hooks/useResponsiveLayout.test.ts
```

Expected: FAIL because responsive exports and the safe-area top behavior do not exist.

- [ ] **Step 3: Implement the pure layout functions**

In `mobile/src/theme/layout.ts`, define:

```ts
export type ResponsiveMode = 'compact' | 'regular' | 'wide';

export function getResponsiveMode(width: number, fontScale: number): ResponsiveMode {
  if (width >= 768) return 'wide';
  if (width < 360 || fontScale >= 1.3) return 'compact';
  return 'regular';
}

export function contentMaxWidth(mode: ResponsiveMode): number | undefined {
  return mode === 'wide' ? 720 : undefined;
}

export function statusBarHeight(
  insets: EdgeInsets,
  platform: typeof Platform.OS = Platform.OS,
): number {
  void platform;
  return insets.top;
}
```

Keep the `platform` parameter temporarily for source compatibility, then mark it unused with `void platform`. Use `statusBarHeight(insets, platform) + spacing.base` for `root`, `child`, and `editor`; retain `spacing.base` for `sheet`. Do not subtract an optical correction from the operating system's safe-area value—the user's request is specifically to move top content down and clear covered hardware regions.

- [ ] **Step 4: Implement the responsive hook**

Create `mobile/src/hooks/useResponsiveLayout.ts`:

```ts
import { useWindowDimensions } from 'react-native';
import { contentMaxWidth, getResponsiveMode, horizontalInset } from '@/theme/layout';

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const mode = getResponsiveMode(width, fontScale);
  return {
    width,
    height,
    fontScale,
    mode,
    isCompact: mode === 'compact',
    isWide: mode === 'wide',
    horizontal: horizontalInset(width),
    maxContentWidth: contentMaxWidth(mode),
  } as const;
}
```

Export the pure layout types/functions from `mobile/src/theme/index.ts`; consumers import the hook from `@/hooks/useResponsiveLayout`.

- [ ] **Step 5: Run focused verification**

```bash
npm test -- src/theme/layout.test.ts src/hooks/useResponsiveLayout.test.ts
npm run typecheck
```

Expected: PASS and exit 0.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/theme/layout.ts mobile/src/theme/layout.test.ts mobile/src/theme/index.ts mobile/src/hooks/useResponsiveLayout.ts mobile/src/hooks/useResponsiveLayout.test.ts
git diff --cached --check
git commit -m "fix(mobile): centralize safe-area and responsive layout"
```

### Task 3: Make `Screen` the full-screen inset owner

**Files:**
- Modify: `mobile/src/components/ui/Screen.tsx`
- Create: `mobile/src/components/ui/Screen.test.tsx`
- Modify: `mobile/src/components/questionnaire/QuestionnaireWizard.tsx`
- Modify: `mobile/src/components/questionnaire/QuestionnaireSummary.tsx`
- Modify: `mobile/app/(app)/profile.tsx`

**Interfaces:**
- Consumes: `screenContentPadding()`, `useResponsiveLayout()`, and safe-area insets.
- Produces: `Screen` props `archetype`, `contentStyle`, and `includeTopSafeArea`; `QuestionnaireWizard({ screenHeader? })` with no nested manual inset.

- [ ] **Step 1: Write failing `Screen` tests**

Mock `react-native-safe-area-context` with `{ top: 47, bottom: 34, left: 0, right: 0 }` and `useWindowDimensions` with `{ width: 320, height: 640, fontScale: 1 }`. Add assertions that:

```tsx
const { getByTestId } = render(
  <Screen testID="screen-content"><Text>Content</Text></Screen>,
);
expect(getByTestId('screen-content')).toHaveStyle({ paddingTop: 63 });
```

Add a second case for `archetype="sheet"` expecting `paddingTop: 16`, and a wide case expecting a centered inner container with `maxWidth: 720`.

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/components/ui/Screen.test.tsx
```

Expected: FAIL because the full-screen top inset and wide content container are absent.

- [ ] **Step 3: Update the `Screen` contract**

Extend the props:

```ts
type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  archetype?: ScreenArchetype;
  includeTopSafeArea?: boolean;
  bottomInset?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
};
```

Default `includeTopSafeArea` to `true`. When false, replace only the computed top padding with `spacing.base`. Wrap children in a `View` whose style is `{ width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', flexGrow: scroll ? undefined : 1 }`. Apply `contentStyle` to that inner view instead of overloading the root `style` prop.

- [ ] **Step 4: Remove the Profile assessment double-inset path**

Change `QuestionnaireWizard` to accept a screen header:

```ts
type QuestionnaireWizardProps = { screenHeader?: React.ReactNode };

export function QuestionnaireWizard({ screenHeader }: QuestionnaireWizardProps) {
  // Every internal Screen renders screenHeader before its state-specific body.
}
```

Change `QuestionnaireSummary` to accept the same optional `screenHeader` and render it first. In `profile.tsx`, remove `useSafeAreaInsets()` and the manual `paddingTop`; render:

```tsx
if (tab === 'assessment') {
  return <QuestionnaireWizard screenHeader={headerBar} />;
}
```

The wizard's single `Screen` now owns the safe area for header and content.

- [ ] **Step 5: Run focused and global verification**

```bash
npm test -- src/components/ui/Screen.test.tsx src/theme/layout.test.ts
npm run typecheck
```

Expected: PASS and exit 0.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/ui/Screen.tsx mobile/src/components/ui/Screen.test.tsx mobile/src/components/questionnaire/QuestionnaireWizard.tsx mobile/src/components/questionnaire/QuestionnaireSummary.tsx 'mobile/app/(app)/profile.tsx'
git diff --cached --check
git commit -m "fix(mobile): keep screen content below system chrome"
```

### Task 4: Add an adaptive metric grid

**Files:**
- Create: `mobile/src/components/ui/AdaptiveGrid.tsx`
- Create: `mobile/src/components/ui/AdaptiveGrid.test.tsx`
- Modify: `mobile/src/components/ui/index.ts`

**Interfaces:**
- Consumes: `useResponsiveLayout()`.
- Produces: `AdaptiveGrid({ children, minItemWidth?, gap? })`; later plans use it instead of hard-coded metric rows.

- [ ] **Step 1: Write the failing component test**

```tsx
it('stacks children in compact mode', () => {
  mockResponsiveLayout({ mode: 'compact', isCompact: true });
  const { getByTestId } = render(
    <AdaptiveGrid testID="grid"><View /><View /></AdaptiveGrid>,
  );
  expect(getByTestId('grid')).toHaveStyle({ flexDirection: 'column' });
});
```

Add a regular-mode assertion for `flexDirection: 'row'` and `flexWrap: 'wrap'`.

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/components/ui/AdaptiveGrid.test.tsx
```

Expected: FAIL because `AdaptiveGrid` does not exist.

- [ ] **Step 3: Implement the component**

```tsx
type Props = ViewProps & { minItemWidth?: number; gap?: number };

export function AdaptiveGrid({ children, minItemWidth = 156, gap = spacing.md, style, ...rest }: Props) {
  const { isCompact } = useResponsiveLayout();
  return (
    <View
      style={[{ flexDirection: isCompact ? 'column' : 'row', flexWrap: 'wrap', gap }, style]}
      {...rest}
    >
      {Children.map(children, (child) => (
        <View style={{ flexGrow: 1, flexBasis: isCompact ? '100%' : minItemWidth, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
```

Use stable child keys via `Children.toArray(children)` and export the component from `ui/index.ts`.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- src/components/ui/AdaptiveGrid.test.tsx
npm run typecheck
git add mobile/src/components/ui/AdaptiveGrid.tsx mobile/src/components/ui/AdaptiveGrid.test.tsx mobile/src/components/ui/index.ts
git diff --cached --check
git commit -m "feat(mobile): add responsive adaptive grid"
```

Expected: tests/typecheck pass and only the three named paths are staged.

### Task 5: Support Reduced Transparency in the tab material

**Files:**
- Create: `mobile/src/hooks/useReducedTransparency.ts`
- Create: `mobile/src/hooks/useReducedTransparency.test.ts`
- Modify: `mobile/app/(app)/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `AccessibilityInfo.isReduceTransparencyEnabled()` and the `reduceTransparencyChanged` event.
- Produces: `useReducedTransparency(): boolean`.

- [ ] **Step 1: Write the failing hook test**

Mock the accessibility API and assert initial resolution plus event updates:

```ts
it('tracks the system reduce-transparency preference', async () => {
  mockIsReduceTransparencyEnabled.mockResolvedValue(true);
  const { result } = renderHook(() => useReducedTransparency());
  await waitFor(() => expect(result.current).toBe(true));
  act(() => reduceTransparencyListener(false));
  expect(result.current).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify failure**

```bash
npm test -- src/hooks/useReducedTransparency.test.ts
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook and tab fallback**

The hook must subscribe and clean up:

```ts
export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
}
```

In the tabs layout, use iOS blur only when the preference is false, set `intensity={20}`, and otherwise set `backgroundColor: colors.card`. Remove the unused `isDark` value inside `TabIcon`.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- src/hooks/useReducedTransparency.test.ts
npm run typecheck
git add mobile/src/hooks/useReducedTransparency.ts mobile/src/hooks/useReducedTransparency.test.ts 'mobile/app/(app)/(tabs)/_layout.tsx'
git diff --cached --check
git commit -m "feat(mobile): respect reduced transparency in tab bar"
```

### Task 6: Normalize motion tokens and progress animation

**Files:**
- Modify: `mobile/src/theme/tokens.ts`
- Modify: `mobile/src/theme/ThemeProvider.tsx`
- Modify: `mobile/src/components/ui/ProgressBar.tsx`
- Create: `mobile/src/components/ui/ProgressBar.test.tsx`

**Interfaces:**
- Consumes: existing `useMotion()` callers.
- Produces: duration keys `micro`, `feedback`, `enter`, `exit`, `value`, and `celebration`; `ProgressBar` clamps any input to `0...1` and animates only transform/opacity.

- [ ] **Step 1: Write a failing progress-bar test**

```tsx
it.each([
  [-1, 0],
  [0.42, 42],
  [2, 100],
  [Number.NaN, 0],
])('exposes a clamped value for %p', (value, now) => {
  const { getByRole } = render(<ProgressBar value={value} accessibilityLabel="Progress" />);
  expect(getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 100, now });
});
```

- [ ] **Step 2: Run the test to verify the new motion contract fails**

```bash
npm test -- src/components/ui/ProgressBar.test.tsx
```

Expected: the accessibility cases may pass, but a source assertion that the fill style uses `scaleX` and no animated percentage width fails.

- [ ] **Step 3: Update motion tokens without breaking existing consumers**

Use:

```ts
duration: {
  micro: 120,
  feedback: 160,
  enter: 200,
  exit: 160,
  value: 260,
  celebration: 500,
}
```

Update the Reduced Motion branch in `useMotion()` so every duration becomes zero. Keep existing easing and spring keys until all callers migrate.

- [ ] **Step 4: Replace percentage-width animation**

Render the fill at `width: '100%'` and animate:

```ts
const animated = useAnimatedStyle(() => ({
  transformOrigin: 'left center',
  transform: [{ scaleX: progress.value }],
}));
```

Initialize the shared value to the clamped value when Reduced Motion is active; otherwise use `withTiming(clamped, { duration: motion.duration.enter, easing })`.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/components/ui/ProgressBar.test.tsx
npm run typecheck
git add mobile/src/theme/tokens.ts mobile/src/theme/ThemeProvider.tsx mobile/src/components/ui/ProgressBar.tsx mobile/src/components/ui/ProgressBar.test.tsx
git diff --cached --check
git commit -m "perf(mobile): move progress motion to transforms"
```

### Task 7: Remove layout animation from segmented controls

**Files:**
- Modify: `mobile/src/components/ui/SegmentedControl.tsx`
- Create: `mobile/src/components/ui/SegmentedControl.test.tsx`

**Interfaces:**
- Consumes: generic `Segment<T>`, `useMotion()`, and haptics.
- Produces: the unchanged public `SegmentedControl<T>` API; compact equal-width rows use one transform-only thumb, while `large` wrapping controls render direct selected surfaces.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('reports radio selection and calls onChange once', () => {
  const onChange = jest.fn();
  const { getByRole } = render(
    <SegmentedControl label="Plan type" value="training" onChange={onChange}
      segments={[{ value: 'training', label: 'Training' }, { value: 'nutrition', label: 'Nutrition' }]} />,
  );
  expect(getByRole('radio', { name: 'Training' })).toHaveAccessibilityState({ selected: true });
  fireEvent.press(getByRole('radio', { name: 'Nutrition' }));
  expect(onChange).toHaveBeenCalledWith('nutrition');
});
```

Add a `large` case asserting four options wrap as individually selected surfaces without the traveling thumb.

- [ ] **Step 2: Run the tests to establish the baseline**

```bash
npm test -- src/components/ui/SegmentedControl.test.tsx
```

Expected: the interaction case passes; the large-mode no-thumb assertion fails.

- [ ] **Step 3: Implement the two rendering modes**

- For `large`, remove the absolute animated thumb and render the active option with `backgroundColor: colors.primaryFill`, `borderColor: colors.primary`, and selected text/icon colors.
- For compact rows, measure the container once, give every option `flex: 1`, keep the thumb width fixed to `(containerWidth - gaps) / segmentCount`, and animate only `translateX` for `motion.duration.feedback`.
- Do not animate `width`, `height`, or `flexBasis`.
- Preserve `radiogroup`, `radio`, selected state, labels, 44pt minimum height, and selection haptic.

Core animated style:

```ts
const thumbStyle = useAnimatedStyle(() => ({
  opacity: measuredWidth > 0 && activeIndex >= 0 ? 1 : 0,
  transform: [{ translateX: withTiming(activeIndex * (segmentWidth + spacing.sm), config) }],
}));
```

- [ ] **Step 4: Verify and commit**

```bash
npm test -- src/components/ui/SegmentedControl.test.tsx
npm run typecheck
git add mobile/src/components/ui/SegmentedControl.tsx mobile/src/components/ui/SegmentedControl.test.tsx
git diff --cached --check
git commit -m "perf(mobile): use transform-only segment motion"
```

### Task 8: Shorten numeric motion and standardize continuous surfaces

**Files:**
- Modify: `mobile/src/components/ui/AnimatedNumber.tsx`
- Create: `mobile/src/components/ui/AnimatedNumber.test.tsx`
- Modify: `mobile/src/components/ui/Card.tsx`
- Create: `mobile/src/components/ui/Card.test.tsx`

**Interfaces:**
- Consumes: normalized motion duration keys and current `Card` props.
- Produces: unchanged `AnimatedNumber` and `Card` public APIs.

- [ ] **Step 1: Write failing rendering tests**

```tsx
it('renders a plain final value when motion is reduced', () => {
  mockUseMotion({ enabled: false, reduced: true });
  const { getByText } = render(<AnimatedNumber value={12.5} precision={1} suffix="kg" />);
  expect(getByText('12.5kg')).toBeTruthy();
});

it('uses a continuous corner curve for cards', () => {
  const { getByTestId } = render(<Card testID="card" />);
  expect(getByTestId('card')).toHaveStyle({ borderCurve: 'continuous' });
});
```

- [ ] **Step 2: Run the tests to verify the surface test fails**

```bash
npm test -- src/components/ui/AnimatedNumber.test.tsx src/components/ui/Card.test.tsx
```

- [ ] **Step 3: Update the implementations**

- Replace the 1000ms digit spring with `withTiming(..., { duration: motion.duration.value, easing: Easing.bezier(...motion.easing.standard) })`.
- Change digit-count layout transition to `LinearTransition.duration(motion.duration.enter)` and keep exit at `motion.duration.exit`.
- Keep plain text under Reduced Motion.
- Add `borderCurve: 'continuous'` to `Card` while preserving the existing radius, border, and theme-specific shadow behavior.

- [ ] **Step 4: Run the complete foundation suite**

```bash
npm test -- src/theme/layout.test.ts src/hooks/useResponsiveLayout.test.ts src/components/ui/Screen.test.tsx src/components/ui/AdaptiveGrid.test.tsx src/hooks/useReducedTransparency.test.ts src/components/ui/ProgressBar.test.tsx src/components/ui/SegmentedControl.test.tsx src/components/ui/AnimatedNumber.test.tsx src/components/ui/Card.test.tsx
npm run typecheck
```

Expected: PASS and exit 0.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/ui/AnimatedNumber.tsx mobile/src/components/ui/AnimatedNumber.test.tsx mobile/src/components/ui/Card.tsx mobile/src/components/ui/Card.test.tsx
git diff --cached --check
git commit -m "refactor(mobile): tighten numeric motion and surfaces"
```

### Task 9: Standardize tab reselect and sheet focus behavior

**Files:**

- Modify: `mobile/src/components/ui/Screen.tsx`
- Modify: `mobile/src/components/ui/Screen.test.tsx`
- Modify: `mobile/src/components/ui/Sheet.tsx`
- Create: `mobile/src/components/ui/Sheet.test.tsx`
- Modify: `mobile/app/(app)/(tabs)/logs.tsx`
- Modify: `mobile/app/(app)/(tabs)/_layout.tsx`
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`

**Interfaces:**

- `Screen` registers its internal scroll ref with React Navigation for tab reselect.
- List-owning tab roots register their `FlatList` ref directly.
- `Sheet` owns title focus, visible close control, keyboard behavior, and bottom safe-area padding.

- [ ] **Step 1: Write failing navigation and sheet tests**

Mock `useScrollToTop` from `@react-navigation/native` in `Screen.test.tsx` and add:

```tsx
it('registers a root scroll view for active-tab reselect', () => {
  render(<Screen archetype="root"><Text>Home</Text></Screen>);
  expect(mockUseScrollToTop).toHaveBeenCalledTimes(1);
  expect(mockUseScrollToTop.mock.calls[0][0].current).toBeTruthy();
});
```

In `Sheet.test.tsx`, mock Gorhom Bottom Sheet with plain views and assert:

```tsx
it('provides a named 44pt close action and bottom safe-area clearance', () => {
  mockSafeAreaInsets({ top: 47, right: 0, bottom: 34, left: 0 });
  const { getByLabelText, getByTestId } = render(
    <Sheet visible title="Exercise details" onClose={jest.fn()}>
      <Text>Prescription</Text>
    </Sheet>,
  );
  expect(getByLabelText('Close Exercise details')).toHaveStyle({ minWidth: 44, minHeight: 44 });
  expect(getByTestId('sheet-content')).toHaveStyle({ paddingBottom: 34 });
});
```

- [ ] **Step 2: Run the tests to verify failure**

```bash
npm test -- src/components/ui/Screen.test.tsx src/components/ui/Sheet.test.tsx
```

Expected: FAIL because root scroll registration, named close semantics, and bottom inset ownership are absent.

- [ ] **Step 3: Register scrollable tab roots**

Declare the navigation package used directly by the screen component:

```bash
npx expo install @react-navigation/native
```

In `Screen`, keep an internal `ScrollView` ref, merge it with the forwarded ref through `useImperativeHandle`, and pass the internal ref to `useScrollToTop`. Call the hook unconditionally so React hook order does not depend on `scroll`; a non-scrolling `Screen` leaves the ref empty.

In `logs.tsx`, create `const listRef = useRef<FlatList<LogRow>>(null)`, call `useScrollToTop(listRef)`, and pass it to `AnimatedFlatList`. This gives all five tab roots the platform-standard behavior: a repeated active-tab press scrolls its root content to the top, while immediate tab switching remains unanimated. Keep the existing tab navigator and screen names unchanged.

- [ ] **Step 4: Standardize sheet semantics and safe area**

In `Sheet.tsx`:

- read `insets.bottom` from `useSafeAreaInsets()`;
- give the content wrapper `testID="sheet-content"` and `paddingBottom: insets.bottom`;
- change the close label to ``Close ${title}``;
- when a sheet opens, move accessibility focus to its title after presentation;
- retain pan-to-dismiss, backdrop dismissal, and the visible close button;
- retain `keyboardBehavior="interactive"`, `keyboardBlurBehavior="restore"`, and `android_keyboardInputMode="adjustResize"`.

Do not add a second top inset inside sheet content; the sheet owns its modal geometry.

- [ ] **Step 5: Verify navigation behavior manually**

On Home and Logs:

1. Scroll well below the first viewport.
2. Tap another tab.
3. Return to the original tab and confirm its navigation/scroll state is preserved.
4. Tap the already-active tab and confirm the root scroll position returns to zero.

Expected: tab changes have no decorative slide; active-tab reselect provides the standard return-to-root/scroll-to-top behavior.

- [ ] **Step 6: Run checks and commit**

```bash
npm test -- src/components/ui/Screen.test.tsx src/components/ui/Sheet.test.tsx
npm run typecheck
git add mobile/package.json mobile/package-lock.json mobile/src/components/ui/Screen.tsx mobile/src/components/ui/Screen.test.tsx mobile/src/components/ui/Sheet.tsx mobile/src/components/ui/Sheet.test.tsx 'mobile/app/(app)/(tabs)/logs.tsx' 'mobile/app/(app)/(tabs)/_layout.tsx'
git diff --cached --check
git commit -m "fix(mobile): standardize tab and sheet navigation"
```

## Plan 1 completion gate

- [ ] Run `npm test -- --runInBand` from `mobile/`.
- [ ] Run `npm run typecheck` from `mobile/`.
- [ ] Run `npx expo install --check` from `mobile/`.
- [ ] Verify one root screen, one child screen, and one sheet at 320dp and 390dp widths.
- [ ] Verify the topmost control is below the status bar on a notched iPhone and compact Android device.
- [ ] Verify Reduced Motion and Reduced Transparency paths.
- [ ] Record the exact commands and results in the implementation handoff before starting Plan 2, 3, or 4.

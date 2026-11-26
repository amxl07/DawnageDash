# Dawnage native UI modernization implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task in the current session. Track the checkboxes. Do not discard the uncommitted mobile work that formed the research baseline.

**Goal:** Deliver a restrained Apple-like Dawnage interface with current native navigation and controls, coherent branded content, and unchanged data/recovery guarantees.

**Architecture:** Keep Expo Router, React Native, existing feature controllers, and the current backend. Introduce platform adapters inside the shared UI layer; use native navigation for ordinary browsing and parent-stack focused editors for guarded work. Migrate high-frequency controls first, then every route, and remove superseded treatments after coverage is complete.

**Tech stack:** Expo 57.0.24, Expo UI 57.0.19, Expo Router 57.0.22, React Native 0.86.3, React 19.2.3, existing Gorhom/Reanimated/Gesture Handler, expo-glass-effect and expo-symbols.

**Spec:** [Current UI research and design specification](../../research/2026-09-24-ui-modernization/README.md). The owner selected “Apple-like, restrained, with Dawnage branding.”

**Delivery status:** All source implementation phases have been applied on `codex/native-ui-modernization`. See the [implementation record](../../research/2026-09-24-ui-modernization/implementation.md) for verification, route/category coverage and conditional decisions. Checked items record source work or an evaluated conditional decision; native device acceptance remains explicitly open. The route walk combines source review, automated state/recovery tests and browser captures; it is not a claim that every native state was manually exercised. The browser startup problem was recovered.

## Global constraints

- Use the current iOS/iPadOS 27 UI kit as the design reference, with runtime/build-specific fallbacks.
- Stay on the current published Expo 57 baseline for the initial migration. Native tabs import from `expo-router/unstable-native-tabs`, not the SDK 58 path shown in some `main` examples.
- Glass belongs to navigation and appropriate transient controls. Ordinary health/workout/meal content remains opaque and readable.
- Preserve the existing accessible coral palette until any replacement is contrast-measured. No hex literals outside `src/theme/`.
- Preserve authentication, onboarding stages, local-calendar dates, first-check-in program start, record schemas, offline outbox, draft recovery, private-photo resolution, and coach-assigned plan meaning.
- Use at least 44×44 pt interactive targets on iOS and 48×48 dp targets on Android. Large text must reflow; do not cap scaling to preserve a mockup.
- Keep 4.5:1 normal text and 3:1 large text/essential non-text contrast targets; test composited glass over real content.
- Keep `useMotion()` for custom motion. Do not add a second press animation or duplicate haptic to an already interactive native control.
- Preserve Android and web behavior with platform-specific implementations. SF Symbols are an iOS implementation detail, not cross-platform image assets.
- No new UI framework, Skia chart rewrite, backend migration, or food-logging feature is required by this plan.
- Tests verify interaction, persistence, navigation and accessibility contracts. Use screenshot review for visual decisions; do not add tests that merely duplicate style constants.

## Execution order and independently reviewable outcomes

| Task | Outcome | Depends on | Relative effort |
| --- | --- | --- | --- |
| 0 | Current baseline, native capability proof and visual target | — | Small–medium; device access matters |
| 1 | Unified actions, symbols, sections and compact selections | 0 | Medium |
| 2 | Focused check-in editing with preserved entry/recovery | 1 | Large; highest behavior risk |
| 3 | Native tabs, headers and correct insets | 2 | Large; device validation required |
| 4 | Home, Training and Nutrition follow the new hierarchy | 1, 3 | Medium |
| 5 | Check-in, onboarding and workout controls are consistent | 1, 2, 3 | Large |
| 6 | Sheets, settings, progress, media and secondary routes complete | 1, 3, 5 | Medium–large |
| 7 | Optional native polish and icon preparation | 4–6 | Small–medium |
| 8 | Full route review, old-treatment removal and release evidence | 0–7 | Medium; devices required |

These are sizing estimates, not time promises. Tasks 1 and 4 provide the earliest visible improvement. Task 3 must not be rushed past Task 2 simply to show a glass tab bar.

## File and interface boundaries

All paths below are relative to `mobile/`.

| File / group | Responsibility |
| --- | --- |
| `src/theme/tokens.ts`, `colors.ts`, `layout.ts` | Roles for type, surfaces, actions and responsive geometry; retain semantic colors. |
| `src/components/ui/Button.tsx`, `Button.ios.tsx`, `Button.android.tsx`, `Button.types.ts` | A stable app action contract with native implementations where verified; default file remains the fallback. |
| `src/components/ui/InlineAction.tsx`, `ToolbarAction.tsx` | Context-specific secondary actions; no duplicate generic button hierarchy. |
| `src/components/ui/AppSymbol.tsx`, `AppSymbol.ios.tsx`, `AppSymbol.types.ts` | Semantic icon names resolved to supported platform symbols/fallbacks. |
| `src/components/ui/Card.tsx`, new `Section.tsx` | Compatible content surfaces and unboxed groups. |
| `src/components/ui/SegmentedControl.tsx`, `SegmentedControl.ios.tsx` | Preserve generic value/onChange contract; native compact selection on iOS; large choices remain a separate presentation. |
| `src/components/navigation/AppTabs.tsx`, `AppTabs.web.tsx` | Native navigation configuration and explicit web fallback. |
| `src/features/checkin/CheckInEditorScreen.tsx` | Move existing check-in editor presentation and guard wiring here before modifying it. |
| `app/(app)/daily-check-in.tsx` | Parent-stack focused editing entry. |
| `app/(app)/(tabs)/check-in.tsx`, new `src/features/checkin/CheckInHub.tsx` | Today’s record/history and compatibility handoff into focused editing. |
| Existing feature components | Compose the new UI; feature hooks continue to own business/data state. |

Do not create two implementations of persistence or validation. Do not introduce a second theme provider inside native Hosts.

The extended button contract should retain every existing prop and add **optional** context and size. The public type can be moved out of the component without changing call sites:

```ts
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text' | 'destructive';
export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
  context?: 'content' | 'floating';
  size?: 'regular' | 'large';
};
```

Native SwiftUI children are not arbitrary RN children. Existing `icon: ReactNode` consumers must either retain the RN rendering path or be migrated to the semantic symbol adapter. Never silently drop their icons. Once consumers are migrated, a later cleanup may simplify the interface deliberately.

The existing segment contract remains `segments: { value; label; icon? }[]`, `value`, `onChange`, `large`, `showLabel`. Native compact segments use strings and selected values. `large` and icon-rich choices use the reviewed choice presentation instead of forcing unsupported content into a native segmented picker.

## Task 0: establish an honest baseline and native capability proof

**Files:** `docs/research/2026-09-24-ui-modernization/evidence/`, `scripts/capture-redesign.mjs`, `src/testing/` (an isolated development-only control gallery if needed), existing `app.config.ts`, `eas.json`, `package.json` and installed declarations for inspection.

**Produces:** dated baseline captures or named capture blockers; recorded build/OS/dependency matrix; chosen component composition for light, dark and large text.

- [x] Record the current working tree. Any isolated checkout must include the current uncommitted and untracked mobile work. Do not silently start from commit `7e8a9c2` alone.
- [ ] Capture Home, Check In, Training, Nutrition, Workout, Settings and one editor sheet on the current app, using fictional records. Review the actual saved images. If this machine still cannot launch a capture browser, record the failure and use a supported development device for the visual baseline.
- [x] Build a development-only comparison surface for primary/secondary/inline actions, compact segments, a switch, a choice group, grouped input, and a sheet. Use the existing theme; do not add a production demo route.
- [ ] Test Expo UI controls in the actual available Expo Go/development client. Record OS and native runtime. Check busy/disabled states, long labels, accessibility names, icon rendering, and Host sizing. For glass, separately check compiled and runtime capability; for OS 27, record the build toolchain.
- [ ] Review a coherent Home/Training composition at compact and ordinary phone widths, both themes, and accessibility text size. Settle the visual target before migrating every route.

**Checks:** run existing focused UI tests before changes; capture the comparison surface natively. A web rendering proves only fallback behavior. Do not run a cloud production build or publish anything just to collect this baseline.

## Task 1: establish the shared control hierarchy

**Files:** UI/theme files in the interface table; `src/components/ui/index.ts`; existing `Button.test.tsx`, `Card.test.tsx`, `SegmentedControl.test.tsx`, `Input.test.tsx`.

**Consumes:** current theme, `useMotion`, `useReducedTransparency`, existing action/segment contracts.

**Produces:** the same feature-facing action and selection interfaces with consistent platform rendering; plain sections and intentional surface roles.

- [x] Extract `ButtonProps` without altering behavior. Add optional `context` and `size`. Keep `disabled || loading` as the single inactive rule and preserve the action label while busy.
- [x] Implement the iOS action renderer with native styles where the full contract is supported; keep the fallback for incompatible custom RN content. Use `borderedProminent` for a content primary action and `glassProminent` only for an appropriate floating action on a capable build/runtime. Use a quiet native secondary and plain inline treatment. Do not set a hard fixed height.
- [x] Add the semantic `AppSymbol` adapter. Start with existing actions: Home, check-in, training, nutrition, profile, back, close, history, overflow, calendar and completion. Choose widely available SF symbols; use existing Lucide equivalents on Android/web and for unsupported symbols.
- [x] Replace the compact Training selection with a native segmented picker. Retain `onChange` values (`plan` / `history`) and skip callbacks when the active value is tapped. Ensure the group remains meaningfully labelled to assistive technology even when the visible “Training view” label is omitted.
- [x] Add unboxed `Section`; extend Card with optional surface/elevation roles while preserving its existing props during migration. Make shadows exceptional. Keep focused/error input boundaries visible and avoid changing border thickness in a way that moves content.
- [ ] Verify existing button behavior tests, segment state tests and representative native interactions. Review screenshots for relative emphasis and contrast. Commit only this task’s files when its checks pass.

**Known-valid SDK 57 primitive recipe** (usage model, not the full production Button adapter):

```tsx
import { Host, Button } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize } from '@expo/ui/swift-ui/modifiers';

export function NativeActionExample({ onPress }: { onPress: () => void }) {
  return (
    <Host matchContents>
      <Button
        label="Continue"
        onPress={onPress}
        modifiers={[buttonStyle('borderedProminent'), controlSize('large')]}
      />
    </Host>
  );
}
```

The production adapter additionally owns theme tint, state, accessibility and fallback content. Follow installed declarations when composing those modifiers; do not copy an SDK 58 example.

**Focused check:** `npm test -- --runTestsByPath src/components/ui/Button.test.tsx src/components/ui/Card.test.tsx src/components/ui/SegmentedControl.test.tsx src/components/ui/Input.test.tsx`.

## Task 2: isolate active check-in editing before changing tabs

**Files:** `app/(app)/(tabs)/check-in.tsx`; new `app/(app)/daily-check-in.tsx`, `src/features/checkin/CheckInEditorScreen.tsx`, `CheckInHub.tsx`; `app/(app)/_layout.tsx`; `src/lib/today-action.ts`; `src/hooks/useNotificationRouting.ts`; existing `src/features/checkin/checkInExitGuard.ts` and check-in tests; new `src/features/checkin/checkin-entry.ts` with behavior tests.

**Consumes:** existing editor/controller, record receipt, date/history selector, draft flush/discard and boundary intent logic.

**Produces:** one editor, displayed above tabs; compatible date links; direct start/resume entry; unmodified record and delivery meaning.

- [x] Move the existing route implementation into `CheckInEditorScreen` with a thin route export. Initially preserve its tests and behavior. This separates file movement from changing navigation.
- [x] Define entry behavior: Home start/resume and reminders enter `/daily-check-in?date=…`; a Check In tab press shows today’s record/history with Start or Continue; a legacy `/check-in` entry with an explicit date/edit intent hands off directly to the focused editor. Normalize array/invalid date parameters with the existing validation behavior.
- [x] Update `today-action.ts` and notification routing to the focused entry. Keep historical link compatibility and the existing `/logs` alias. Clear consumed handoff parameters so returning from the editor does not immediately reopen it.
- [x] Keep editor `usePreventRemove`, the visible Close action, notification guard registration, numeric commit, draft flush and failed-save recovery in one place. Initially disable the native back gesture on this editor, as the logger already does, until the guarded native gesture is verified. Android Back still follows the removal guard. A failed save must leave the user in the editor with retry/discard choices.
- [x] Make editor content use the `editor` screen archetype and measured task footer without a tab-height offset. Preserve history/date switching, receipt reopening and first-program-day submission rules.
- [ ] Run the existing check-in journey, screen, notification and today-action tests; add entry/return regressions below and record native Close/Back behavior before the next task.

**Required regression scenarios:** dirty numeric edit then Close; failed local flush then attempted exit; discard and replay exactly once; a notification arriving during an edit; old date deep link; invalid/future date; completed receipt reopened for edit; first submission starts the program once; an offline receipt still says waiting to sync; returning to the tab does not reopen the editor in a loop.

**Route recipe:**

```tsx
// app/(app)/daily-check-in.tsx
export { CheckInEditorScreen as default } from '@/features/checkin/CheckInEditorScreen';
```

**Focused check:** `npm test -- --runTestsByPath src/features/checkin/CheckInJourney.integration.test.tsx src/screens/__tests__/tabs/check-in.test.tsx src/hooks/useNotificationRouting.test.tsx src/lib/today-action.test.ts` plus the new entry contract test. Update existing route assertions to the equivalent behavior; do not delete persistence assertions.

## Task 3: native navigation and safe-area ownership

**Files:** `app/(app)/(tabs)/_layout.tsx`; `app/(app)/_layout.tsx`; move the legacy `app/(app)/(tabs)/logs.tsx` redirect to `app/(app)/logs.tsx`; new `src/components/navigation/AppTabs.tsx`, `AppTabs.web.tsx`; `src/components/ui/Screen.tsx`, `StickyActionBar.tsx`, `PageHeader.tsx`; `src/components/logger/RestDock.tsx`; `src/theme/layout.ts`; navigation/layout/Screen/footer tests.

**Consumes:** guarded work has a parent-stack home; existing tab route names and check-in status are still available.

**Produces:** actual native tabs and detail headers, with exactly one owner for each inset.

- [x] Configure native triggers for `index`, `check-in`, `plans`, `nutrition`, and `more`; preserve displayed labels Home, Check In, Training, Nutrition and You. Move the `/logs` compatibility redirect to the parent stack and update internal grouped-route references to Training History. Remove the duplicate tab-group alias after consumers are updated. The installed native navigator throws when the focused route has no visible trigger, so do not leave a routable hidden Logs tab under it.
- [x] Let the system render tab backgrounds, selected symbols, geometry and typography. Remove the custom per-icon pill and extra `GlassView` tab background on this path. Translate the check-in status indicator to a supported accessible badge/status treatment without inventing a count.
- [x] Keep a web-specific tab implementation. Maintain native route deep linking and reselect behavior. Do not copy `event.preventDefault()` into native tab listeners; it is unsupported.
- [x] Audit `Screen` wrappers for native scroll-edge/inset behavior. Remove JS tab-height consumption from parent-stack editor footers. Root content must rely on the native inset mechanism or one documented measured/manual fallback, never both.
- [x] Enable native headers for ordinary detail pages such as settings, measurements and profile; remove their duplicate in-content back rows. Keep the logger’s gesture conflict policy and focused custom controls. Do not force a large collapsing title onto an editor.
- [ ] Test native iOS 27, available iOS 26, older fallback, Android Back and web. Check dynamic text, tab reselection, hidden aliases, notification pushes, keyboard transitions and sheet overlays. Record large/resizable layout behavior; iPhone Duo adaptation remains unproven until tested on a supported runtime.

**SDK 57 tab recipe:**

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export function NativeTabExample() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

The real configuration supplies all existing routes, Android symbol mappings, theme integration and status. No fake tab buttons should be overlaid on this component.

**Focused check:** `npm test -- --runTestsByPath src/screens/__tests__/tabs/navigation.test.tsx src/components/ui/Screen.test.tsx src/components/ui/StickyActionBar.test.tsx src/theme/layout.test.ts` plus native navigation flows. Do not rely on mocked native tabs as evidence that platform cancellation or layout works.

## Task 4: change the browsing screens as one visual family

**Files:** `app/(app)/(tabs)/index.tsx`; `src/features/home/TodayBrief.tsx`, `NextSessionCard.tsx`, `HomeDetails.tsx`, `WeekRecordStrip.tsx`; `src/features/training/training-screen.tsx`, `training-plan.tsx`, `workout-history.tsx`; `src/components/plans/PlanDayCard.tsx`; `src/features/nutrition/nutrition-screen.tsx`; corresponding existing screen tests.

**Consumes:** sections, surfaces, action roles, native segments and navigation.

**Produces:** coherent Home, Training and Nutrition, with current data/recovery behavior.

- [x] Reduce Home to a quiet header, one next action, week record, next workout and optional progress/detail disclosure. Keep incomplete loading domains isolated; do not show a confident action when required plan or program state is unknown.
- [x] Turn secondary destinations into consistent disclosure rows/inline actions instead of another full-sized button or card. Give coral only to the actual next action and meaningful selected/status indicators.
- [x] Apply the native Plan/History control to Training, align next-session and day rows, and keep plan source/coach provenance visible. Retain history filters, re-open routes and the `/logs` alias.
- [x] Group Nutrition meals under a clear prescribed target. Combine redundant framing around totals, supplements and notes; never label prescription data as consumed calories or completion.
- [ ] Capture populated, empty, loading, offline/stale and error states with realistic text lengths. Keep existing state/routing tests and verify no added tap is required to start a Home check-in or workout.

**Focused check:** `npm test -- --runTestsByPath src/screens/__tests__/tabs/index.test.tsx src/screens/__tests__/tabs/plans.test.tsx src/screens/__tests__/tabs/nutrition.test.tsx src/screens/__tests__/tabs/logs-alias.test.tsx src/components/plans/PlanDayCard.test.tsx`.

## Task 5: task controls, onboarding and workout ergonomics

**Files:** `src/components/checkin/CheckInRatingScale.tsx`, `CheckInFieldBlock.tsx`, `CheckInForm.tsx`, `src/features/checkin/components/`; `src/features/onboarding/SetupStage.tsx`; `app/(auth)/login.tsx`, `reset-password.tsx`; `src/components/logger/CurrentSetEditor.tsx`, `CompactSetRow.tsx`, `ExerciseSlide.tsx`, `RestDock.tsx`, `WorkoutSummary.tsx`; `app/(app)/logger.tsx`; existing feature/screen tests.

**Consumes:** shared action/input roles and focused-editor navigation.

**Produces:** exact, quick data entry that feels consistent with the browsing interface.

- [x] Keep the existing ten-point readiness scales discrete (corrected against the production data contract). Present them as a cohesive group, show endpoint meaning and selected value, and preserve nullable/unanswered state. Do not silently preselect the midpoint. Keep exact one-tap selection and the existing accessibility action model.
- [x] Reduce check-in field framing and duplicate labels. Preserve stable keyboard commit, field focus on errors, date context, stage progress and review editing.
- [x] Apply grouped fields and quiet secondary links to account entry. Keep autofill, password visibility, reset state, validation and account gating. Keep onboarding’s three stages and current save semantics.
- [x] Refine workout weight/reps fields, units and previous-value hints. A value copied from history remains editable and is never marked complete until the user completes the set. Keep RPE/removal/calculator in an appropriate secondary surface and Finish visible.
- [x] Replace the rest auto-start sentence button with a shared switch row. Replace the expanded preset button bank with a compact duration picker. Keep Pause, +15s and Skip reachable, and retain timer persistence/background-clock behavior.
- [x] Use short completion feedback and existing next-step logic. Preserve the distinction between local save and sync. Avoid any delay before the next action becomes available.

**Required regressions:** empty versus zero numeric values; comma/decimal normalization as currently supported; immediate Complete after typing; copied-value undo; duplicate completion taps; interrupted/backlogged save; rest expiry/backgrounding; accessibility selection and speech; large text and keyboard avoidance.

**Focused check:** `npm test -- --runTestsByPath src/components/checkin/CheckInRatingScale.test.tsx src/components/checkin/CheckInForm.test.tsx src/components/logger/CurrentSetEditor.test.tsx src/components/logger/RestDock.test.tsx src/components/logger/WorkoutSummary.test.tsx src/screens/__tests__/logger.test.tsx` and existing onboarding/auth tests selected by the changed files.

## Task 6: finish sheets, settings, charts and remaining routes

**Files:** `src/components/ui/Sheet.tsx`, `Input.tsx`, `ListRow.tsx`, `OptionRow.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `Skeleton.tsx`, `RecordStatus.tsx`; `app/(app)/settings.tsx`, `profile.tsx`, `weekly-feedback.tsx`, `measurements.tsx`, `media.tsx`, `(tabs)/more.tsx`; `src/components/measurements/MeasurementSheet.tsx`; `src/components/charts/LineChart.tsx`, `types.ts`; `src/components/media/PhotoViewer.tsx`, `PhotoCaptureSheet.tsx`; `src/components/questionnaire/`; existing tests.

**Consumes:** new shared roles; existing chart geometry, photos and draft models.

**Produces:** full route coverage and coherent transient surfaces.

- [x] Give sheets a role (`choice`, `detail`, `editor`) and map each of the 15 call sites to it. Preserve `visible`, `onClose`, `dismissible`, `returnFocusRef` and sheet-aware inputs. A short choice fits its content; long content can expand and scroll. Keyboard and dismiss behavior must pass before replacing any Gorhom editor with native presentation.
- [x] Recompose You/Settings/Profile with grouped rows, native switches and concise selected values. Use native Form only where it owns scrolling and where validation/focus behavior is proven; do not nest it inside Screen’s ScrollView.
- [x] Add chart selection by nearest actual recorded date, with a readable value/date/unit readout. Keep existing missing-data segmentation. Avoid intercepting vertical page scroll for a horizontal chart gesture. Offer an accessible chronological list or increment/decrement selection as an equivalent interaction.
- [x] Keep photo controls discreet but explicit; maintain previous/next and close, signed URL resolution, focus restoration and caption dates. Do not replace private-photo components with raw public image URLs.
- [x] Bring questionnaire/weekly-feedback fields and review screens into the same action/group hierarchy. Preserve their validation, reconciliation and recovery contracts.
- [x] Match skeleton geometry to the final layout. Keep failed-operation status adjacent to recovery, and do not replace persistent save failures with an ephemeral toast.

**Required chart cases:** no data, one point, irregular dates, missing values, two series with different units, selected date disappearing after filter change, large text, screen reader access, vertical scroll conflict.

**Focused check:** `npm test -- --runTestsByPath src/components/ui/Sheet.test.tsx src/components/measurements/MeasurementSheet.test.tsx src/components/charts/LineChart.test.tsx src/components/charts/timeSeries.test.ts src/components/media/PhotoViewer.test.tsx src/screens/__tests__/settings.test.tsx src/screens/__tests__/weekly-feedback.test.tsx src/components/questionnaire/QuestionnaireWizard.test.tsx`.

## Task 7: optional polish once the complete app works

**Files:** existing motion/number/completion components; navigation accessory component if justified; brand icon assets and `app.config.ts` only if a verified layered-icon delivery path is available.

- [x] Audit custom animation on controls now rendered natively. Remove duplicate springs/haptics. Use existing short feedback and interruption behavior on custom components; reduced motion snaps to the correct end state.
- [x] Evaluate a compact ongoing-workout/rest accessory on browsing screens. Use `NativeTabs.BottomAccessory` only if it reduces the effort to resume an ongoing task. Its placement views must share state from `RestTimerProvider`/the existing workout owner, not create separate timers. The full-screen logger keeps its own compact rest controls.
- [x] Add supported symbol/number transitions only for a meaningful state change. New SF Symbols 8-only effects require capability/fallback testing; a plain supported symbol is the correct fallback.
- [x] Prepare a layered Dawnage icon using the current Apple template and original brand assets when the build path supports it. Treat new icon binaries/store screenshots as a separate verifiable deliverable. Do not let that delay the UI migration.
- [x] Add search only where collection size has created a real findability problem. Reuse actual history/exercise data and avoid a decorative global Search destination.

## Task 8: prove coverage and retire superseded UI

**Files:** all migrated UI consumers; `src/components/ui/index.ts`; `docs/ui-validation-matrix.md`; `.maestro/`; `scripts/verify-ui-contracts.mjs` only for real new constraints; evidence directory for the implementation date.

- [x] Walk every route listed in the spec, including reset password, recovery, first-day onboarding, empty plans/nutrition, history, photos and offline failures. Record component migration status for every inventory caller. “Modernized” does not mean only Home looks different.
- [x] Remove old duplicate control treatments and unused compatibility branches only after all consumers are migrated. Preserve required platform fallbacks. Update stale SDK comments and navigation documentation.
- [x] Run the complete standard verification once after integration; fix observed failures and rerun the affected checks. Existing React Compiler adoption is a separate recorded issue, not a reason to disable more lint rules.

```sh
npm run verify
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=fixture-public-key npm run export -- --max-workers 1
```

- [ ] Run the existing Maestro journeys on a configured development build: onboarding, home-checkin, backfill, workout interruption and progress. Run manual offline-retention/sync-recovery scenarios. Use test accounts and keep secrets outside checked-in commands/evidence.
- [ ] Compare native captures against the agreed composition at compact/ordinary phone widths, light/dark appearances, large text, Reduce Motion, Reduce Transparency and increased contrast. Exercise VoiceOver/TalkBack and hardware Back. Review screenshots at their native size, not only in a contact sheet.
- [ ] Record UI frame responsiveness and input latency on a physical baseline device. Investigate actual pauses in keyboard, sheet, list or gesture behavior; do not claim 60/120 fps from a static export.
- [ ] Record the exact OS, device, Expo/native binary, build toolchain and source revision for acceptance. Explicitly distinguish iOS 27 verified behavior from unsupported/unavailable device cases. Keep the prior build as rollback until acceptance is complete.

Source work for the partially open verification items above is complete. Native interaction, accessibility-text, manual offline/device and physical performance checks remain unavailable on this host; see the implementation record for the exact completed evidence.

Final available verification passed after the last shared-layout fix: **145 suites / 1,078 tests**, TypeScript, lint, UI contracts, and iOS/Android/web exports. Accepted browser evidence includes **60 screen frames and 28 journey checkpoints** across both themes and compact/ordinary/wide layouts. Check-in, workout and chart interaction journeys passed. This does not close the native-device gates above.

## Acceptance matrix

| Scenario | Must remain true |
| --- | --- |
| Home → check-in | One direct start/resume action; correct reporting day; no extra hub tap. |
| Check-in → close/back/notification | Commit or explicitly recover/discard pending input; no silent navigation loss. |
| Offline submission | Local receipt remains accurate; no claim that the coach/account received unsynced data. |
| Training / history / legacy URL | Correct view, compatible links, no duplicated visible Logs tab. |
| Workout | Immediate entry/complete works, previous values are distinguishable, rest and finish remain reachable. |
| Sheets / keyboard | Content scrolls, primary action stays reachable, cancel/dismiss rules and focus restoration work. |
| Large text | Controls reflow and labels stay readable; there is no clipping hidden by a scaling cap. |
| Accessibility settings | Native and custom content both respect motion/transparency/contrast and have usable focus order. |
| Unsupported glass / older symbols | Solid/native fallback with no missing control or crash. |
| Android / web | Appropriate navigation and semantic controls; no SwiftUI-only imports in fallback bundles. |
| Expanded/resized display | Stable state and hierarchy; no fixed-bottom-bar overlap. New reserved-region support is claimed only with device evidence. |
| Final route inventory | All 29 component categories have a completed or explicitly conditional disposition; no forgotten legacy screen. |

## Initial milestone (completed; implementation continued through Task 8)

Demonstrate the shared action/selection/surface system in **Home and Training**, alongside the native control gallery in both appearances. Complete the focused check-in boundary before enabling native tabs. This creates a reviewable visual improvement while keeping the riskiest navigation change explicit.

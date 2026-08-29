# Dawnage Progress and Coach Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give measurements, progress photos, weekly feedback, profile, and coach surfaces a clear, accessible, trustworthy production experience without assuming unavailable backend capabilities.

**Architecture:** Preserve the current hooks and routes while extracting pure validation/state helpers and focused row/card components. Coach lookup returns an explicit discriminated state so screens can distinguish assigned, unassigned, and unavailable data. Sensitive photo UI states truthfully reflect permission and upload behavior; backend privacy verification remains a release gate.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, Expo Router 6, React Query 5, Supabase, AsyncStorage, Expo Image/Image Picker/Image Manipulator, Gorhom Bottom Sheet, Jest Expo, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-dawnage-fitness-ui-ux-design.md`

## Global Constraints

- Complete `2026-08-29-dawnage-ui-foundations-motion.md` first.
- Keep Expo SDK 54 and Expo Go compatibility.
- Do not apply `mobile/plans/coach-identity-migration.sql` or change RLS without separate authorization.
- Do not claim a coach or coach reply exists unless authorized data proves it.
- Do not claim photos are private until the storage bucket and access policies are verified.
- Keep image dimensions explicit and `expo-image` cache policy at `memory-disk`.
- Compact or large-text layouts stack metric cards and comparison rows.
- Keep 44x44pt targets, visible labels, error text, and non-gesture dismissal.
- Preserve the current dirty working tree; stage only task-owned paths.
- Run `npm`/`npx` commands from `mobile/`; run `git` commands from the repository root.

---

### Task 1: Model assigned, unassigned, and unavailable coach states

**Files:**
- Modify: `mobile/src/hooks/useCoach.ts`
- Create: `mobile/src/hooks/useCoach.test.ts`
- Modify: `mobile/src/components/coach/CoachBadge.tsx`
- Create: `mobile/src/components/coach/CoachBadge.test.tsx`

**Interfaces:**
- Produces: `CoachLookup = { kind: 'assigned'; coach: Coach } | { kind: 'unassigned' } | { kind: 'unavailable' }`; `CoachBadge({ variant?, caption?, size?, fallback? })` where `fallback` is `'hide' | 'status'`.

- [ ] **Step 1: Write failing state tests**

```ts
it('normalizes an assigned coach', () => {
  expect(toCoachLookup([{ id: 'c1', full_name: 'Amal Manoj', avatar_url: null }])).toEqual({
    kind: 'assigned',
    coach: { id: 'c1', full_name: 'Amal Manoj', avatar_url: null },
  });
});

it('distinguishes no assignment from an unavailable RPC', () => {
  expect(toCoachLookup([])).toEqual({ kind: 'unassigned' });
  expect(toCoachLookup(null, new Error('missing function'))).toEqual({ kind: 'unavailable' });
});
```

Add `coachInitials()` coverage for multiple names, one name, whitespace, and null.

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/hooks/useCoach.test.ts src/components/coach/CoachBadge.test.tsx
```

- [ ] **Step 3: Implement the discriminated lookup**

Export pure `toCoachLookup(data, error?)`. The React Query function returns a `CoachLookup` instead of collapsing errors and no assignment to `null`. Keep `retry: false` and the 30-minute stale time.

- [ ] **Step 4: Render intentional fallbacks**

- `fallback="hide"`: preserve the current behavior for compact inline placements.
- `fallback="status"` with `unassigned`: render “No coach assigned yet.”
- `fallback="status"` with `unavailable`: render “Coach details are temporarily unavailable.”
- Assigned: render image or initials, name, caption, and a single combined accessibility label.
- Never render a fake name, placeholder portrait, or “coach updated” language for unavailable data.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/hooks/useCoach.test.ts src/components/coach/CoachBadge.test.tsx
npm run typecheck
git add mobile/src/hooks/useCoach.ts mobile/src/hooks/useCoach.test.ts mobile/src/components/coach/CoachBadge.tsx mobile/src/components/coach/CoachBadge.test.tsx
git diff --cached --check
git commit -m "fix(mobile): distinguish coach availability states"
```

### Task 2: Make measurements adaptive and test validation independently

**Files:**
- Create: `mobile/src/lib/measurement-validation.ts`
- Create: `mobile/src/lib/measurement-validation.test.ts`
- Modify: `mobile/src/components/measurements/MeasurementSheet.tsx`
- Modify: `mobile/app/(app)/measurements.tsx`
- Create: `mobile/src/components/measurements/MeasurementHistoryRow.tsx`
- Create: `mobile/src/components/measurements/MeasurementHistoryRow.test.tsx`

**Interfaces:**
- Produces: `MeasurementField`, `MeasurementDraft`, `validateMeasurementValue(value)`, `validateMeasurementDraft(draft)`, and a memoized history row.
- Consumes: `AdaptiveGrid`, existing measurement mutation, and chart components.

- [ ] **Step 1: Write failing validation tests**

```ts
it.each([
  ['', undefined],
  ['abc', 'Enter a number in centimetres.'],
  ['19', 'That looks off — expected 20–250 cm.'],
  ['251', 'That looks off — expected 20–250 cm.'],
  ['82.5', undefined],
])('validates %p', (value, expected) => {
  expect(validateMeasurementValue(value)).toBe(expected);
});
```

Add a draft test asserting errors remain keyed to `chest | waist | hips | thighs | arms`.

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/lib/measurement-validation.test.ts
```

- [ ] **Step 3: Extract validation and history row**

Move `FIELDS`, `FieldKey`, `Draft`, and validation from `MeasurementSheet` into the new library. Move `HistoryRow` into `MeasurementHistoryRow.tsx`. Keep stable `row.id` list keys and the existing combined accessibility label.

- [ ] **Step 4: Make the screen responsive**

- Replace the first two metric cards with `AdaptiveGrid`.
- Keep latest value/change above the chart and history.
- Raise chart-series filter chips from 36pt to 44pt.
- Allow baseline/latest value rows to stack in compact/large-text mode.
- Render a textual latest/change/source-date summary before the chart so the primary insight never requires chart exploration.
- Defer mounting the chart until its section is visible after initial interactions; do not animate chart values during scroll.
- Keep the sheet keyboard-aware and preserve inline validation, previous-value hints, save pending, error, and success announcement.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/lib/measurement-validation.test.ts src/components/measurements/MeasurementHistoryRow.test.tsx
npm run typecheck
git add mobile/src/lib/measurement-validation.ts mobile/src/lib/measurement-validation.test.ts mobile/src/components/measurements/MeasurementSheet.tsx mobile/src/components/measurements/MeasurementHistoryRow.tsx mobile/src/components/measurements/MeasurementHistoryRow.test.tsx 'mobile/app/(app)/measurements.tsx'
git diff --cached --check
git commit -m "fix(mobile): adapt measurement progress layouts"
```

### Task 3: Make progress-photo states explicit and accessible

**Files:**
- Create: `mobile/src/components/media/PhotoSlot.tsx`
- Create: `mobile/src/components/media/PhotoSlot.test.tsx`
- Modify: `mobile/src/components/media/PhotoCaptureSheet.tsx`
- Modify: `mobile/src/components/media/PhotoViewer.tsx`
- Modify: `mobile/app/(app)/media.tsx`

**Interfaces:**
- Consumes: current `SlotState`, `AngleKey`, picker/upload callbacks, and Reduced Motion.
- Produces: `PhotoSlot({ angle, state, ghostUrl, showGuide, onChoose, onRemove })` with explicit empty, selected, uploading, failed, and uploaded states.

- [ ] **Step 1: Write failing slot-state tests**

```tsx
it.each([
  [{ url: null, pendingUri: null, uploading: false, error: null }, 'Front photo, empty'],
  [{ url: null, pendingUri: 'file://front.jpg', uploading: false, error: null }, 'Front photo, selected and not uploaded'],
  [{ url: null, pendingUri: 'file://front.jpg', uploading: true, error: null }, 'Front photo, uploading'],
  [{ url: null, pendingUri: 'file://front.jpg', uploading: false, error: 'Upload failed' }, 'Front photo, upload failed'],
] as const)('announces the slot state', (state, label) => {
  const { getByLabelText } = renderPhotoSlot(state);
  expect(getByLabelText(label)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/media/PhotoSlot.test.tsx
```

- [ ] **Step 3: Extract the slot component and correct targets**

Move slot rendering out of `PhotoCaptureSheet`. The whole thumbnail remains the choose/replace action. Remove and Library actions become at least 44pt high. Uploading sets `accessibilityState={{ busy: true, disabled: true }}`. A failed pending image retains its URI and exposes a visible “Retry upload” action.

Use `expo-image` with explicit slot dimensions, `contentFit="cover"`, `cachePolicy="memory-disk"`, and a stable `recyclingKey`. Photo-history cards mount only their display-size thumbnails; full-display images mount only while `PhotoViewer` or comparison mode is open. Verify memory behavior with the release matrix rather than adding a second image-storage pipeline.

- [ ] **Step 4: Add truthful privacy and permission context**

Place this fixed copy before the slots:

```text
Photos upload to Dawnage only after you tap Save photos. They are used for progress review with your coaching team. You can leave any angle empty and return later.
```

Permission denial continues to offer Cancel and Open Settings. Do not say “private,” “encrypted,” or “only your coach” in UI copy unless the release-hardening storage review proves those claims.

- [ ] **Step 5: Improve viewer focus and position announcements**

On open and Previous/Next, announce `“Front photo, Week 3, 1 of 4”`. Keep explicit buttons, safe-area handling, and Reduced Motion fade removal. Pager dots remain decorative and are hidden from accessibility.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- src/components/media/PhotoSlot.test.tsx
npm run typecheck
git add mobile/src/components/media/PhotoSlot.tsx mobile/src/components/media/PhotoSlot.test.tsx mobile/src/components/media/PhotoCaptureSheet.tsx mobile/src/components/media/PhotoViewer.tsx 'mobile/app/(app)/media.tsx'
git diff --cached --check
git commit -m "feat(mobile): clarify progress photo states"
```

### Task 4: Add resilient weekly-feedback draft, validation, and exit behavior

**Files:**
- Create: `mobile/src/lib/weekly-feedback.ts`
- Create: `mobile/src/lib/weekly-feedback.test.ts`
- Create: `mobile/src/hooks/useWeeklyFeedbackDraft.ts`
- Create: `mobile/src/hooks/useWeeklyFeedbackDraft.test.ts`
- Modify: `mobile/app/(app)/weekly-feedback.tsx`

**Interfaces:**
- Produces: `validateWeeklyStep(step, form)`, `weeklyDraftKey(userId)`, and `useWeeklyFeedbackDraft(userId)` returning `{ loadDraft, saveDraft, clearDraft, draftStatus }`.
- Consumes: `WEEKLY_STEPS`, AsyncStorage, `StatusPill`, and the shared sticky action bar.

- [ ] **Step 1: Write failing validation tests**

```ts
it('rejects invalid numeric values without changing optional text fields', () => {
  expect(validateWeeklyStep(2, { ...emptyWeekly(), step_count: '-1' })).toEqual({
    step_count: 'Enter a step count of zero or more.',
  });
  expect(validateWeeklyStep(3, { ...emptyWeekly(), water_intake: '25', stress_level: '11' })).toEqual({
    water_intake: 'Enter water between 0 and 20 litres.',
    stress_level: 'Choose a stress level from 1 to 10.',
  });
});
```

Also test allowed radio values and that optional blank responses remain valid; this plan does not invent new required business fields.

- [ ] **Step 2: Write failing draft-state tests**

Use fake timers and mocked AsyncStorage to assert `saving → saved`, restored step bounds, corrupted-draft fallback, and `error` without clearing the in-memory form.

- [ ] **Step 3: Run tests to verify failure**

```bash
npm test -- src/lib/weekly-feedback.test.ts src/hooks/useWeeklyFeedbackDraft.test.ts
```

- [ ] **Step 4: Implement helpers and migrate the screen**

- Move storage effects to `useWeeklyFeedbackDraft` with a 500ms debounce.
- Validate the active step before moving forward and render field errors inline.
- Use `StatusPill` in `StickyActionBar` beside step count.
- Intercept back/navigation while a dirty unsent draft exists with Keep editing, Save draft & exit, and Discard draft actions.
- Scroll/focus the error summary on invalid submit; announce every new step.
- Preserve submission values on network failure and expose Retry.

- [ ] **Step 5: Virtualize history**

Extract a memoized `WeeklyFeedbackHistoryCard` and render history with `AnimatedFlatList`, stable IDs, `initialNumToRender={6}`, and `windowSize={5}`. The start card remains the list header. Do not fabricate coach replies; render only submitted answers and server fields that exist in the typed data contract.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- src/lib/weekly-feedback.test.ts src/hooks/useWeeklyFeedbackDraft.test.ts
npm run typecheck
git add mobile/src/lib/weekly-feedback.ts mobile/src/lib/weekly-feedback.test.ts mobile/src/hooks/useWeeklyFeedbackDraft.ts mobile/src/hooks/useWeeklyFeedbackDraft.test.ts 'mobile/app/(app)/weekly-feedback.tsx'
git diff --cached --check
git commit -m "feat(mobile): harden weekly feedback flow"
```

### Task 5: Reorganize More and Profile around user goals

**Files:**
- Modify: `mobile/app/(app)/(tabs)/more.tsx`
- Modify: `mobile/app/(app)/(tabs)/index.tsx`
- Modify: `mobile/app/(app)/profile.tsx`
- Create: `mobile/src/components/coach/CoachStatusCard.tsx`
- Create: `mobile/src/components/coach/CoachStatusCard.test.tsx`

**Interfaces:**
- Consumes: `CoachLookup`, `ListRow`, and the corrected `Screen` contract.
- Produces: `CoachStatusCard({ lookup })` and three More groups: Coaching, Progress, Account.

- [ ] **Step 1: Write failing coach-status tests**

```tsx
it.each([
  [{ kind: 'unassigned' as const }, 'No coach assigned yet'],
  [{ kind: 'unavailable' as const }, 'Coach details are temporarily unavailable'],
])('renders a truthful fallback', (lookup, copy) => {
  const { getByText } = render(<CoachStatusCard lookup={lookup} />);
  expect(getByText(copy)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
npm test -- src/components/coach/CoachStatusCard.test.tsx
```

- [ ] **Step 3: Build the coach status card**

Assigned state renders the existing coach identity with “Your coach.” Unassigned and unavailable states use the exact copy in the tests and a neutral icon, not an error-colored alarm. There is no message CTA until a supported route and authorized backend thread exist.

- [ ] **Step 4: Reorganize More and Profile**

- **Coaching:** Weekly feedback.
- **Progress:** Measurements and Progress photos.
- **Account:** Profile and Settings.
- Place `CoachStatusCard` below the More heading.
- On Home, render the compact `CoachBadge fallback="status"` in the greeting/date block; allow long coach names and fallback text to wrap without displacing the primary action.
- In Profile, use `CoachBadge fallback="status"`; keep profile and assessment tabs.
- Ensure Program date rows stack in compact/large-text mode and preserve the single safe-area owner established in Plan 1.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- src/components/coach/CoachStatusCard.test.tsx src/components/coach/CoachBadge.test.tsx
npm run typecheck
git add mobile/src/components/coach/CoachStatusCard.tsx mobile/src/components/coach/CoachStatusCard.test.tsx 'mobile/app/(app)/(tabs)/index.tsx' 'mobile/app/(app)/(tabs)/more.tsx' 'mobile/app/(app)/profile.tsx'
git diff --cached --check
git commit -m "feat(mobile): clarify coaching and progress navigation"
```

### Task 6: Normalize progress-screen state coverage

**Files:**
- Modify: `mobile/app/(app)/measurements.tsx`
- Modify: `mobile/app/(app)/media.tsx`
- Modify: `mobile/app/(app)/weekly-feedback.tsx`
- Modify: `mobile/src/components/measurements/MeasurementSheet.tsx`
- Modify: `mobile/src/components/media/PhotoCaptureSheet.tsx`

**Interfaces:**
- Consumes: `SkeletonCard`, `EmptyState`, `ErrorState`, `StatusPill`, and current React Query status.
- Produces: consistent initial-loading, loaded, empty, partial, saving, failed, and retry behavior across the three flows.

- [ ] **Step 1: Add focused state tests**

For each screen, mock the data hook and assert:

```ts
expect(renderState('loading').getByTestId('progress-skeleton')).toBeTruthy();
expect(renderState('error').getByRole('button', { name: 'Retry' })).toBeTruthy();
expect(renderState('empty').getByRole('button')).toBeTruthy();
```

For sheets, assert a failed save retains entered values and exposes a retry action.

- [ ] **Step 2: Run tests to verify incomplete state coverage**

```bash
npm test -- src/components/measurements src/components/media
```

- [ ] **Step 3: Implement consistent state composition**

- Measurements: shape-matched metric/chart/history skeleton; error with Retry; baseline-oriented empty action.
- Media: shape-matched photo cards; error with Retry; privacy-aware first-photo action.
- Weekly feedback: query error with Retry, history empty explanation, draft status, submit retry.
- Keep partial photo sets and partial measurements visible; do not replace useful content with a full-screen error when only one operation fails.

- [ ] **Step 4: Run the plan suite**

```bash
npm test -- src/hooks/useCoach.test.ts src/components/coach/CoachBadge.test.tsx src/components/coach/CoachStatusCard.test.tsx src/lib/measurement-validation.test.ts src/components/measurements/MeasurementHistoryRow.test.tsx src/components/media/PhotoSlot.test.tsx src/lib/weekly-feedback.test.ts src/hooks/useWeeklyFeedbackDraft.test.ts
npm run typecheck
```

Expected: PASS and exit 0.

- [ ] **Step 5: Commit**

```bash
git add 'mobile/app/(app)/measurements.tsx' 'mobile/app/(app)/media.tsx' 'mobile/app/(app)/weekly-feedback.tsx' mobile/src/components/measurements/MeasurementSheet.tsx mobile/src/components/media/PhotoCaptureSheet.tsx
git diff --cached --check
git commit -m "fix(mobile): complete progress screen states"
```

## Plan 4 completion gate

- [ ] Verify Measurements, Photos, Weekly Feedback, More, and Profile at 320dp width and font scale 1.30.
- [ ] Deny camera and photo-library permission; confirm Cancel and Open Settings paths.
- [ ] Fail an individual upload; confirm the local image remains and Retry succeeds.
- [ ] Confirm partial photo sets and partial measurement rows remain usable.
- [ ] Confirm assigned, unassigned, and unavailable coach states never display fabricated identity.
- [ ] Traverse one full flow with VoiceOver and one with TalkBack.
- [ ] Run `npm test -- --runInBand`, `npm run typecheck`, and `npx expo install --check`.

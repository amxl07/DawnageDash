# 03 — Mobile UX Standards (binding on every phase)

Derived from the `ui-ux-pro-max` mobile/native rule set (app-interface + react-native stack guidelines + pro-rules pre-delivery checklist), applied to this app. `02-design-system.md` says what it *looks* like; this file says how it *behaves*.

**These are acceptance criteria for every phase, not Phase 8 polish.** A screen that violates one of these is not done. Phase 8 is a *verification* pass over these rules, not the place they first get applied.

---

## A. Accessibility (CRITICAL — the plan had zero coverage before this file)

1. **Every icon-only control** gets `accessibilityRole="button"` + a descriptive `accessibilityLabel`. `<Pressable>` with only an icon child and no label is a bug.
2. **Every input** has a visible `<Text>` label paired with `accessibilityLabel`. Placeholder-as-label is banned.
3. **Composite controls** expose state: `ScalePicker` → `accessibilityRole="adjustable"` + `accessibilityValue={{min:1,max:10,now:n}}` + `onAccessibilityAction` for increment/decrement. `SegmentedControl` → `accessibilityRole="radio"` per option with `accessibilityState={{selected}}`. `Stepper` → `adjustable`.
4. **Decorative icons** (the icon inside an empty state, chart glyphs) → `accessible={false}` / `importantForAccessibility="no"`, so the reader doesn't narrate them.
5. **Async results are announced**: after a check-in saves, a measurement saves, or a workout syncs, call `AccessibilityInfo.announceForAccessibility(...)` (or wrap the status text in `accessibilityLiveRegion="polite"`). Silent success is invisible to a screen-reader user.
6. **Color is never the only carrier of meaning.** Score colors pair with the numeral; chart series pair with line style (§02.2); the green "set complete" ring pairs with a check glyph; the workout-status badge pairs with its text.
7. **Charts get a text equivalent**: an `accessibilityLabel` summarising the series in one sentence — `"Weight, last 7 days, down 0.8 kilograms, from 82.4 to 81.6"` — plus, where the plan already builds a table (check-in history), that table *is* the fallback.
8. **Touch targets ≥44×44** with ≥8 spacing. Reach it with padding; `hitSlop` only when layout genuinely forbids padding.
9. **Dynamic Type**: `allowFontScaling` stays on. Every screen must survive the largest system text size without clipping or overlap.
10. **Reduced motion** per §02.6 — wired into the theme module in Phase 1 so it is inherited, not retrofitted.
11. Screen-reader focus order must match visual order. Test one screen per phase with VoiceOver or TalkBack and say which in the phase summary.

## B. Touch, gesture & navigation

1. **Pressed feedback within 120ms** on everything tappable (scale 0.97 + opacity, or Android ripple). Never a state change with no feedback.
2. **No gesture-only actions.** Every swipe has a visible equivalent — the workout carousel gets prev/next affordances and a tappable dot pager; a swipe-to-dismiss sheet also gets a close button.
3. **Horizontal-swipe conflict**: the workout logger's exercise carousel fights the iOS back-swipe. On the logger route set `gestureEnabled: false` and provide an explicit X / "Close" in the header. Same rule anywhere else a horizontal pan owns the full width.
4. **Back behaviour is predictable**: `router.back()` preserves the previous screen's scroll position and form state. Android hardware back must never exit the app from a nested screen or silently drop a dirty form — dirty forms prompt (the logger's discard confirm is the pattern; reuse it for the weekly-feedback wizard and the measurement sheet).
5. **Bottom tabs stay at 5.** Anything new goes under More.
6. **Modal escape** is always obvious: a close button *and* swipe-down where the platform expects it.
7. **Screen state is preserved** across tab switches — list scroll offsets and half-filled forms survive navigating away and back.

## C. Forms (check-in, measurements, weekly feedback, profile, logger)

1. **Correct keyboard per field**: `decimal-pad` for weight/water/measurements, `number-pad` for steps/calories/reps, `email-address`, `phone-pad`, `default` + `multiline` for notes.
2. **`onSubmitEditing` chains to the next field**; the last field submits. Never make the user tap every field.
3. **`KeyboardAvoidingView`** (`behavior: padding` iOS / `height` Android) on every screen with an input, plus `keyboardShouldPersistTaps="handled"` on the scroll view so a tap on a button while the keyboard is open registers first time.
4. **Validate on blur and on submit — never per keystroke.** Errors render inline, directly under the offending field, in words ("Weight must be between 20 and 300 kg"), not as a bare red border.
5. **Sticky bottom action bar** on long forms (check-in, logger, measurement sheet), inside the safe area, with `contentInsetBottom` on the scroll view so the last field is never trapped behind it.
6. **Password fields** get a show/hide toggle (Phase 2).
7. **Destructive or lossy actions confirm**: discarding a dirty draft, removing a photo, signing out.

## D. Lists & performance

1. **`FlatList` (or `FlashList`) for anything unbounded** — check-in history, workout-log weeks, measurement history, media grid, country picker (~250 rows), questionnaire sections. `ScrollView` + `.map()` is acceptable only for a fixed, short set.
2. Always `keyExtractor` on a stable id (never the index), `React.memo` on the row component, a named `renderItem`, and `getItemLayout` where row height is fixed.
3. **Tune the window**: `initialNumToRender` ≈ one screenful, `windowSize` 5–7 for long lists.
4. `expo-image` with `cachePolicy="memory-disk"` and explicit dimensions for every remote image (progress photos) — prevents layout shift and repeated downloads.
5. Debounce high-frequency handlers (draft autosave 500ms, exercise search 250ms, country search 200ms).
6. Memoize chart data with `useMemo`; never rebuild a series array on every render.

## E. Feedback & states

1. Any operation over ~300ms shows a **skeleton shaped like the content it replaces** — never a bare centred spinner on a full screen (the one exception is auth boot).
2. Every query has three designed states: **loading (skeleton) · error (message + Retry) · empty (icon + one encouraging line + primary action)**. All three ship with the screen, in the same phase.
3. Every successful write produces visible confirmation — toast, inline checkmark, or the payoff line the phase specifies. Nothing succeeds silently.
4. Errors say what to do next. "Couldn't save — check your connection and tap Retry", not "Error: PGRST116".
5. Buttons show an in-place pending state and are disabled while in flight — double-submit must be impossible (this matters most where a UNIQUE constraint exists: `daily_check_ins`).

## F. Layout & safe areas

1. `Screen` wrapper applies safe-area insets. Nothing tappable sits under the notch, status bar, home indicator, or Android nav bar.
2. Scroll content gets bottom inset for the tab bar **and** any sticky action bar.
3. Horizontal inset 16 (24 at ≥768dp width). 4/8 spacing rhythm throughout — no arbitrary values.
4. Portrait-locked (`app.json`) — flag it in Phase 1 in case the user wants otherwise.
5. Long-form text (plan notes, questionnaire prose) capped at a readable measure on wide screens; not edge-to-edge on a tablet.

## G. Theming

1. Both themes are built at the same time as the screen, never inferred from one another. Every phase's acceptance criteria include "checked in both themes".
2. Semantic tokens only. No hex outside `src/theme/` (grep check in Phase 8).
3. Pressed / focused / disabled states are distinguishable in **both** themes.
4. Modal scrim per §02.1 — strong enough that background content stops competing.

---

## Per-phase quick check (run before declaring any phase done)

- [ ] Every new interactive element: label, role, ≥44pt, pressed feedback
- [ ] Every new input: right keyboard, blur validation, inline error, next-field chaining, keyboard avoidance
- [ ] Every new list: FlatList + keyExtractor + memoized row
- [ ] Every new query: skeleton + error+retry + empty state
- [ ] Reduced-motion path checked; largest Dynamic Type checked
- [ ] Both themes checked on every new screen
- [ ] One screen from this phase traversed with a screen reader (name it in the summary)
- [ ] `npx tsc --noEmit` clean

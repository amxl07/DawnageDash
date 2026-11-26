# Minimalist main tabs — source review

Reviewed on 2026-10-09 against the pre-change copies in `/Users/manojthomas/.cache/dawnage-cleanup/2026-10-09-resume`. This review covers the eleven specified existing UI files and the new `DetailDisclosure.tsx`; it does not treat older dirty-tree work as part of this change.

## Preserved behavior

- Home keeps draft resume actions with their original reporting dates and keeps pending/blocked delivery recovery outside its disclosure. Weekly draft and error recovery also remain visible.
- Check In retains the earlier-draft action, date-aware editor navigation, and history sheet entry. The first-check-in submission consequence remains visible in the unchanged editor review step.
- Training retains session start/continue/repeat actions and exercise details. Template plans remain identified as previews, with no start action introduced.
- Nutrition retains each prescribed meal, target, listed totals, supplement instructions, and coach notes behind disclosures. A visible cue remains when totals are incomplete or differ from the target.
- New disclosure controls have button roles, expanded state, and sufficient minimum touch-target height. Normal numeric detail being collapsed is consistent with the requested scope.

## Findings

### P2 — Include the nutrition warning in the disclosure's accessible name — resolved

**Location:** `mobile/src/components/ui/DetailDisclosure.tsx:13`, used by `mobile/src/features/nutrition/MealPlanDetails.tsx:40`.

The initial implementation set `accessibilityLabel={title}`. When nutrition totals need review, the visual trigger also contains `Meal totals need review`, but that descendant text was omitted from the trigger's explicit accessible name. With the disclosure closed, a screen-reader user would hear only `Nutrition details` and miss the warning that tells a sighted user to inspect the discrepancy.

**Fix:** Include `notice` in the accessible label when present, or expose the warning as a separate accessible sibling. Verify the collapsed warning state exposes both the title and notice while preserving the expanded state.

**Resolution verified in source:** The explicit accessible label now combines `title` and `notice` when a notice is present, so the collapsed warning is exposed as `Nutrition details. Meal totals need review`. The expanded state remains on the same trigger. Finding closed.

## Follow-up checks

Checked the final component declarations and all production call sites for `TodayBrief`, `ProgramWelcome`, and `MealPlanDetails`; their removed and added props are consistent. `DetailDisclosure` is imported directly at every use and receives compatible props and children. Inspected the final Home loading/error/empty-plan branches and Nutrition empty-meal branch; no new render gap was identified. The implementation agent's `verification/typecheck.log` contains no TypeScript diagnostics; this reviewer did not rerun the compiler or independently establish its exit status.

## Assessment

The source reviews are complete with no open findings. All three reported P2 issues are fixed, including the final responsive tab-label issue. No substantive unresolved source issue was identified in the guide or receipt refinements. No source code was edited by this reviewer. Runtime and test verification remain owned by the implementation agent.

This is a source review only. Tests and browser checks are owned by the implementation agent; this reviewer did not run them. Native layout, VoiceOver, and TalkBack behavior were not exercised.

## Phase 4 follow-up: receipt announcements and weekly cleanup

Compared `CompletionLayout.tsx` and `app/(app)/weekly-feedback.tsx` with the same October 9 snapshot. Inspected their callers, `RecordStatus`, and the unchanged weekly controller. The supplied RED log records both targeted failures; GREEN records 46 passing tests across the workout summary, weekly feedback, and check-in receipt suites. These runs were performed by the implementation agent.

- **Weekly cleanup: no finding.** `weekly-feedback.tsx:128` now prefers `exitError`, exposing the failure from “Retry & exit.” Neither retry path calls the insertion function: the screen calls `retryCleanup`, and the exit alert calls `clearDraft`; submission remains guarded by `cleanupRequired`. The regression test verifies one insert across failed cleanup and successful exit.
- **Duplicate announcements: no new duplicate path identified.** `CompletionLayout.tsx:25` initializes its previous state on mount and only announces a changed receipt state on native when the status pill is absent. The heading's live region is web-only, and `RecordStatus` is mutually exclusive with the new announcement. Unchanged-state rerenders cannot announce again. Explicit check-in submission mounts its receipt after editing and retains the editor's existing submit announcement.

### P2 — Today's queued check-in can still become synced without an announcement — resolved

**Location:** `mobile/src/features/completion/CompletionLayout.tsx:25`, in combination with the existing branch in `mobile/src/features/checkin/components/CheckInCompletion.tsx:16`.

Before the follow-up fix, `CheckInCompletion` returned a direct `CheckInReceipt` while queued, then a `CurrentCompletion` wrapper once today's record synced. This changed the component type and remounted the receipt/header. The header initialized `previousState` to `synced`, so its transition guard was false and no native announcement ran. The direct `CheckInReceipt` tests did not cover the wrapper change.

**Fix:** Preserve the receipt/header component identity across this delivery transition, or let a stable owner announce the transition with a single owner for speech. Verify through `CheckInCompletion` that a queued-to-synced update for today announces once, while initial mount and an unchanged-state rerender remain quiet.

**Resolution verified in source:** `CheckInCompletion.tsx:18` now always returns `CheckInReceipt`. Only the action slot changes, preserving the header's identity across delivery updates. `CurrentCompletionAction` mounts only for today's synced receipt, so its profile/plan/local hooks remain deferred until acknowledgment. `CheckInReceipt.tsx:33` retains the fallback Home button, and Edit remains available. The final call sites match the new `ReactNode` action-slot type.

Reviewed `completion-transition-red.log`, which reproduces zero announcements through the real wrapper, and `completion-transition-green.log`, which records 25 passing completion/receipt/workout tests. The added test verifies exactly one announcement on today's queued-to-synced transition, silence on initial mount and unchanged-state rerender, and no plan reads before acknowledgment. These tests were run by the implementation agent. Finding closed; no further source issue identified.

## Final guide and web tab refinements

No unresolved guide or receipt source issue was identified. `CheckInGuideSheet` retains the no-save practice boundary, agreed time/reporting date, required-field and sleep-date instructions, and direction to log individual sets in Training. `heightRatio={0.85}` resolves to one supported `85%` detent; the content remains in `SheetScrollView`, with the existing close handler and focus-return reference intact at both Home and onboarding call sites. The stable receipt/header and deferred current-day action remain intact.

`AppTabs.web` now uses intrinsic height (`height: 'auto'`, `minHeight: 64`) and explicitly keeps labels below icons. The installed Expo Router tab bar preserves safe-area padding and reports its measured height through its layout callback, so the bar is not restricted to the earlier fixed 64 pixels. Its custom `Text` has no one-line limit and uses the navigator-provided color and label. Stretching and the negative horizontal margin reclaim the installed navigator's five-pixel button padding within this consistent vertical layout. Titles, explicit accessibility labels, check-in badge, and route names are unchanged. Final label fit and guide-button reachability remain owned by the implementation agent's browser checks. No app or persistence logic changed in these deltas.

### P2 — Restrict the label padding compensation to labels below icons — resolved

**Location:** `mobile/src/components/navigation/AppTabs.web.tsx:13`.

Before the follow-up fix, the label used `alignSelf: 'stretch'` and `marginHorizontal: -5` while allowing the installed navigator to switch to labels beside icons in landscape and at tablet widths. In that horizontal row, stretching would make the text fill the bar's cross-axis instead of vertically centering it, while the negative leading margin would move it toward/into the icon rather than reclaiming the tab's outer padding. The intended width correction applies to the below-icon layout.

**Fix:** Explicitly select `tabBarLabelPosition: 'below-icon'` for this layout, or branch on the supplied `position` and keep beside-icon labels centered with a positive leading gap. Intrinsic bar height can remain unchanged.

**Resolution verified in source:** `tabBarLabelPosition: 'below-icon'` is now explicit. The installed navigator checks this option before its landscape/tablet heuristics, preserving the vertical layout expected by the wrapping-label styles at every width. Intrinsic bar height remains in place. Finding closed.

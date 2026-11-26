# Restore the pre-minimization design

**Goal:** Roll back the October 9 minimalist visual changes and October 10 pearl/cobalt theme at the user's request.

**Architecture:** Restore verified working-source snapshots, rather than Git HEAD, because the earlier functional improvements are still uncommitted. Preserve subsequent documentation references and the accessibility/reliability fixes mixed into those sessions.

**Spec:** User request on October 13: undo the color-theme switch and the last minimization because the app feels too empty.

**Constraints:** Keep earlier cleanup, workout suggestions/steppers/Undo, required check-in fields/grouping/counter, data compatibility, drafts and native integrations. No checkout, reset, staging, commit, push or backend writes. Back up every touched file outside the repository before mutation.

## Steps

- [x] Verify snapshot and current-file hashes; store recoverable backups in `/Users/manojthomas/.cache/dawnage-design-rollback/2026-10-12T20-58-58.331Z`.
- [x] Restore the following files from the manifest sources, removing DetailDisclosure only after restoring every production consumer:
  - `mobile/app/(app)/(tabs)/index.tsx`
  - `mobile/app/(app)/(tabs)/more.tsx`
  - `mobile/docs/review/2026-10-03-cleanup-implementation/scripts/capture-flows.mjs`
  - `mobile/docs/review/2026-10-03-cleanup-implementation/scripts/cleanup-journeys.mjs`
  - `mobile/scripts/capture-redesign.mjs`
  - `mobile/scripts/guided-journeys.mjs`
  - `mobile/src/components/plans/PlanDayCard.test.tsx`
  - `mobile/src/components/plans/PlanDayCard.tsx`
  - `mobile/src/features/checkin/CheckInHub.test.tsx`
  - `mobile/src/features/checkin/CheckInHub.tsx`
  - `mobile/src/features/home/HomeDetails.tsx`
  - `mobile/src/features/home/NextSessionCard.tsx`
  - `mobile/src/features/home/TodayBrief.tsx`
  - `mobile/src/features/nutrition/MealPlanDetails.tsx`
  - `mobile/src/features/nutrition/nutrition-screen.tsx`
  - `mobile/src/features/program/CheckInGuideSheet.tsx`
  - `mobile/src/features/program/ProgramWelcome.tsx`
  - `mobile/src/features/training/training-plan.tsx`
  - `mobile/src/screens/__tests__/tabs/index.test.tsx`
  - `mobile/src/screens/__tests__/tabs/more.test.tsx`
  - `mobile/src/screens/__tests__/tabs/nutrition.test.tsx`
  - `mobile/src/screens/__tests__/tabs/plans.test.tsx`
  - `mobile/src/components/ui/DetailDisclosure.tsx`
  - `mobile/src/theme/colors.ts`
  - `mobile/src/theme/tokens.ts`
  - `mobile/src/components/brand/DawnGlow.tsx`
  - `mobile/src/components/navigation/AppTabs.tsx`
  - `mobile/src/components/navigation/AppTabs.web.tsx`
  - `mobile/app.json`
- [x] Keep saved-record announcements, weekly exit errors, accessible web tab labels, removed unused check-in affirmations and the 85% practice-guide sheet. Align DESIGN.md with the restored layouts.
- [x] Run mobile TypeScript and UI contracts: both passed. Verify all 30 rollback targets and 553 protected file hashes; no unexpected changes. Document verification limits in the rollback report.
- [ ] Complete affected Jest, scoped lint and fixture browser checks: attempted but unfinished due to prolonged local file loading/startup. Jest was interrupted after 13m 27s, lint reached its 6m limit, and the isolated preview did not serve HTML within 3m. Native-device verification remains outstanding. These limits do not imply test passes.

The application restoration is performed by a guarded snapshot-copy script. Original and target SHA-256 values are in `/Users/manojthomas/.cache/dawnage-design-rollback/2026-10-12T20-58-58.331Z/manifest.json`.

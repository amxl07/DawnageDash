# Vetted source audit

17 September 2026 · commit `8ec16a7` plus working-tree changes. Three read-only audits covered shared infrastructure, daily workflows and supporting features. The cited implementations were re-read before accepting these findings. This is source evidence, not a native frame-rate or accessibility certification.

| ID | Priority / category | Source anchor | Finding | Planned treatment |
| --- | --- | --- | --- | --- |
| A1 | High · data truth prerequisite | `app/(app)/measurements.tsx:158–167`; `src/types/db.ts:46–49` | Nullable observations become zero through `num()`; index labels `W0/W1` also imply regular week spacing. | Nullable chart adapter, actual dates and gaps before graphics polish. Do not change the shared numeric helper globally. |
| A2 | High · accessibility | `src/theme/ThemeProvider.tsx:78–89`; installed Reanimated `src/hook/useReducedMotion.ts:4–18` | `useMotion()` relies on Reanimated's startup snapshot; OS changes do not rerender the policy. | Live system preference, resume handling, cancellation of ongoing motion. |
| A3 | High · platform correctness | `src/components/media/PhotoViewer.tsx:51–55,76–79`; `app/(app)/weekly-feedback.tsx:332–340` | Unguarded `findNodeHandle` reaches a web implementation that throws (`react-native-web/dist/exports/findNodeHandle/index.js:11–12`). | Reuse the platform-safe focus pattern already established in Sheet. Runtime reproduction remains a verification step. |
| A4 | Medium · frequent feedback | `src/components/ui/Button.tsx:42–51,68–79`; `ThemeProvider.tsx:85` | Button press feedback is scale-only; reduced motion sets scale to 1, removing visible acknowledgement. | Immediate contrast-safe pressed surface in every motion mode. |
| A5 | Medium · causal feedback | `src/components/checkin/CheckInRatingScale.tsx:60–70,77–100` | Press response runs when `active` changes, including restored selected values; a held press has no press-in feedback. | Move touch response to press lifecycle, keep selection semantics and one haptic. |
| A6 | Medium · haptic ownership | `src/components/logger/CurrentSetEditor.tsx:71`; `app/(app)/logger.tsx:215`; `useRestTimer.ts:239–251` | One completion requests a light impact, then auto-start rest requests another. | One feedback owner; explicit timer start still has feedback. This proves duplicate API calls, not measured hardware double vibration. |
| A7 | Medium · large-text risk | `src/components/ui/AnimatedNumber.tsx:80,85–87,119–128` | Fixed clipping geometry uses unscaled type sizes while native text scales. | Plain-number fallback at enlarged text or correctly measured dimensions. Verify real native rendering. |
| A8 | Medium · transient contrast risk | `src/components/ui/SegmentedControl.tsx:49–56,128–139` | Selected text becomes white before its animated background arrives. Light mode can have low contrast during transit. | Selected fill/text update coherently; inspect intermediate frames. |
| A9 | Medium · density | `app/(app)/(tabs)/plans.tsx:180–229` and `PlanDayCard.tsx` expanded exercise list | Exercises appear in an expanded day and in a separate always-visible details list. | One day-level exercise list with all detail actions preserved. |
| A10 | Medium · touch consistency | `CurrentSetEditor.tsx:75–83`; `ExerciseSlide.tsx:81–85`; `RestDock.tsx:94`; `TodayBrief.tsx:82,99` | Several custom links/disclosures have no touch-down visual state. | Add immediate tint using the shared pattern; no decorative bounce required. |
| A11 | Low · cohesion | `src/components/ui/AnimatedList.tsx:25–27` | Hardcoded 260/220/160 timings bypass shared entry/exit tokens. | Use tokens where animation is appropriate; do not add list entrances to routine scrolling. |

## Four additive opportunities

1. **Anchored authoring transitions.** `ExerciseSlide.tsx:60–78` directly swaps the set editor and completion block. `OptionalCheckInFields.tsx:48–57` mounts content/reverses its chevron immediately. Add only a ≤160 ms local treatment while retaining numeric flush (`:27`), stable IDs, keyboard and explicit continuation.
2. **A factual receipt signature.** `CheckInReceipt.tsx` and `WorkoutSummary.tsx` have good explicit delivery-state copy. A finite path/check can reinforce a new result while leaving queued/synced/blocked distinct and actions immediately available.
3. **Direct chart inspection.** `src/features/home/RecentRecord.tsx:40–56` already supports dated tap selection and accessible adjustment. Continuous horizontal inspection and a persistent readable label are a focused Skia/SVG comparison, not a reason to invent scores.
4. **Supporting-flow continuity.** `SetupStage.tsx:22–60`, log expansion (`logs.tsx:103–123`) and weekly stage replacement can share the same restrained selection/disclosure/heading language. For weekly transitions, establish the new scroll/focus position before adding decoration.

## Keep these decisions

- Current Home uses `src/features/home`, not legacy dashboard components. Unused `StreakHero`, `ConsistencyGrid`, `Celebration`, `CircularTimer`, `SetEditor`, BarChart and DonutChart are not evidence of current screen behavior.
- Tabs deliberately use `animation: 'none'`; native stack transitions remain platform-owned. Do not replay card entrances on tab focus.
- Glass-capable tabs and a live reduced-transparency hook already exist. Add API availability hardening before expanding glass use, rather than claiming the app has no glass support.
- The repaired Sheet has explicit snap sizing, a measured handle/header, keyboard-aware input, dirty-dismiss guards and focus restoration. Do not undo those for presentation effects.
- Current forms use direct entry and tap ratings. The progress underline in rating choices is deliberate. Do not restore precision rulers or ten tiny controls squeezed across one row.
- Workout rest already uses absolute time and separate display/actions contexts. Swipe already uses shared values and release velocity with explicit button alternatives. No source-only claim of dropped frames or a leaking timer is justified.
- Charts retain values and provenance outside graphics, and measurement series use dash patterns. Improve missing-data handling while keeping these strengths.

No repository content attempting to redirect the audit was identified in the inspected files. Existing product design decisions were treated as evidence of intent.

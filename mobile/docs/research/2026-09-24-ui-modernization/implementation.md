# Dawnage native UI implementation — 24 September 2026

The implementation follows the restrained Apple-like direction with Dawnage branding. Navigation and ordinary actions use native iOS controls; content uses opaque, quiet surfaces. Android has native tabs and a consistent custom control fallback; web has its own navigation adapter. No dependencies, record schemas or backend contracts were replaced.

**Subsequent daily check-in correction:** all measurement fields and notes are required for submission. The optional disclosures were removed. See the [required check-in implementation record](required-check-in.md) for this follow-up and its current evidence; the initial modernization captures below record the earlier form.

Source baseline: `4ad68d3`, branch `codex/native-ui-modernization`. This document records implementation and source/browser checks, not approval of an immutable native binary. The initial Home/Training screenshots were captured after route work began and before the shared visual controls landed; their manifests correctly mark the source as dirty. They are comparison evidence, not captures of an untouched checkout.

## Phase disposition

| Phase | Implementation |
| --- | --- |
| 0 — baseline | Clean source checkpoint recorded. Home/Training baseline images reviewed. Added opt-in development control gallery. Native hardware/toolchain validation remains unavailable. |
| 1 — controls | SwiftUI buttons, compact pickers, SF Symbols, semantic toolbar/inline actions, flat surface roles, sections and Android/web fallbacks. Busy labels, disabled behavior, touch targets and large text remain explicit contracts. |
| 2 — check-in boundary | One parent-stack editor, non-editing tab hub, legacy dated entry handoff, direct Home/reminder entry, guarded Close/Back, error-state escape and preserved draft/outbox controller. |
| 3 — navigation | Five native tab triggers; web adapter; legacy Logs alias outside tabs; native detail headers; explicit inset owners; measured editor footers. |
| 4 — browsing | Home prioritizes one action; Training separates plan context from the next session; Nutrition groups prescribed meals without implying consumption. |
| 5 — editing | Cohesive readiness scale, quieter field framing, shared native actions throughout account/onboarding/workout flows, real rest auto-start switch and compact rest-duration selection. |
| 6 — remaining routes | Choice/detail/editor sheet roles, compact iOS reminder-time control, flat settings/profile groups, selected-date charts with accessible equivalents, discreet photo controls, consistent weekly/assessment actions. |
| 7 — conditional polish | Kept meaningful completion/number motion, removed duplicated workout press haptic. Continued system-symbol fallback. Accessory, icon and search decisions are recorded below. |
| 8 — acceptance | Source verification, platform exports, visual review and route inventory are recorded below. Native acceptance remains a separate device gate. |

The research mistakenly described readiness as a five-point scale. The production data contract is **1–10**. The implementation preserves all ten exact values, nullable/unanswered state and existing reporting meaning.

## All 29 replacement categories

| # | Final disposition |
| --- | --- |
| 1 | NativeTabs on iOS/Android; five destinations; data-backed Check In status. |
| 2 | Native stack headers on detail destinations; guarded editor navigation remains explicit. |
| 3 | SwiftUI prominent content action; capability-gated floating glass; stable busy label and progress. |
| 4 | Quieter native secondary action and matching platform fallback. |
| 5 | Compact text actions and InlineAction; no universal large ghost button. |
| 6 | ToolbarAction with named SF Symbols; deliberate custom pressables for gestures/compound content. |
| 7 | Native destructive action role within existing options/recovery surfaces; existing native Alert confirmations retained. |
| 8 | Native compact segmented picker; one rail/selection treatment in fallback. |
| 9 | Checkmarked choices; explanatory onboarding choices retain the space their copy requires. |
| 10 | Native SwitchRow for rest auto-start; native reminder switches retained. |
| 11 | Stable field border geometry, inline destructive error copy, autofill/keyboard contracts preserved. |
| 12 | Compact iOS time picker; compact history action with the actual record-history list. |
| 13 | Four compact rest presets with an explicit unselected state until a preference exists. |
| 14 | Cohesive ten-point readiness groups with endpoint labels and accessible exact selection. |
| 15 | Unboxed workout field hierarchy; weight/reps units, history-copy distinction and completion lock preserved. |
| 16 | Flat Card roles and unboxed Section; exceptional elevation only when requested. |
| 17 | Existing inset grouped rows restyled through shared surfaces/choices; no nested native Form scroll owner. |
| 18 | Short choices size to content and scroll; detail/editor detents expand; long virtualized choices keep explicit height. |
| 19 | Parent task footers use measured height and the bottom safe area, without a tab-bar offset. |
| 20 | Compact RestDock retains Pause, +15s, Skip, clock persistence and recovery. No extra timer instance. |
| 21 | AppSymbol semantic mapping with expo-symbols and Lucide fallback; native tab icons on both platforms. |
| 22 | SVG chart chooses nearest recorded date, keeps missing-data gaps and per-series units; chronological values and accessibility adjustment are available. |
| 23 | Existing contextual numbers retained; selection readout changes immediately. |
| 24 | Existing RecordStatus keeps local/sync/failure distinctions; persistent errors remain adjacent to recovery. |
| 25 | Existing small completion feedback retained; no new full-screen celebration or SF Symbols 8-only dependency. |
| 26 | Skeletons match flat cards; existing empty/error/refresh recovery remains intact. |
| 27 | Explicit circular photo close control; private-image resolution, previous/next and focus restoration retained. |
| 28 | Existing collection search/filter remains; there is no demonstrated need for a new global search destination. |
| 29 | Original Dawnage icon retained. Layered icon binaries require a supported Icon Composer/Xcode pipeline and device verification, unavailable here. |

The optional native bottom accessory was evaluated and omitted: the rest provider owns a timer but not a durable workout destination, and the two native accessory placements cannot be tested here. Home already resumes the exact saved workout date. Adding an always-mounted or ambiguously linked accessory would weaken that behavior. No fake ongoing-workout state was introduced.

## Route coverage

| Route | Coverage |
| --- | --- |
| Login / sign-up / forgot password | Shared native actions and input treatment; autofill and account gating retained. |
| Reset password | Shared actions, flat surface, secure-entry visibility and recovery retained. |
| Onboarding | Three stages, grouped goal/start choices, timezone/country sheets and native action hierarchy. |
| Home | Flat primary brief, quieter next-session row, unboxed section headings, real local/synced summaries. |
| Check In | Read-only hub with explicit Start/Continue/View and history; no draft created by browsing. |
| Daily check-in | Focused guarded editor, explicit Close, original numeric/draft/receipt controller. |
| Training Plan / History | Native compact selection, plan provenance, next session, day disclosures and preserved history list. |
| Legacy Logs | Parent-stack redirect into Training History; parameters preserved. |
| Nutrition | Prescribed target, grouped meals, supplements/notes as sections. |
| Workout logger | Native actions, lighter number fields, switch/preset rest controls and measured footer. |
| You | Grouped account/coaching/progress rows and consistent destination title. |
| Settings | Native header/switches, compact iOS time picker, appearance choices and content-sized sheets. |
| Profile / assessment | Native header, shared fields/actions, role-based recovery/overview sheets. |
| Weekly check-in | Shared actions/fields/surfaces; existing reconciliation and recovery unchanged. |
| Measurements | Native header, selected-date chart/readout/list, editor sheet and retained numeric validation. |
| Progress photos | Native header, editor sheet, private viewer with explicit controls. |

The [caller inventory](evidence/implementation-component-inventory.json) covers **82 production caller files** that use the shared control families. Preserved custom controls implement task-specific gesture, numeric or recovery behavior; their existence is not an indication that an obsolete library remains.

## Verification record

- Final `npm run verify`, after the list layout correction: **145 suites / 1,078 tests passed**, TypeScript and lint passed, UI contracts passed for **230 source files**.
- Visual and interaction checks exposed browser focus displacement in sheets, duplicate empty-photo actions, a compressed compact rest label, missing web chart accessibility values and an unbounded list. These were corrected and verified through focused tests, the final complete suite and fresh browser captures. The chart has explicit ARIA values, keyboard controls and a stable gesture responder while retaining native accessibility actions.
- Final `expo export --platform all --max-workers 1`: **iOS, Android and web passed**. These are JavaScript/Hermes exports, not installed native binaries.
- Native navigation source review reproduced and corrected Android inset ownership, loading/error editor escape, notification replacement and a deferred cold-start response race. Final reviewer found no remaining concrete regressions in that scope.
- Browser verification uses HeadlessChrome 147 with fictional intercepted data and a fixed local-calendar reference date. The accepted set contains **60 screen frames and 28 journey checkpoints**, with no recorded capture errors. Saved images were visually inspected. Check-in, workout and chart journeys passed in both themes, covering **26 assertion groups** across the recorded runs.

| Accepted browser evidence | Screen frames | Journey checkpoints |
| --- | ---: | ---: |
| [Ordinary phone, light/dark](evidence/implementation-web/capture-manifest.json) — 390 × 844 | 22 | 16 |
| [Compact phone, light/dark](evidence/implementation-compact/capture-manifest.json) — 320 × 740 | 12 | 0 |
| [Account, onboarding and workout states](evidence/implementation-states/capture-manifest.json) — 390 × 844 | 12 | 8 |
| [Recorded-date chart interaction](evidence/implementation-charts/capture-manifest.json) — 390 × 844 | 2 | 4 |
| [Measurements, photos, weekly check-in and training history](evidence/implementation-lists/capture-manifest.json) — 390 × 844 | 8 | 0 |
| [Wide Home and Training](evidence/implementation-wide/capture-manifest.json) — 768 × 1024 | 4 | 0 |

Representative images: [Home](evidence/implementation-web/home-light-390.png), [Training](evidence/implementation-wide/training-dark-768.png), [compact workout](evidence/implementation-compact/workout-dark-320.png), [workout sheet](evidence/implementation-web/workout-overview-light-390.png), [chart](evidence/implementation-charts/measurements-chart-light-390.png), [recorded values](evidence/implementation-charts/measurements-chart-chronological-values-dark-390.png).

These are fallback UI captures. The lists were recaptured after the final bounded-layout correction; their superseded frames were removed from the accepted set. Failed startup, accessibility and scroll diagnostic frames are excluded. This set is not a complete native loading/offline/error or accessibility-text matrix.

Reproducible source checks from `mobile/`:

```sh
npm run verify
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=fixture-public-key npm run export -- --max-workers 1
```

The first live integration capture encountered a stale Metro file map that omitted new modules. Those error frames were rejected and moved out of checked-in evidence. Final captures use a fresh static export. The capture driver scrolls only explicit scrolling containers; it also rejects a workout-sheet header outside the viewport or overlapping its content. Sheet focus uses `preventScroll` on web while retaining native accessibility focus behavior.

The final UI changes also preserve a single photo-add action and let compact rest controls wrap without crushing the timer/status label. Chart exploration exposed an unbounded list container: its content could exceed the viewport without scrolling. Non-scrolling Screen wrappers now provide a bounded flex chain so their FlatList owns scrolling; this also covers weekly check-ins, photos and workout history. Native material, system navigation geometry and native keyboards require the device checks below.

## Native validation limits

The installed Expo and ExpoModulesCore podspecs require iOS 16.4 or later; selected SF Symbols are available within that supported range. RN’s independent lower deployment minimum does not define this Expo app’s supported floor.

This host is macOS 12.7.6 with command-line developer tools, without a usable current iOS simulator/Xcode toolchain or configured native Maestro device. SwiftUI rendering, actual iOS 27 material, VoiceOver/TalkBack, native keyboard/sheet behavior and physical input/frame performance cannot be signed off from a web screenshot or a Metro export.

Native review must record OS/device, installed native binary and source revision; cover light/dark, compact phone, accessibility text, Reduce Motion, Reduce Transparency, hardware Back, sheet keyboard/dismissal, guarded editor exit and background rest timing. No physical 60/120 fps claim is made.

The control comparison can be opened only in a development runtime with `EXPO_PUBLIC_UI_GALLERY=1`; production ignores that flag. It has no production route and does not change account authorization.

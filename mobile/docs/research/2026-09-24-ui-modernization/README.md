# Dawnage mobile: current UI research and replacement direction

Research conducted September 23–24, 2026 (Asia/Kolkata). Target: `mobile/`, including its current uncommitted changes. Direction confirmed by the owner: **Apple-like, restrained, with Dawnage branding**.

**Recommendation:** adopt native Apple navigation and selected native controls, reduce outlined containers, and rebuild the shared Dawnage component hierarchy around clear actions and quiet content. Use the current iOS 27 design resources as the visual reference, with capability-based fallbacks. Keep the existing Expo architecture and fitness workflows.

The app has already reached the current published Expo baseline. More package upgrades alone will not produce the change you want. The largest opportunity is how the installed capabilities are used.

Read the [implementation plan](../../superpowers/plans/2026-09-24-native-ui-modernization.md) for sequencing, files, migration contracts, and acceptance checks. This document is the design specification and research rationale. **This delivery contains research and a plan; the app UI has not been changed.**

## 1. What is actually current

| Verified source | Current finding | Meaning for Dawnage |
| --- | --- | --- |
| Apple Design Resources and What’s New [S1, S2] | iOS/iPadOS **27** UI kit; Figma update dated **September 17, 2026** | Start new design work from that kit, not an iOS 18 kit or only the initial 2025 glass examples. |
| Apple branding guidance [S3] | Revised **September 9, 2026**; accent color used judiciously for primary actions and selected/status indicators | Keep coral recognizable without coloring every icon, outline, and secondary action. |
| Apple materials and adoption guidance [S4, S5] | Liquid Glass is a distinct navigation/control layer; avoid it in ordinary content | Glass navigation, toolbars and appropriate transient controls; opaque, legible workout and health content. |
| Apple SF Symbols [S6] | Current library includes new symbols available on OS 27 | Prefer system symbols on iOS, with symbols that exist on supported older OS versions or explicit fallbacks. A new symbol is not automatically available everywhere. |
| Apple layout guidance [S7, S8] | September guidance includes resizing, reserved regions, and vertical navigation on iPhone Duo | Stop assuming navigation is always a fixed-height bottom rectangle. Native adaptation is valuable, but must be tested with the actual Expo build. |
| npm registry [S9, S10] | `expo` **57.0.24** and `@expo/ui` **57.0.19** are the fetched `latest` versions | They already match `mobile/package.json`. Do not propose upgrading to an unreleased SDK to solve a styling problem. |
| Expo Router source and installed declarations [S11] | SDK 57 uses `expo-router/unstable-native-tabs` | Current `main` docs also show the SDK 58 `expo-router/native-tabs` import. That is not the import to copy into this project. |
| Expo UI SDK 57 source [S12–S14] | SwiftUI, Compose, universal controls, and community replacements are available | Use the installed native primitives through Dawnage adapters; no wholesale framework replacement is needed. |

“Latest” here means verified against live official sources and published packages during this research. OS appearance also depends on the SDK used to build the binary, runtime OS, and accessibility settings. The September 9 Apple submission announcement refers to Xcode 27 RC [S15]; it is not proof of which Xcode image an existing Dawnage binary used.

## 2. Evidence and limits

The local review covers navigation, shared primitives, tokens, Home, check-in, workout entry/rest, Training, Nutrition, settings, charts, and photo presentation. The starting commit is `7e8a9c2`, with substantial existing uncommitted work. That working tree is the baseline, not the older redesign documents.

The source inventory found **111 `<Button>` call sites, 64 `<Card>` call sites, 76 `<Pressable>` call sites, 21 `<Input>` call sites, 15 `<Sheet>` call sites, and 15 `<PageHeader>` call sites** in non-test TSX. These are literal source uses, not the number visible on one screen. There are **no `@expo/ui` or `expo-symbols` imports in application source**, despite both packages being installed. There is one `GlassView` use, in the custom tab bar. See [inventory](evidence/component-inventory.json).

Fresh visual capture was attempted against the current routes using the repository’s fictional-data capture harness. The Expo web server responded, but Chrome did not expose its debugger within 45 seconds; **zero app screenshots were accepted**. This machine has macOS 12.7.6 and Command Line Tools, without a suitable iOS Simulator. Consequently:

- The app findings below are **source-based design findings**, not a completed visual or usability audit.
- The reference images are current public App Store/Expo images, not screenshots of a redesigned Dawnage app.
- Native feel, keyboard behavior, VoiceOver/TalkBack, glass rendering, and frame performance remain device checks.

See [capture record](evidence/capture-status.json), [source manifest](evidence/sources.json), and [short source excerpts](evidence/source-excerpts.md). Failed fetches are retained in the manifest; they were not used to substantiate recommendations. Public Expo docs returned 403, so official Expo GitHub source pinned to `sdk-57` and installed package declarations were used. App Store screenshots are developer promotional material, not hands-on evidence of every current screen.

## 3. Why the existing app can still feel older

| Source finding | Why it can affect the experience | Specific response |
| --- | --- | --- |
| `app/(app)/(tabs)/_layout.tsx` uses JS tabs, a 56 pt body, a top border, an extra custom selected pill, and glass only as a background | Updated material does not give a custom bar the system’s geometry, selection, scrolling, or adaptive behavior | Migrate to actual native tabs after the check-in navigation boundary is solved. |
| `Button.tsx` gives all five variants the same 52 pt minimum and 14 pt corners; `ghost` and `text` share their treatment | A minor “History” or “Rest options” action occupies the visual rhythm of a main action | Separate primary, secondary, inline, toolbar, and destructive semantics; reserve large controls for task actions. |
| `Card.tsx` always adds a border and the card shadow; many screens compose numerous cards | Repeated framing competes with information hierarchy | Introduce plain sections, grouped surfaces, metric surfaces, and an exceptional hero surface. Most content needs no shadow. |
| `SegmentedControl.tsx` is separate bordered cells with gaps and an animated outlined thumb | It reads as a row of standalone form buttons | Use a native segmented picker for short related choices, especially Training Plan/History. |
| `Input.tsx`, `OptionRow.tsx`, ratings, and workout number fields all use strong boundaries | Too many simultaneous outlines can dominate a form | Keep visible labels and focus/error affordances; use grouped rows and consistent selection surfaces where appropriate. Never remove an essential affordance solely for appearance. |
| `RestDock.tsx` uses a secondary button labelled “Auto-start after a set: on/off” | A persistent Boolean setting is presented as an action sentence | Replace it with a real switch row; use a picker/menu for rest duration. |
| `Sheet.tsx` defaults to one 85% detent, disables dynamic sizing, and gives every sheet a divider-heavy header | A short choice can occupy nearly a full screen | Give sheets explicit content-sized, medium, large, and editor roles. Keep long editing surfaces scrollable. |
| `PageHeader.tsx` implements a custom back arrow and title; all app stack headers are hidden | Native navigation behavior and updated toolbar treatment are lost across ordinary detail screens | Use native headers on standard pushed screens; retain a focused header for the workout gesture surface. |
| `StickyActionBar.tsx` and `RestDock.tsx` depend on the JS tab-height context; `layout.ts` assumes a 56 pt tab bar | A tab migration alone can cause double insets or covered controls | Redesign safe-area ownership together with navigation. |
| Typography already selects the system font on iOS, but tab labels explicitly use Inter at 11 pt | The app is partly native already; changing every font would miss the real inconsistencies | Keep the good type foundation. Let native navigation own its labels and standard text behavior. |
| `LineChart.tsx` renders useful but static SVG charts | Detailed progress exploration requires looking elsewhere | Add a selected-value readout and deliberate chart interaction, while retaining accessible data summaries and missing-data gaps. |

These findings do not mean buttons, cards, outlines, or SVG are obsolete. The issue is the uniform way they are composed. Standard controls can remain current for years; novelty alone is not a useful replacement criterion.

## 4. Reference apps: borrow the relevant part

| Reference | Evidence checked | Pattern to borrow | Dawnage application |
| --- | --- | --- | --- |
| Apple Health | Apple’s current segmented-control guidance explicitly cites Health’s graph time ranges [S16] | Compact selection, data first, quiet grouping | Progress ranges and Training view selection. |
| Apple Music | Current tab-bar and adoption guidance [S5, S17] | System tabs, persistent accessory for an ongoing task | Navigation; optionally a compact resume/rest accessory once the shell is stable. |
| Apple Fitness | Current official product page [S18] | A clear next activity and readable progress | Home’s next workout and workout completion, using Dawnage’s own metrics. |
| Moonlitt | **2026 Apple Design Award, Interaction winner**; App Store 2.9, released September 10 [S19, S20] | Quiet controls over a strong content identity; Apple specifically praises glass integration | Strong reference for restrained native chrome, not for adopting an astronomy palette. |
| Tide Guide | **2026 Interaction finalist**; App Store 27.0.4, released September 21 [S19, S21] | Clear large data visualization with compact controls | Measurement history and progress details; avoid drowning the graph in cards. |
| The Outsiders | **2026 Interaction finalist**; App Store 1.8.1, released September 23 [S19, S22] | Intentional training/recovery hierarchy | Make the next coaching action understandable; its louder colors are not our chosen direction. |
| Hevy | Official feature documentation; App Store 3.1.15, released September 21 [S23, S24] | Previous workout values, efficient set logging, rest controls near the task | Preserve and streamline the existing current-set editor and rest workflow. |
| Bevel and Gentler Streak | Current official public product pages [S25, S26] | Plain-language health context and respectful recovery guidance | Short useful explanations, restrained celebration, no invented readiness score. |

Apple’s award page distinguishes winners from finalists; an award is evidence of recognized design quality, not proof that every pattern is suitable for Dawnage. Store version dates establish release recency, not the recency of each marketing screenshot.

See the [reference gallery](references.md) for retrieved images and their exact source boundaries.

## 5. The chosen Dawnage design system

### Structure and visual hierarchy

1. **Content:** warm/cool neutral surfaces close to the existing palette, grouped information, system typography, and clear data. Retain measured accessible coral colors until a replacement palette is measured.
2. **Actions:** one prominent coral task action per local decision area; neutral secondary actions; standard symbols for common toolbar actions.
3. **Navigation:** native system bars on iOS, native platform behavior on Android, coherent branded fallbacks on web and unsupported capabilities.

Use glass where it conveys a layer above content. The default material for a text-heavy floating control is regular glass, not clear glass. Do not add glass to meal cards, workout data, text fields, or chart backgrounds. Do not combine an app-drawn shadow, custom blur, and system glass on the same native control. [S4, S5]

Preserve the existing 4/8/12/16/20/24 spacing vocabulary. Use approximately 20 pt phone gutters (16 on compact layouts), 24–32 pt section separation, and content-driven control height. These are Dawnage design targets, not claims that Apple mandates those numbers. Use native control shapes instead of forcing every component to a single corner radius. Shared custom surfaces should distinguish grouped sections from prominent cards.

Keep iOS system text, 17 pt body copy, and tabular numerals for workout/time data. Use 15–17 pt secondary content and native caption styles only for genuinely secondary information. Replace repeated uppercase eyebrow text with sentence-case labels where the label is needed at all. Keep the Dawnage logo mainly in account entry and identity contexts. [S3, S6]

### Complete component replacement map

Priority: **P0** defines the new visual system; **P1** completes core workflows; **P2** adds polish after the core works on devices.

| # | Current element | Proposed element and behavior | Implementation route | Priority |
| --- | --- | --- | --- | --- |
| 1 | Custom glass-backed JS tabs | Actual system tab bar; labels, selected symbols, stable destinations | SDK 57 `NativeTabs`, with web adapter; migration boundary below | P0 |
| 2 | Custom detail-page back/title row | Native navigation title/back and grouped toolbar items | Existing Expo Router native Stack options; use installed API | P0 |
| 3 | Generic primary button | Native prominent capsule appropriate to context; stable loading label; no double press animation | Dawnage `Button.ios` adapter over Expo UI; large solid content action or glass-prominent floating action | P0 |
| 4 | Outlined secondary button everywhere | Neutral native secondary style; clear but quieter than primary | Native bordered/tonal treatment; coherent RN fallback | P0 |
| 5 | Full-size ghost/text button | Inline action with native-looking label, proper target and pressed state | Separate `InlineAction`; no unnecessary 52 pt visual block | P0 |
| 6 | Ad hoc icon-only pressables | System-symbol toolbar action with accessible name | `ToolbarAction`/`AppSymbol`; native toolbar where possible | P0 |
| 7 | Repeated destructive outlines | Destructive menu/row, with undo or confirmation according to recoverability | Native `Menu`/`ConfirmationDialog` via platform adapter | P1 |
| 8 | Spaced outlined segmented cells | One native segmented picker for short related options | Expo UI `Picker` with segmented style; community adapter can be evaluated | P0 |
| 9 | Large option grid used for every selection | Checkmarked grouped choice rows; small native menu for compact choices | `ChoiceGroup`, native `Picker`/`Menu`; keep large cards only when explanatory content earns space | P1 |
| 10 | Button pretending to be a switch | Real switch row with label and optional explanatory value | RN native `Switch` or Expo UI Toggle; choose one shared adapter | P0 |
| 11 | Heavy universal input shell | Grouped labelled field; stable focus treatment, inline error, correct keyboard | Keep RN input for keyboard-sensitive editors initially; native forms for simple settings groups after proof | P1 |
| 12 | Date/history action as large button | Compact date control; native calendar/date picker where a date is actually being edited | Retain installed datetime picker; use existing history data list for record selection | P1 |
| 13 | Many rest preset buttons | Current duration plus native preset picker/menu | `RestDurationPicker`, explicit selected value | P1 |
| 14 | Five individually outlined readiness buttons | A cohesive discrete five-point scale with visible endpoints and selected value | Refine `CheckInRatingScale`; retain tap-to-select and adjustable accessibility | P0 |
| 15 | Large weight/repetition input cards | Compact task-specific numeric fields with units, previous-value hint, clear completion action | Refine `CurrentSetEditor`; preserve decimal input/commit rules | P1 |
| 16 | Every group as a bordered/shadowed card | `Section`, `GroupedSurface`, `MetricSurface`, exceptional `HeroSurface` | Extend existing shared `Card` contract during migration | P0 |
| 17 | Repeated standalone settings cards | Inset grouped list rows with separators and trailing values | Evolve `ListRow`, `OptionRow`; native Form only as a bounded non-nested scrolling surface | P1 |
| 18 | Large fixed-height sheet for every task | Content-sized choice sheet, medium/large detail sheet, focused editor | Keep Gorhom for RN-rich editors; use native presentation where it improves a specific surface | P1 |
| 19 | Solid full-width bottom action slab | One measured task action area with correct keyboard/safe-area ownership | Refine `StickyActionBar`; allow restrained floating material when it truly overlays content | P0 |
| 20 | Expanded rest controls always competing with exercise data | Compact rest accessory with Pause, +15s, Skip; settings in a small secondary surface | Refine `RestDock`; later evaluate `NativeTabs.BottomAccessory` outside full-screen workout | P1/P2 |
| 21 | Lucide symbols everywhere | SF Symbols for common iOS controls; consistent Android/web mapping | Installed `expo-symbols`; Lucide remains a valid fallback | P0 |
| 22 | Static chart with scattered surrounding metrics | Chart with prominent value, period picker, selected-date readout and accessible data list | Extend SVG chart initially; native Swift Charts only after equivalent contracts exist | P1 |
| 23 | Numeral/value changes with uniform animation | Short contextual number transitions; stable dimensions | Keep `AnimatedNumber` and `useMotion`; no animation for ordinary data refresh unless helpful | P1 |
| 24 | Repeated status pills / technical saving language | Compact inline status and persistent actionable errors | Keep `RecordStatus` delivery truth: saved locally, waiting, synced, failed | P1 |
| 25 | Broad full-screen celebration / repeated reveals | Small completion check and next action, tied to real completion | Existing completion components; optional supported symbol transition | P1 |
| 26 | Generic loading/error/empty panels | Skeleton matching final geometry; short empty state; retry adjacent to failed content | Evolve existing components; preserve cached content during refresh | P1 |
| 27 | Photo viewer with detached controls | Content-first full-screen viewer, restrained overlay controls, explicit close/previous/next | Refine current viewer; preserve private URL resolution and focus restoration | P1 |
| 28 | Search/filters added as decoration | Native search only in a collection that actually needs search | Exercise/history picker when scale warrants it; do not add a global Search tab | P2 |
| 29 | Flat app icon / store surfaces | Layered icon prepared with current Apple template where supported | Existing brand assets plus Icon Composer build workflow, separately verified | P2 |

Do **not** replace discrete readiness answers with a continuously adjustable slider merely because sliders animate attractively. Exact one-tap selection is useful here. Do not turn prescribed meal targets into “consumed” progress rings; the current Nutrition screen is a prescription display, not a food logger.

## 6. Technology choices and alternatives

| Choice | Decision | Reason |
| --- | --- | --- |
| Expo UI 57.0.19 | **Use selectively as the primary native control source** | Already installed; actual SwiftUI/Compose controls. Universal controls exist, but adapters must preserve Dawnage’s busy states, accessibility, focus, icons and fallback contracts. |
| Expo Router native tabs | **Target shell, with a navigation prerequisite** | Closest match to current Apple behavior; SDK 57 API is unstable and is not a drop-in replacement. |
| `expo-glass-effect` | **Keep for a small number of custom floating surfaces** | Gives a native material, not an entire native button or tab system. Check runtime and compiled availability; respect accessibility. |
| `expo-symbols` | **Use on iOS** | Already installed; native symbol rendering. Do not assume all SF Symbols 8 names/effects exist on older OS versions. |
| Gorhom 5.2.14 | **Keep for complex RN sheets** | Installed version equals the fetched latest version. Existing input, focus, dismiss, and draft handling are valuable. It is not obsolete because it is custom. |
| Reanimated / Gesture Handler | **Keep** | Existing interruption and reduced-motion infrastructure is useful. Do not stack custom animations on native controls. |
| HeroUI Native 1.0.10 | **Not the primary system** | Modern React Native styling, but a new visual vocabulary and styling peers; it does not make the app use Apple system controls. |
| Tamagui 2.7.7 / gluestack core 5.0.15 | **Not a migration requirement** | Useful universal systems; would introduce another styling architecture without solving native navigation behavior. |
| React Native Paper 5.15.3 | **Not the Apple-first visual baseline** | Material design focus; useful in other contexts, but not the chosen direction. |
| Material 3 Expressive | **Use Android conventions selectively** | Google’s research supports clear grouping and action hierarchy [S27]. Do not copy its most expressive shapes/colors into the restrained iOS direction. Native Android APIs still need SDK/build-specific verification. |
| Full SwiftUI rewrite | **Reject for this scope** | Existing RN product logic, offline work, tests, and Android support would all need unnecessary replacement. |

The npm versions above were retrieved during this research; they are not recommendations to install those libraries. No dependencies were changed.

Three approaches were considered: refining custom RN components alone (lowest migration cost, limited system adaptation), selectively adopting native controls and navigation (**recommended**), and replacing the entire component framework or rewriting natively (highest cost with little benefit to the established workflows).

## 7. Screen-by-screen target

| Screen | Target hierarchy and interaction |
| --- | --- |
| Sign in / create account / reset | One modest brand introduction, grouped fields with persistent labels, one prominent action, quieter mode/recovery links. Preserve autofill, secure-entry toggle, validation and keyboard flow. |
| Onboarding | Keep the existing three-stage setup. Use compact checkmarked choices and a clear next action. Avoid extra steps introduced only for visual effect. |
| Home | Greeting and program context → one next action → quiet week record → next workout → optional progress/details. Reduce secondary containers and hide nonessential explanations behind existing disclosure. |
| Check In | A clean record/history tab and a focused editor. Show one stage at a time, discrete readiness scales, grouped inputs, and one task action. Keep direct Home and notification entry into editing. |
| Training | Native Plan/History selector; next workout first; clean day rows and readable prescriptions. Keep historical `/logs` links working. |
| Workout | Exercise and prescription → current set → completion action; previous sets nearby; compact rest controls. Keep visible Finish and Overview. Do not hide required actions behind gestures. |
| Nutrition | Daily prescribed target → grouped meals → supplements → coach notes. Avoid a separate elevated card around every text block. Preserve empty, assigned, and stale-data states. |
| Measurements / progress | One headline value with timeframe, clean interactive chart, chronological records. Gaps remain gaps; show units and source dates. |
| Photos | Clear capture slots and dates, immersive viewer, discreet controls. Continue signed/private media handling without exporting customer photos to design services. |
| Weekly feedback / assessment | Grouped questions, clear stage progress, readable review, recovery status next to the relevant action. Preserve all field meanings and draft behavior. |
| You / profile / settings | Grouped rows with trailing values, real toggles, concise sheet pickers. Native detail navigation where it improves consistency. |

## 8. Migration constraints that change the plan

### Native tabs and the check-in guard

The installed `NativeTabNavigationEventMap` declares **`canPreventDefault: false`**. The current tab layout calls `event.preventDefault()` before leaving check-in. Merely changing the import would bypass that intended boundary. See [declaration evidence](evidence/native-tabs-guard-evidence.txt).

Recommended architecture: move active check-in editing into a **parent-stack focused editor**, as the workout logger already is. Retain a Check In tab for today’s record and history. Home’s start/resume action and notification/date links open the editor directly, so the main daily task does not gain an extra tap. The editor owns `usePreventRemove`, visible Close, save/discard recovery and notification exit guards. Existing `/check-in?date=…` links route compatibly. Record receipt and first-program-day behavior stay attached to the same model.

Native tab `disabled` events exist in this SDK, but disabling all other tabs while typing has unclear assistive-technology and interaction consequences. Do not use that as an untested substitute. If the focused editor migration is not accepted or cannot pass persistence tests, retain the current safe tab navigator while completing the other component changes; do not claim native tab delivery.

### Insets and transient surfaces

Native navigation owns its own chrome. `Screen`, `StickyActionBar`, and `WorkoutRestFooter` must stop combining manual JS tab offsets with automatic native insets. Parent-stack editors do not inherit a tab offset. Native tab accessories can render in more than one placement; state belongs above the accessory, not inside a remountable view. [S11]

### React Native / native-control boundaries

Expo UI requires the correct `Host`. A Host is a layout boundary, not a drop-in RN View. Avoid one Host per item in a large list; prefer a bounded control group. Give sliders and flexible controls an actual width. Do not apply `matchContents` along a scrolling axis, or nest a native Form scroll view inside the existing RN Screen scroll. [S13, S14]

Keep RN text inputs in the workout and check-in editors until native replacements prove keyboard, decimal parsing, immediate commit, focus restoration and accessibility behavior. Native control adoption is incremental; the final interface must nevertheless use one coherent Dawnage specification.

### Compatibility and accessibility

Test iOS 27/current appearance, iOS 26 glass, and the oldest supported iOS fallback; test Android and web separately. Confirm actual deployment floors and EAS image availability before selecting a build image. An installed JS package does not prove a binary was built with Xcode 27 or adapts to iPhone Duo reserved regions.

Use at least 44×44 pt interactive targets on iOS and 48×48 dp targets on Android. Large text must reflow; do not cap scaling to preserve a mockup. Keep 4.5:1 normal text and 3:1 large text/essential non-text contrast targets; test composited glass over real content. Provide non-color selection cues, named icon actions, focus restoration, reduced motion and reduced transparency. [S28]

## 9. What a successful result must prove

- Every shipped route uses the new component roles; no arbitrary mixture of old and new button or section treatments remains.
- A user can identify the primary action quickly on Home, each check-in stage, and the current set. Measure this with realistic tasks; do not promise a retention increase from visual changes.
- Core check-in and workout tasks take no more actions than the current baseline. The same data, draft, delivery, date and recovery contracts pass.
- Current iOS screenshots show actual native navigation and appropriate control material, not a web approximation labelled as native.
- Light, dark, large-text and accessibility settings retain clear actions, readable content and working keyboard/sheet behavior.
- Small phones, ordinary phones, and resizable large layouts show no covered controls or hard-coded bottom-bar assumptions.
- Navigation, selection, and sheets remain responsive on a physical baseline device; completion does not depend on a decorative animation finishing.
- Only after route-by-route review and call-site migration are obsolete implementations removed. Temporary compatibility wrappers have an explicit end state.

## Sources

Primary links are intentionally provided so the design can be rechecked when APIs or OS guidance change.

| ID | Source |
| --- | --- |
| S1 | [Apple Design Resources](https://developer.apple.com/design/resources/) · [official iOS/iPadOS 27 Figma kit](https://www.figma.com/community/file/1651309003795292092/ios-and-ipados-27) |
| S2 | [Apple Design: What’s New](https://developer.apple.com/design/whats-new/) |
| S3 | [Apple HIG: Branding](https://developer.apple.com/design/human-interface-guidelines/branding) |
| S4 | [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) |
| S5 | [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) |
| S6 | [SF Symbols](https://developer.apple.com/sf-symbols/) |
| S7 | [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| S8 | [Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo) |
| S9 | [Published Expo version](https://registry.npmjs.org/expo/latest) |
| S10 | [Published Expo UI version](https://registry.npmjs.org/@expo/ui/latest) |
| S11 | [Expo native tabs, SDK 57 source](https://github.com/expo/expo/blob/sdk-57/docs/pages/router/advanced/native-tabs.mdx) · [installed API upstream](https://github.com/expo/expo/blob/sdk-57/packages/expo-router/src/native-tabs/types.ts) |
| S12 | [Expo UI overview, SDK 57](https://github.com/expo/expo/blob/sdk-57/docs/pages/versions/unversioned/sdk/ui/index.mdx) |
| S13 | [Expo UI SwiftUI Button, SDK 57](https://github.com/expo/expo/blob/sdk-57/docs/pages/versions/unversioned/sdk/ui/swift-ui/button.mdx) |
| S14 | [Expo UI Host, SDK 57](https://github.com/expo/expo/blob/sdk-57/docs/pages/versions/unversioned/sdk/ui/swift-ui/host.mdx) |
| S15 | [Apple: submissions for the latest OS releases, September 9](https://developer.apple.com/news/?id=k1mtkt1k) |
| S16 | [Apple HIG: Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) |
| S17 | [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) |
| S18 | [Apple Fitness+](https://www.apple.com/apple-fitness-plus/) |
| S19 | [2026 Apple Design Awards](https://developer.apple.com/design/awards/) |
| S20 | [Moonlitt](https://apps.apple.com/us/app/moonlitt-moon-phase-tracker/id6444718902) |
| S21 | [Tide Guide](https://apps.apple.com/us/app/tide-guide-charts-tables/id1406371071) |
| S22 | [The Outsiders](https://apps.apple.com/us/app/the-outsiders-athlete-tracker/id6751584800) |
| S23 | [Hevy feature documentation](https://www.hevyapp.com/features/) |
| S24 | [Hevy App Store](https://apps.apple.com/us/app/id1458862350) |
| S25 | [Bevel](https://www.bevel.health/) |
| S26 | [Gentler Streak](https://gentler.app/) |
| S27 | [Google: research behind Material 3 Expressive](https://design.google/library/expressive-material-design-google-research) · [Android Material 3](https://developer.android.com/develop/ui/compose/designsystems/material3) |
| S28 | [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| S29 | [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) · [Menus](https://developer.apple.com/design/human-interface-guidelines/menus) · [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) |
| S30 | [WWDC 2026: Principles of great design](https://developer.apple.com/videos/play/wwdc2026/250/) · [Design intuitive search experiences](https://developer.apple.com/videos/play/wwdc2026/292/) |

The full manifest also records registry checks for the alternative libraries. No claim of library quality is based on download counts or version number alone.

# Design System — mobile (light + dark)

Source of truth: `MISC/design_guidelines.md` + `client/src/index.css` + `tailwind.config.ts`, **corrected for measured WCAG contrast** (audit run 2026-08-27 — every ratio below was computed, not estimated). The user chose: **support light AND dark mode**, following the device setting with a manual override in Settings.

> Where this file deviates from the web's `index.css`, the deviation is intentional and marked **[FIX]** with the measured ratio that forced it. Implement THIS file; do not "restore" the web values.

## 1. Surface & elevation model

Dark and light separate surfaces by **different mechanisms**. Do not copy one to the other.

- **Dark = surface lift.** Shadows are invisible on near-black. Depth comes from each layer being lighter: `background` → `card` → `elevated` (sheets, popovers, pressed states). Borders are decorative hairlines only.
- **Light = shadow + hairline.** `background` is light grey, `card` is pure white, lifted by a soft shadow (`shadowOpacity 0.06`, `radius 12`, `offset {0,2}` on iOS / `elevation: 2` on Android) plus a hairline border.

**[FIX]** The web light theme uses bg `hsl(0 0% 98%)` (#FAFAFA) and card `hsl(0 0% 96%)` (#F5F5F5) — a **1.03:1** difference. Cards are effectively invisible without the web's CSS shadows. Mobile inverts to grey-bg / white-card (the native pattern on both platforms) and adds real elevation.

| Token | Dark | Light |
|---|---|---|
| `background` | `#0B0B0C` | `#F2F2F5` **[FIX]** |
| `card` | `#131416` | `#FFFFFF` **[FIX]** |
| `elevated` (sheets, menus, pressed) | `#1A1B1E` | `#FFFFFF` + stronger shadow |
| `scrim` (behind modals/sheets) | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.45)` |

Never use pure `#000000` as a surface — it smears on OLED during scroll. `#0B0B0C` already avoids this; keep it.

## 2. Color tokens (measured)

### Text & foreground

| Token | Dark | on card | Light | on card |
|---|---|---|---|---|
| `foreground` | `#FFFFFF` | 18.4 ✓ | `#17171A` | 17.9 ✓ |
| `mutedForeground` | `#A1A1A8` | 7.2 ✓ | `#5C5C63` | 6.6 ✓ |

### Brand & semantic — **two tiers per hue**

The brand red is a bright accent. It reads well **as** text on dark, but white text **on** it fails. So each hue gets an `-accent` value (text/icon/graphics) and a `-fill` value (surface behind white text).

| Role | Dark | Light | Measured |
|---|---|---|---|
| `primary` (accent: icons, links, chart-1, text on dark) | `#F04E45` | `#C0362C` **[FIX]** | 5.16 dark ✓ / 5.52 light ✓ |
| `primaryFill` (button/badge surface, white label) | `#D93A31` **[FIX]** | `#D93A31` | white-on-fill **4.57 ✓** |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | — |
| `success` (text/icon) | `#00D26A` | `#0F7A43` **[FIX]** | 9.15 dark ✓ / 5.41 light ✓ |
| `gold` (text/icon) | `#F6C85A` | `#7D5E00` **[FIX]** | 11.7 dark ✓ / 6.05 light ✓ |
| `destructive` | `#F04E45` | `#C0362C` | same as primary tier |

**[FIX] measured failures in the previous spec, for the record:** white on `#F04E45` = **3.57** (needs 4.5); light `primary #F04E45` on white = **3.28**; light `success hsl(150 100% 35%)` = **2.56**; light `gold hsl(44 94% 35%)` = **3.28**. All three light values were unusable as text.

### Borders — three tiers, chosen by purpose

WCAG 1.4.11 requires **3:1** for the boundary of an interactive control when the boundary is what identifies it. Decorative dividers are exempt.

| Token | Dark | Light | Use for |
|---|---|---|---|
| `border` (hairline, decorative) | `#1F1F23` (1.12) | `#E4E4E9` (1.27) | card edges, list dividers, chart gridlines |
| `borderStrong` (3:1, required) | `#5E6268` (3.00 ✓) | `#8E8E96` (3.25 ✓) | **inputs, steppers, segmented controls, checkboxes, unselected chips** — anything whose outline is its affordance |
| `focusRing` | `#F04E45` (5.16 ✓) | `#C0362C` (5.52 ✓) | 2px ring on focus/active |

If a screen needs a lighter look than `borderStrong` gives, give the control a **filled** surface (`elevated`) instead of a faint outline — never a sub-3:1 outline as the only affordance.

### Chart series — two tiers, and never color alone

| Series | Dark (on `card`) | Light (on white) | Line style |
|---|---|---|---|
| chart-1 (weight / primary) | `#F44A3E` (5.17 ✓) | `#E0392E` (4.38 ✓) | solid |
| chart-2 (nutrition / success) | `#00D66B` (9.51 ✓) | `#00994D` (3.71 ✓ graphical) | dashed `[6,4]` |
| chart-3 (energy / gold) | `#FACE57` (12.3 ✓) | `#A87C05` (3.78 ✓ graphical) | dotted `[2,4]` |
| chart-4 (performance / blue) | `#4799EB` (6.17 ✓) | `#2E86E0` (3.75 ✓ graphical) | dash-dot `[8,3,2,3]` |

**[FIX]** The previous light chart values (`l≈35%` variants) measured **1.37–2.74** on a light card — invisible. Multi-series charts must additionally differentiate by **line style**, not color alone (colorblind users + the score-color rule below).

### Score coloring (used across cards, tables, badges)

`≥8 success · ≥6 gold · ≥4 orange (#E8853B dark / #A85A00 light) · else primary`.
**Color must never be the only signal** — always pair with the numeral itself (`8/10`) or a short label. A bare colored dot is not acceptable.

## 3. Implementation

`mobile/src/theme/colors.ts` exports `{ light, dark }` with exactly these keys. `mobile/src/theme/index.ts` exports `useTheme()` → `{ colors, spacing, radius, type, motion, isDark }`, driven by `useColorScheme()` with an AsyncStorage override (`theme-preference`: `system | light | dark`).

Charts, Reanimated styles, `StatusBar`, tab bar, and NativeWind all read from this **one** object. Zero hex literals outside `theme/`. A grep for `#[0-9A-Fa-f]{6}` outside `src/theme/` should return nothing — this is a Phase 8 acceptance check.

## 4. Spacing, radius, sizing (tokens, not literals)

```
spacing:  xs 4 · sm 8 · md 12 · base 16 · lg 24 · xl 32 · 2xl 48
radius:   sm 8 · md 12 · card 20 · pill 999
icon:     sm 16 · md 20 · lg 24 · xl 32     (stroke 2 everywhere, lucide default)
hit:      minimum 44×44 — use padding first, hitSlop only when layout forbids it
```
Screen horizontal inset: 16 on phones, 24 when `useWindowDimensions().width ≥ 768`. Section vertical rhythm: 16 within a card, 24 between cards, 32 between major sections.

## 5. Typography

- **Inter** (headings, UI, navigation, body) + **Poppins** (metrics/numbers) via `@expo-google-fonts/inter` / `@expo-google-fonts/poppins` + `expo-font`, loaded in the root layout with a splash hold.
- Scale: `display` 32/700 Poppins · `metric` 28/700 Poppins · `h1` 24/700 Inter · `h2` 18/600 Inter · `body` 16/400 Inter · `bodySm` 14/400 Inter · `label` 12/600 Inter uppercase, letterSpacing 0.6, `mutedForeground`.
- **Never below 14** for anything a user must read. `label` at 12 is uppercase metadata only.
- **Tabular figures.** Any number that animates, sits in a table, or aligns in a column (metric cards, set rows, weekly history grid, rest timer) must use `fontVariant: ['tabular-nums']`. Android support for this is inconsistent across ROMs — also give numeric containers a fixed `minWidth` so a `9 → 10` transition never reflows the row. Verify on Android during Phase 8.
- **Dynamic Type.** Leave `allowFontScaling` at its default (true). Never disable it globally. Layouts must survive the largest system text size — cards grow, they don't clip. Test at max scale in Phase 8.

## 6. Motion tokens

```
duration:  micro 120 · enter 250 · exit 180 · celebration 1400
easing:    standard  Easing.bezier(0.16, 1, 0.3, 1)   // enters, "Expo.out" feel
           exit      Easing.bezier(0.4, 0, 1, 1)      // exits leave faster than they arrive
spring:    sheet     { damping: 20, stiffness: 90 }
           press     { damping: 15, stiffness: 250 }
press:     scale 0.97, 120ms, opacity unchanged — never a transform that shifts neighbours
```
- **Reduced motion is mandatory.** Read Reanimated's `useReducedMotion()` (or `AccessibilityInfo.isReduceMotionEnabled`). When on: no translate/scale entrances (opacity only, or instant), the check-in celebration collapses to a static checkmark + haptic, the PR celebration to a static badge, the count-up to the final number. Ship this in Phase 1's theme module so every phase inherits it — not as a Phase 8 retrofit.
- **No infinite loops** except the rest-timer ring while a timer is actually running.
- Blur (`expo-blur`) only on the tab bar / sticky headers, intensity ≤ 20, and only if it holds 60fps on a mid-range Android; otherwise a solid `elevated` surface.

## 7. Haptics choreography (`expo-haptics`)

| Moment | Call |
|---|---|
| ScalePicker tap, segmented change, chip select, day-pill change | `selectionAsync()` |
| Stepper increment, set row completes | `impactAsync(Light)` |
| Sheet opens, photo captured | `impactAsync(Medium)` |
| Check-in / measurement / weekly-feedback saved | `notificationAsync(Success)` |
| **New PR** | `impactAsync(Heavy)` ×2, 90ms apart |
| Validation or network failure | `notificationAsync(Error)` |

Haptics fire **with** the visual, never instead of it, and never on scroll.

## 8. Icons

`lucide-react-native`, stroke width 2, sizes from the `icon` token only. Same names as web (Activity, Flame, Trophy, Zap, Dumbbell, TrendingUp/Down, Weight, Moon, Footprints, Droplet, Camera, Ruler).

**Emoji are never structural.** Anything that is a control, a status, or a data category uses a lucide glyph — emoji are font-dependent, unthemeable, and render differently per OS. This specifically overrides earlier phase text:

| Was | Becomes |
|---|---|
| Workout status buttons `Done 💪 / No / Cardio 🏃 / Rest 😴` | `Dumbbell` / `X` / `Footprints` / `Moon` + text label |
| Digestion chips | `Check` / `CircleDot` / `MinusCircle` / `AlertCircle` + text label |
| Tab bar, More list, empty-state icons | lucide only |

Emoji **in prose** is fine and wanted — the streak line ("🔥 12-day streak"), the welcome copy, the weekly-feedback greeting. Warmth in a sentence, glyphs in the chrome.

## 9. UI primitives — `mobile/src/components/ui/`

`Button` · `Card` · `Input` (label + icon slot + error text) · `Badge` · `ProgressBar` (glow) · `Select` (bottom-sheet picker) · `Stepper` (±, long-press to type) · `ScalePicker` (1–10 row) · `SegmentedControl` · `Chip` · `Sheet` · `Screen` (safe area + scroll + inset) · `EmptyState` · `ErrorState` (with Retry) · `Skeleton` · `Toast`.

Every primitive:
1. takes colors from `useTheme()` — no hex literals;
2. exposes `accessibilityLabel` / `accessibilityRole` / `accessibilityState` and sets a sensible default;
3. has a visible pressed state within 120ms that does **not** move its neighbours;
4. has a `disabled` state that is both visually reduced and `accessibilityState={{ disabled: true }}`;
5. meets 44×44 minimum, with ≥8 between adjacent targets.

**Progress-bar glow:** dark = a blurred/semi-transparent halo `View` behind the fill in the fill color at ~35% alpha (no `box-shadow` in RN; `elevation` tints unpredictably on Android). Light = drop the halo to ~12% alpha or omit it — glow on a white card reads as a rendering bug.

# 05 — Figma Component Build Specs (Phase 3)

Extracted from the shipped React Native source, not from memory. Every value
below was read out of `src/components/ui/*.tsx`.

**Purpose:** the Figma MCP quota on the Starter plan is 20 calls/month. This
document makes Phase 3 mechanical so the rebuild costs the fewest possible
calls — one `use_figma` per component, no discovery round-trips.

**Resume:** Run ID `ds-dawnage-001`. IDs in `figma-build-state.json`.

---

## Global rules for every component

| Rule | Value |
|---|---|
| Bind fills/strokes/radius/padding/gap | to `Color` (Dark) + `Dimension` variables — **never hardcode** |
| Minimum interactive height | `size/hit-target` = **44** |
| Card radius | `radius/card` = 20 · control radius `radius/md` = 12 |
| Selected state | border `2px` `brand/primary` — unselected `1px` `border/strong` |
| Disabled | `opacity 0.45` + `accessibilityState.disabled` |
| Text | always a **text style**, never loose font settings |

`Color · Light` is a parallel collection (Starter plan has no modes). Build
against `Color`; on Professional, merge the two into one collection with
Light/Dark modes and rebind once.

---

## 1. Button — `src/components/ui/Button.tsx`

**Geometry:** minHeight `48` (hit-target 44 + 4) · radius `14` (`radius/md` + 2) ·
paddingHorizontal `spacing/lg` (24) · content gap `spacing/sm` (8) · centred.

**Variants — property `Variant`:**

| Variant | Fill | Border | Label style |
|---|---|---|---|
| `Primary` | `brand/primary-fill` | none | Text `text/on-primary` |
| `Secondary` | transparent | `1px border/strong` | Text `brand/primary` |
| `Ghost` | transparent | none | Text `brand/primary` |

**Property `State`:** `Default` · `Disabled` (opacity 0.45) · `Loading` (label
replaced by a spinner glyph, opacity 0.45).

Variant matrix: 3 × 3 = **9** — under the 30 cap, build as one set.

**Component properties:** `label` (TEXT, default "Continue") · `icon`
(BOOLEAN, default false) · `iconSwap` (INSTANCE_SWAP → lucide icon component).

Label uses text style **H2** (Inter Semi Bold 18/24) — that is deliberate: at
18/600 white-on-`primary-fill` clears 4.57:1.

---

## 2. Input — `src/components/ui/Input.tsx`

**Geometry:** minHeight `48` · radius `radius/md` (12) · fill `bg/elevated` ·
paddingHorizontal `spacing/md` (12) · internal gap `spacing/sm` (8) ·
label→field gap `spacing/xs` (4).

**Property `State`:**

| State | Border |
|---|---|
| `Default` | `1px border/strong` |
| `Focused` | **`2px` `border/focus`** |
| `Error` | `1px brand/destructive` |
| `Disabled` | `1px border/default`, opacity 0.45 |

**Structure (vertical auto-layout):**
1. Label — text style **Label**, `text/muted` — *always visible, never a placeholder*
2. Field row — optional leading icon (INSTANCE_SWAP) · text · optional eye toggle
3. Helper — **Body Small**; `brand/destructive` when error, else `text/muted`

**Component properties:** `label` (TEXT) · `value` (TEXT) · `helper` (TEXT) ·
`showIcon` (BOOLEAN) · `showPasswordToggle` (BOOLEAN) · `iconSwap` (INSTANCE_SWAP).

---

## 3. Card — `src/components/ui/Card.tsx`

Fill `bg/card` · radius `radius/card` (20) · `1px border/default` ·
padding `spacing/base` (16).

**Property `Elevation`:** `Card` (effect style `Elevation/Card`) ·
`Sheet` (fill `bg/elevated`, effect `Elevation/Sheet`).
**Property `Padded`:** BOOLEAN, default true (false → padding 0).

Shadows are light-theme only — in dark, depth comes from the surface lifting
`background → card → elevated`.

---

## 4. Stepper — `src/components/ui/Stepper.tsx`

Row: `[ − ] [ value ] [ + ]`, radius `radius/md`, `1px border/strong`,
fill `bg/elevated`. Minus/plus buttons are `48 × 48`.

Value uses **H2** with **tabular figures**, centred, FILL width.
Suffix (kg/h/L) is **Body Small** `text/muted` inline after the value.
Below: helper **Body Small** `text/muted` — "last: 82.4 kg · hold the number to type".

**Properties:** `label` (TEXT) · `value` (TEXT) · `suffix` (TEXT) · `helper` (TEXT).
**Property `State`:** `Default` · `Empty` (value shows `—` in `text/muted`).

Long-press opens direct entry — the ± path never opens a keyboard, which is
what makes a 16-field check-in fast.

---

## 5. RatingRow — `src/components/ui/RatingRow.tsx`

> Named `ScalePicker` in `02-design-system.md`. **Code name wins** for Code Connect.

Ten cells 1–10, wrap, gap `spacing/sm` (8). Each cell `44 × 44` min,
radius `radius/md`.

| Cell | Fill | Border | Text |
|---|---|---|---|
| Unselected | transparent | `1px border/strong` | Body `text/foreground` |
| Selected | `brand/primary-fill` | `2px brand/primary` | Body `text/on-primary` |

Exposed to screen readers as **one** `adjustable`, not ten buttons —
build as a single component with a `value` (1–10) variant property, not
ten nested instances.

---

## 6. SegmentedControl — `src/components/ui/SegmentedControl.tsx`

**Property `Size`:** `Compact` (row, minHeight 44) · `Large` (wrap grid,
flexBasis 46%, minHeight **64**, icon above label).

Segment: radius `radius/md`, gap `spacing/sm`.

| Segment | Fill | Border | Content |
|---|---|---|---|
| Inactive | transparent | `1px border/strong` | icon `text/muted` + Body Small |
| Active | `brand/primary-fill` | `2px brand/primary` | icon + label `text/on-primary` |

Icons are **INSTANCE_SWAP** — never a variant per icon. Real usage:
Dumbbell/X/Footprints/Moon (workout) and Check/CircleDot/MinusCircle/AlertCircle
(digestion). **No emoji** — they are font-dependent and unthemeable.

---

## 7. ProgressBar — `src/components/ui/ProgressBar.tsx`

Track height `8` (prop-driven), radius `radius/pill`, fill `bg/elevated`.
Light theme adds `1px border/default`; dark has none.

Fill bar: radius `radius/pill`, colour is a **swappable variable** —
`brand/primary` · `status/success` · `status/gold`.

Glow: shadow in the fill colour, `radius 8`, opacity **0.55 dark / 0.15 light**.
On white a strong halo reads as a rendering fault, so it is nearly removed.

**Property `Fill`:** `0` · `25` · `50` · `75` · `100`.
**Property `Tone`:** `Primary` · `Success` · `Gold`.

---

## 8. OptionRow — `src/components/ui/OptionRow.tsx`

Row, minHeight `44`, radius `radius/md`, padding `16 / 12`, gap `spacing/md`.

| State | Border | Label | Trailing |
|---|---|---|---|
| Unselected | `1px border/strong` | Body `text/foreground` | empty 20px box |
| Selected | `2px brand/primary` | Body `brand/primary` | **Check** glyph `brand/primary` |

Selection is carried by the check glyph, **not colour alone**.
**Property `Role`:** `Radio` · `Checkbox` (changes a11y role only, visuals identical).

---

## 9. EmptyState — `src/components/ui/EmptyState.tsx`

Centred vertical, padding `spacing/xl` (32), gap `spacing/md` (12).

**Property `Mark`:** `Icon` (INSTANCE_SWAP lucide, 32, `text/muted`) ·
`Glyph` (Dawnage bird, 30, `border/strong`) — glyph is for true first-run screens.

Title **H2** centred · message **Body Small** `text/muted` centred ·
optional Button instance (`Primary`).

**Properties:** `title` (TEXT) · `message` (TEXT) · `showAction` (BOOLEAN) · `actionLabel` (TEXT).

Copy rule: forward-looking, never guilt. "Your first check-in starts
everything", not "You have no data".

---

## 10. Sheet — `src/components/ui/Sheet.tsx`

Bottom sheet. Top corners `radius/card` (20), fill `bg/card`,
effect `Elevation/Sheet`. Scrim above it: **60% black dark / 45% light**.

Header row: title **H2** + **X** close button (44×44), `1px border/default` beneath.
A visible close button is mandatory — dismissal is never gesture-only.

**Properties:** `title` (TEXT) · `heightRatio` (`0.45` · `0.6` · `0.85`).

---

## 11. Chip — ⚠️ design-only, no code counterpart

Pill: radius `radius/pill`, minHeight `36`, paddingHorizontal `spacing/md`.

| State | Border | Text |
|---|---|---|
| Unselected | `1px border/strong` | Body Small `text/muted` |
| Selected | `1px brand/primary` | Body Small `brand/primary` |

**Description must say:** *"Design-only. Duplicated inline in 5 files —
measurements series toggles, logger day pills, check-in Same-as-yesterday,
week strip, tab pill. Extract to `src/components/ui/Chip.tsx` before adding
Code Connect."*

**Property `Icon`:** BOOLEAN + INSTANCE_SWAP (leading, 16).

---

## 12. Badge — ⚠️ design-only, no code counterpart

Pill: radius `radius/pill`, paddingHorizontal `spacing/sm`, height `20`,
text style **Label**.

**Property `Tone`:** `Neutral` (`bg/elevated` / `text/muted`) ·
`Success` · `Gold` · `Primary` — each tinted fill + matching text token.

**Description must say:** *"Design-only. No usage in the codebase yet — spec
ahead of code. Do not add Code Connect until `Badge.tsx` exists."*

---

## Build order (dependency-first)

Atoms → molecules. One `use_figma` per component:

1. Badge · 2. Chip · 3. ProgressBar · 4. OptionRow · 5. RatingRow
6. Button · 7. Input · 8. Stepper · 9. SegmentedControl
10. Card · 11. EmptyState (consumes Button) · 12. Sheet (consumes Card)

**≈12 write calls + ~6 validation screenshots ≈ 18 calls.** That exceeds a
Starter month on its own — Professional (200/day) is required to finish in
one sitting.

## Phase 4 after that

Code Connect for the 10 real components (skip Chip/Badge until they exist) ·
contrast audit against `02-design-system.md` · naming audit · confirm no
unbound fills remain.

---
name: Dawnage
description: A coached training journal. A daily record, workout logging and a real coach, in one calm native app.
colors:
  # Light (default reading of every token). Source: src/theme/colors.ts → light
  background: "#F2F2F7"
  card: "#FFFFFF"
  elevated: "#ECECF1"
  scrim: "rgba(0,0,0,0.32)"
  foreground: "#1D1D1F"
  muted-foreground: "#66666B"
  primary: "#C2302A"
  primary-fill: "#D6362C"
  primary-soft: "#FCEFEE"
  primary-pressed: "#B32A22"
  pressed: "#E5E5EA"
  on-primary: "#FFFFFF"
  success: "#1B7A35"
  gold: "#8F5E00"
  orange: "#C23200"
  destructive: "#D70015"
  border: "#E3E3E8"
  border-strong: "#86868B"
  focus-ring: "#C2302A"
  chart-1: "#D6362C"
  chart-2: "#248A3D"
  chart-3: "#946200"
  chart-4: "#0071E3"
  # Dark. Source: src/theme/colors.ts → dark
  dark-background: "#0B0B0C"
  dark-card: "#131416"
  dark-elevated: "#1A1B1E"
  dark-scrim: "rgba(0,0,0,0.6)"
  dark-foreground: "#FFFFFF"
  dark-muted-foreground: "#A1A1A8"
  dark-primary: "#F04E45"
  dark-primary-fill: "#CF382F"
  dark-primary-soft: "#30191B"
  dark-primary-pressed: "#AE2D26"
  dark-pressed: "#24262C"
  dark-on-primary: "#FFFFFF"
  dark-success: "#00D26A"
  dark-gold: "#F6C85A"
  dark-orange: "#E8853B"
  dark-destructive: "#F04E45"
  dark-border: "#1F1F23"
  dark-border-strong: "#6B6F76"
  dark-focus-ring: "#F04E45"
  dark-chart-1: "#F44A3E"
  dark-chart-2: "#00D66B"
  dark-chart-3: "#FACE57"
  dark-chart-4: "#4799EB"
typography:
  display:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: "40px"
    letterSpacing: "-0.6px"
  metric:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: "50px"
    letterSpacing: "-0.6px"
    fontFeature: "tnum"
  h1:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "34px"
    letterSpacing: "-0.4px"
  h2:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: "27px"
    letterSpacing: "-0.2px"
  body:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "24px"
  body-sm:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "21px"
  label:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "22px"
  caption:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  overline:
    fontFamily: "SF Pro (iOS system), Inter (Android, web)"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.5px"
rounded:
  sm: "8px"
  input: "12px"
  md: "12px"
  button: "14px"
  card: "24px"
  sheet: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  content: "20px"
  lg: "24px"
  section: "28px"
  xl: "32px"
  spacious: "40px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary-fill}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "52px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.border-strong}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 24px"
    height: "44px"
  button-secondary-pressed:
    backgroundColor: "{colors.pressed}"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.destructive}"
    rounded: "{rounded.pill}"
    height: "44px"
  input:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "0px 12px"
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "16px"
  card-metric:
    backgroundColor: "{colors.elevated}"
    rounded: "{rounded.card}"
    padding: "16px"
  sheet:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sheet}"
    padding: "16px"
  option-row:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "44px"
  option-row-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.foreground}"
  rating-option-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  badge:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  status-pill:
    backgroundColor: "{colors.elevated}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    padding: "8px 16px"
    height: "56px"
  progress-track:
    backgroundColor: "{colors.elevated}"
    rounded: "{rounded.pill}"
  tab-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
  tab-bar-selected:
    textColor: "{colors.primary}"
---

# Design System: Dawnage

This is the single design and product reference for the Dawnage client app in `mobile/` (Expo SDK 57, React Native 0.86, iOS, Android and a web export). It has two halves:

1. **The visual system** (Overview → Do's and Don'ts). This covers tokens, components and rules for how the app looks and moves.
2. **The product system** (Product Map → Roadmap). This covers what the app does: the daily check-in, workout logging, weekly check-in, progress, coach connection, native surfaces, and how records are saved and synced.

Every feature is tagged with its status:

- **[Built]**: in the code today.
- **[Partly built]**: some of it ships and the rest is planned.
- **[Planned · Phase N]**: specified in [`docs/superpowers/plans/2026-09-26-market-review/`](docs/superpowers/plans/2026-09-26-market-review/README.md), not built yet.

> **Code is the source of truth for token values.** The YAML above mirrors `src/theme/colors.ts` and `src/theme/tokens.ts`. If you change a token, change the code and this file in the same commit. Never put a hex value anywhere outside `src/theme/`; `npm run verify:ui` enforces this.

---

## Overview

**Creative North Star: "The Training Journal"**

Dawnage should feel like an exceptionally clear training instrument with the warmth of a personal journal. Each day the client writes one honest page: how they slept, how they felt, what they ate, what they lifted. A real coach reads it. The interface should get out of the way of that writing, so it is quiet, legible and native. It should also make each page feel kept and valued: drafts never disappear, saved records say so plainly, and progress is visible.

The visual direction is **refined athletic**. Light mode follows Apple's grouped style: a neutral `#F2F2F7` canvas, white cards, near-black text and no tinted greys. Dark mode is near-black, and surfaces are separated by lifting their colour rather than by shadow. One coral-red hue carries the brand. A vivid fill is used for primary actions and a deeper shade of the same hue for text and icons. Everything else is neutral. The app uses native controls wherever the platform offers them: native tabs, SF Symbols, SwiftUI buttons and segmented pickers on iOS, and Material symbols on Android.

The interface is used in a gym between sets, half-awake in the morning, and on a slow connection. That situation sets three priorities. Large targets and few taps come first. Nothing the user typed may ever be lost. Every number must be readable at a glance in either theme and at the largest text size.

**Key Characteristics:**
- Grouped and calm. Surfaces are separated by tone, with very little shadow and no decoration for its own sake.
- One accent hue, used sparingly, so that it reads as "act here".
- Native first. Platform controls are preferred over custom lookalikes.
- Contrast is measured. Every colour pair carries a WCAG ratio in `colors.ts`.
- Reliability is visible. Every record shows whether it is a draft, saved on the device, synced, or needs attention.
- The motion is restrained. It is short and eased, and it switches off completely under Reduce Motion.

## Colors

One coral hue against true neutrals. The accent marks the action; the neutrals carry the content.

### Primary
- **Dawn Coral** (`primary-fill`): fills primary buttons, the selected rating option, badges and tab badges. Labels on it are always white (`on-primary`, 4.75:1 light / 4.93:1 dark).
- **Ember Text** (`primary`): the same hue made deeper so it can be used as text and icons. It covers links, inline actions, the selected tab, the focus ring and stage icons. It measures 5.60:1 on white in light mode, and the dark value measures 5.16:1 on the dark card.
- **Ember Pressed** (`primary-pressed`): the pressed state of a primary fill.
- **Dawn Wash** (`primary-soft`): tonal selection, used behind the selected option, the selected rating, the stage icon disc, and the pressed state of text buttons.

### Semantic
- **Steady Green** (`success`): "Saved", completed checks, positive trends.
- **Amber Ledger** (`gold`): waiting states ("Saved here · waiting to sync") and score bands.
- **Burnt Orange** (`orange`): the middle score band only.
- **Alert Red** (`destructive`): errors, "Couldn't sync", destructive actions. In light mode it is Apple's accessible red, deliberately distinct from the brand coral. In dark mode it shares the coral.

### Neutral
- **Grouped Canvas** (`background`): the screen background behind everything.
- **Paper** (`card`): cards, sheets, the tab bar and the sticky action bar.
- **Inset Grey** (`elevated`): fills inside cards, such as inputs, chips, option rows, progress tracks and metric cards. In dark mode it is the lifted surface.
- **Ink** (`foreground`): all primary text.
- **Graphite** (`muted-foreground`): secondary text, labels, captions and inactive icons. It measures 5.71:1 on white. Apple's own `#8A8A8E` secondary label fails AA, so it is not used.
- **Press Grey** (`pressed`): the pressed state of neutral rows and buttons.
- **Hairline** (`border`): decorative dividers only.
- **Control Edge** (`border-strong`): the outline of any control whose edge is its only affordance (inputs, the current-set card, unselected badges). It is at least 3:1, as WCAG 1.4.11 requires.
- **Scrim** (`scrim`): behind modals and sheets.

### Charts
`chart-1` coral (weight, primary series), `chart-2` green, `chart-3` amber, `chart-4` blue. Every series must reach at least 3:1 against the card, and every series also differs by **line style** (solid, dashed, dotted, dash-dot), not by colour alone.

### Score colouring
For 1–10 scores in summaries and history: **≥8 success · ≥6 gold · ≥4 orange · otherwise primary**. Always show the numeral with the colour (`8/10`); a coloured dot alone is not allowed.

### Named Rules
**The One Hue Rule.** Coral is the only brand colour. It marks the next action, the current selection and the active tab, and nothing decorative. If a screen shows more than two coral elements at rest, one of them is wrong.

**The Fill-or-Text Rule.** Use `primary-fill` behind white text and `primary` for text and icons. Never swap them, because white on the bright coral fails contrast.

**The Measured Pair Rule.** Every new foreground/background pair is measured before it ships (4.5:1 for text, 3:1 for control edges and graphics), and the ratio is written next to the token in `colors.ts`.

**The Two Mechanisms Rule.** Light mode separates surfaces with white on grey plus a faint shadow. Dark mode separates them by lifting the surface colour. Never port one theme's mechanism to the other.

## Typography

**iOS:** the system font (SF Pro), so the app inherits optical sizing and Dynamic Type exactly as iOS renders it.
**Android and web:** Inter (400, 500 and 600), loaded with `@expo-google-fonts/inter`.

**Character:** a single neutral sans with tight negative tracking at display sizes and relaxed body leading. The type should read like a well-set journal, not like a dashboard.

### Hierarchy
- **Display** (600, 34/40, −0.6): the account-entry heading and the onboarding hero. At most once per screen.
- **Metric** (600, 44/50, −0.6, tabular): the single big number on a receipt or summary, such as completed sets.
- **H1** (600, 28/34, −0.4): screen titles, the check-in stage title, the exercise name in the logger.
- **H2** (600, 21/27, −0.2): card titles, section headings, the date in the logger header, the rest countdown.
- **Body** (400, 17/24): all reading text and input text.
- **Body small** (400, 15/21): supporting copy, helper text, status lines, inline errors.
- **Label** (500, 16/22): button labels, field labels, set labels.
- **Caption** (400, 14/20): metadata such as "3 of 16 answered" or "Last time · 4 Oct 2026".
- **Overline** (500, 12/16, +0.5, uppercase): tiny structural labels such as "EXERCISE 2 OF 6", "TARGET" and "REST". These are never the only label for something the user must read.

### Named Rules
**The Fourteen Floor Rule.** Nothing a user must read is smaller than 14pt. The 12pt overline is for structure only.

**The Tabular Numbers Rule.** Any number that animates, sits in a column or updates live (metrics, set rows, the rest timer, the week strip, answer counters) uses tabular figures (`numeric` on `<Text>`) and a fixed minimum width, so `9 → 10` never shifts the layout.

**The Dynamic Type Rule.** `allowFontScaling` stays on. When `fontScale ≥ 1.3`, rows stack into columns and sticky bars become inline. Layouts grow; they never clip.

## Layout

- **Screen archetypes** (`src/theme/layout.ts`) set every inset; screens never do the arithmetic themselves.
  - `root`: a tab root. It clears the native tab bar (56pt) and the safe area.
  - `child`: a pushed screen.
  - `editor`: a focused task with a sticky action bar. Bottom padding is the measured footer height plus 24.
  - `sheet`: content inside a bottom sheet.
- **Horizontal gutter:** 20pt on phones, 16pt below 360pt width, 24pt at 768pt and wider.
- **Width:** content is capped at 720pt on wide screens (tablets, web) and centred, so text keeps a readable measure.
- **Responsive modes:**
  - `compact`: width below 360 or `fontScale ≥ 1.3`. Side-by-side rows stack, and headers wrap.
  - `regular`: everything else on phones.
  - `wide`: 768pt and wider.
- **Rhythm** (4pt base):
  - 8–12 between related lines
  - 16 inside a card
  - 24 between cards
  - 28–40 between major sections
  - Use only tokens. No arbitrary numbers.
- **Sticky action bars** hold the primary action of long tasks: check-in steps and the logger's rest footer. They collapse to inline buttons when the keyboard is visible, the screen is shorter than 650pt, or the text is very large.
- **Orientation:** portrait only.

## Elevation & Depth

Depth is mostly tonal. Light mode works like iOS grouped lists: white surfaces on the `#F2F2F7` canvas do the separating, and shadow is a faint ambient lift. Dark mode uses no shadows at all, because they are invisible on near-black. A raised surface is simply lighter (`background` → `card` → `elevated`).

### Shadow Vocabulary (light mode only)
- **Card lift** (`0 2px 10px rgba(0,0,0,0.04)`; Android elevation 1): hero cards, such as the Today action card. Ordinary cards stay flat.
- **Sheet lift** (`0 8px 32px rgba(0,0,0,0.10)`; Android elevation 8): bottom sheets and overlay cards.

### Named Rules
**The Flat-by-Default Rule.** Cards are flat (`elevation="flat"`). Only a hero card is `raised`, and only sheets are `overlay`. Never stack a shadow on a shadow.

**The No Navy Shadow Rule.** Shadows are pure black at low opacity. A tinted shadow reads as a dirty edge on the neutral canvas.

**The Glass Is Native Rule.** Translucency comes only from the platform: the native tab bar, and iOS 26 Liquid Glass on floating primary buttons. It is switched off under Reduce Transparency. The app never fakes blur.

## Shapes

Soft, continuous corners (`borderCurve: 'continuous'`, the iOS squircle) on every rounded surface.

- **Capsules** (`pill`, 999): every button, badge, status pill, progress track and the segmented-control track.
- **Cards** (24): cards, the current-set card, skeletons and the Today action card.
- **Sheets** (28): top corners of bottom sheets.
- **Fields and tiles** (12): inputs, option rows, large segmented tiles (digestion, workout status).
- **Small press targets** (8): inline text actions, links and copy chips.
- `button` (14) is defined but unused. Buttons are capsules.

Borders: hairlines (`border`) are decorative dividers. Control edges use `border-strong`. Cards have no border.

## Components

All primitives live in `src/components/ui/` and are exported from `@/components/ui`. Every primitive reads colour from `useTheme()`, has a role and label, shows a pressed state within 120ms, reaches 44pt (iOS) or 48dp (Android) through padding, and has a disabled state that is both visible and announced.

### Buttons (`Button`)
*Calm, native capsules.*
- **Variants:**
  - `primary`: coral fill, white label, 52pt, `large`.
  - `secondary`: coral label, no fill, 44pt.
  - `ghost` and `text`: compact, coral label.
  - `destructive`: red label.
- **States:**
  - Pressed: a spring scale to 0.97 (`motion.spring.press`). The primary darkens to `primary-pressed`; the others get the `pressed` grey.
  - Loading: a spinner plus the label, with the button disabled. A double submit is impossible.
  - Disabled: the primary fills with `border-strong`, and the others show a muted label.
- **iOS:** buttons without icons render as native SwiftUI buttons (`borderedProminent`). A floating primary uses `glassProminent` when Liquid Glass is available and Reduce Transparency is off. Buttons with an icon always use the cross-platform fallback.
- **One primary per view.** Secondary paths are `ghost` or `text`.

### Inputs (`Input`, `NumericEntry`)
- **Style:** an `elevated` fill, a 1pt `border-strong` edge, 12 radius, 48pt minimum height, 17pt body text, and the unit shown outside the editable text ("kg", "kcal").
- **Label:** always visible above the field (`label` variant, muted). A placeholder is never the label.
- **Focus:** the edge turns `focus-ring` coral.
- **Error:** the edge turns `destructive`, and the message appears in words directly underneath ("Enter a weight between 20 and 400 kg."), announced politely.
- **Keyboards:** `decimal-pad` for weight, water and measurements; `number-pad` for steps, calories and reps; `email-address`, `phone-pad`, or multiline default text where appropriate.
- **Numeric entry** (check-in) adds quick-value chips (sleep 6/7/8/9 h, water 1–3 L), a "Use 81.4 kg · 10 Oct 26" previous-value chip with **Undo**, and a "Recent range 80.9–81.6 kg" caption once three earlier entries exist.

### Rating scale (`CheckInRatingScale`)
A 1–10 row of options. The anchor words sit under 1 and 10 (for example "Exhausted" → "Very energetic"). Selection animates the edge to `primary` and the fill to `primary-soft` over 160ms. Each option is a radio with the label "Energy out of 10, 7". The scale wraps to two rows at large text sizes.

### Segmented control (`SegmentedControl`)
- **iOS:** a native SwiftUI segmented picker, tinted coral.
- **Fallback:** a capsule track in `elevated` with a sliding `primary-soft` thumb.
- **`large`:** 64pt tiles at 12 radius, used for categorical answers (digestion, workout status).
- Selection fires a selection haptic.

### Cards (`Card`)
- **Corner:** 24, continuous.
- **Surfaces:**
  - `grouped`: `card`, flat. This is the default.
  - `metric`: `elevated`.
  - `hero`: `card` with Card lift.
- **Padding:** 16 by default, 20–24 for hero content.
- **No border, and never a card inside a card.**

### Lists (`ListRow`, `OptionRow`, `SwitchRow`)
- `ListRow`: a leading muted icon, title and subtitle, a trailing chevron, at least 56pt, hairline dividers, and the `pressed` grey on press. Used for the You tab and settings navigation.
- `OptionRow`: a selectable `elevated` tile that turns `primary-soft` when selected. Used for single-choice questions.
- `SwitchRow`: a label and a native switch at 44pt.

### Status (`RecordStatus`, `StatusPill`, `Badge`)
- `RecordStatus`: the delivery state of a record (see *Records, Offline and Sync*). It shows an icon and words, and it announces changes.
- `StatusPill`: a compact save state inside an `elevated` capsule.
- `Badge`: an outline capsule with a label (`neutral`, `primary`, `success` or `warning`), for example "Baseline".

### Sheets (`Sheet`)
A Gorhom bottom sheet on native and a modal on web. It has `card` surface, 28 top radius, the scrim behind it, a `border-strong` grabber, **and** a visible close button. Swipe-down is never the only way out. It opens with `motion.spring.sheet`.

### Navigation
- **Tabs:** `expo-router/unstable-native-tabs`, a real UITabBar or Material bottom navigation. Labels and SF Symbol / Material icons; the selected tint is coral. In light mode the bar is `card` white with a `primary-soft` indicator; dark mode keeps the system's translucent material. The Check In tab shows a dot badge while today's check-in is missing.
- **Headers:** `PageHeader` (title and back) on child screens; native headers where the stack provides them.
- **Guarded editors** (check-in, logger) are stack screens above the tabs, with an explicit Close control. They intercept leaving while there are unsaved edits.

### Feedback states (`Skeleton`, `EmptyState`, `ErrorState`, `ProgressBar`)
- **Loading:** a skeleton shaped like the content it replaces. Never a centred spinner, except during auth boot.
- **Empty:** a calm icon, one plain line, and the next action ("No progress photos yet" → "Add your first set").
- **Error:** what happened, what is safe, and a Retry button. For example: "Your plan couldn't load. Your daily record is still available."
- **Progress bar:** a capsule track in `elevated` with a coral fill. In light mode the glow is off.

### Charts (`LineChart`)
SVG lines with per-series dash patterns, a touch cursor (a dashed `border-strong` rule) with a readout, a legend, and a one-sentence `summary` as the accessibility label, for example "Weight, last 30 days, down 1.2 kg".

### Brand (`DawnGlow`, `Logo`)
`DawnGlow` is a low-sun gradient wash used only on account-entry screens: coral to amber in dark mode, and a faint coral wash at about 40% strength in light mode. It is never used inside the product.

### Signature components
- **Today action card** (`TodayBrief`): the greeting ("Hi, Amal.") and exactly one next action, chosen by `resolveTodayAction`. See *Product Map → Home*.
- **Week record strip** (`WeekRecordStrip`): seven day pills showing each day's record state in words.
- **Current-set card** (`CurrentSetEditor`): the heart of the logger. See *Workout Logging*.
- **Rest dock** (`RestDock`): a countdown with Pause, +15s and Skip, and a 4pt progress track.

### Motion and haptics
Motion is read only through `useMotion()`. It returns zero durations and `enabled: false` under Reduce Motion, so screens never branch on the setting themselves.

**Durations (ms):**

| Token | Value | Used for |
|---|---|---|
| `micro` | 120 | Press |
| `feedback` | 160 | Selection, captions fading in |
| `enter` | 200 | Reveals, step hand-offs |
| `exit` | 160 | Exits |
| `value` | 260 | Number changes |
| `celebration` | 500 | Reserved for PRs and milestones |

**Easing and springs:**
- `standard`: `cubic-bezier(0.23, 1, 0.32, 1)`, used for entrances.
- `exit`: `cubic-bezier(0.4, 0, 1, 1)`. Exits leave faster than they arrive.
- Springs: `sheet` uses damping 20 and stiffness 90; `press` lasts 120ms with damping ratio 1.
- Press scale is **0.97**. It never moves the neighbouring elements.

**Rules:**
- Animate only transform and opacity.
- No infinite loops, except the rest timer while it is actually running.
- Under Reduce Motion, entrances become instant and celebrations become static.

**Haptics fire with the visual, never instead of it:**

| Moment | Haptic |
|---|---|
| Selection: rating, segment, chip, copy previous value | selection |
| Set completed, stepper ± | light impact |
| Sheet opens, photo captured | medium impact |
| Check-in, measurement or weekly check-in saved | success notification |
| New PR (planned) | two heavy impacts, 90ms apart |
| Validation or network failure | error notification |

## Do's and Don'ts

### Do:
- **Do** take every colour from `useTheme().colors` and every size from the tokens. The only literals allowed are 0 and 1.
- **Do** use `primary-fill` behind white labels and `primary` for coral text (The Fill-or-Text Rule).
- **Do** keep one primary button per view, in the sticky bar on long tasks.
- **Do** give every control whose outline is its affordance a `border-strong` edge, or give it an `elevated` fill instead.
- **Do** pair every colour signal with words or a numeral (`8/10`, "Waiting to sync", a check glyph).
- **Do** use native controls first: native tabs, SF Symbols on iOS, SwiftUI buttons and segmented pickers.
- **Do** use tabular figures for every number that changes or aligns.
- **Do** design both themes at the same time, and check every screen at the largest text size.
- **Do** write the record state in words ("Saved on this device. Waiting to sync.").

### Don't:
- **Don't** put a hex value outside `src/theme/`. `npm run verify:ui` fails the build if you do.
- **Don't** use white text on `primary` (#C2302A text coral) or on dark `#F04E45`. Use the fill tier.
- **Don't** use tinted or navy greys in light mode. The neutrals are true greys (`#F2F2F7`, `#E5E5EA`, `#66666B`).
- **Don't** add shadows in dark mode, or tinted shadows in light mode.
- **Don't** put a card inside a card, or a border on a card.
- **Don't** use emoji as structure (status, buttons, categories). Emoji are allowed only in prose such as reminder copy.
- **Don't** use a placeholder as a label, or a bare red border as an error.
- **Don't** use gesture-only actions. Every swipe has a visible button (logger prev/next, sheet close).
- **Don't** use streak shaming, guilt copy, exclamation marks or medical claims.
- **Don't** animate layout properties or loop animations, and never ignore Reduce Motion.

---

## Product Map

Dawnage is the **client** app of a coached fitness program. Coaches and admins use the web dashboard, and a coach or admin account that signs in on mobile is sent there. Supabase is the only backend: direct `supabase-js` calls with RLS and the anon key only.

### Navigation (current) **[Built]**

| Tab | Route | Job |
|---|---|---|
| **Home** | `(tabs)/index` | Greeting, the one next action, the next session, this week's record, recap, recent record |
| **Check In** | `(tabs)/check-in` | Hub for today's record, earlier drafts and history (the editor is a stack screen above the tabs) |
| **Training** | `(tabs)/plans` | `Plan` / `History` segmented view of the coach's program and past workouts |
| **Nutrition** | `(tabs)/nutrition` | Meal plan, supplements, coach nutrition notes |
| **You** | `(tabs)/more` | Weekly check-in, Measurements, Progress photos, Profile, Settings, coach details |

Stack screens above the tabs:
- `daily-check-in`: the check-in editor
- `logger`: the workout logger
- `weekly-feedback`
- `measurements`
- `media`: progress photos
- `profile`, including the coaching assessment
- `settings`
- `onboarding`
- `logs`: workout history
- `health-access`

Auth screens: `login` (sign in, sign up and forgot password) and `reset-password`.

### Navigation (target) **[Planned · Phase 7]**
**Today · Training · Nutrition · Progress · Coach.**
- The check-in starts from Today, the iOS widget, the Lock Screen and the reminder notification. It no longer needs its own tab.
- Profile, Settings, Measurements, Photos and the Weekly check-in move behind the avatar on Today (an `account` screen).
- Route constants live in `src/features/coach/routes.ts` and `src/features/progress/routes.ts`, so moving a screen into the tab bar changes one constant.

### Home / Today **[Built; becomes "Today" in Phase 7]**
- **Greeting:** "Hi, {first name}."
- **One next action**, chosen by `resolveTodayAction` (`src/lib/today-action.ts`). The order of precedence is:
  1. resume a workout draft ("Pick up where you left off")
  2. continue a check-in draft
  3. a record that needs attention
  4. the daily check-in
  5. "Review your updated plan" (the coach changed it)
  6. "Your next session is ready", which opens the logger on the next unlogged plan day
  7. "Your day is recorded"
- **Pending strip**, shown when records are waiting or blocked, with "Review check-in" and "Review workout".
- **Next session card:** the plan day's focus, or "all sessions logged" once every day is done.
- **Weekly reflection:** the prompt to do the weekly check-in, or to resume its draft.
- **Details:**
  - "This week": the week strip, showing each day as No record, Draft saved, Waiting to sync, Saved and synced, or Needs attention. Tapping a day opens that day's check-in.
  - The weekly recap.
  - "Your recent record", linking to Progress.
  - The assessment row, shown until the assessment is complete.
  - "Day N of your program".
  - The coach's name.
- **Program welcome:** before the first check-in, Home explains that the first check-in starts Day 1. It shows a waiting variant if the client chose to wait for their coach.
- Pull to refresh. Every block has its own loading, error and stale state, so one failed query never blanks the screen.

---

## Daily Check-in

The core ritual: one record per local calendar day, sent to the coach. Code lives in `src/features/checkin/`, `src/components/checkin/`, `src/lib/checkin-validation.ts`, and the table `daily_check_ins`.

### Principles
1. **Every applicable field is required.** The owner decided this. Speed comes from **pre-filling values the user can see and edit**, never from making fields optional, and never from auto-submitting.
2. **Only objective values carry forward.** Weight, sleep, calories, water, steps and macros can be copied from the last record with one visible tap. Subjective ratings (energy, stress, hunger, digestion, workout performance, nutrition score) are always answered fresh (`prefillFrom` in `model.ts`).
3. **Nothing is lost.** Every edit autosaves as a device draft. Leaving, backgrounding the app or changing the date flushes the draft first. A failed device write blocks navigation with "Retry saving" or "Discard draft".
4. **Dates are local.** A record is keyed by a device-local `YYYY-MM-DD`. Past days can be recorded or edited ("Recording a past day."). Future days are refused ("Future days are not available. A check-in records a day you have lived.").

### Flow **[Built]**
1. **Entry.** Entry points are the Home action, the Check In tab hub, the week strip, a reminder notification, the iOS widget (`dawnage:///daily-check-in`) and the history sheet. The hub never creates a draft; it only opens the editor.
2. **Editor.** The editor has four stages. A stage header shows an icon disc, the stage title, a "9 of 16 answered" counter and a step progress bar. A sticky bar holds **Continue** and **Back**. **Continue** validates only the current stage, then scrolls to and focuses the first invalid field.
3. **Review.** The Review stage summarises every answer, with an **Edit morning**, **Edit your day** and **Edit adherence** button for each section.
4. **Submit.** The submit label depends on the situation:
   - "Submit check-in" for today.
   - "Submit for this day" for a past day.
   - "Save changes" for an existing record.
   - "Save check-in & start Day 1" for the very first record.
5. **Receipt.** The receipt shows the record state (synced or saved on the device). The next step is "View your training" if today's record is synced, a coach plan is assigned and nothing needs recovery; otherwise it is "Back to Home". From the receipt the client can edit or open history.
6. **Exit.** "Close check-in" and "Save draft and return Home" are always available.

### Fields **[Built]** (`src/features/checkin/config/fields.ts`)

| Stage | Field | Control | Range / options | Carries forward |
|---|---|---|---|---|
| **Morning** | Morning weight | Numeric entry | 20–400 kg, 0.1 | Yes |
| | Sleep | Numeric entry and quick values 6/7/8/9 | 0–24 h, 0.5. "Sleep during the night before this reporting date." | Yes |
| | Energy | 1–10 rating | Exhausted → Very energetic | Never |
| **Your day** | Stress | 1–10 rating | Relaxed → Very stressed | Never |
| | Hunger | 1–10 rating | No appetite → Very hungry | Never |
| | Digestion | Large segmented | Normal · Bloated · Constipated · Diarrhea | Never |
| **Training & nutrition** | Workout | Large segmented | Done · No · Cardio · Rest | Never |
| | How did it go? | 1–10 rating, **only when Done or Cardio** | Struggled → Felt strong | Never |
| | Nutrition score | 1–10 rating | Far from my goals → Matched my goals | Never |
| | Calories | Numeric | 0–20,000 kcal | Yes |
| | Water | Numeric and quick values 1/1.5/2/2.5/3 | 0–20 L, 0.25 | Yes |
| | Steps | Numeric | 0–200,000 | Yes |
| | Protein · Carbs · Fats | Numeric | ≥ 0 g | Yes |
| **Review** | Notes | Multiline text | "Briefly describe your day for your coach." | Never |

This gives 16 fields, or 15 when workout performance does not apply. The payload maps one-to-one to `daily_check_ins` columns; `toPayload` nulls performance when the status is No or Rest.

### Helpers inside the form **[Built]**
- **Previous value chip:** "Use 81.4 kg · 10 Oct 26" copies the last record's value. It then reads "Copied …" with an **Undo**.
- **History caption:** after three earlier entries, the field shows "Recent range 80.9–81.6 kg" (or "Recently: 7 h"), covering up to 14 earlier entries.
- **Health import** (`src/features/health/`): reads Apple Health or Health Connect for the reporting day.
  - Fields: morning weight (the latest sample before noon), steps, food calories, water, protein, carbs and fats.
  - Every value goes through a **review sheet** first. Nothing is applied without the user seeing it.
  - Denied, empty and unavailable reads explain themselves and fall back to manual entry.

### Validation **[Built]** (`src/lib/checkin-validation.ts`)
- Validation runs per stage on **Continue**, and for every stage on **Submit**, so a restored Review draft cannot skip a stage.
- Messages are specific and in words, for example "Enter a weight between 20 and 400 kg." or "Choose a rating from 1 to 10."
- A summary alert reads "Please complete the highlighted fields." and is announced to the screen reader.

### Program day
- A client's program starts on their **first submitted check-in**. That date is stored in `users.package_start_date`, and Home shows "Day N of your program".
- Drafts and coach assignment never start the program.

### Planned improvements
- **Sleep import** from Apple Health and Health Connect **[Planned · Phase 4, Task 4.3]**.
- **Meal-log totals**: "Use today's meals: 1,850 kcal · 140 P · 180 C · 60 F" fills the calorie and macro fields in one visible tap. Swapped or unanswered meals are flagged as partial **[Planned · Phase 5, Task 5.3]**.
- **GLP-1 protein floor**: a hint on the protein field when GLP-1 mode is on **[Planned · Phase 8, X7]**.
- **"Ask your coach about this"** from a submitted record. The message is pinned to that day **[Planned · Phase 2]**.

---

## Workout Logging

A focused, offline-safe logger for the coach's program and for free sessions. Code lives in `app/(app)/logger.tsx`, `src/components/logger/`, `src/features/workout/`, and the table `workout_logs`.

### Entry **[Built]**
Workouts open from:
- Home's "Your next session is ready", which opens the next unlogged plan day.
- The Training tab: a plan day, or History.
- A resumed draft.
- The iOS Training widget and the Live Activity (`dawnage:///logger`).

Each workout has a date, which must be today or a past day. If several saved workouts share a date, the logger asks which one to open.

### Screen anatomy **[Built]**
- **Header:**
  - A close (X) control and the date ("Sat 11 Oct").
  - **Overview** opens a sheet listing every exercise with its progress, plus **Add exercise**.
  - **Finish**.
- **Session details** (a disclosure): the workout title, and plan day chips. Switching days asks whether to keep or replace the current draft.
- **Exercise carousel:**
  - An overline ("EXERCISE 2 OF 6") above a swipeable slide.
  - **Previous exercise** and **Next exercise** buttons, because swipe is never the only way.
  - The iOS back-swipe is disabled on this route.
- **Exercise slide:**
  - The exercise name (H1) and "2 of 4 sets complete".
  - **Exercise guide** opens the coach's prescription sheet: sets × reps, rest, coach notes, demo link and substitutions.
  - **Use [substitute]** replaces the exercise for this session, after a confirmation.
- **Current-set card** (`CurrentSetEditor`):
  - A label ("Set 2" or "Warm-up 1") and "2 of 4".
  - A **Target** chip from the prescription ("8 reps" or "45 sec").
  - The suggestion line: "Last time · 4 Oct 2026: 60 kg × 8 reps", with **Use suggestion**, **Use target** or **Use previous**, then **Undo copy**.
  - **Steppers:** weight ±2.5 kg ("Leave blank for bodyweight", with **Use bodyweight**), reps ±1, duration ±5 s.
  - **Effort & options:** an optional RPE field, the **Plate calculator** and Remove set.
  - **Complete set**, which becomes **Mark set incomplete** once done.
- **Set list:** compact rows for every set, each with a checkbox, RPE, **Add a set**, and remove with **Undo removed set**.
- **"Exercise complete"** then **Continue to {next unfinished exercise}**, or **Review workout** when nothing is left.
- **Rest dock** (a sticky footer):
  - The rest duration is the prescribed rest, or the user's preset (60/90/120/180 s).
  - Rest auto-starts after a completed set (this can be turned off).
  - Controls: Pause or Resume, +15s and Skip, with a progress track.

### Rules **[Built]**
- **Suggestions are never saved silently.** A suggested value becomes part of the set only when the user completes that set, and then it is visible in the row (`applySetSuggestion`).
- **Validation on completion:**
  - Reps must be a positive whole number.
  - Weight must be a valid number, or left blank for bodyweight.
  - Duration sets need a valid duration.
  - Errors appear under the card in words.
- A completion lock prevents double completion, and "Undo" is available right after completing a set.
- **Warm-up sets** (from the plan's `warmupSets`) are labelled separately and excluded from personal-record calculations.
- **Volume** counts only completed strength sets with valid kg and whole reps. Bodyweight and duration sets are counted as sets but not as volume.

### Finishing **[Built]**
1. **Review workout** shows the completed sets (Metric), the incomplete sets and the volume ("kg × reps · completed strength sets"). It warns about incomplete sets and about values excluded from volume.
2. **Save workout** leads to a receipt: "Workout saved", "Workout saved on this device", or "Couldn't sync workout" with **Retry save**.
3. **Leaving with unsaved changes** asks: **Keep editing**, **Discard local changes**, or **Save draft & exit**.

### Data
- `workout_logs.content` is a versioned JSON document: `version: 2`, `planDayNumber`, and exercises with tracking type and sets (weight, reps, RPE, duration, warm-up or work, completed).
- Older array-format and plain-text logs stay readable. Plain-text notes open read-only ("This historical note is preserved in Training history").
- The web dashboard must read and preserve v2 **[Planned · Phase 1, Task 1.4, owner gate]**.

### Planned improvements
- **Personal records and last-session comparison.** Estimated 1RM uses the Epley formula, only for sets of 1–12 reps, and warm-ups are excluded. The summary celebrates PRs with the `celebration` token and a double heavy haptic, and compares volume with the last session **[Planned · Phase 3, Tasks 3.6–3.7]**.
- **Readiness nudge.** When today's check-in shows sleep under 6 h, energy of 4 or less, or stress of 8 or more, the logger offers "Low readiness today: slept 5.5 h, energy 3/10. Should I adjust this session?". This opens a coach message and the coach's own substitutions. It never changes the plan by itself **[Planned · Phase 8, X4]**.
- **Quick entry by dictation:** "8 at 60" fills reps and weight, using the OS keyboard microphone with no new dependency **[Planned · Phase 8, X5]**.
- **Form-check video** from the set screen, sent to the coach **[Planned · Phase 8, X2, owner gate]**.
- **Opt-in Lock Screen detail:** the exercise name and a coach cue on the Live Activity, off by default **[Planned · Phase 8, X8]**.
- **Deferred:** lb units, supersets and session duration (see the spec, §5).

---

## Other Records

### Weekly check-in **[Built]** (`app/(app)/weekly-feedback.tsx`, `src/components/weekly/steps.ts`, the table `weekly_check_ins`)
A five-step wizard, with values matching the web byte for byte:

1. **Weekly Overview:** overall feeling, weekly wins.
2. **Nutrition:**
   - Adherence: Yes / No / Mostly
   - Digestion
   - Enjoying meals
   - Hunger levels: No hunger / Mild hunger / High hunger / Cravings
   - Questions
3. **Training:**
   - Progressing: Yes / No / Stalled
   - Enjoying training
   - Missed sessions
   - Joint pain
   - Average steps, **pre-filled from this week's daily check-ins**
   - Questions
4. **Wellbeing:** recovery issues, average water (pre-filled), stress 1–10 (pre-filled), overall experience.
5. **Feedback:** optional.

How it works:
- The week number is the number of earlier check-ins plus 1.
- Every value is written as text, and a weekly check-in cannot be edited after it is sent.
- Drafts are kept on the device.
- Before sending, the app re-checks the submitted history so a report can never be sent twice.
- On completion the app shows "Check-in submitted", with **Add measurements**, **Add progress photos** and **Done**.
- Past check-ins appear as history cards. **[Planned · Phase 2]** The coach's reply will show directly under the answer it responds to.

### Measurements **[Built]** (`app/(app)/measurements.tsx`, `body_measurements`)
- Chest, waist, hips, thighs and arms, in cm (valid range 20–250), entered in a sheet.
- Weight is not entered here. It comes from the daily check-ins.
- Metric cards for **Weight change** and **Avg weekly change**, a chart per measurement with timeframes All / 1M / 3M / 6M, and history rows.
- **[Planned · Phase 6, Task 6.1]** The chart will render immediately; today it waits for a lazy-mount that can fail.

### Progress photos **[Built]** (`app/(app)/media.tsx`, `weekly_progress_photos`)
- Four poses: **Front, Back, Side left, Side right**.
- The first set is **Week 0 · Baseline**, and every later set is numbered by week.
- **Pose guide:** the camera shows last time's photo as a ghost overlay, so photos line up. Week 0 uses a silhouette instead.
- Images are compressed (up to 1200×1600, quality 0.75) and stored per user.
- **[Planned · Phase 1, Task 1.3, owner gate]** Photos move to a private bucket served through signed URLs (`PrivatePhoto`, `usePrivatePhotoUrl`).

---

## Plans, Nutrition and Progress

### Training tab **[Built]** (`src/features/training/`)
- **Plan:** the coach-assigned program from `users.active_workout_plan` (level, workout type, sub-category, days per week).
  - The user's own `workout_plans` rows are shown first. If there are none, the global templates are used.
  - Day cards show the focus and the exercise prescriptions (sets × reps, rest, notes, demo link, substitutions).
  - Plan provenance reads "Updated 3 days ago", or "Coach update 3 days ago" with a "Plan updated" marker when the coach changed it. That change also drives Home's "Review your updated plan".
  - A global template fallback is labelled "Training template · preview only".
  - The plan is read-only for the client.
- **History:** past workouts newest first, including drafts and records waiting to sync. Legacy logs are rendered safely.

### Nutrition tab **[Built]** (`src/features/nutrition/`)
- The meal plan from `users.active_meal_plan`: Breakfast, Mid Morning Snack, Lunch, Evening Snack and Dinner, each with kcal and macros.
- Supplements (name, serving, timing) and the coach's nutrition notes, in disclosures.
- Read-only today, with calm empty and error states ("No meal plan yet").
- **[Planned · Phase 5]** A **Today** section where each meal is marked **Ate it / Swapped / Skipped**.
  - The log is stored on the device per user and date.
  - The meals marked "Ate it" give the totals for the check-in.
  - "Swapped meals aren't counted. Add what you ate in your check-in."

### Progress **[Planned · Phase 6]**
A Progress screen, which becomes a tab in Phase 7, built around "since you started":
- A smoothed weight trend with its start and current values.
- Strength progress per lift, using best estimated 1RM over time.
- The measurement chart, and photos side by side (baseline and latest).
- Home's "Your recent record" and the weekly recap link here, in place of text like "A change needs two dates".
- **Monthly "Chapter"** **[Planned · Phase 8, X6]**: then-and-now photos, the trend and PRs for the month. It is offered in the last three days of a month and the first seven of the next.

---

## Coach Connection

The coach is Dawnage's moat: a real person, with rich daily data. Today the coach appears only as a name (Home, and "Coach details" in You).

### Coach thread **[Planned · Phase 2, owner gate for SQL]**
- **Storage:** a private thread in the new table `coach_messages`, protected by RLS, with a mark-read RPC.
  - Columns: `client_id`, `sender_id`, `body`, `context_type`, `context_id`, `context_date`, `read_at`.
- **Pinned context:** a message can be pinned to a `daily_check_in`, `weekly_check_in`, `workout_log`, `progress_photo` or `workout_set`. The thread shows the pin ("About your check-in · 9 Oct").
- **Screen:** a thread with a composer. A failed send **keeps the typed text** and offers a retry. The screen polls every 60 s while open; there is no realtime or push yet.
- **Entry points:**
  - A Home card, "From your coach", for the latest unread message.
  - "Ask your coach about this" on records.
  - A row in the account screen, and later the **Coach** tab.
- **No coach assigned:** a calm "no coach yet" state, with the composer hidden. Never an error.
- **Coach side:** the web inbox and reply push are specified only, not built **[owner gate]**.

---

## Account, Onboarding and Settings

### Account entry **[Built]** (`app/(auth)/`)
- **Sign in** ("Welcome back."), **Create my account** ("Create your account.": full name, email, and password with a show/hide toggle), and **Forgot password?** ("Reset your password.").
- The **Verify your email** state has a resend countdown.
- Password reset uses the deep link `dawnage://reset-password`. After the reset the user is signed out and returned to sign in.
- Only `client` accounts can use the app. Coach and admin accounts are pointed to the web dashboard.

### Onboarding **[Built]** (`app/(app)/onboarding.tsx`, `src/features/onboarding/`)
- **Your focus:** Fat loss · Build muscle · Performance · Consistency.
- **The rhythm:** an explanation of the daily check-in, training and the weekly check-in.
- **Start:** **Start now** opens the first check-in. **Wait for my coach** goes to Home, which shows a waiting state.
- **Timezone:** detected from the device and editable. It is stored in `users.profile_data`.
- "You can change your mind on Home. Your plans appear when your coach assigns them."

### Coaching assessment **[Built]** (`src/components/questionnaire/`, `onboarding_questionnaire`)
- 10 sections and 87 questions, mirrored verbatim from the web: text, number, select, radio, textarea and rating types.
- Progress is saved per section. Home shows "Your assessment" until it is complete, and it is resumed from Profile.

### Profile **[Built]**
- Name, email, phone (with a country picker), goal, injuries, food allergies, workout days per week and medical conditions.
- Program details, **Save changes** with save recovery, and **Sign out** (which asks for confirmation).

### Settings **[Built]** (`app/(app)/settings.tsx`, `src/lib/reminders.ts`)
- **Reminders:**
  - A daily reminder with a time (default 08:00). Its copy reads "A moment for your daily record · Check in with your training, nutrition and recovery when you're ready."
  - A weekly reminder with a day and time (default 18:00), reading "Your weekly check-in is ready 📝 · Tell your coach how the week went."
  - A permission explainer appears before the OS prompt, and the screen reports whether delivery is actually scheduled.
- **Appearance:** System · Light · Dark. This is stored under `theme-preference`.
- **[Planned · Phase 8]**
  - GLP-1 mode: on/off, dose weekday and protein floor, stored in `profile_data.glp1`.
  - The Lock Screen detail opt-in.

---

## Native Surfaces and Health

These require an **iOS 16.2+ development build**. They do not run in Expo Go.

- **Widgets [Built]** (`src/features/native-surfaces/`)
  - `DawnageCheckIn` reads "Daily check-in · Open Dawnage".
  - `DawnageTraining` reads "Training · Open Dawnage".
  - Both come in home-screen sizes and as Lock Screen accessories (circular and inline), with SF Symbols (`checklist`, `dumbbell`).
- **Workout Live Activity [Built]**
  - Starts only for **today's** new, unsynced workout.
  - Shows "Workout", "Rest" or "Rest paused", the exercise number of the total, sets done of the total, and a live rest countdown in the Dynamic Island and on the Lock Screen.
  - Goes stale after inactivity ("Open Dawnage to continue") and ends on finish or discard.
  - **Privacy:** no exercise names, titles, IDs or measurements on the Lock Screen (`activityContent`). The opt-in detail is **[Planned · Phase 8, X8]**.
- **Deep links:** `dawnage:///daily-check-in`, `dawnage:///plans`, `dawnage:///logger`.
- **Health [Built]**
  - Apple HealthKit and Android Health Connect readers.
  - A consent screen titled "Your health data, your choice".
  - A review-before-apply sheet in the check-in.
  - Sleep is **[Planned · Phase 4]**.
- **Notifications [Built]:** local only. Tapping one routes to the right screen (`useNotificationRouting`).
- **Deferred:** Android widgets, Apple Watch, Siri / App Intents, voice check-in.

---

## Records, Offline and Sync

Every record the client creates (daily check-in, workout, weekly check-in draft, profile) goes through the same lifecycle. It is **local first, delivered by an outbox** (`src/lib/asyncOutbox.ts`, `checkInOutbox.ts`, `outbox.ts`).

| State | Words shown (`RecordStatus` and the week strip) | Tone |
|---|---|---|
| saving-local | "Saving on this device…" | muted |
| draft | "Draft saved on this device." | muted |
| queued | "Saved on this device. Waiting to sync." | primary |
| synced | "Saved" / "Saved and synced" | success |
| blocked | "Couldn't sync this record." / "Needs attention" | destructive |

Rules:
- A record is **never discarded silently**. Discarding is always a deliberate, confirmed action.
- **Blocked** records explain the cause in plain words, keep the user's values, and offer **Retry**:
  - auth: "Your session needs to be refreshed"
  - permission
  - conflict: "Another record conflicts with this save"
  - validation
- The outbox flushes on reconnect and on app focus. Home surfaces pending and blocked records first.
- Daily check-ins are unique per user and date: the app fetches the record, then updates or inserts it. Workouts are keyed per user, date and log, with explicit recovery when several logs exist for one day.
- State changes are announced to screen readers.

---

## Voice and Copy

- Plain, short, second person, and sentence case on buttons ("Save workout", "Continue check-in").
- **No** exclamation marks, guilt ("You missed…"), streak shaming or medical claims.
- Say what is safe and what to do next: "Your plan couldn't load. Your daily record is still available." Never show raw errors ("PGRST116").
- Fewer words. **[Planned · Phase 7, Task 7.2]** The copy pass removes helper sentences that explain the obvious.
- Emoji appear only inside prose (the weekly reminder), never as UI structure.
- Units are kilograms, litres, hours, kcal and grams, with the locale's thousands separators.

## Accessibility Contract

These apply to every screen, as acceptance criteria (from `plans/03-ux-standards.md`):

1. Every control has a role and a label. Icon-only controls get a descriptive label, and decorative icons are hidden from screen readers.
2. Targets are at least 44pt (iOS) or 48dp (Android), with 8pt between them, reached through padding (`HIT_SLOP_MIN`).
3. Composite controls expose their state: ratings and segments are radios with selected/checked; steppers announce "Increase weight by 2.5 kilograms".
4. Async results are announced ("Check-in saved and synced.", "Check-in saved on this device. Waiting to sync.").
5. Charts carry a one-sentence summary, and colour is never the only signal.
6. Dynamic Type stays on, and layouts reflow at `fontScale ≥ 1.3`.
7. Reduce Motion and Reduce Transparency are respected through `useMotion()` and `useReducedTransparency()`.
8. Forms use the right keyboard, validate on blur and on submit (never on each keystroke), show inline errors, avoid the keyboard, and keep `keyboardShouldPersistTaps="handled"`.
9. Unbounded lists use `FlatList`, with a stable `keyExtractor` and memoised rows.
10. Every query has a designed loading, error and empty state.

---

## Roadmap

From the market review (graded C+ on 2026-09-26). Run the phases in order. 🔒 marks owner-gated work (SQL, `client/`, `shared/`, devices).

| Phase | Theme | Status |
|---|---|---|
| 1 | Launch blockers: RLS, role escalation, private photos 🔒, web reads v2 workouts 🔒, dev build, device run 🔒 | Planned |
| 2 | Coach loop: `coach_messages` 🔒, thread, pinned context, Home card, replies under weekly feedback | Planned |
| 3 | Fast logging: suggestions, one-tap completion, ±, set list, name suggestions | **Built** (3.1–3.5) |
| 3 | Rewarding finish: PRs (Epley), last-session comparison, celebration | Planned (3.6–3.7) |
| 4 | Faster check-in: "Morning / Your day" stages, the answered counter | **Built** (4.1–4.2) |
| 4 | Sleep import | Planned (4.3, needs a device) |
| 5 | Plan-first nutrition: meal check-offs, totals into the check-in | Planned |
| 6 | Progress: chart fix, weight trend, strength progress, Progress screen | Planned |
| 7 | Tabs: Today · Training · Nutrition · Progress · Coach; copy pass; `useHomeModel` | Planned |
| 8 | Standout: Lock Screen cue (X8), readiness nudge (X4), dictation (X5), Chapter (X6), GLP-1 (X7), form video (X2 🔒) | Planned |

**Will not build:** AI-generated workouts, a social feed, streak shaming.

### Open design decisions (owner)
- **Light-mode inputs:** keep the filled `elevated` field with its edge, or move to white fields with only a hairline outline, which looks more iOS. The second option needs every outline to stay at least 3:1.
- **A visual identity pass** beyond the palette (the "generic look" in the C+ grade). This is planned after Phase 7 as a separate `/impeccable shape` session.

---

## Maintaining This File

- **Code wins on values.**
  - Tokens: `src/theme/colors.ts`, `src/theme/tokens.ts`, `src/theme/layout.ts`.
  - Check-in fields: `src/features/checkin/config/fields.ts`.
  - Weekly fields: `src/components/weekly/steps.ts`.

  If this file disagrees with the code, fix whichever one is wrong in the same change, and say which.
- When a planned feature ships, change its tag to **[Built]** and update the Roadmap table.
- Superseded references, kept for history only:
  - `plans/02-design-system.md`
  - `docs/redesign/2026-09-15/design-system-and-motion.md`
  - `animation-plans/02-design-system.md`
- Before shipping UI, run `npm run verify` (types, lint, tests and `verify:ui`).

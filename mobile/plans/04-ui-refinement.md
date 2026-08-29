# 04 — UI Refinement Plan

Written after the app first ran on device. The build is functionally complete and
accessible; what it lacks is **identity**. Screens read as a competent form
wrapper rather than as Dawnage. This plan fixes that in priority order.

Binding constraints unchanged: `02-design-system.md` (measured colour),
`03-ux-standards.md` (behaviour). Nothing here may regress either.

---

## Direction: first light

The one idea everything hangs off. It is not decoration — it is the product:

- **Dawn**age is dawn + age.
- The mark is a bird in **forward flight**, and the wordmark is oblique — it leans.
- The ritual the entire app turns on is a **morning** weigh-in.

So the brand gesture is a **directional wash from the top edge** — brand red
pushed toward amber, light breaking over a dark horizon (`DawnGlow`).

**Restraint rule: it appears on exactly two surfaces — auth and the dashboard
header.** The moment it lands on every screen it stops being a signature and
becomes wallpaper. Do not add a third without removing one.

Everything else stays quiet and disciplined so the mark and the data carry the
screen.

---

## P0 — Brand identity ✅ DONE

- `Logo` component: `wordmark` / `glyph` / `lockup`. The source art is pure
  white with alpha, so it is **tinted at render time from the theme** rather
  than shipped as two files that can drift. Follows a live theme switch.
- `assets/wordmark.png` — the source `logo.png` is 1920×1080 with enormous
  transparent padding; trimmed to 1643×226 so layout maths is real.
- `DawnGlow` — verified in both themes at the gradient's strongest point:
  dark washes to `rgb(57,24,23)`, light to `rgb(242,228,230)`; foreground,
  muted and primary all still clear AA.
- Applied: auth (lockup + glow), auth confirmation screens, dashboard header
  (20dp glyph, muted) + glow, onboarding (wordmark).

---

## P1 — Hierarchy (highest impact remaining)

### 1. Dashboard hero
The streak is the emotional payload of a habit app and it currently sits in a
12pt muted subtitle next to "Day 271 · Week 39". Promote it:

```
┌─────────────────────────────────┐
│  Good morning, Amal        [>]  │   greeting owns the line
│                                 │
│   12          Day 271 · Week 39 │   streak as a METRIC, Poppins 40
│   day streak                    │   label beneath, not inline
└─────────────────────────────────┘
```
When the streak is 0 the block becomes the forward-looking prompt instead
("Today's a fresh start" + Check in) — never a zero on display.

### 2. Break the 2×2 tile grid
Four identical tiles is the template answer. Weight is the number the client
actually cares about daily — give it a full-width card with the trend chart
inline as a sparkline, and demote Workouts / Nutrition / Energy to a compact
three-up row of small stats.

### 3. Tab bar
Currently stock. Add an active-state treatment (filled pill behind the active
icon in `primaryFill`), and let the Check In tab carry a subtle dot when today
has no check-in — the one piece of ambient state worth surfacing globally.

---

## P2 — Flow friction

### 4. Plans navigation
Two stacked tab rows (Training|Nutrition → Workout|Notes) means four taps to
reach nutrition notes. Collapse to a single segmented control with the
secondary content as labelled sections in one scroll.

### 5. Check-in tone
`12 of 16` on the submit bar is accounting, not encouragement. Replace with the
payoff that is about to happen ("Submit — keeps your 12-day streak"), and keep
the count only as an accessibility value.

### 6. Logger density
The set row is a 5-column grid on a phone. Give the active exercise a sticky
header, and drop RPE to a second line so weight/reps get full width.

---

## P3 — Finish

7. Screen transitions on tab focus (fade+rise 250ms, honouring `useMotion()`).
8. Empty states use the **glyph** at low opacity instead of a generic lucide
   icon — free identity on the screens users hit when they have no data yet.
9. Skeletons matched per-card rather than the generic 2–4 line block.

---

## Light mode

**Already implemented and shipping** — `ThemeProvider` + AsyncStorage override,
switchable at **More → Settings → Appearance** (System / Light / Dark), live,
no restart. Every colour was contrast-measured in `02-design-system.md`; the web
app's light values were unusable on mobile and were replaced, not copied.

Remaining light-mode work is verification on device, not implementation:
confirm chart series, the glow, progress-bar halos and the tinted logo all read
correctly against white cards.

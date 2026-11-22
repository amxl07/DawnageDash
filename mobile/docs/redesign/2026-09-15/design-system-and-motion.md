# Dawnage design system and motion specification

Companion to the [master design](../../superpowers/specs/2026-09-15-premium-experience-design.md). Values are proposed starting tokens. No runtime theme file is changed by this document.

## Visual character

Precise, warm, quiet, and personal. A useful comparison is a well-made training instrument paired with an editorial health journal. The interface should have strong focal points and generous breathing room without wasting the space needed for actual work.

Three visual signatures carry the identity:

1. **Today Brief:** an open editorial header and one substantial coral-accented next action.
2. **Daily Record:** clear section rhythm, large readable values, precise controls, quiet personal context.
3. **Workout Focus:** one current set, compact history, and a restrained persistent rest dock.

Do not use nested cards, full-screen gradients, ambient animated glows, decorative dashboards, or decorative glass behind every metric. Existing brand artwork can be used sparingly where it has a clear role.

## Color tokens

Retain the current semantic naming where possible; add aliases only when a new role is genuinely different.

| Role | Dark | Light | Use |
| --- | --- | --- | --- |
| background | #0B0B0C | #F5F4F1 | Main canvas; proposed light canvas adds slight warmth |
| card | #131416 | #FFFFFF | Independently actionable summaries and grouped sections |
| elevated | #1A1B1E | #FFFFFF | Sheets and elevated controls |
| foreground | #FFFFFF | #17171A | Primary text |
| mutedForeground | #A1A1A8 | #5C5C63 | Supporting text that remains readable |
| primary | #F04E45 | #C0362C | Accent text/icons on stable neutral surfaces |
| primaryFill | #CF382F | #CF382F | Proposed button fill with more contrast margin |
| onPrimary | #FFFFFF | #FFFFFF | Label on primaryFill |
| border | #1F1F23 | #E4E4E9 | Decorative separation only |
| borderStrong | #6B6F76 | #8E8E96 | Proposed dark boundary works on elevated surfaces |
| success | Existing #00D26A | Existing #0F7A43 | Confirmed operations, always with text/icon |
| destructive | Existing #F04E45 | Existing #C0362C | Errors/destructive actions, never weight interpretation |

A source calculation during planning found the existing dark borderStrong against elevated at approximately 2.81:1. Proposed #6B6F76 measures approximately 3.41:1 there and 3.65:1 on card. White on proposed primaryFill measures approximately 4.93:1. Existing muted text measures approximately 7.18:1 on dark card; on the proposed warm light canvas it measures approximately 6.03:1.

These are flat-color calculations, not rendered accessibility certification. Validate pressed, disabled, composited, high-contrast, glass, and chart states separately. Avoid lowering the opacity of an entire active button if that makes its text harder to read.

Use coral to indicate action and selection. Missing health data is not red. Weight change is not automatically green or red. Charts distinguish series through labels, line styles, and selected-point text.

## Typography

Use the platform system font for ordinary UI on iOS; retain installed Inter for Android. Use the already installed Poppins only for selected hero metrics or brand expression. Do not bundle downloaded SF font files into Android.

| Role | Default size / line height | Weight | Usage |
| --- | --- | --- | --- |
| Display | 34 / 40 | Semibold | First-run and a small number of major headings |
| Hero metric | 44 / 50 | Semibold or Poppins bold | One principal metric, never a grid of competing headlines |
| Page title | 28 / 34 | Semibold | Home, Daily Record, workout title |
| Section title | 21 / 27 | Semibold | Section boundaries |
| Body | 17 / 24 | Regular | Instructions and content |
| Control label | 16 / 22 | Medium/Semibold | Buttons, inputs, selected states |
| Supporting | 15 / 21 | Regular | Context and history |
| Caption | 14 / 20 | Regular/Medium | Dates, units, secondary metadata |
| Brand overline | 12 / 16 | Medium | Nonessential brand labeling only |

Use tabular numerals for timers, entered values, and set columns. Keep body tracking near zero; slightly tighten large titles only. Let titles wrap. Do not clip exercise names, shrink essential text to fit, or cap font scaling to preserve a composition.

At 200% text, a compact vertical composition is expected. Hero data may occupy more lines; labels and units must remain associated. Screen-reader names include the full value and unit even when visual typography separates them.

Native tab labels follow platform behavior. Do not force them into a custom tiny-label style.

## Layout and density

| Token | Value / rule |
| --- | --- |
| Spacing scale | 4, 8, 12, 16, 20, 24, 32, 40, 48 |
| Phone horizontal margin | 20; 16 below 360 points |
| Section separation | 28–32 |
| Related field separation | 16–20 |
| Inline label/value gap | 4–8 |
| Button radius | 14 |
| Input radius | 12 |
| Independent summary radius | 24 |
| Sheet upper radius | 28 where supported; native presentation owns native radius |
| Primary button minimum height | 52, grows with content |
| iOS minimum hit region | 44 by 44 points |
| Android minimum hit region | 48 by 48 dp |
| Touch separation | At least 8 between adjacent compact controls |
| Wide content | Centered, maximum 720 points; selective two-column read-only summaries |

Use continuous corner curves where supported, with an ordinary radius fallback. Geometry tokens are not fixed-height content constraints.

Keep a single scroll owner per form. Floating actions, native tab bars, safe areas, and the keyboard must each have one documented inset owner. Measure action/dock height; do not assume the existing 64-point action token still fits at large text.

Primary authoring sizes: 390 by 844, 320 by 568, and 430 by 932 points. Validate 768-wide layout as a secondary responsive case. These are design canvases, not device-specific hardcoded dimensions.

## Component contracts

| Component | Required variants and states | Important behavior |
| --- | --- | --- |
| Button | Primary, secondary, text, destructive; enabled, pressed, busy, disabled | Preserve label while busy; prevent duplicate submit; named role/state |
| Input | Empty, filled, focused, error, read-only, disabled | Persistent label/unit; correct keyboard/autofill; error association; clear focus |
| Selection row | Unselected, selected, unavailable | Checkmark and selected semantics; no color-only selection |
| Rating scale | Unanswered and 1–10 | Two rows of five on phones when needed; never squeeze ten subminimum targets into one row |
| Numeric instrument | Unset, typed, dragging, bounded, invalid, read-only | Weight/sleep/water only; direct typing stays visible; cancel safely |
| Section | Plain, grouped, collapsible | Title and optional summary; no border merely to fill space |
| Day Record | Draft, queued, synced, failed | Compact factual content; local save state distinct from server state |
| Status banner | Informational, pending, error | Persistent while relevant; retry action where actionable; no automatic disappearance for critical status |
| Sheet | Picker, details, review | Title, explicit close, logical focus, drag alternative, keyboard-aware scroll |
| Set row | Future, current, completed, invalid | One current editor; completion is deliberate and reversible |
| Rest dock | Running, paused, elapsed, inactive | Independent timer subscription; visible controls; accessible remaining time |
| Chart | Loading, empty, sparse, populated, failed | Selected value/date, units and source; textual data alternative; missing values are gaps |
| Skeleton | Header, summary, row, editor | Match expected footprint; static under Reduce Motion; never obscure available cached content |

Prefer expanding existing primitives and focused feature components. Do not install a new UI kit or replace the full component library to obtain these variants.

## Platform behavior

Apple principles guide hierarchy, feedback, and direct manipulation. Android retains its own back behavior, notification permissions, keyboard behavior, and accessibility service conventions.

| Surface | iOS | Android |
| --- | --- | --- |
| Hierarchical navigation | Native stack transition and back semantics | Native stack and hardware/predictive back compatibility for installed versions |
| Tabs | Persistent labels; installed implementation; optional native-tabs evaluation | Same destinations; platform minimum targets; preserve tab state |
| Materials | Native glass only when actually supported; otherwise static blur/solid | Stable solid surfaces by default; no expensive glass imitation |
| Sheets | Existing Gorhom behavior or verified native form sheet per use case | Existing tested Gorhom behavior with Android back/keyboard handling |
| Haptics | Best effort, meaningful commits | Best effort where supported; visual feedback always sufficient |
| Text access | Dynamic Type, VoiceOver, Voice Control | Font scaling, TalkBack, system contrast/access settings |

Do not run multiple competing keyboard owners or stack a custom blur over a native glass component.

## Motion language

Values below are house defaults to feel-test in the installed Reanimated 4.1 environment. Gesture updates use worklets and shared values. Domain state updates do not run on every frame.

| Interaction | Purpose | Starting treatment | Reduced Motion |
| --- | --- | --- | --- |
| Primary button press | Acknowledge touch | Immediate pressed color; scale to 0.98 over 100 ms, return over 120 ms | Color only |
| Selection change | Explain state | 120–160 ms color/opacity | Immediate state |
| Tab change | Switch peer sections | No custom slide or entrance replay | Same |
| Stack push/pop | Explain hierarchy | Platform default | Platform reduced-motion behavior; verified fade fallback if needed |
| Sheet presentation | Reveal a focused task | Library/native transition; custom snap target around 300 ms with damping ratio 1 | Immediate/static or short fade |
| Drag release | Settle an object | Around 400 ms, damping ratio 0.8 only when momentum warrants it; pass release velocity | Immediate settle |
| Ruler | Direct manipulation | Finger-aligned tick/value preview; commit domain value once; no velocity-driven change in the recorded measurement | Immediate preview/commit; no spring travel |
| Set completion | Confirm a reversible action | Check and row emphasis over 120–160 ms; next editor appears without forced scroll | Immediate |
| Rest timer | Communicate time | Absolute-time model; subtle progress, no pulsing; digits update only as needed | Static progress/digits |
| Receipt | Confirm the result | 160 ms opacity; optional small check transition | Immediate |
| Chart selection | Inspect data | Immediate crosshair/value; no bouncing axis or animated data entrance on scroll | Same |

Use an ease-out curve equivalent to cubic-bezier(0.23, 1, 0.32, 1) for brief custom feedback. Physics settles have no guaranteed wall-clock completion; perceived timing must be measured. Avoid animating blur intensity, large shadows, layout margins, or long lists.

### Ruler engineering requirements

- Keep the existing objective fields, bounds, increments, and tap-to-type path.
- Start a horizontal gesture only after clear intent; reject it when vertical scrolling wins.
- The visible preview and committed value come from the same clamp/round function.
- Update transient visual text through a verified UI-runtime-compatible adapter; do not send a React state update every frame.
- A cancelled gesture restores the committed value and visual anchor. Boundary travel cannot imply a value beyond the bounds.
- VoiceOver/TalkBack adjustment performs the same one-step operation as explicit plus/minus alternatives.
- One subtle haptic may accompany a committed adjustment. No per-frame haptics or repeated live-region announcements.
- If the native preview adapter cannot meet these requirements in SDK 54, keep a correctly aligned current-value ruler and direct typing while resolving the prototype. Do not ship a visually misleading preview.

### Haptics and sound

Use one best-effort selection/confirmation haptic for a meaningful commit, and a success haptic only when the relevant save state is known. A local queue may receive a light acknowledgment paired with explicit pending text; it must not masquerade as a synced success.

No haptics on ordinary scrolling, screen entrance, timer ticks, or every form keystroke. Sound is off by default. Exact physical haptic timing is platform controlled and is not promised to occur on the same display frame.

## Accessibility details

The app targets WCAG-informed contrast and native task accessibility; a source review does not certify compliance.

- Normal essential text targets at least 4.5:1 contrast; large text and required non-text boundaries at least 3:1.
- Every control has an accessible name, role, state, and relevant value. “Previous” includes which value/date will be copied.
- Rulers expose one adjustable value. Decorative ticks and transient preview text are hidden from screen readers.
- On validation, expand any containing section, scroll to the field, focus it, then announce its error once.
- On sheet opening, move focus to its title or first appropriate control. On closing, restore focus to the trigger.
- Preserve reading/focus order as layouts stack. Do not mark a whole form section accessible in a way that hides its children.
- Charts provide a readable list of date/value/unit observations and never rely on hue alone.
- Saved/failed states are announced at meaningful transitions, not on each autosave keystroke.
- When a sticky Day Record or timer dock consumes too much of a large-text viewport, move it into the document flow while keeping a reachable action.
- Test reduced transparency and increased contrast independently of reduced motion.

## Design handoff

Produce component variants, token definitions, flow frames, and annotations before implementing the broad visual pass. If Figma is used later, pages should be Foundations, Components, Onboarding, Home, Check-in, Workout, and States.

Each key screen needs dark/light, normal/large text, and its important error/empty/pending variants. Annotate scroll ownership, keyboard placement, focus destination, transition source, and data provenance.

Use fictional consistent data. Reference date for initial concepts is Tuesday, 15 September 2026; the containing Monday–Sunday week is 14–20 September. Do not put production names, health records, or photo URLs into design artifacts.

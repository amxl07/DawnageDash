# One visual and motion system

**User-confirmed direction: Refined athletic.** Retain Dawnage’s dark/red identity, with precise motion and selective cinematic graphics. Apply this direction to the existing screen, component, accessibility and motion specifications below.

Design target: an exceptionally clear training instrument with the warmth of a personal journal. Extend `src/theme/tokens.ts`, `src/theme/colors.ts` and `useMotion()`; do not introduce another theme package. The current palette and typography already support this direction.

## Composition and aesthetic

The screen should have one focal point, one primary action and a clear route back. Use open sections for related information; reserve cards for independently actionable content. Thin separators, visible selection and typography provide hierarchy without nesting boxes.

Retain near-black `#0B0B0C`, card `#131416`, raised `#1A1B1E`, white text, muted `#A1A1A8`, coral `#F04E45` for accent, and `#CF382F` for white-labelled primary buttons. Light mode uses `#F5F4F1`, white cards, `#17171A` text, muted `#5C5C63`, and `#C0362C` accent. Use existing semantic success, error and chart roles. A lower body weight is not inherently “success”; a missed entry is not an error.

The signature graphic is a **segmented record of real activity**, not an invented readiness or health score. It can become seven dated marks on Home, set marks in a workout, and a restrained line in first-run artwork. The metaphor stays consistent while the actual data meanings remain explicitly labelled.

| Element | Specification |
| --- | --- |
| Screen margins | 20 pt; 16 below 360 pt; content max width 720 |
| Section rhythm | 28–32 pt between sections; 16–20 between related fields |
| Corners | Input 12, button 14, card 24, sheet 28; continuous where supported |
| Controls | Minimum 44×44 iOS, 48×48 Android; primary min height 52, expands with text |
| Type | Existing iOS system UI / Android Inter; 34/40 display, 28/34 page, 21/27 section, 17/24 body, 16/22 labels, 15/21 support, 14/20 metadata |
| Numbers | Tabular; one large metric per surface. Prefer system semibold for frequent values; retain Poppins sparingly for brand/hero expression. |
| Contrast | Essential normal text ≥4.5:1; large text/control boundaries ≥3:1; verify actual composed states |
| Depth | Surface color first in dark mode, restrained static shadow in light. No continuous shadow/blur animation. |
| Graphics | Native text overlays; strokes 2–3 pt for charts and 4–6 for a compact ring; date/value/unit always explicit |

Large text changes the layout. Stack workout fields, let labels wrap, grow buttons, move the dock inline, and use plain metrics where animated digit clipping cannot remain readable. Do not fix a layout by shrinking text or capping accessibility scaling.

## Motion tokens

These are **proposed house defaults** for an implementation to feel-test. Preserve the exported token names where possible. Existing callers keep their data contracts. Native navigation and Gorhom own their platform transitions.

| Token / interaction | Exact starting value | Reduced motion |
| --- | --- | --- |
| `micro` / press | 120 ms; scale 1→0.97, immediate surface tint; release returns from current value | Tint only, no scaling |
| `feedback` / selection | 160 ms, cubic-bezier(0.23,1,0.32,1) | Immediate selected state |
| `enter` / local content | 200 ms maximum; opacity, optional ≤8 pt translation for non-input content | Immediate or 100 ms opacity if comfortable |
| `exit` | 160 ms maximum, cubic-bezier(0.4,0,1,1) | Immediate |
| `value` | 260 ms, only occasional read-only metric changes | Immediate text |
| `celebration` | ≤500 ms finite check/path sequence, only a meaningful confirmed result | Static check and text |
| Standard ease-out | `[0.23, 1, 0.32, 1]` | No travel |
| In-out | `[0.77, 0, 0.175, 1]`, rare reversible non-gesture illustration | Static |
| Sheet curve if timing is needed | `[0.32, 0.72, 0, 1]`, 300 ms | Library reduced-motion behavior |
| Settle spring | `{ duration: 400, dampingRatio: 1 }` | Direct final value |
| Gesture release | `{ duration: 400, dampingRatio: 0.8, velocity }`; clamp hard boundaries | Direct settle |
| Press spring, if retained instead of timing | `{ duration: 120, dampingRatio: 1 }` | Scale remains 1 |

Reanimated duration-based spring parameters are not Apple's spring “response” parameter. Do not mix `duration`/`dampingRatio` with physics `stiffness`/`damping` keys in the same config. The library may settle differently from the nominal duration; confirm on device.

Do not animate typing, ordinary timer digits, chart inspection values, routine tab changes, or screen content on every tab revisit. State commits immediately; decorative completion runs alongside it. No action waits for an animation to finish. A disappearing or changing control must not deliver a second rapid tap to a new set/action underneath it.

## Microinteraction contracts

| Primitive | Press / transition | Interruption and semantics |
| --- | --- | --- |
| Button | Immediate pressed fill/tint; optional 0.97 scale over 120 ms | Commit on release, cancel by moving away; scale returns on cancellation/disable; loading retains label; one submit |
| Rating / choice | Selected background/check and text change together, 160 ms | Tap same answer does nothing; announce selected state; no default subjective answer |
| Segmented control | Thumb 160 ms; maintain readable text at both old/new positions throughout | Rapid retargeting starts at current presentation value; selected semantics update immediately |
| Text input | Focus border immediately; 120 ms optional outline color | Native keyboard, caret and selection; raw invalid text survives; no digit odometer |
| Disclosure | Chevron 0→180° over 160 ms; body immediate or ≤160 ms opacity | Input-containing layout does not slide underneath a focused keyboard; flush/validate before collapse |
| Error | Persistent local message; focus/scroll to actual first error | No shake, flashing red screen or repeated announcement on every keystroke |
| Set completion | Local check 160 ms; summary retained; next editor opacity ≤160 ms | Capture stable set ID; Undo targets that ID; preserve focus; no automatic exercise advance |
| Receipt | Check/path ≤500 ms once on a fresh receipt; readable text immediately | Queue says “Saved on this device”; synced says “Saved”; retry/restore never fabricates success |
| Sheet | Existing gesture follows finger; snap settles through Gorhom | Explicit close, back and screen-reader alternatives; title focus then trigger restoration; retain dirty guards |
| Toast/banner | Short 160 ms opacity if transient; persistent errors stay | No crucial information only in a disappearing toast; timers pause/lengthen with accessibility needs |
| Refresh/loading | Keep cached data; matching placeholder if no data | Static skeleton under reduced motion; cancel loops when hidden/unmounted; no artificial loading delay |
| Chart | Immediate finger-aligned crosshair; end-selection tint 120 ms | Axis fixed while inspecting; vertical scroll wins unless horizontal intent is clear; keyboard/adjustable alternative |
| Photo | Cached thumbnail→image crossfade ≤160 ms | Never animate shape/color of progress subject; user-controlled zoom/pan; no auto-play comparison |

## Haptics

Centralize ownership by action. Keep visual feedback sufficient when the device cannot or chooses not to vibrate.

| Event | Treatment |
| --- | --- |
| Changed answer/segment | One selection haptic; no repeat on selected option |
| Complete set / explicit timer start | One light impact. Auto-starting rest as a consequence of set completion is silent. |
| Rest expires while relevant | One best-effort success/notification event; no ticks; notification permissions are separate |
| Confirmed server save | One success event for a new receipt only |
| Local queued save | Optional light acknowledgement plus explicit pending text |
| Validation | Prefer focus/text; no haptic barrage across invalid fields |
| Scroll, keystroke, screen entry, chart frame | None |

Sound remains off unless explicitly configured. An in-app haptics preference is optional later; system reduced motion is not automatically equivalent to disabling haptics.

## Accessibility and platform matrix

- A live preference source must handle startup lookup, OS change events, application resume, cleanup and web `prefers-reduced-motion`. A late initial promise must not overwrite a newer event.
- On preference changes cancel in-flight loops/transforms and settle them safely. The standard state must be readable with every animation disabled.
- Reduced transparency produces a solid surface with the same geometry and foreground contrast. It is independent of reduced motion.
- VoiceOver/TalkBack announce meaningful discrete changes, never every chart frame or timer second. Allow explicit “remaining time” focus and date/value adjustment.
- Keep accessible labels, roles, selected/busy/disabled state, units and errors in native elements. Canvas content is decorative to assistive technology unless paired with a semantic equivalent.
- Preserve native stack back behavior, hardware back and form-exit checks. Do not introduce mandatory swipe actions. RTL mirrors layout/navigation cues, not chronological chart data without an explicit locale rule.
- Test both themes at 320/390/430 widths and 200% text, keyboard open/closed, screen reader active and offline states. Compact designs may scroll; they must not obscure the action or trap focus.

## Rendering and lifecycle rules

Use shared values/worklets for continuous transforms and graphics. Never bridge every frame into React state. Reuse paths, memoize normalized chart data, size canvases to their actual bounds, and avoid multiple full-screen compositing layers. Lazy-load nonessential graphics. Pause finite/ambient work when the route is unfocused or the app is backgrounded; discard old completion callbacks after route/data changes.

No ambient animation is planned for normal authoring screens. For optional first-run artwork, one ≤800 ms line reveal is sufficient; the CTA is usable from the first frame. Native launch splash remains static and hands off without an artificial pause.

60 Hz gives 16.67 ms/frame; 120 Hz gives 8.33 ms/frame. These are display budgets, not demonstrated app performance. Transform/opacity and a canvas can still cost frames. Profile a release-like build on real iOS and Android devices before claiming smoothness, battery efficiency or ProMotion support.

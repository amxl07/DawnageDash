# Dawnage — premium motion and interface blueprint

Designed 17 September 2026 against `mobile` at commit `8ec16a7` **plus the existing uncommitted SDK 57 and guided-flow changes**. This is the original design and execution specification. The authorized source implementation is complete; see the [implementation evidence](../docs/redesign/evidence/premium-motion/README.md) for current checks and limitations.

**Confirmed visual direction:** The user selected **Refined athletic — retain Dawnage’s dark/red identity, with precise motion and selective cinematic graphics**. This is the chosen direction for the detailed redesign and its implementation plans.

## The recommendation

Keep Dawnage's refined athletic identity: near-black, warm white, coral, generous typography, and precise feedback. Preserve the easier three-step check-in and one-set-at-a-time workout logger. Give the product a recognizable visual language through **weekly rhythm, focused training, and a clear personal record**.

Use the installed **Reanimated 4 + Gesture Handler** for interaction, **selective Skia** for graphics that benefit from a canvas, and **native materials/symbols** where the platform supports them. Native inputs, text, navigation, accessibility, and persistence remain the foundation.

SDK 57 supports a more current graphics stack. It does not automatically make the interface smoother, and Skia was possible before SDK 57. Most immediate quality improvements need no new graphics library.

## Review the design

- [Interactive motion studio](motion-studio.html): five proposed surfaces, light/dark, reduced-motion control, working selection, set completion, rest, and chart inspection. Open the HTML in a browser. It uses fictional data and illustrates timing and hierarchy; it is not the Expo app or native performance evidence.
- [SDK 57 options and evidence](01-sdk57-research.md): versions, platform support, tradeoffs, official sources.
- [Visual, motion, material, and accessibility system](02-design-system.md): exact defaults and component rules.
- [Complete feature specification](03-feature-specification.md): every current product area, interaction states, content, and motion.
- [Source audit](04-audit.md): vetted improvement opportunities and existing decisions to preserve.
- [Delivery and acceptance](05-delivery-and-acceptance.md): sequence, measurements, release criteria, and dependencies.

## Five signature moments

1. **Home — a weekly rhythm.** Seven dated segments communicate the actual record. A saved day fills its segment once; opening a tab does not replay a celebration. A single next action remains dominant.
2. **Check-in — a calm conversation.** Clear tap targets acknowledge an answer immediately. Small local transitions connect steps, errors, optional details, and the final receipt. No precision dragging is required.
3. **Workout — one decisive action.** Completing a set confirms exactly that set, retains Undo, and brings the next editor into the same place. The rest indicator remains independent of the input controls.
4. **Progress — a record you can inspect.** A crosshair follows touch, with an always-readable date and value. Missing observations remain gaps. Skia is considered for this surface only if it improves the existing SVG experience.
5. **First run — quiet confidence.** A finite brand-line reveal introduces the rhythm; onboarding stays short, skippable where appropriate, and immediately usable.

## Execution order

| Plan | Outcome | Dependencies | Status |
| --- | --- | --- | --- |
| [001](execution/001-motion-foundation.md) | Live motion preferences, reliable touch feedback, readable metrics | None | Implemented; automated + browser checks passed |
| [002](execution/002-guided-daily-interactions.md) | Check-in continuity, set handoff, one haptic per action | 001 | Implemented; automated + browser checks passed |
| [003](execution/003-graphics-and-progress.md) | Truthful progress graphics; SVG retained pending a measured Skia comparison | 001; compare against SVG | SVG upgrade implemented; native pilot deferred |
| [004](execution/004-materials-and-supporting-features.md) | Coherent materials, onboarding, plans, history, media, settings | 001; 002 pattern decisions | Implemented; automated + browser checks passed |
| [005](execution/005-native-quality-gate.md) | Device evidence and production acceptance | Each relevant slice | Automated/browser checks and exports passed; physical-device evidence pending |

Do not install Skia, Lottie, Rive, a replacement navigation system, and a new UI kit together. Start with the shared interaction fixes and daily workflows. Keep Skia only where a measured prototype earns its cost. Lottie and Rive are alternatives for a later authored illustration, not prerequisites for this design.

The [original design-pass verification](verification.md) is historical evidence for the motion studio. The subsequent product implementation and refreshed light palette have their own [verification record](../docs/redesign/evidence/premium-motion/verification.json). Neither browser screenshots nor automated tests establish native frame timing or haptic quality.

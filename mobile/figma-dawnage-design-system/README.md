# Dawnage Mobile Design System Builder

This is a local Figma plugin that creates a complete **3-page high-fidelity Dawnage mobile design-system file** from the existing Expo app UI system.

It is designed for a blank Figma file. It creates exactly these pages:

1. `01 Foundations`
2. `02 Components`
3. `03 Screens & UX`

## What It Builds

- Foundations from the app tokens in `src/theme/colors.ts` and `src/theme/tokens.ts`.
- High-fidelity component mockups for buttons, inputs, cards, selectors, steppers, rating rows, progress bars, chips, badges, empty states, error states, sheets, tab bar, week strip, and sticky action bars.
- Representative high-fidelity mobile screens for auth, dashboard, check-in, questionnaire, empty dashboard, and settings.
- UX documentation for daily check-in speed, streak tone, loading/error/empty states, accessibility, chart clarity, and brand restraint.

## How To Use

1. Open Figma.
2. Create a new blank design file.
3. Go to `Plugins` → `Development` → `Import plugin from manifest...`.
4. Select this file:

   `mobile/figma-dawnage-design-system/manifest.json`

5. Run `Dawnage Mobile Design System Builder` from `Plugins` → `Development`.
6. The plugin will populate the file with the complete 3-page design system.

## Notes

- The plugin uses Figma primitives only, so it does not need external image uploads.
- The Dawnage logo is approximated as a vector/text lockup because local app PNG assets are not imported by this plugin.
- If Figma does not have `Poppins` available, the plugin falls back to `Inter` or `Roboto`.
- Running the plugin clears existing nodes from the first three pages and removes additional existing pages to keep the file limited to 3 pages.

## Source References

- `src/theme/colors.ts`
- `src/theme/tokens.ts`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/Stepper.tsx`
- `src/components/ui/RatingRow.tsx`
- `src/components/ui/OptionRow.tsx`
- `src/components/ui/ProgressBar.tsx`
- `plans/02-design-system.md`
- `plans/03-ux-standards.md`
- `plans/05-figma-component-specs.md`

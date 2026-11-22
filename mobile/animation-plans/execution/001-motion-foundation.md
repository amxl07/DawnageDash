# 001 — Reliable shared motion and feedback

Status: IMPLEMENTED · Automated and browser verification passed; native-device acceptance pending · Baseline: `8ec16a7` plus current working tree · Priority: high/medium · Categories: accessibility, feedback, contrast, cohesion.

## Problem and scope

Work in `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile`. Preserve existing uncommitted work. Relevant sources:

- `src/theme/ThemeProvider.tsx:78`: `const reduced = useReducedMotion();` reads Reanimated's startup snapshot. The installed hook explicitly does not rerender on system-setting changes.
- `src/components/ui/Button.tsx:68–73`: press handlers only change `scale` with `withSpring`; reduced-motion `pressScale: 1` removes all visual touch feedback.
- `src/components/ui/SegmentedControl.tsx:56`: thumb moves with `withTiming(...)`; `:139` changes selected text immediately to `onPrimary` before its fill arrives.
- `src/components/ui/AnimatedNumber.tsx:119–128`: digit geometry derives from unscaled type tokens and clips scaled text.
- `src/components/ui/AnimatedList.tsx:25–27`: durations are hardcoded 260/220/160.

## Target

Keep `useMotion()` as the public consumer API. Introduce one live preference owner using React Native AccessibilityInfo startup/query/change events and a web media-query adapter, with event-vs-initial-query race protection and cleanup. Recheck on application resume as appropriate. Reuse `src/hooks/useReducedTransparency.ts` as a race-safe local pattern; do not conflate the two preferences.

Use immediate pressed tint plus optional scale 0.97. Press/release timing 120 ms, cubic-bezier(0.23,1,0.32,1); if a spring is retained use `{ duration:120, dampingRatio:1 }`, not mixed physics keys. Reduced motion leaves scale 1 but retains tint. Selection is 160 ms with the same curve. Local entrances 200 ms, exits160, infrequent numeric changes260. Native tabs remain instantaneous.

For compact segmented controls, prefer a neutral selected surface with foreground text that maintains contrast throughout transit; a coral indicator can carry brand. Alternatively coordinate old/new fills and label colors without a white-on-light intermediate frame. Do not merely delay semantics or selected state until animation completion.

At increased text size, prefer the existing plain Text numeric branch rather than clipped odometer columns. Initial proposed fallback threshold is `fontScale > 1.2`, also always plain under reduced motion. Preserve sign, precision, unit and aggregate accessible label. Do not disable font scaling. If later using measured animated digits, prove all sizes/locale formats first.

## Implementation steps

1. Read current theme, preference and primitive tests before editing. Snapshot the starting diff; do not reset existing work.
2. Add the live preference source and preserve `enabled`, `reduced`, duration and pressScale output shape. On a true reduced-motion change cancel active motion and settle values; do not rely only on zeroing future durations.
3. Update Button touch-down/cancel/release states. Preserve busy label, disabled state, onPress semantics and target size. Extend a small reusable pressed-surface pattern to PageHeader, Sheet close and RecordStatus retry without changing their actions.
4. Make selection intermediate states readable. Use the current radio roles/selected values and layout calculation; no schema or segment API rewrite.
5. Add the large-text plain-number fallback. Keep MetricCard's semantic value and fixed-width protections where needed.
6. Replace relevant hardcoded timing with theme tokens. Cancel Skeleton repeats on reduced-motion change, blur/unmount as appropriate and set a stable opacity; do not claim or fix an unproven memory leak.

## Boundaries

Do not replace navigation, enable React Compiler, introduce Skia, change saved data, animate keyboard input, animate every list row, or change Sheet snap sizing. The existing `enableDynamicSizing={false}` and measured handle are deliberate. Color values come from `src/theme/colors.ts`; add a semantic pressed role only if existing surfaces cannot meet contrast.

## Verification and done criteria

Meaningful tests: preference event before initial promise; live on/off; cleanup/resume; held/cancelled/disabled Button; selected semantics independent of animation; large-text number retains exact accessible value. Run relevant existing primitive/theme tests, TypeScript, lint and UI contracts. No test is needed solely to assert a duration literal.

Feel-check normal and reduced motion on iOS/Android: hold then drag out of a button; retarget selection rapidly; switch system setting while a skeleton is visible; inspect light-mode selection frame by frame; view metrics at 200% text. Done means feedback remains visible without movement, text never clips, and input/action delivery is unchanged.

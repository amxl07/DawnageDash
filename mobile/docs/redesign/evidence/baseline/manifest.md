# Baseline evidence

- Source: `8ec16a7` (mobile), before the premium implementation.
- Planning snapshot: `61fd7bd`.
- Fixture: fictional Alex Morgan, reporting date 15 September 2026.
- Intended comparison: actual Expo routes at 390 × 844, dark/light, with 320-point compact variants.
- Native baseline: unavailable on this machine; no Xcode Simulator or connected Android device was available.
- Browser capture status: the original source reached a runtime error. That capture is retained as diagnostic evidence and does not establish a visual baseline.

The machine's original mobile source was used for the baseline preview while implementation remained in an isolated worktree. No production backend account or records were used.

## Browser observation — 2026-09-16

The original Home route bundled but raised a runtime error before normal layout: React Native Web does not implement `AccessibilityInfo.isReduceTransparencyEnabled`. The original notification-response lookup also rejected on web. `home-dark-390.png` and its text/error manifest record that failure; they are **not accepted baseline design frames**. The redesign guards those unsupported platform APIs. Native baseline comparison remains unverified.

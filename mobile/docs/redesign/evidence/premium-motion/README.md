# Premium motion and light appearance

The shared UI, daily flows, progress graphics and supporting-screen source changes are implemented. Regression tests, TypeScript, lint, browser journeys and all-platform exports have passed. Physical-device acceptance remains pending. This record distinguishes source changes, automated checks and actual runtime evidence; pending checks are not passes.

## Light appearance

SparkyFitness reference: `SparkyFitnessMobile/global.css` and `SparkyFitnessFrontend/src/index.css` in the adjacent FitnessAPPRepos checkout. Dawnage uses the reference's cool surface hierarchy and slate text while retaining deep coral actions.

| Role | Light token |
| --- | --- |
| Canvas | `#F3F6FA` |
| Card | `#FFFFFF` |
| Raised/input surface | `#F7F9FC` |
| Primary text | `#17243B` |
| Secondary text | `#53647C` |
| Coral text/icons | `#B63B32` |
| Primary action | `#C94136` |
| Selected surface | `#FBEAE7` |
| Primary press | `#A9322B` |
| Neutral press | `#E7EDF5` |
| Success | `#0F766E` |
| Interactive outline | `#7E8CA1` |

Metrics use the same system/Inter semibold family as headings. The native light splash pairs a slate version of the existing wordmark with the pearl canvas; it applies on the next native build. The system window background also follows appearance. Slate-tinted shadows provide quiet depth. Dark mode retains its existing identity with additive pressed and selected surfaces.

`contrast.json` contains 64 measured semantic color combinations across both appearances: body text/semantic text against canvas/card/raised surfaces, control boundaries, primary labels, tonal selections and neutral press states. All 64 meet their stated 4.5:1 text or 3:1 boundary thresholds. Decorative borders intentionally have lower contrast. This calculation does not replace screen-level accessibility checks.

## Motion and graphics

Shared motion uses 120 ms press, 160 ms selection/local handoff, 200 ms entrance and 260 ms value durations. Controls keep visible pressed feedback with movement disabled. The OS preference is observed live; loading pulses stop on blur/background/unmount. Metrics at any non-default font scale use naturally wrapping text instead of clipped rolling columns.

Production graphics remain SVG. SDK 57 supports Skia 2.6.2, but native profiling is required before claiming a benefit or replacing the renderer. Progress plots use actual dates and preserve missing values; native semantic text and controls accompany decorative graphics.

## Implemented interaction changes

- Live Reduced Motion changes, discrete pressed surfaces, interruptible local transitions, and large-text metric fallback.
- Check-in rating feedback, optional-section disclosure, step handoff and fresh-result receipts without replaying restored answers.
- Stable-ID set completion, stale-tap protection, explicit Undo and a single completion haptic; auto-starting rest does not add another haptic.
- Dated chart inspection, preserved missing observations, per-measurement valid baseline/latest comparisons and aligned weekly record marks.
- Calmer plans with one exercise list, consistent supporting-screen press states, and improved heading/photo focus ownership.
- Light/dark system backgrounds, guarded iOS glass availability, and a tab indicator that waits for known check-in data.

## Rendered app evidence

The actual Expo app uses fictional intercepted data. No live account or backend mutation is used.

| Capture | Appearance and motion | Evidence |
| --- | --- | --- |
| Standard phone, 390 × 844 | Dark/light; normal motion | [14 route states and 16 journey checkpoints](phone-final/capture-manifest.json) |
| Compact phone, 320 × 568 | Dark/light; Reduced Motion | [6 route states and 16 journey checkpoints](compact/capture-manifest.json) |

All 20 route frames passed readiness and geometry checks with zero recorded application errors. Both capture runs exited 0. The two runs executed 32 guided journey checks: incomplete sections do not submit; numeric drafts commit or retain invalid input; review edits preserve other answers; check-in submission has the intended date/values; completed workout sets remain editable; explicit Continue selects the next exercise; Overview opens partial review without losing entries. The Overview header/body geometry also passed.

View [light Home](phone-final/home-light-390.png), [light check-in](phone-final/checkin-light-390.png), [light workout](phone-final/workout-light-390.png), and [light onboarding](phone-final/onboarding-light-390.png). These are app screenshots, not the separate illustrative motion studio. Visual review corrected the check-in badge to a tonal surface so its icon remains readable, and sheets now consume the softer light scrim.

Every page reported the known react-native-svg web interoperability warning about native `accessible={false}`. It remains recorded in the capture manifests. The capture tool dismisses only its matching Expo development toast before screenshots, leaving application UI unchanged. The raw logs also retain late CDP interception/session messages during target closure. No active frame failed. The initial cold-start attempt timed out before its first route rendered; its rejected frame is not accepted as app evidence.

## Verification status

- Semantic palette calculations: passed, 64/64 pairs, including the tonal check-in badge.
- UI contracts / production syntax: passed, 191 source files.
- Direct production data/geometry smoke checks: passed, 21 assertions across two reproducible scripts.
- Integrated TypeScript: passed on the implementation and final fixture corrections.
- ESLint: full scan had no errors; one array-type style warning was corrected and the targeted rerun passed.
- Jest: all 904 tests across 122 suites have passing latest results, with no skipped tests. The full run passed 109 suites and exposed 13 fixture failures; all 13 corrected suites then passed (104 tests). The corrections retain behavior assertions and align mocks/queries with the upgraded renderer. See [per-suite outcomes](jest-latest-outcomes.json) and [the exact record](verification.json).
- Browser captures and guided journeys: passed as described above.
- iOS, Android and web exports passed (exit 0), including native Hermes bundles. [Export log](logs/export.txt) and [bundle hashes](export-artifacts.json) are recorded. These are JavaScript/Hermes exports, not installed native app builds.
- Physical iOS/Android touch, haptics, glass, accessibility and frame timing remain unverified.

## Reproducibility and limits

The source was already dirty before this task. [Source hashes](source-manifest.json) compare against the preserved [before-task hashes](baseline-hashes.json); the source archive remains at `/tmp/dawnage-premium-20260917/baseline.tar.gz`. A null baseline hash means a new path or one outside the original limited inventory, not proof that this task created it. No RED execution is claimed: initial failing-test attempts stalled in filesystem/module loading before executing.

This host showed severe synchronous filesystem delays. Verification used temporary directory-resolution and immutable dependency-byte caches. Existing source contents, source reads/writes and assertions stay live; the optional byte cache reuses only installed dependency bytes and returns independent Buffers. [Directory helper](directory-resolution.cjs.txt) and [dependency helper](dependency-read-cache.cjs.txt) are preserved as text for reproducibility, not installed app configuration. The 60-second Jest timeout is CLI-only; repository defaults are unchanged.

No test, export or browser screenshot establishes native frame timing, haptic quality or accessibility certification. Production graphics remain SVG; a Skia comparison and physical-device release acceptance remain pending.

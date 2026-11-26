# Pearl and cobalt light mode — 10 October 2026

The client selected pearl white + cobalt blue. The implementation uses a cool mist canvas, pearl cards, navy text, cobalt actions, pale-blue selections and quiet blue-gray dividers. Charts use cobalt, teal, violet and ochre, retaining their labels and line styles.

The shared palette carries this treatment through the app. Light-mode native and web tab badges use the new accent; native tab backgrounds/indicators use the theme. Account-entry glow and raised-surface shadows also follow the palette. The light splash background matches the canvas and will take effect in the next native build.

Six application/config files changed. Screen layout, copy, routes and persistence behavior are unchanged. Dark palette values, glow colors, default tab treatment and dark shadow behavior remain as before. Source snapshots are stored as plain text to keep them out of build/lint scans; `source-manifest.json` and `light-mode.diff` record the final change against the pre-edit working source.

## Verification

- All 67 measured color pairs pass: body/semantic text and action labels at least 4.5:1; control boundaries/focus and chart lines at least 3:1. Minimum measured ratios are 4.58:1 for text and 3.14:1 for boundaries/graphics. See `verification/contrast.json`.
- The same check confirms that the dark palette is unchanged and both splash backgrounds match their corresponding canvases.
- TypeScript and scoped ESLint passed. All 133 existing tests across 15 affected component/navigation/screen suites passed. The UI contract check passed for 255 source files. Commands, exit codes and logs are in `verification/results.json` and the adjacent log files.
- Fresh Expo-web browser verification passed for eight light screens at 390 px: Home, Check In hub, Training, Nutrition, You, sign-in, workout logging and measurement charts. Fifteen guided interaction checks passed, including disclosure panels, exercise guides, set steppers/Undo, partial-workout confirmation and chart navigation. All writes were intercepted fictional fixtures. Two additional dark-mode smoke captures (Home and sign-in) passed. See `verification/browser-results.json` and each capture manifest.
- Visually inspected Home, Training, sign-in, expanded nutrition details, workout logging and charts in light mode, plus both dark smoke frames. Shared surfaces, input boundaries, labels and cobalt controls render consistently. The existing React Native SVG `accessible` DOM-attribute warning appears in some web captures; no captured runtime errors or journey failures occurred.
- The first preview attempt failed to load the populated app; its frame was rejected. The before-capture attempt ended before any accepted frame. See `verification/environment-notes.md`; these attempts are not visual validation.

Native simulator/device tooling is unavailable. Actual native glass rendering, system permission surfaces and rebuilt splash appearance cannot be established from browser captures or mocked component tests. No dependencies, backend records, migrations, deployment or commits were added.

## Preview

- [Home](pearl-cobalt-390/home-light-390.png)
- [Training](pearl-cobalt-390/training-light-390.png)
- [Sign-in](pearl-cobalt-390/signin-light-390.png)
- [Workout logging](pearl-cobalt-390/workout-light-390.png)
- [Measurement chart](pearl-cobalt-390/measurements-chart-light-390.png)
- [Light capture manifest](pearl-cobalt-390/capture-manifest.json)
- [Dark capture manifest](dark-390/capture-manifest.json)

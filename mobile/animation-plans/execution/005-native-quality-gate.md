# 005 — Verify the native experience before calling it production grade

Status: AUTOMATED + BROWSER CHECKS PASSED; PHYSICAL-DEVICE ACCEPTANCE PENDING · Baseline: `8ec16a7` plus working tree · Depends on relevant implementation slices001–004.

## Scope and purpose

Root: `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile`. The existing browser evidence proves layouts and selected guided journeys, not native touch latency, haptics, glass rendering or smoothness. The interactive motion studio is a separate illustrative HTML artifact. Do not use either as proof of120 fps or a successful native Skia integration.

## Preconditions

Each implemented slice has an exact source revision/diff, relevant behavioral tests, TypeScript/lint/UI-contract results, and no unresolved critical data/accessibility failures. Re-read package scripts before choosing commands; do not change dependencies only to make a check pass. For the native graphics slice use Expo SDK57-aligned dependencies and a development build; performance checks require a release-like build.

## Test sequence

1. Re-run the existing guided browser journeys with fictional fixtures. Confirm date/account separation, numeric commit, queued versus synced receipts, Overview, header/body geometry and keyboard fallback. Add normal-motion captures, since previous evidence used reduced motion.
2. Record dark/light stills and normal/reduced-motion videos at compact/standard/large widths and200% text. Verify pressed/selected/error/empty/offline states, not only populated happy paths.
3. Test physical iOS26+ glass and a supported fallback iOS configuration; Android midrange60 Hz; high-refresh hardware if claiming that behavior. Record device, OS, build mode, display rate and thermal state. Confirm minimum-frame-duration configuration in generated native output rather than assuming the SDK guarantees ProMotion.
4. Perform hold/cancel/repress; fast selections; set completion/Undo/edit; partial session review; keyboard show/hide; interrupted sheet drag; app background/resume; timer expiry; preference changes while active; offline queue/reconnect and dirty navigation.
5. Inspect intermediate frames: selected-label contrast, no animated input caret/digits, no ghost editor accessible beneath the next, no sheet heading overlap, no disappearing essential status. Motion must start from the current presentation state when retargeted.
6. Profile baseline versus new implementation for chart scrubbing, typing while timer runs, long history scrolling and route startup. Report actual median/p95 frame timing, long-frame causes, JS/UI work, native/asset size and resource lifecycle.60 Hz=16.67 ms and120 Hz=8.33 ms are budgets, not results.
7. Observe5–8 representative users doing check-in, invalid-value correction, two-set logging, Undo, rest control, partial save and resume. Measure the current baseline before setting time/hesitation improvement targets. Do not collect health answers or photo content as analytics.

## Required evidence package

Store build/source identity, device matrix, commands/results, normal/reduced-motion videos, key state screenshots, before/after traces, usability observations and unresolved limitations under the repository's existing evidence convention. Record artifact hashes for reproducibility. Distinguish native results from browser samples. Never claim full accessibility certification from automated tests.

## Done criteria

- All daily authoring and delivery semantics remain correct; no data mutation occurs in an animation completion callback.
- Touch feedback is visible immediately and remains sufficient with movement disabled.
- Missing measurements never become fake zero observations; all graphics have semantic text/controls.
- Focus, large text, contrast, keyboard and platform fallbacks work in the actual runtime.
- No material performance regression is concealed by a richer visual effect. If Skia/glass is not beneficial, ship the SVG/solid fallback with the same design quality.
- Product claims match measured evidence and any remaining platform limitations are explicit.

This gate does not require App Store deployment or external messaging. Those are separate actions outside this design pass.

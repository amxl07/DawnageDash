# 003 — Truthful, responsive progress graphics

Status: SVG IMPLEMENTATION COMPLETE · Automated/runtime verification pending; native Skia comparison deferred · Baseline: `8ec16a7` plus working tree · Depends on001 · Priority: high data correctness, medium graphics.

## Source and problem

Root: `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile`.

`app/(app)/measurements.tsx:167` currently creates `data: asc.map((r, i) => ({ label: \`W${i}\`, value: num(r[s.key]) }))`. `src/types/db.ts:46–49` turns null/undefined/unparsable values into0. This can draw missing measurements as measured zero and implies equal weekly spacing.

`src/features/home/RecentRecord.tsx:40–56` already uses dated observations, an adjustable native Pressable and SVG tap-to-nearest selection. This is the active Home chart. Legacy dashboard graphics are not the target.

## Target

First create an explicit chart observation adapter preserving source date, valid numeric value or missing, unit and series identity. Date x-position reflects actual elapsed time. Missing observations produce gaps; do not connect across an absent value if that suggests continuous recorded data. Retain legitimate zero only under each measurement's actual validation contract. Avoid modifying the global `num()` helper for unrelated consumers. Audit adjacent baseline/latest deltas for the same missing-value issue before displaying them.

Then compare existing SVG against **SDK57-pinned Skia2.6.2** for one RecentRecord chart. Use `npx expo install @shopify/react-native-skia` only when executing this pilot; verify the resolved version matches the Expo runtime. Do not upgrade Reanimated/RN to follow rolling Skia documentation. Current installed Reanimated4.5.1/Worklets0.10.1 is the intended foundation.

Graphics:2–3 pt line,5 pt selected mark,1 pt dashed crosshair, stable date/value text outside plot. No decorative fill that implies additional observations. Finger selection is immediate, no easing; optional end-state tint120 ms ease-out(0.23,1,0.32,1). Axes do not animate while inspecting. Reduced motion uses the same direct selection and static plot.

## Steps

1. Fix the measurement data adapter and tests before changing renderer. Cover null, invalid numeric, one point, irregular intervals, same-day policy, empty series and legitimate values. Use actual dates rather than `W${i}`. If the current chart API cannot express gaps/time spacing, introduce a small local chart adapter rather than silently dropping dates.
2. Preserve five measurement series, visibility controls, dash patterns, deferred mounting, baseline/latest summaries and readable history. Do not globally replace every chart.
3. Build the RecentRecord renderer boundary. Domain data and semantic native controls stay above it. Keep current date-based selection memory when data refreshes; missing selected dates resolve predictably.
4. Add horizontal-intent scrubbing with Gesture Handler. Start with10 pt horizontal intent and cancel on clear vertical travel; tune on physical devices. Worklet/shared value drives crosshair; update semantic selected state at meaningful observation boundaries or gesture end, not every frame. Always retain tap and adjustable/previous-next alternatives.
5. Implement an SVG baseline and the minimal Skia equivalent. Memoize normalized data/paths and avoid canvas text/input. Use native/SVG web fallback initially; do not require CanvasKit at app bootstrap.
6. Measure both implementations using the same dataset/device/build. Retain Skia only for a perceptible/functional or measurable benefit. Record binary/startup/CPU/frame costs, not just an attractive screenshot.
7. Add the Home weekly rhythm to `src/features/home/WeekRecordStrip.tsx` if layout review supports it: seven dated marks, actual count, queued/synced distinction, current-day outline. Animate only a newly changed mark200 ms, never all marks on mount. SVG is sufficient if Skia is rejected.

## Boundaries

No readiness/health score, inferred compliance, interpolated recorded value, misleading weight colors, automatic data collection or backend changes. No 3D, Graphite, shaders, Lottie or Rive. Keep current Home resolver and next-session provenance. No general navigation migration.

## Verification and done

Test actual observation output, gap/date semantics and accessible selected value; do not snapshot a renderer's private implementation. Run relevant chart/measurement/Home tests, TypeScript and lint; Expo native/web exports after adding a native dependency. Verify missing-data fallback and no-WASM web behavior.

On real devices: diagonal scroll versus scrub, interrupted selection, large text, empty/sparse/error/cached states, reduced motion, route blur/resume, and a large realistic dataset. Record release-like traces at60 Hz and high refresh if supported. Done means the data is truthful, inspection works without precision gestures, and the chosen renderer's cost is justified by evidence.

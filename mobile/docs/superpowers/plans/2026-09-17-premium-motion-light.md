# Premium motion and refreshed light mode — implementation

User authorized implementation of `animation-plans/README.md` and chose refined athletic; latest steering asks to improve light mode using SparkyFitness as a reference.

## Scope

Execute the five existing plans under `animation-plans/execution/`, preserving the completed guided flows and data/draft/exit contracts. Refine the light palette using SparkyFitness's cool neutral surfaces and slate typography, adapted to Dawnage's coral/red identity. Keep iOS system UI / Android Inter and accessible contrast. No changes to SparkyFitness itself.

## Work packages

1. Shared motion policy, touch states, large-text metrics, selection contrast, light palette/type/depth.
2. Guided check-in/workout feedback, disclosures, completion/Undo, haptic ownership, receipts.
3. Truthful measurement charts, direct progress inspection, weekly rhythm, measured renderer boundary.
4. Supporting flows: safe focus, plans density, onboarding, history, media, weekly/assessment/settings consistency, glass availability.
5. Integration review, relevant behavior tests, full regression checks, exports and actual app browser journeys/screenshots. Native-device performance/accessibility claims require device evidence and must remain explicit if unavailable.

## Execution rulings

- Work in the existing user-facing `mobile` checkout on `feat/checkin-single-scroll`; it contains all the uncommitted SDK and guided-flow work the user is running. Capture a source baseline and do not reset, stash, commit or move it into a clean checkout.
- Source snapshot: `/tmp/dawnage-premium-20260917/baseline.tar.gz` and `baseline-hashes.json`.
- Ownership separates shared theme/primitives, daily flows, graphics and supporting flows. Shared contracts remain stable. Root coordinates edits to barrel exports, package manifests and shared helpers.
- Physical device profiling cannot be replaced by Expo Go/browser results. SVG remains a valid production renderer; any Skia experiment must have an explicit comparison/fallback and cannot be declared faster without measurement.
- Apply regression tests to behavioral changes; visual token tweaks use contrast calculations, layout evidence and existing tests rather than tests mirroring hex values.
- No backend/schema changes, no new required form fields, no precision rulers, no automatic subjective answers, no extra product tabs or all-screen animation replay.

## Light mode direction

SparkyFitness reference: `SparkyFitnessMobile/global.css` light tokens and `SparkyFitnessFrontend/src/index.css`. Use cool pearl canvas, crisp white cards, slate headings/body, quieter slate secondary text, muted coral selection surfaces and a deep coral CTA that preserves white-label contrast. Final exact tokens and calculations are recorded in the implementation evidence.

# SDD ledger — plan: mobile/docs/superpowers/plans/2026-09-30-content-cleanup-phases.md

## Preflight rulings
- Ruling: execute all five phases — current user authorization supersedes the plan’s former planning-only constraint.
- Ruling: retain the existing dirty feature checkout and compare against filesystem snapshots — a clean HEAD worktree would omit the authorized current app; no unrelated work will be committed or discarded. Snapshots: /tmp/dawnage-cleanup-2026-10-03/baseline.
- Ruling: phases are sequential implementation/review gates. Browser fixture checks and unit tests do not establish native permission or assistive-technology behavior.

| Phase pair | Shared interface | Preflight resolution |
|---|---|---|
|1 / 2|Question catalog|Phase 1 text only; Phase 2 explicit legacy catalog and revised IDs.|
|1 / 3|Home, logger, nutrition, measurements|Remove filler first; layout and conditional metrics later.|
|1 / 4|Auth, setup, weekly, status|Remove unsupported claims first; preserve conditional state explanations until Phase 4.|
|1 / 5|Whole-app wording|Phase 5 tests final copy and removes only unused code.|
|2 / 3|Profile versus everyday layouts|No shared storage changes in Phase 3.|
|2 / 4|Assessment and status semantics|Preserve meaningful historical readback and server acknowledgment.|
|2 / 5|Mobile/web compatibility|Final checks include both clients.|
|3 / 4|Workout receipts, nutrition and photos|Phase 3 hierarchy precedes conditional state wording.|
|3 / 5|Layout verification|Fresh captures after the final layout.|
|4 / 5|Shared save wording|Only combine identical semantics.|

| Phase | Internal consistency |
|---|---|
|1|Display edits, except confirmed-empty supplements; test that condition.|
|2|Meaning-changing questions require new IDs, preserved old labels and both clients.|
|3|Compact presentation must retain units, dates, valid comparisons and actions.|
|4|Reduced copy must preserve state distinctions and permission/disclosure decisions.|
|5|Full verification may expose unavailable native tooling; record exact limits rather than claim device coverage.|

## Execution
- Phase 1: complete (snapshot comparison; independent review clean; 160 affected tests plus 17 parser/screen cases, typecheck and lint passed; 12 browser screen records and guided flows checked).
- Phase 2: complete — 68 affected mobile tests, 2 web summary tests, mobile typecheck/lint, root check/build, mobile assessment journey and 11 actual web wizard browser checks passed; independent spec/quality re-review passed. Precise waist protocol remains a documented content dependency.
- Phase 3: complete — affected automated checks, independent source review and final normal/enlarged browser footer checks passed. See phase-3-report.md and phase-3-visual-review.md.
- Phase 4: application implementation and controlled verification complete — state-specific status/help, photo partial-save exit, receipt announcements and weekly cleanup errors are covered. Native integration gate remains open; see phase-4-report.md and native-verification.md.
- Phase 5: source cleanup and final automated/browser verification complete. All 48 findings have an implementation disposition; finding 42 retains its content dependency. Native keyboard/assistive-technology/permission/provider/picker checks remain open; the whole plan is not claimed as fully device-verified. See phase-5-report.md.

- Ruling: execute and review directly after two worker initialization failures (deployment unavailable); no worker changed sources.
- Write access restored and verified after the temporary read-only interruption.

- Verification scheduling: stopped the initial browser/Metro run before any captures completed to give Jest priority under host memory pressure. It will be restarted after tests/static checks; no screenshot pass claimed.

- Phase 2 writer trace: only the mobile and web wizards insert assessments; Profile updates existing rows only. The reviewed stable user UUID primary-key strategy applies to new rows without migrating old IDs.
- Phase 2 QA: prepared stateful intercepted assessment responses; acknowledged updates persist across fixture reads, stale compare-and-swap filters return no row, and unknown answer objects survive. No live backend traffic.

- Phase 2 QA correction: React Native Web replaces host scrollTo with the native {x,y,animated} signature; the old audit helper passed DOM {top,behavior}, producing repeated top screenshots. Current helper uses scrollTop and verifies actual movement. First attempts remain recorded as failed checks, not app regressions.
- Phase 2 browser: all ten picker destinations reached. The reload test exposed capture bootstrap clearing localStorage on every navigation; revised bootstrap initializes once per fixture tab, allowing true draft/position reload checks.
- Ruling: guard users.profile_data updates against concurrent replacement too. The touched Profile latest-read/merge has a concrete overwrite window; the global data-loss requirement warrants a bounded conditional update and narrow top-level patches. Existing JSONB schema is confirmed in sqlmigrationfiles/add_profile_data_to_users.sql; no migration.

- Phase 2 original 87-question historical catalog checked byte-for-byte against initial source snapshot: identical.
- Phase 2 visual review: no clipping in inspected 390px active-section frames; corrected remaining generic clean-state hint (finding 36) and inherited historical symptom scale anchors. Fresh final captures pending these last edits.

- Phase 2 independent review: P1 web Continue/Finish shadows missingRequired helper; P1 prepared Profile recovery can recompute narrow intent against a newer baseline and overwrite newer unrelated values. Fix round 1 in progress; source review baseline archived for a scoped re-review. Phase 3 remains gated on corrections and checks.

- Phase 2 fix round 1 evidence: prepared and profile-saved recovery regressions reproduced, then 45 Profile/recovery/wizard tests passed. Actual web wizard RED reproduced the frozen ReferenceError; GREEN passed 11 browser checks including missing required fields, failed acknowledgments without advance, all section saves and final completion (web-assessment/manifest.json). Re-review package: phase-2-fix-1.diff.

- Phase 2 fix round 1: both P1 findings addressed; independent spec and quality re-review passed. No required review findings remain. Final build/static checks still pending.

- Phase 2 final gate: all checks passed; lint has nine pre-existing warnings. No app edits after scoped re-review; final explicit-undo recovery test and browser text-enlargement QA support included in final snapshot. Detailed results: phase-2-report.md.

- Phase 3 browser: 390 px and 320 px each passed 8 screens / 28 journey checks; 1.4× browser text passed 4 screens / 20 checks; 2 empty-plan screens passed. Visual inspection found RestDock label collapse under browser text enlargement; minimum-width fix is in progress with targeted recapture.
- Phase 3 root review: confirmed queued→blocked delivery leaves receipt.status queued while deliveryState becomes blocked. The newer-draft header must use actual delivery state for previous-version wording. Fixing and adding a transition regression before the phase gate, per the incorrect-state global rule.

- Phase 3 closed: all affected automated suites have passing final results; final typecheck/scoped lint pass; source review PASS/PASS. Final normal/enlarged footer recaptures pass 6 checks each, 0 errors, with readable wrapping. Earlier pending rest/header-caption notes are superseded by the final report. Phase 4 now owns the remaining logger status layout and state-dependent cleanup.

## October 9 final continuation

- The later minimalist request is implemented across Home, Check In, Training, Nutrition and You. Ordinary Home metrics and metadata move into View details; Training/Nutrition reveal prescriptions and totals on demand. Important draft/sync/load states stay visible. The practice guide is shorter, and web tabs wrap within an intrinsic-height bar.
- All final checks passed: mobile TypeScript, lint (nine pre-existing warnings), 169 Jest suites / 1,405 tests, 255-source-file UI contracts, root web TypeScript and production build. Final logs are persisted under `../2026-10-09-minimalist/verification/`.
- Fresh browser evidence includes 320/390 px main screens, light/dark, 1.4× text, landscape, empty plans and complete setup. Daily, workout, weekly, measurement and assessment flows passed. Earlier failed attempts and their successful rechecks are recorded, not discarded.
- Independent source review has zero open findings. Fixes include the collapsed nutrition warning's accessible name, stable daily receipt identity for queued-to-synced announcements, and below-icon web tab positioning at wider widths.
- The October 3 temporary source/log directory was lost at restart. Historical reports/screens persist. The durable October 9 source baseline is `/Users/manojthomas/.cache/dawnage-cleanup/2026-10-09-resume/`; 32 changed source/test/QA files are captured in the final continuation manifest/diff.
- Native verification remains unavailable on this workstation. No production writes, migrations, deployments, staging or commits were performed. The fixture-only Metro/Chrome processes created for final verification were stopped; pre-existing user processes were left alone.

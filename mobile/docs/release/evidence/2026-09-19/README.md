# Release-hardening verification

The [release handoff](../../2026-09-19-hardening.md) is the maintained implementation and rollout index. [verification.json](verification.json) records the checks; [source-hashes.json](source-hashes.json) identifies 464 final source/configuration files, and [export-artifacts.json](export-artifacts.json) identifies the 67 files in the final export. HEAD alone does not identify this app state: the existing feature checkout contains uncommitted work.

| Check | Observed result |
| --- | --- |
| Full mobile Jest run | 125 suites / 945 tests passed before the final persistence corrections |
| Final measurement/photo/capture regressions | 3 suites / 34 tests passed after observed failures |
| Reopening amendment | 6 measurement tests passed after reproducing overlapping writes |
| Lint cleanup regressions | 7 suites / 33 tests passed |
| Final TypeScript | Passed |
| ESLint | Full scan and subsequent affected-file scans passed, zero errors/warnings |
| Import resolution probes | Five positive/negative checks passed, including shared files, casing and mobile aliases |
| Final UI contracts | Passed for 186 checker files |
| Expo SDK alignment | Passed; Expo 57.0.24 with recommended installed packages |
| Final platform exports | iOS/Android Hermes and web JavaScript exported successfully after the last source change |
| Web build and photo contracts | Passed; photo policy matrix executed locally with PGlite 0.5.8 |
| Fresh browser captures | Unavailable: Chrome debugger startup timed out after 60 seconds; no accepted images |

The test rows overlap and must not be added together. The complete Jest run preceded the final two persistence fixes; the affected suites and the subsequent measurement amendment passed separately. The final source then passed TypeScript, lint, UI contracts and platform export. Standard installed tooling was used, with Jest `--runInBand --watchman=false --testTimeout=60000` and one Metro worker; no dependency-read preloader was used for these final checks.

Logs are in [logs/](logs/). The [product report](../../../review/2026-09-18/implementation-product.md) preserves the failing and passing regression evidence. The [photo report](../../../review/2026-09-18/implementation-photos.md) records injected-client and actual local PostgreSQL coverage. The web build retains existing Browserslist-age and PostCSS warnings; these are distinct from mobile lint results.

[cleanup.json](cleanup.json) records the removal inventory and measured text-font reduction: 8,220,580 raw bytes. Required Android Material Symbols remain; no compressed-download, startup-performance or native-binary reduction is asserted.

No live photo migration, remote telemetry event, cloud/native app build, physical-device acceptance or human usability study was performed. The browser attempt used the first hardening export before the final persistence corrections; it produced no visual evidence. No historical screenshots are presented as current verification.

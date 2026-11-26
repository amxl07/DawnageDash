# Fresh verification and visual-audit limits

Review date: 26 September 2026. Git base: `70c11b0`; current working tree includes substantial pre-existing uncommitted development work. No application source was changed by this review.

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm run typecheck` within `npm run verify` | Passed; the `&&` chain advanced to lint | Current TypeScript consistency |
| `node scripts/verify-ui-contracts.mjs` | Passed for 251 source files | The repository's static UI contract rules, not rendered UI or usability |
| Core palette calculations | Sampled text pairs at least 4.59:1; sampled strong boundaries at least 3.24:1 | Those exact opaque color combinations meet the corresponding contrast thresholds; not full accessibility compliance |
| `npm run lint` | Started; stopped without a result after extended local file-read delays | No pass/fail claim |
| Jest suite | Not reached in the sequential verification chain | 163 test files were inventoried, but no test-pass count or coverage is claimed |
| Native build / physical devices | Not executed | No claim about native rendering, health-provider access, widgets, keyboard/gesture behavior, performance or store acceptance |
| Live database authorization and private photos | Not exercised | Repository policy/schema risks remain deployment-dependent |

## Attempted fresh visual capture

The review used the existing `scripts/capture-redesign.mjs` harness, an isolated temporary headless Chrome profile and an Expo web server on port 8096. Expo was started with `EXPO_NO_DOTENV=1`, a fictional `preview.invalid` backend and a fictional public key. The harness permits the local server, intercepts fictional backend requests and blocks other hosts. No production client data or credentials were used.

The first capture attempt timed out after waiting 900 seconds for the local server. The server later became available and a second capture was attempted. A direct read-only inspection of the isolated browser confirmed a `Dawnage` page at `http://localhost:8096/login`, `document.readyState` equal to `interactive`, an empty body text, and a pending local `index.bundle` script. No populated application screenshot was obtained. A sampled Expo process was predominantly waiting in filesystem reads; this is evidence of the local verification constraint, not measured application launch performance.

The blank state was rejected as visual-audit evidence. No older workspace screenshots were substituted. Temporary review processes were stopped at handoff. The capture logs and cleanup record are retained in `evidence/`.

## Requested journey coverage

The table distinguishes source-reviewed flows from rendered/device evidence. **None of these steps received an accepted current-run screenshot**, so the visual audit remains blocked and rendered visual polish is deliberately ungraded.

| Step | Journey | Source-based health | Rendered evidence |
| --- | --- | --- | --- |
| 1 | Sign in / create account / password recovery | Broad functionality; account/privacy lifecycle incomplete | Login remained blank awaiting local bundle; later steps not reached |
| 2 | Setup: goal → explanation/practice → start preference/timezone | Good progressive entry; coach assignment needs an actionable next step | Not reached |
| 3 | First Home / returning Home | Useful priority action; progress and service feedback can improve | Not reached |
| 4 | Check In hub / history | Clear separation of browsing and editing; recovery is a strength | Not reached |
| 5 | Daily check-in: readiness → recovery → adherence → review/receipt | Strong state handling; 15–16 mandatory fields create a high-effort routine | Not reached |
| 6 | Training plan / training history | Substantial assigned-plan support; partial logs can be mislabeled Complete | Not reached |
| 7 | Workout: sets → rest → overview → save/recovery | Strongest execution feature; draft expiry/offline access need correction | Not reached |
| 8 | Nutrition / meal details | Useful prescription view; limited consumption and substitution actions | Not reached |
| 9 | Measurements / chart / progress photos | Existing useful progress tools; fragmented destination and write-contract risks | Not reached |
| 10 | Weekly reflection / submission / history | Detailed reporting; client-visible coach response missing | Not reached |
| 11 | You / Profile / assessment / Settings | Functional basics; long unbranched assessment and missing self-service/help paths | Not reached |
| 12 | Health-access explanation / reviewed import | Carefully scoped source implementation; real provider behavior unverified | Not reached |

The source-based workflow findings remain supported by code and are documented separately. They do not establish pixel-level layout, touch reachability, native usability or measured task times.

## Evidence files

- `evidence/verification.log`
- `evidence/ui-contracts.log`
- `evidence/palette-contrast.json`
- `evidence/capture.log`
- `evidence/capture-retry.log`
- `evidence/process-cleanup.json`

Next validation should run the same journeys on a working preview build with dedicated test accounts, then on physical iOS/Android devices. Assess native health import, widgets/Live Activities, large text, screen readers, cold offline launch, process termination, sync on foreground and coach-dashboard round trips explicitly. This review did not prove those release gates complete.

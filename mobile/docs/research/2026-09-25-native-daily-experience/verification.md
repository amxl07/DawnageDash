# Native daily experience verification

This record separates completed source/browser/build checks from outstanding native-device acceptance. It uses fictional fixtures only.

## Current evidence

- Nutrition focused tests: 12 passed (`/tmp/dawnage-task2-tests.log`).
- Week-strip and rating geometry: both passed in the root full-suite run. Earlier mock initialization failures were corrected without removing geometry assertions.
- TypeScript: final frozen-source check exited 0 (`/tmp/dawnage-frozen-types.log`).
- Lint: final full run exited 0 with nine test-only `require` import warnings; the last health-fixture edit also passed scoped lint with its three existing warnings. UI contracts: corrected-source exit 0 for 251 source files.
- Source tests: all 163 current suites have passing evidence across the full run and affected-suite reruns; see `test-results.json`. The initial full run passed 159 suites and found three test-fixture failures. The corrected check-in screen passed 22 tests, native availability passed two, and health configuration passed all 20, including all 12 repeated-generation cases. The new bootstrap suite and updated lifecycle/layout regressions also passed. This is a full-run-plus-rerun result, not a claim of one clean full run.
- Browser at 390×844, light/dark, reduced motion: Home recap/navigation, nutrition disclosures, workout editing/review and signed-out health rationale passed in `evidence/final-regular`. Its failed check-in results are superseded by `evidence/final-checkin-accessible`, where the entire check-in journey passed through all required values, invalid input, review edits and intercepted submission. Health review cancellation preserved answers, storage and writes. The local fixture server on port 8088 has been stopped.
- Compact 320×720 light/dark browser journeys with normal motion: all ten captures and all five guided flows passed in `evidence/final-compact-stable`. The earlier compact workout failure was a CDP tap sent during sheet motion; the same size passed with reduced motion, and waiting for stable target coordinates corrected the animated capture. Product behavior was unchanged for this driver fix.
- Native module discovery: all four iOS/Android React Native and Expo autolinking commands exited 0; see `autolinking.json`.
- Native-project generation: final isolated iOS/Android prebuild exited 0 after manifest-ordering and SDK-minimum fixes. Assertions on actual generated output passed: Android minimum 26, compile/target 36, exactly the four intended Health read permissions, rationale Activity/alias/order and variant URL; iOS HealthKit read description without write/background access, shared app group, Live Activities enabled, and exactly two native targets. See `native-generated-config.json`. No native binary build is implied.
- Widget SDK JavaScript bundle: exit 0; `ExpoWidgets.bundle` generated. iOS, Android and web production JavaScript exports each exited 0; the native platforms generated Hermes bundles. See `build-results.json` for artifact sizes and hashes. The resource-heavy combined export was deliberately canceled (exit 137) and replaced by these successful sequential exports.
- Final source review: approved with no open findings, including all three Live Activity/widget corrections, retained-screen ownership, native cleanup, widget backgrounds and the Android SDK correction. Final fixture corrections were also reviewed; their reruns passed.
- Startup/recovery regressions: the corrected bootstrap, ownership hooks, controller, widget layouts, logger and precise-rating suites passed. Storage/auth boundaries and a stable forwarding controller mock preserve the actual controller, rest and StrictMode assertions.
- Daylight-saving boundary: all six health-model tests passed with `TZ=America/New_York`, including the 23-hour March reporting day and preservation of required subjective fields after import.
- Native build: this host has Command Line Tools, but no full Xcode/iPhone SDK or Android SDK was found. Native compilation and device checks remain separate from JavaScript and generated-project checks.

## Native acceptance

Use development builds with purpose-made test records. Never copy personal health data into test logs or screenshots.

These integrations require a new native build; Expo Go and older binaries retain the manual flows with an unavailable state. Health Connect raises the application's Android minimum to API 26 (Android 8), while higher configured or framework minimums are preserved. Generated iOS deployment remains 16.4. Provider availability is checked separately at runtime.

### Reviewed health import

1. Confirm only read permissions for weight, steps, dietary nutrition, and water. The iOS usage description explains review and coach sharing on submission. No write/background access is requested.
2. From a daily check-in, open the import sheet, read the explanation, and explicitly request access. Test all, partial, and declined access. On iOS, an empty response must say no accessible records or no access; it must not assert permission was granted.
3. Review a past local reporting day, today, a DST transition day, and a day with no records. Check source, local date/time, correct kg/litres/kcal/gram units, and partial-day wording. Overlapping-device steps must use the platform aggregate. Afternoon weights must not become morning weight.
4. Confirm missing nutrients remain unanswered, including Health Connect's ambiguous zero nutrient values. A manually entered zero remains valid where the field allows it.
5. Flush a valid number before import; block unfinished/invalid input. Existing entries start unselected and require explicit replacement. Cancel, switch account/date/timezone, and edit while the request is pending: late responses must not overwrite the current record.
6. Apply selected values and verify required unanswered fields still prevent completion. Applying imports must not submit the check-in or write back to a health provider.
7. Open the Android permission rationale through system settings on Android 13 and Android 14+, with the app closed and already open, signed in and signed out. It must show the public health-access explanation.
8. Exercise Expo Go/missing module, provider missing/update required, locked-device/read errors, and retry. Ordinary manual check-in must remain usable.

### iOS widgets and workout Live Activity

1. Build each development/preview/production scheme and inspect the Widget extension, app groups, and Live Activities configuration. Verify supported Home and Lock Screen families.
2. Add quick-access widgets. Links must open check-in or training under the current variant, including through signed-out routing. Widgets must not display patient/account identifiers or health measurements.
3. Start today's workout, complete a set, and start/pause/resume/extend/skip rest. Compare the Lock Screen countdown with the in-app absolute deadline. It must clamp at zero, including while JavaScript is suspended.
4. Change exercises and resume the app. Updates must reflect the current session without issuing per-second native updates. Stale content must direct the user to reopen Dawnage.
5. Finish, discard, replace, and sign out during a workout, including with an update in flight. The previous activity must end and stay ended. Relaunch to check orphan reconciliation. Editing a past workout must not start a Live Activity.
6. Disable Live Activities and test an unsupported OS/missing native module. Workout editing must continue normally. Android must retain its normal in-app workout behavior without advertising iOS-only surfaces.

## Final results

All six phases are implemented: calmer hierarchy and adaptive dates, concise nutrition disclosures, compact exact ratings, a dated weekly recap, reviewed read-only Health imports, and iOS workout/rest Live Activities with check-in/training shortcut widgets. Every applicable daily check-in field remains required.

| Check | Final result |
| --- | --- |
| Source tests | 163 current suites covered by passing full-run/affected-rerun evidence; no unresolved failures or missing suites |
| TypeScript | Passed on final source |
| Lint | No errors; nine test-only import warnings, including three in the final scoped fixture check |
| UI contracts | Passed for 251 source files |
| Browser | 20 successful screen/theme/size captures with guided journeys, using the superseding final evidence sets above |
| Production JavaScript exports | iOS, Android and web passed |
| Isolated widget runtime bundle | Passed |
| Native project generation and autolinking | Passed, including actual generated configuration assertions |
| Final diff check | Passed |
| Native compilation and device acceptance | Not run: required Xcode/iPhone SDK and Android SDK/Java toolchains are unavailable |

The application exports use a development app identity and fictional backend configuration. They prove production bundling and are not release artifacts for distribution. The native integrations require a fresh native build and the device checks listed above before release.

Detailed evidence: [test results](test-results.json), [build results](build-results.json), [generated native configuration](native-generated-config.json), [autolinking](autolinking.json), [Health acceptance](health-native-acceptance.md), and [native surfaces acceptance](native-surfaces-acceptance.md).

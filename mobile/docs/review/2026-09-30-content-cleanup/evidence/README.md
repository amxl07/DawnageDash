# Visual evidence and coverage

Captured on 30 September 2026 from the current Expo app with local, intercepted fictional data. The fixture clock is 15 September 2026; the dates in screenshots are not capture dates. Viewport: 390 × 844, light theme, reduced motion. No live Supabase account was accessed.

The accepted set contains **22 main screen/state captures, the top of all 10 assessment sections, and 11 selected detail/flow captures**. Each listed saved image was visually inspected. Source review covers conditional text beyond these images. Raw checkpoint files are retained for traceability; their existence does not mean every frame was accepted.

## Representative current screens

![Home, workout review and assessment goals](cleanup-examples.jpg)

Home repeats its ordinary next-action explanation; workout review repeats its heading; assessment places several lines of navigation/progress copy and a SMARTS explanation before the first question. These examples support findings 06–08, 18 and 36–37.

## Main app screens

![Main screens 1–6](contact-1.jpg)

![Main screens 7–12](contact-2.jpg)

![Main screens 13–18](contact-3.jpg)

![Main screens 19–22](contact-4.jpg)

## Assessment section views

![Assessment sections 1–6](assessment-contact-1.jpg)

![Assessment sections 7–10](assessment-contact-7.jpg)

The source defines 87 questions; only the upper portion of each section is shown in these contact sheets. The fixture contains synthetic legacy answers, including an invalid age value; this is not evidence of a newly introduced validation defect. Blue focus outlines in setup are browser focus indicators, not decorative app content to remove.

## Accepted image index

| ID | View | Saved image |
| --- | --- | --- |
| S01 | home | [Image](screens/home-light-390.png) |
| S02 | hub | [Image](screens/hub-light-390.png) |
| S03 | checkin | [Image](screens/checkin-light-390.png) |
| S04 | workout | [Image](screens/workout-light-390.png) |
| S05 | training | [Image](screens/training-light-390.png) |
| S06 | training-history | [Image](screens/training-history-light-390.png) |
| S07 | nutrition | [Image](screens/nutrition-light-390.png) |
| S08 | weekly | [Image](screens/weekly-light-390.png) |
| S09 | measurements | [Image](screens/measurements-light-390.png) |
| S10 | measurements-chart | [Image](screens/measurements-chart-light-390.png) |
| S11 | media | [Image](screens/media-light-390.png) |
| S12 | profile | [Image](screens/profile-light-390.png) |
| S13 | settings | [Image](screens/settings-light-390.png) |
| S14 | you | [Image](screens/you-light-390.png) |
| S15 | signin | [Image](screens/signin-light-390.png) |
| S16 | signup | [Image](screens/signup-light-390.png) |
| S17 | onboarding | [Image](screens/onboarding-light-390.png) |
| S18 | onboarding-rhythm | [Image](screens/onboarding-rhythm-light-390.png) |
| S19 | onboarding-ready | [Image](screens/onboarding-ready-light-390.png) |
| S20 | welcome | [Image](screens/welcome-light-390.png) |
| S21 | first-checkin | [Image](screens/first-checkin-light-390.png) |
| S22 | health-access | [Image](screens/health-access-light-390.png) |
| A01 | Assessment section 1, top of section | [Image](assessment-rerun/profile-audit-assessment-1-top-light-390.png) |
| A02 | Assessment section 2, top of section | [Image](assessment-rerun/profile-audit-assessment-2-top-light-390.png) |
| A03 | Assessment section 3, top of section | [Image](assessment-rerun/profile-audit-assessment-3-top-light-390.png) |
| A04 | Assessment section 4, top of section | [Image](assessment-rerun/profile-audit-assessment-4-top-light-390.png) |
| A05 | Assessment section 5, top of section | [Image](assessment-rerun/profile-audit-assessment-5-top-light-390.png) |
| A06 | Assessment section 6, top of section | [Image](assessment-rerun/profile-audit-assessment-6-top-light-390.png) |
| A07 | Assessment section 7, top of section | [Image](assessment-rerun/profile-audit-assessment-7-top-light-390.png) |
| A08 | Assessment section 8, top of section | [Image](assessment-rerun/profile-audit-assessment-8-top-light-390.png) |
| A09 | Assessment section 9, top of section | [Image](assessment-rerun/profile-audit-assessment-9-top-light-390.png) |
| A10 | Assessment section 10, top of section | [Image](assessment-rerun/profile-audit-assessment-10-top-light-390.png) |
| F01 | Expanded rest controls; development lightning badge is not production UI. | [Image](flows/workout-audit-rest-options-top-light-390.png) |
| F02 | Workout overview and repeated Add exercise labels. | [Image](flows/workout-overview-light-390.png) |
| F03 | Review of a partial workout; no successful workout receipt claimed. | [Image](flows/workout-review-light-390.png) |
| F04 | Suggested values and history date. | [Image](flows/workout-history-suggestion-light-390.png) |
| F05 | Daily check-in receipt after intercepted fixture submission. | [Image](flows/checkin-saved-light-390.png) |
| F06 | Photo editor; no photo chosen or uploaded. | [Image](flows/media-audit-photo-editor-top-light-390.png) |
| F07 | Expanded breakfast; mismatch retained. | [Image](flows/nutrition-meal-details-light-390.png) |
| F08 | Prefilled measurement editor; no measurements saved. | [Image](flows/measurements-audit-measurement-editor-top-light-390.png) |
| F09 | Health-access introduction; not native permissions/results. | [Image](flows/checkin-health-intro-light-390.png) |
| F10 | Full weekly recap text; not evidence of the lower expanded Home panels. | [Image](flows/home-audit-expanded-scroll-1-light-390.png) |
| F11 | Weekly first step after local draft saving settled. | [Image](weekly-settled/weekly-audit-weekly-form-top-light-390.png) |

## Runtime capture results and limits

- The initial 22-screen capture completed with **zero recorded runtime errors**. Known React Native SVG DOM warnings were retained separately by the capture tool; their development toast was dismissed. These warnings are not user-copy findings.
- The detail run completed Home, workout, check-in, nutrition, photos, measurements, weekly, settings, signup and final setup captures without recorded errors. Its first Assessment attempt could not click section 9 through the overview sheet because the control was below the reachable viewport. The failed attempt and its diagnostic are preserved in `flows/capture-manifest.json`; it is not reported as a passing end-to-end run.
- Assessment was recaptured through all ten sections. Sections 9 and 10 were reached with the existing Save & continue action; those saves were intercepted fixtures, not production writes. `assessment-rerun/capture-manifest.json` records zero errors. This confirms the section content is reachable by that route; it does not prove the overview-sheet navigation problem is fixed. Verify that sheet separately on native devices.
- Some custom scroll checkpoints did not reliably advance through nested React Native web scrolling containers. They are not used as proof that below-fold questionnaire content or lower Home panels was visually inspected. Those findings are grounded in the source inventory and rendering conditions.
- Earlier weekly-form frames caught the transient Saving state. F11 is the separately recaptured, settled version.
- No native simulator/device was available. Native health results, permission dialogs, reminder delivery, widgets/live activities, camera/library behavior and screen-reader operation were reviewed from source where applicable, not device-tested.
- Email verification/reset completion, plan-empty/template states, meal-total matches, exceptional recovery states and the weekly success receipt were not all activated. Recommendations about those states are source findings.
- Workout guide/substitution and populated photo comparison retain their useful content by source review; this audit does not claim their complete interaction coverage.
- This is not a full dark-mode, compact-screen, dynamic-type or accessibility-compliance audit. The implementation plan specifies those checks for any future cleanup.

## Finding-to-evidence map

| Findings | Direct visual evidence | Source-only portion / limit |
| --- | --- | --- |
| 01–03 | S15–S16 | Verification/reset conditional content in 03. |
| 04–05 | S17–S21 | Practice guide and exact first-submission consequence also traced in source. |
| 06–09 | S01, F10 | Expanded Home subtitle and completed-week training card are source findings. |
| 10–13 | S02–S03, F05 | Newer-draft, pending-number and constant historical-range wording in 12 are source findings. |
| 14–19 | S04, F01–F04 | Exercise-completion paragraph, successful workout receipt, zero-incomplete state, plate validation and legacy records also checked in source. |
| 20–24 | S05–S07, F07 | Empty/template plans, duplicate profile notes, matching totals and missing-macro states are source findings. |
| 25–27 | S08, F11 | 48-hour promise is in the source-only weekly success state; cleanup failure was not triggered. |
| 28–31 | S09–S11, F06, F08 | Lazy placeholder, populated photo history/comparison and partial-angle status partly source-only. |
| 32–35 | S12–S14 | Reminder view is the web-unavailable state; normal native scheduling and permission sheets are source-only. |
| 36–43 | A01–A10 | Complete question lists, branching absence, overlapping data and lower questions reviewed in source. |
| 44–45 | S22, F09 | Native read results and platform permission details are source-only. |
| 46–48 | F05 and source | Exceptional recovery, error headlines and unused utility references are source-only. |

## Reproduction

Use `scripts/capture-redesign.mjs` from the mobile directory for the baseline capture, and this audit folder’s `scripts/capture-audit.mjs` for details. The latter reuses the existing capture tool with an audit-only journey module; application files are not modified. Launch Expo with `EXPO_NO_DOTENV=1`, the fixture URL `https://preview.invalid` and the fictional public key `fixture-public-key`, then run the capture tool against localhost. All non-local, non-fixture requests are rejected by the capture tool. The public key is a placeholder, not a credential.

Capture manifests: [main screens](screens/capture-manifest.json), [detail run, including the failed first assessment attempt](flows/capture-manifest.json), [assessment rerun](assessment-rerun/capture-manifest.json), [settled weekly form](weekly-settled/capture-manifest.json).

The final evidence set supports the content recommendations; it does not claim every possible app state was executed.

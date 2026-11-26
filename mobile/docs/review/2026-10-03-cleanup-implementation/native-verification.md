# Native verification still required

Status: **not run**. This workstation exposes CommandLineTools but no full Xcode/simulator, Android device/ADB, Maestro, or callable native test tool. Browser fixtures and React Native component tests do not establish the device behavior below.

Use development builds with fictional test accounts on iOS and Android. Keep production records out of these checks.

| Check | Steps and expected result |
|---|---|
| Text size and sheet boundaries | Use the largest supported system text sizes on a small phone. Open workout overview, rest options, measurement/photo editors, health review and all ten assessment destinations. Text wraps without reducing the font; actions remain reachable, sheets scroll and close, dates/units/scale endpoints remain readable. |
| Keyboard and focus | Edit the final field in daily, weekly, measurement and assessment forms with the soft keyboard open. Reach the footer and validation error, move through fields, dismiss the keyboard and reopen the sheet. No keyboard or sticky footer covers the focused field or required action. |
| VoiceOver / TalkBack | Traverse the five tabs and core forms, then open/close sheets. Verify logical focus order and focus return, rating endpoints and selected states, answered counter/progress, and announcements for draft, queued, saved and failed states without repeated normal confirmations. |
| Reminders | Check denied, unknown and granted notification access; enable, change time/day, disable, and reopen Settings. Compare actual native schedules with requested preferences. Confirm delivery, timezone behavior and system-settings recovery. An unavailable or mismatching schedule must not be shown as confirmed. |
| Health access | Deny/cancel, allow selected data, review a partial current day and missing fields, and replace an existing zero only by explicit selection. Check before-noon weight handling, source and food-intake distinction. Cancel and change date/account while a read is pending; stale results must not alter the form. Verify the platform-specific Manage access destination. |
| Photos | Pick/capture optional angles, deny permission, cancel, fail an upload, retry one angle, fail reference persistence and retry it. Exit after one acknowledged photo while another selection remains unsaved. The saved photo remains; the warning distinguishes unsaved selections. Check account changes and native dismiss gestures during an operation. |
| Offline persistence | Enter daily/workout values offline, leave/reopen, reconnect and retry. Uncommitted numbers, durable drafts, queued submissions, account acknowledgments and newer unsent edits remain distinct. An acknowledged weekly report whose local cleanup fails must never submit a second report when Retry is tapped. |

Record device/OS/build, fixture account, steps, screenshots, announcements and results for each platform. These checks are an explicit outstanding portion of the approved plan, not a claim that a known native regression exists.

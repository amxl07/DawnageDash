# Dawnage mobile UI release validation matrix

This matrix is the release record for one immutable mobile build. A source revision is not a build, and an automated source check is not physical-device, accessibility-service, or runtime-performance evidence.

## Baseline and evidence availability

| Field | Recorded value |
| --- | --- |
| Untouched baseline source | `513443492c934e1c9fba26dc6493060b120c7ad6` |
| Untouched runtime baseline | Blocked — no pre-change iOS or Android capture was available before UI implementation began |
| Current evidence directory | Local and private by default; only `.gitkeep` is tracked |

The baseline commit identifies the approved pre-implementation source. It does not imply that an app build was produced or that any baseline route was observed. No screenshot, recording, profile, account identifier, credential, object URL, or device identifier is checked in with this matrix.

## Build under review

| Field | Recorded value |
| --- | --- |
| Git commit | 52f34258d60cc98e4201365e22ae548048d72035 — source revision reviewed by the automated/source gate; no app binary |
| Expo build | Not available — no immutable development or preview build was produced for this matrix |
| Supabase environment | Not recorded — no runtime validation session was conducted |
| Reviewer/date | Not assigned / 2026-08-30 — runtime review pending |

## Device and text matrix

| ID | Device | OS | Width class | Font scale | Required routes | Result | Evidence note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IOS-COMPACT | iPhone SE (3rd generation) or equivalent | Supported iOS | Compact, 320–375pt | 1.30 | Login, Home, Check-in, Plans, Logger, Measurements, Photos, More | Blocked | No immutable build or iOS device session; compact layout and keyboard checks remain pending |
| IOS-NOTCH | Current notched/Dynamic-Island iPhone | Supported iOS | Regular phone | Default | All primary routes | Blocked | No immutable build or iOS device session; system-geometry clearance remains pending |
| IOS-LARGE-TEXT | Current notched/Dynamic-Island iPhone | Supported iOS | Regular phone | Largest practical accessibility size | Check-in, Plans, Logger, sheets, errors | Blocked | No immutable build or iOS accessibility-size session; wrap and scroll checks remain pending |
| ANDROID-COMPACT | Compact Android phone or emulator | Supported Android | 320–359dp | 1.30 | Login, Home, Check-in, Plans, Logger, Measurements, Photos, More | Blocked | No immutable build or Android session; inset, keyboard, and compact-layout checks remain pending |
| ANDROID-MID | Mid-range physical Android device | Supported Android | Regular phone | Default | Full workout plus dashboard scroll | Blocked | No immutable build or mid-range physical device; gesture and frame-delivery checks remain pending |
| ANDROID-LARGE | Large Android phone | Supported Android | Regular phone | Default and 1.30 | Home, Plans, Logger, Photos | Blocked | No immutable build or large Android session; readable-width checks remain pending |
| WIDE | Supported tablet/emulator or 768dp-wide web viewport | Supported target | Wide, at least 768dp | Default and 1.30 | Home, Plans, Logs, Measurements | Blocked | No immutable build or wide-target session; centered layout and composition checks remain pending |

## State matrix

| State | Setup | Required assertions | Result | Evidence note |
| --- | --- | --- | --- | --- |
| Loading | Throttle first API response | Stable skeleton footprint; no layout jump into unsafe area | Blocked | No immutable build or controlled network session; loading routes remain unobserved |
| Empty | E2E account with no check-ins or plan | One clear next action; no misleading chart or coach identity | Blocked | No sanitized empty-state fixture or runtime session was available |
| Partial | Plan present, incomplete metadata and sparse history | Fallback labels, no crashes, truthful status | Blocked | No sanitized partial-data fixture or runtime session was available |
| Slow | Network conditioner at high latency | Buttons expose pending state and remain non-duplicating | Blocked | No immutable build or conditioned-network session was available |
| Offline | Disable connectivity after loaded state | Draft remains available; retry/status is visible | Blocked | No immutable build or offline runtime session was available |
| Failed save | Force request failure | Error is announced; input remains intact; retry works | Blocked | No immutable build or controlled failure session was available |
| Interrupted check-in | Stop app on step 2 | Reopen to the same step with draft content | Blocked | No immutable build or process-interruption session was available |
| Interrupted workout | Stop app during rest timer | Reopen with workout draft and timestamp-correct timer | Blocked | No immutable build or process-interruption session was available |

## Accessibility review

| Check | Pass condition | Result | Evidence note |
| --- | --- | --- | --- |
| Screen reader | VoiceOver and TalkBack reach controls in visual order with useful names, values, states, and hints | Blocked | VoiceOver and TalkBack were not run on an immutable build |
| Touch targets | Every interactive target is at least 44×44pt/dp, including chart/series controls and photo actions | Blocked | No physical or runtime target measurements were taken |
| Focus after validation | First invalid field receives focus and its error is announced | Blocked | No accessibility-service form session was run |
| Reduced Motion | State changes remain understandable with restrained opacity or immediate updates | Blocked | Reduced Motion behavior was not observed on an immutable build |
| Reduced Transparency | Tabs and sheets use solid semantic surfaces with no readability loss | Blocked | Reduced Transparency behavior was not observed on iOS |
| Contrast | Body text, controls, selected states, and focus indicators meet approved semantic-token targets | Blocked | Runtime theme and focus-state contrast was not measured |

No WCAG or complete screen-reader compliance claim may be made from source review or simulator inspection alone.

## Motion and performance review

| Scenario | Pass condition | Result | Evidence note |
| --- | --- | --- | --- |
| Home cold render | No decorative continuous animation; content settles without a visible top jump | Blocked | No immutable build cold-render recording was captured |
| Dashboard scroll | No animated chart values during scroll; no repeated list entrance animation | Blocked | No device scroll observation or profile was captured |
| Long histories | Only visible rows render; ordinary refresh does not replay entrance animation | Blocked | No populated runtime histories or device profile were available |
| Chart visibility | Expensive chart content is deferred until its section is expanded or visible where practical | Blocked | No runtime first-render and scroll profile was captured |
| Photo memory | Grid/list thumbnails render at slot size; full display images mount only in the viewer/comparison state | Blocked | No sanitized photo fixture or memory profile was available |
| Logger swipe | Swipe follows the finger, decides with distance/velocity, and cannot trigger twice | Blocked | No physical gesture session was run |
| Rest timer | Progress is monotonic, survives backgrounding, and completion feedback fires once | Blocked | No foreground/background device session was run |
| Sheets | Open/close can be interrupted without visual corruption; content clears bottom inset | Blocked | No physical interruption or inset session was run |
| Android mid-range workout | Primary logging gestures remain responsive with no sustained visible jank | Blocked | No mid-range physical Android profile was captured |

## Privacy release gate

| Check | Pass condition | Result | Evidence note |
| --- | --- | --- | --- |
| `progress_photos` bucket | Supabase storage bucket reports `public = false` | Fail | Source audit: checked-in bucket provisioning declares `public = true` and bucket-wide read access. No live environment query was performed |
| Read authorization | User A cannot read User B's photo object or metadata | Blocked | No authorized linked-environment SQL session or two non-production accounts were available; cross-account denial was not run |
| UI disclosure | Before first capture, copy states who can access the photo and when upload occurs | Blocked | Source copy names the coaching-team audience and says upload occurs after Save photos, but no immutable-build runtime review was performed |
| URL lifetime | The app does not persist or display a permanently public object URL | Fail | Source audit: the client calls `getPublicUrl` after upload and persists the returned `publicUrl`; no live object or URL was accessed |

### Privacy audit boundary and release decision

This was a source-only audit on 2026-08-30. No live Supabase query or cross-account runtime check was performed. No immutable Expo build, authorized linked-environment SQL session, or two dedicated non-production accounts were available. The audit did not access or record credentials, project identifiers, object paths, photo URLs, or user data.

- Progress-photo feature decision: **Blocked**. The checked-in storage setup declares a public bucket and bucket-wide read access, while the client persists permanent public URLs.
- Mobile release decision: **Blocked**. No existing deployment feature-control mechanism was found, so this UI hardening plan cannot safely disable the progress-photo production entry point. The entire mobile release remains blocked pending a separate approved security remediation covering private storage, owner and authorized-coach access policies, signed URLs, data migration and backfill, cache invalidation, and staged rollout validation.

This audit does not authorize or implement storage, policy, schema, URL-model, data-migration, or product-code changes.

## Evidence procedure

Run every row against the same immutable commit and Expo build identifier. Replace `Not run` or `Blocked` only after a named reviewer records a concise, sanitized observation. A `Fail` requires a defect with route, device, font scale, state, reproduction steps, expected result, actual result, and owning implementation plan. Rebuild after a P0/P1 fix and rerun every affected row.

Capture the implemented routes at matched data state and dimensions for compact/default font, compact/1.30 font, notched iPhone/default font, compact Android/1.30 font, and every supported theme. Store local files as `<commit>-<platform>-<device>-<font-scale>-<route>-<theme>.png` under `docs/ui-release-evidence/`. Evidence remains local unless separately reviewed and sanitized.

## Release sign-off

Verdict: BLOCKED — 52f34258d60cc98e4201365e22ae548048d72035 — Codex automated/source gate — 2026-08-30 — PRIV-PHOTO-BUCKET-PUBLIC, PRIV-PHOTO-PUBLIC-URL, EVIDENCE-IMMUTABLE-BUILD-UNAVAILABLE, E2E-IOS-MAESTRO-UNAVAILABLE, E2E-ANDROID-MAESTRO-UNAVAILABLE, PRIV-CROSS-ACCOUNT-UNVERIFIED

Release is blocked while any required row is `Not run`, `Blocked`, or `Fail`, or while an unresolved P0/P1 defect exists. Source-only checks never satisfy physical-device, accessibility-service, or runtime-performance rows.

### Open release blockers

- `PRIV-PHOTO-BUCKET-PUBLIC`: checked-in provisioning declares the progress-photo bucket public with bucket-wide read access.
- `PRIV-PHOTO-PUBLIC-URL`: the client obtains and persists permanent public object URLs.
- `EVIDENCE-IMMUTABLE-BUILD-UNAVAILABLE`: no immutable Expo build or matching physical-device evidence exists for the device, state, accessibility, motion, or performance rows.
- `E2E-IOS-MAESTRO-UNAVAILABLE`: Maestro, E2E credentials, and an approved installed iOS build/device were unavailable, so the iOS flows were not run.
- `E2E-ANDROID-MAESTRO-UNAVAILABLE`: Maestro, E2E credentials, ADB, and an approved installed Android build/device were unavailable, so the Android flows were not run.
- `PRIV-CROSS-ACCOUNT-UNVERIFIED`: no authorized linked-environment session or dedicated non-production accounts were available for the required cross-account denial test.

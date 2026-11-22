# Delivery and production acceptance

The user-visible goal is easier daily recording with exceptional visual clarity and feedback. Implement in reviewable vertical slices. A higher library count is not an acceptance criterion.

## Sequence

| Stage | Deliverable | Exit condition |
| --- | --- | --- |
| 1. Foundation | Live motion preference, pressed-state coverage, contrast-safe selection, large-text metrics | Shared primitives work with motion enabled/disabled and settings changed while running |
| 2. Daily actions | Rating press lifecycle, numeric/disclosure continuity, current-set handoff, single haptic ownership, factual receipt | Full daily check-in and partial/full workout survive keyboard, interruption, undo and offline delivery |
| 3. Truthful graphics | Correct measurement gaps/dates; Skia-versus-SVG RecentRecord pilot; restrained Home week graphic | Observations remain exact, controls accessible, measured benefit justifies dependency |
| 4. Supporting experience | One plan exercise list, platform-safe focus, onboarding, history, measurements, photos, weekly/profile/settings consistency | Every feature/state in the specification has a reviewed implementation or an explicit unchanged acceptance result |
| 5. Native acceptance | Release-like device runs, usability comparison, documented limitations | No critical task/accessibility/data defects; no unverified “production-ready” or “120 fps” claim |

Skia may be rejected after the pilot without invalidating the design. The SVG baseline can deliver the same visual language. Lottie/Rive remain optional asset-dependent proposals. Keyboard Controller requires a separate comparison proving it improves a real device problem without duplicating inset ownership.

## Required component deliverables

| Family | Required variants |
| --- | --- |
| Actions | Primary, secondary, text, destructive; default, held, cancelled, disabled, busy, keyboard focus |
| Choices | Unanswered, selected, pressed, unavailable; readable intermediate state; native role/value |
| Entry | Empty, typed, focused, invalid, committed, read-only; direct keyboard and optional explicit quick choice |
| Containers | Plain section, disclosure, summary card, sheet; compact/large text; restored focus |
| Delivery | Draft, saving locally, queued, synced, blocked, retrying; actual feature support only |
| Graphics | Loading, absent, one point, irregular dates, missing values, populated, selected, failed renderer |
| Media | Empty, selected locally, preparing, uploading, stored, upload failure, record-persistence failure |
| Motion | Normal, live reduced-motion switch, reduced transparency, background/unfocused, interrupted/reversed |

## Verification strategy

**Behavior first.** Extend meaningful existing tests for live preference changes, duplicate haptics, stable-set identity, numeric flush, null observations and unsupported web focus. Do not write tests that merely duplicate a spring constant. Reuse the existing daily-flow journey suite and fictional fixtures to detect regressions in save payloads, date/account isolation, queued receipts, exit guards and Overview.

**Visual review.** Capture normal-motion video and stills in both themes at compact/standard/large phone widths. Include 200% text, keyboard-visible states, populated/empty/error/queued screens. Review intermediate frames for segmented-control contrast, set handoff, sheet heading/body separation and focus placement. The previous browser captures defaulted to reduced motion and cannot validate the new normal-motion treatments.

**Physical devices.** Test a supported iOS 26+ device for glass and a supported older iOS configuration for fallback; Android with 60 Hz and representative midrange hardware; a high-refresh device if claiming 120 Hz behavior. Use an SDK 57 development build for native integration and a release-like build for performance. Expo Go is useful for compatibility/smoke checks, not the final performance baseline.

**Interaction cases:** hold/cancel/repress; rapid selection changes; complete then Undo; partial workout; keyboard hide/show; sheet drag interrupted/reversed; app background/resume; reduced motion toggled while open; timer expiry; navigation with an invalid numeric draft; offline save then reconnect; account/date changes during pending work. No interaction may be completed by a stale animation callback.

## Performance evidence to collect

Record build mode, device/OS/display rate, thermal/battery state and exact scenario before comparing implementations. Use the same dataset and gesture script before/after; repeated runs establish variance.

- Input responsiveness: event-to-visible-feedback distribution; touch feedback begins promptly and never waits for a network response or illustration.
- Frame timing: UI/render and JS traces while scrolling, entering values, scrubbing charts and opening sheets. Report median/p95, long frames and their causes. Display budgets are 16.67 ms at 60 Hz and 8.33 ms at 120 Hz, not claimed results.
- Startup/bundle: cold and warm route-open time, added native binary/assets, JS/WASM transfer on web. Compare SVG and Skia with actual builds rather than upstream package estimates.
- Resource lifecycle: no continuing decorative animation on hidden screens; measure rest/progress CPU and memory before/after repeated navigation. No speculative leak claims from code alone.
- Accessibility: VoiceOver/TalkBack task completion, readable large text, contrast throughout transitions, keyboard-only web use and platform-safe focus.

Keep the simpler implementation when the richer one has no perceptible benefit or introduces measurable task regressions. Do not hide known regressions behind an overall average.

## Usability acceptance

Run a small observed comparison with approximately 5–8 representative users, including a first-time logger and someone using enlarged text. This study has **not** been conducted.

Tasks: complete today's check-in with an optional field; correct invalid input; log two sets and undo one; pause/resume rest; edit a completed set; save a partial workout; resume a draft; identify whether a queued record has synced. Record completion, mistakes, hesitation, help requests and time. Set improvement targets after measuring the current baseline; no arbitrary speed claim substitutes for observations.

The upgraded experience passes only if users can identify the next action, understand save state, and complete these tasks with no new critical errors. Aesthetic preference is evaluated alongside task success, not instead of it.

## Rollout and handoff

Each slice includes source changes, relevant test results, normal/reduced-motion evidence, source revision, and explicit unresolved platform limitations. Use an internal preview before general rollout. Keep optional graphics behind a small renderer boundary so a regression can fall back to SVG/solid without touching saved records.

No backend/schema changes are needed for the proposed core visual system. New functionality such as comparison, widgets or Live Activities requires separate implementation and capability review. No automatic event collection of health answers, photos or free-text notes is part of this plan.

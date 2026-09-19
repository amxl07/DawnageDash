# 004 — Coherent materials and complete supporting flows

Status: IMPLEMENTED · Automated and browser verification passed; native-device acceptance pending · Baseline: `8ec16a7` plus working tree · Depends on001/002 patterns · Priority: high correctness, medium/low visual polish.

## Evidence and scope

Root: `/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash/mobile`.

- `src/components/media/PhotoViewer.tsx:53`: `findNodeHandle(photoRef.current)` is unguarded; weekly-feedback error focus at `app/(app)/weekly-feedback.tsx:338` is also unguarded. RN Web's implementation throws.
- `app/(app)/(tabs)/plans.tsx:180–229` renders a day card and a second exercise-details list.
- `src/features/onboarding/SetupStage.tsx` implements goal→rhythm→review; the proposed visual system must preserve these actual stages.
- `app/(app)/(tabs)/_layout.tsx` already guards glass using iOS availability and reduced transparency, and sets tabs `animation:'none'`.

## Exact target treatments

Pressed tint immediate; selection/chevron160 ms using cubic-bezier(0.23,1,0.32,1). Local content opacity≤160 ms, occasional entry≤200 ms. First-run brand line≤800 ms once with CTA immediately available; successful result check≤500 ms and only after actual accepted save. Photo decode crossfade≤160 ms. Reduced motion is immediate/static; reduced transparency is solid with identical layout. Native stack and existing Gorhom sheet own presentation timing.

Liquid Glass only for functional floating controls on supported iOS26+. Require `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()` behind safe platform checks. Retain solid fallback and live reduced transparency. Use regular glass; never stack blur over glass. Installed `GlassView` style config supports `animationDuration` **in seconds**; native style changes are preferred over opacity-to-zero on a glass ancestor, which has a documented rendering issue. No glass in chart/card/form content.

## Implementation slices

1. **Focus correctness first:** use guarded web `.focus()` with a focusable title/summary and native AccessibilityInfo/finding node handle only on native. Reuse the existing Sheet pattern without widening its API unnecessarily. Photo viewer opening, next/previous and close restore predictable focus; weekly validation announces once. Reproduce both paths on web before declaring fixed.
2. **Plans/history:** move prescription access into the day-level exercise list, preserve all alternatives/videos/start behavior, remove the duplicate list. Reuse the160 ms disclosure pattern in Logs. Keep legacy log content and local/server statuses. No scrolling list stagger.
3. **Auth/onboarding:** retain signup's two stages, password recovery and verification states. Onboarding keeps four goals, daily-rhythm explanation and goal/timezone review. Coordinate heading/content changes and native focus; optional video closes on stage change/background. No new permission gate or required intro video.
4. **Weekly/assessment/profile:** keep five weekly stages/18 fields and10 assessment sections. Establish new scroll/focus before any opacity transition. Retain editable prefills' provenance, draft/resume and account/flow guards. Profile save/dirty state and read-only email remain. Do not import daily outbox assumptions into unsupported feature paths.
5. **Media:** preserve four optional angles, baseline/current context, upload-versus-record-persistence failure distinctions, partial sets and explicit save. Reserve preview footprint and add only a brief decode reveal. Keep comparison as sequential browsing unless separately implementing the specified optional pair view. No automatic audio/video.
6. **Settings/You:** consistent pressed rows, current coach states and pending-work-safe sign-out; native reminder switches/time pickers show actual permission/scheduling status; theme change has no full-screen wipe. Native UI replacements are isolated experiments, not a rewrite.
7. **Materials:** harden existing tab glass. Evaluate rest-dock glass only after001/002 and device contrast/performance checks. Keep current tab-exit interception and inset ownership. Android blur requires its new target/method API; solid is the default acceptance case.

## Boundaries

No new chat/AI-coach service, metrics schema, native-tabs migration, mandatory photo comparison, Lottie/Rive dependency or notification-policy change. Native UI libraries already installed may be used only where current data/focus/accessibility behavior survives. Do not change app-wide navigation to get a material effect.

## Verification and done

Exercise real web viewer/error-focus paths, auth/signup/recovery, onboarding back/failure, plans detail access, local log resume, weekly validation/resume, assessment section save, photo upload/persistence retry and denied-reminder state. Run relevant existing tests/typecheck/lint, and full suite/exports at integration. Native verify screen reader focus, large text, reduced motion/transparency, iOS glass/fallback and Android solid/keyboard.

The feature specification is the coverage checklist, not a suggestion to animate every row. Done means every current area has coherent readable states and no action is lost when a duplicate list or a rendering layer changes.

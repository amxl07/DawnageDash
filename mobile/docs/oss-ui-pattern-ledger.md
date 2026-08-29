# Open-source UI pattern ledger

Dawnage uses an independent implementation of the concepts listed here. No source or assets copied from the reference repositories are shipped by this project. Before any future direct reuse, re-check the source file's current license and record the exact file, commit, license, and retained notice in this ledger.

| Reference | Observed posture | Concepts reviewed | Dawnage implementation boundary |
| --- | --- | --- | --- |
| FitnessApp | No clear root license found | Friendly onboarding rhythm, workout grouping, photo-progress framing, empty-state composition | Visual reference only; no source, assets, colors, or typography copied |
| Flexify | MIT | Offline-first logging, search/filter, exercise reorder, persistent timers | Concepts reimplemented against Dawnage data and components; preserve MIT notice if direct code is ever introduced |
| Kenko | GPLv3 | Editorial plan cards, large set ordinals, drag feedback, spatial transitions | Independently reimplemented concepts only; no source or assets copied |
| LiftLog | AGPLv3; Expo 57 / React Native 0.86 | Native controls, compact insights, safe-area behavior, test posture | Independently reimplemented information hierarchy only; no source copied and no stack upgrade |
| PerfectGymCoach | GPLv3; Kotlin Compose | Full-screen rest state, completion choreography, haptics, adaptive panes | Independently reimplemented state concepts only; no source or decorative morphing copied |
| SwiftLift | GPLv3; SwiftUI/iOS 17 | Restrained native rhythm, safe-area usage, concise numeric progress | Independently reimplemented concepts only; no source copied and no iOS-only architecture adopted |
| demos / reactiive | Restricted demo/source redistribution terms; app-use conditions require case-by-case review | Non-Skia counters, list motion, sheets, swipe actions, timers, selection indicators | Independently implemented with Reanimated; no demo source or assets copied; no Skia patterns adopted |
| fitness_workout_app_flutter_3_ui | No clear root license found | Meal, sleep, progress-photo, calendar, and workout screen grouping | Visual reference only; no source, assets, or visual system copied |
| liftosaur | AGPLv3 | Current-set hierarchy, previous results, adaptive inputs, warmups, persistent timers | Independently reimplemented interaction concepts only; no source or assets copied |
| skulpt | GPLv3; Expo 57 / React Native 0.86 | Centralized layout, sheets, local-first boundaries | Independently reimplemented concepts only; no source copied, no FlashList/Unistyles migration, and no stack upgrade |

## Maintainer rule

Design inspiration does not grant code reuse. Any row that changes from concept-only reference to direct reuse requires legal review and a new ledger entry identifying the exact imported material and its notice obligations.

# Dawnage premium experience blueprint

Prepared 15 September 2026. This is a proposed redesign and execution package, not a claim that the app has been redesigned or released.

Start with the [master design](../../superpowers/specs/2026-09-15-premium-experience-design.md), then use the [implementation roadmap](../../superpowers/plans/2026-09-15-premium-experience.md).

| Document | Purpose |
| --- | --- |
| [Master design](../../superpowers/specs/2026-09-15-premium-experience-design.md) | Product direction, alternatives, scope, navigation, decisions, and success measures |
| [Research and decisions](research-and-decisions.md) | Retrieved primary sources, competitor mechanisms, source-code findings, and evidence limits |
| [Design system and motion](design-system-and-motion.md) | Visual tokens, component rules, platform behavior, motion, and accessibility |
| [Visual direction and screen blueprints](visual-direction-and-screen-blueprints.md) | Four concrete screen compositions, sample copy, and visual acceptance criteria |
| [Journey specifications](journey-specifications.md) | Onboarding, assessment, Home, Check-in, Workout, and their failure states |
| [Production quality and rollout](production-quality-and-rollout.md) | Validation, performance budgets, observability, privacy, rollout, and rollback |
| [Implementation roadmap](../../superpowers/plans/2026-09-15-premium-experience.md) | Dependencies, file ownership, task sequence, interfaces, tests, and delivery gates |
| [Setup and Home execution plan](../../superpowers/plans/2026-09-15-premium-onboarding-home.md) | Account access, three-stage setup, assessment continuity, and Today Brief |
| [Check-in execution plan](../../superpowers/plans/2026-09-15-premium-checkin.md) | Shared editor, draft recovery, precise controls, Review, and receipt |
| [Workout execution plan](../../superpowers/plans/2026-09-15-premium-workout.md) | Session identity, current-set controls, rest dock, finish, and compatibility |

The recommendation is to evolve mobile. Preserve the existing Supabase contracts, Expo SDK 54 baseline, useful interaction code, and both themes. Build a coherent daily coaching experience around three signature surfaces: **Today Brief**, **Daily Record**, and **Workout Focus**.

Only documentation is added by this planning work. Existing untracked design briefs and application code are left intact. Planning can proceed now; any later work outside mobile, schema changes, signed distribution, or external publishing needs its own concrete scope.

# Research and decision record

Prepared 2026-09-15 for the [master design](../../superpowers/specs/2026-09-15-premium-experience-design.md).

## Evidence boundary

This work combines current source inspection, retrieved platform guidance, public competitor feature descriptions, and one relevant research abstract. It is not a hands-on competitor audit or a study of Dawnage clients. No native app screenshots, usability sessions, production analytics, or live Supabase records were inspected.

Public sources below were retrieved during this planning run. Apple content was read through its public documentation JSON as well as its canonical page identifiers. Temporary retrieval files are working material; the durable findings and source links are recorded here.

Older briefs contain client counts and sample-history statistics. Those values were not revalidated and are not used as current evidence.

## Primary platform sources

| ID | Source | Relevant guidance | Dawnage decision |
| --- | --- | --- | --- |
| R01 | [Apple HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) | Prefer learning through interaction, brief prerequisite setup, optional tutorials, contextual permissions | Keep three short stages; preserve optional videos; assessment stays separate; ask for reminders after value |
| R02 | [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Purposeful motion, realistic gesture response, brief feedback, cancellable transitions, restraint for repeated actions | UI-thread rulers/swipes; no daily entrance choreography; native navigation; immediate reduced-motion alternatives |
| R03 | [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Liquid Glass belongs to the functional navigation/control layer and should be used sparingly | Stable opaque content surfaces; supported native glass only in appropriate chrome; solid accessible fallback |
| R04 | [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Tabs navigate between persistent sections, retain labels, and should not behave as action buttons | Keep five named destinations and their state; Check In is a record destination; no floating submit tab |
| R05 | [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Legible sizes, weight/size hierarchy, system typography, optical sizing, Dynamic Type | 17-point body starting size, limited type roles, platform font on iOS, text-driven reflow |
| R06 | [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Larger text, contrast, alternatives to gestures, sufficient controls, redundant feedback | Primary task testing at 200% text; screen-reader flows; at least 44-point iOS and 48-dp Android targets |
| R07 | [Expo Router native tabs](https://docs.expo.dev/router/advanced/native-tabs/) | APIs differ by SDK; platform behavior has constraints; latest examples include newer SDK families | Use the installed SDK 54 API when evaluating native tabs; do not mechanically copy latest examples |
| R08 | [Expo GlassEffect](https://docs.expo.dev/versions/latest/sdk/glass-effect/) | Glass is platform/version dependent; availability checks and fallbacks matter | Optional enhancement only; verify installed package API and actual iOS runtime before enabling |
| R09 | [Reanimated withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/) | Implementation reference to verify against the installed Reanimated version during the motion task | Numerical motion targets are Dawnage defaults, not Apple requirements or guaranteed device timing |

R01–R08 were retrieved successfully in this run. R09 is an implementation reference, not independently retrieved evidence in this run. This distinction prevents a useful link from being represented as completed research.

The current Expo tabs page contains examples for SDKs newer than either repository. “Latest” documentation therefore does not establish compatibility with this project.

## Competitor mechanisms worth learning from

| ID | Source inspected | Documented mechanism | Adaptation and limitation |
| --- | --- | --- | --- |
| R10 | [Hevy feature directory](https://www.hevyapp.com/features/) | Previous workout values, automatic rest timer, exercise notes, routines | Put previous values next to the current set; use actual prescribed rest; preserve notes. These mechanisms already partly exist in Dawnage and need better composition |
| R11 | [Strong official product page](https://www.strong.app/) | Notebook-oriented workout logging, RPE, timers, warm-up calculator, charts | Keep the logging surface focused and make advanced controls secondary. The public page is a product description, not proof of performance or usability |

No source or assets from these products are copied. Social feeds, leaderboards, and their broader product scope are not adopted.

An attempted Oura article URL returned 404. It is excluded from the evidence and recommendations; no uninspected Oura mechanism is asserted.

## Behavioral research

R12: Harkin and colleagues, [Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence](https://pubmed.ncbi.nlm.nih.gov/26479070/), Psychological Bulletin, 2016. The PubMed abstract was retrieved and inspected.

The study supports progress monitoring as a useful self-regulation mechanism across its included studies. It does not establish that a particular app animation improves retention, that daily weight tracking suits every person, or that public sharing is appropriate for private coaching.

Practical implication: preserve an understandable personal record and return useful factual context after input. Validate the cadence and tone with coached clients. Keep records private according to the existing access model; public accountability is not inferred as a feature requirement.

There is insufficient research in this run to claim that gamification universally backfires or that a habit forms in a fixed number of days. The decision to avoid points/confetti follows Dawnage's existing professional coaching brief and product fit.

## Diagnosis: what the redesign should fix

| Before, from source inspection | Proposed after | Why |
| --- | --- | --- |
| Long stacks of similarly bordered cards | Editorial sections, grouped rows, one dominant action | Gives the user a clear hierarchy |
| Repeated check-in fields with limited acknowledgment | A stable Daily Record, relevant neutral context, persistent receipt | Returns value without inventing coaching advice |
| Small numeric controls mixed with dense form sections | Precise weight/sleep/water instruments and direct typing for known totals | Matches the interaction to the data |
| Every workout set becomes a large form on normal phones | One expanded current set plus compact editable rows | Makes the next action clear while preserving access |
| A server save and a local queue can look similar | Separate draft, queued, failed, and synced states | Protects trust and avoids assuming the coach has received data |
| Missing measurements can block the full dashboard | Independent section states | Keeps available tasks usable |
| Last seven rows described as a week | Explicit observation/date windows and coverage | Avoids misleading health information |
| Onboarding/profile paths can overwrite each other's JSON keys | One tested merge path, hydrated defaults, explicit progress errors | Makes personalization reliable |

## Source-grounded implementation risks

Paths below are relative to mobile unless prefixed otherwise.

| ID | Source | Finding and decision |
| --- | --- | --- |
| C01 | src/features/checkin/config/fields.ts; src/lib/checkin-validation.ts | Actual 16-field registry and required validation are authoritative |
| C02 | repository root: docs/superpowers/specs/2026-08-31-checkin-single-scroll-design.md | Newer approved single-scroll trial supersedes contradictory older briefs |
| C03 | src/hooks/useCheckInDraft.ts; app/(app)/(tabs)/check-in.tsx | Existing-row edits lack equivalent draft protection; flush/clear races need explicit tests |
| C04 | src/lib/asyncOutbox.ts | All persistence failures can become offline success; replacement intent must be durable before delivery |
| C05 | app/(app)/logger.tsx | Hydration can race plan readiness; date/account identity and every exit path need control |
| C06 | src/features/workout/workoutSave.ts | Existing generation-safe finalization is valuable and must survive refactoring |
| C07 | src/lib/workout-content.ts; repository root: client/src/pages/WorkoutLogs.tsx and client/src/components/WorkoutLogDialog.tsx | Mobile V2 object and array-oriented web consumers require compatibility validation before release |
| C08 | src/hooks/useOnboarding.ts | Read failures collapse to step zero; distinguish unavailable state from a new client |
| C09 | app/(app)/profile.tsx; app/(app)/onboarding.tsx | Profile replacement can drop primary_goal; onboarding must hydrate saved goal/timezone |
| C10 | src/hooks/useDashboardData.ts; app/(app)/(tabs)/index.tsx | Shared query-key shape, missing-data treatment, target assumptions, and date windows need correction |
| C11 | src/lib/photos.ts; repository root: sqlmigrationfiles/create_storage_bucket.sql | Public URL/storage configuration remains a release dependency; no live backend assertion |
| C12 | src/lib/reminders.ts | Scheduling is device-local; copy must not imply the stored profile timezone controls delivery |

## Product hypotheses to validate

1. One prominent next action makes Home easier to understand than several equally weighted cards.
2. A stable record plus neutral personal context reduces the feeling of repeated extraction.
3. Current-set focus improves one-handed logging without hiding the workout's structure.
4. A compact rest dock is less disruptive than a large timer surface after every set.
5. Optional tutorial and assessment entry reduce setup friction while preserving coaching context.

Use eight formative participants: four newer coached clients and four regular clients, covering iOS/Android, compact devices, and at least two people who use larger text or assistive access. Recruitment may need additional dedicated accessibility sessions; eight participants is not a compliance sample.

Compare current and proposed flows with the same fictional records. Counterbalance order. Record task success, mis-taps, hesitation, perceived effort, and comprehension of save states. Do not ask only whether a screen “looks premium.”

Run a subsequent opt-in 7–14 day diary study. Observe repetition, interruptions, workout context, and whether neutral observations stay useful. Any analytics instrumentation must exclude raw health values, notes, photo URLs, and credentials.

## Decisions recorded

| Decision | Reason | Reconsider when |
| --- | --- | --- |
| Evolve mobile | Existing domain coverage and interaction investment | A measured structural obstacle prevents the required experience |
| Keep single-scroll default | Current approved trial and implemented baseline | Comparative testing shows a different structure improves repeated use |
| Keep 16 fields and validation | Coach data compatibility | Product owner separately changes reporting policy |
| Keep current five destinations | Limit relearning while transforming core surfaces | Navigation testing identifies a persistent discovery problem |
| Stay on SDK 54 for core UI | No core visual requirement needs an upgrade | A separately tested native capability warrants migration |
| No automatic health verdicts | Goals and context differ; coach interprets | A specific, reviewed, reliable domain contract supports the interpretation |
| No cross-screen flying-card transition in P1 | Adds coordination and accessibility risk without proving daily value | Core receipt and Home return are already reliable and tested |

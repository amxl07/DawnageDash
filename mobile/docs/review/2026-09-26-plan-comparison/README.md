# Dawnage roadmap comparison and recommendation

26 September 2026 · Decision review, not application implementation.

**Recommendation: use a corrected combined roadmap.** The other plan is stronger at specifying everyday interactions and identifying several concrete near-term improvements. My Product Excellence plan is stronger at finishing the human-coaching service, protecting data and defining release evidence. Neither should be executed unchanged.

The other plan's advantages are substantial. My original plan under-specified the logger interaction, did not explicitly prioritize the current web/mobile workout-format incompatibility, and made some useful UI work wait behind larger architecture work. Those are corrections to my recommendation, not cosmetic concessions.

## Plans actually compared

| | Product Excellence — A, my plan | Market Review — B, the other plan |
| --- | --- | --- |
| Main document | [Product Excellence master](../../superpowers/plans/2026-09-26-product-excellence.md) | [Market Review master](../../superpowers/plans/2026-09-26-market-review/README.md) |
| Full scope read | Master, design specification and all seven work packages | Master, findings specification and all eight phase files |
| Task count | 38 | 40, including one task folded into its neighbor |
| Main purpose | Whole-service quality and launch roadmap | Detailed mobile feature implementation |
| Detail style | Contracts, dependencies, behavioral acceptance, rollout and research | Many exact code blocks, test fixtures, UI replacements and commit steps |
| Estimate | 26–39 engineering person-weeks; 16–22 calendar weeks with two engineers plus support, subject to baseline | S/M/L phase labels; no defensible total schedule or staffing estimate |
| Principal limitation | Broad and sometimes unnecessarily dependent on larger infrastructure | Important service/lifecycle work deferred; multiple supplied examples need correction |

I identified B as the September 26 eight-phase plan in the workspace and asked the user to confirm the folder while continuing. This comparison is explicitly about those documents; it is not a verdict on every historical plan in the repository.

I also checked the project brief, relevant earlier differentiation/native research, the actual current source, and selected live competitor/platform sources. Existing documentation says native compilation/device acceptance was not performed. The prior source-based grades of approximately 6–6.5/10 are broadly aligned; A's more cautious reliability assessment is better supported than B's “A” offline grade.

Supporting deliverables:

- [Disposition of every B task and every A task](task-disposition.md).
- [Proposed combined delivery plan](../../superpowers/plans/2026-09-26-combined-delivery.md).
- [Reproducible example checks](evidence/reproduce-plan-examples.cjs) and [12 results](evidence/example-results.json).
- [Live source checks](evidence/source-checks.json) and [Everfit contextual-feedback evidence](evidence/contextual-feedback-source.json).
- [Verification scope and limits](validation.md).

## Head-to-head assessment

| Criterion | A: Product Excellence | B: Market Review | Judgment |
| --- | --- | --- | --- |
| Premium human-coach positioning | Designs the actual coach/client service, review commitments and next actions | Makes coach presence and contextual conversation prominent | Combine; A completes more of the service |
| Concrete gym interaction | Goals such as fast entry/undo/history, but insufficient control-level specification | Suggested values, one-tap completion, steppers, visible sets and exercise suggestions | **B is better at interaction design**, after correcting the handlers |
| Required daily check-in | Keeps strict default, improves capture/review and measures effort | Concrete Morning/Your day regrouping, answered count and sleep import | **B provides better immediate UI detail**; retain A's provenance and measurement rules |
| Coach-side operation | Queue, drafts, publication, acknowledgment, follow-up, reassignment, coverage | Client thread is detailed; web inbox is a later plan and SQL-editor replies satisfy Phase 2 exit | **A is substantially more complete** |
| Web/mobile compatibility | Generic compatibility requirements; current incompatibility insufficiently explicit | Names current v2 reader/save defect as a launch blocker | **B identifies the stronger immediate priority**; its proposed serializer is unsafe |
| Offline/data integrity | Cold recovery, no silent expiry, account isolation, central replay, atomic acknowledgments | Preserves existing outbox; adds local-only meal storage and an in-memory message draft | **A is stronger** |
| Nutrition usefulness | More expensive but durable actual-intake model, portion review and source reconciliation | Simple meal ticks produce a tangible quick benefit | **B's interaction with A's data rules** |
| Progress | Goal-specific, sample-aware, stable comparable exercise identity | Concrete screen, smoothing, PRs and monthly story | B is clearer visually; **A is stronger on interpretation/correctness** |
| Current market research | Broad official-site comparison, restrained claims | More specific recent announcements and interaction examples | **B adds valuable research**; its exclusivity claims need correction |
| Visual design process | Current native captures, options, shared states, user task study | Mainly code/copy changes; brand design pass explicitly excluded | **A is more complete**, but neither is a finished visual design |
| Differentiating ideas | Decision trail, approved alternatives, goal-oriented progress | Contextual questions, monthly chapter, dictation, form videos, readiness cues | **B broadens the useful idea set**; several ideas belong after the core service |
| Privacy/account lifecycle | Export/deletion, safe profiles, protected local data, notification boundaries | Photo/RLS hardening, but no complete export/deletion/privacy lifecycle | **A is stronger** |
| Test detail | Broad risk coverage; many tests are behavioral descriptions | More executable examples, but happy-path fixtures miss integration failures | B is more specific; A covers more consequential failure modes |
| Launch validation | Accessibility/device matrix, fault tests, pilot, coach capacity and rollback | Device checklist and phase verification; failures may be owner-deferred | **A is stronger** |
| Speed to first visible improvement | Some unnecessary dependencies delay simple UI improvements | Small local changes are easier to deliver early | **B is better here** |
| Execution discipline | Preserves current changes, records evidence, staged compatibility | Thorough steps, but blanket sequential phases, many stops, and some broad staging commands | Combine; reconcile the current scope and use task-specific diffs |

This is a comparison of plan quality, not a measured product ranking. A cannot earn correctness points simply because it contains less executable code. Its proposed architecture also needs tests and implementation review.

## Where the other plan improves mine

**1. It makes “faster logging” concrete.** A repeatable set should not require retyping the same numbers. Suggested values, understandable confirmation, configurable/appropriate increments, a visible set list and known exercise names are tangible improvements. My T02 should contain these details. Warm-up/work sets and tracking modes must match before reusing history.

**2. It identifies a real web compatibility blocker.** The current web reader in [WorkoutLogDialog.tsx](../../../../client/src/components/WorkoutLogDialog.tsx) accepts arrays at line 190, whereas mobile emits a v2 object. Its save path reconstructs legacy arrays around line 486. [usePreviousWorkoutData.ts](../../../../client/src/hooks/usePreviousWorkoutData.ts) also skips non-arrays at line 42. This needs a dedicated first-slice task. My generic “preserve readers” requirement was not specific enough.

**3. It improves the daily rhythm.** Grouping morning weight, sleep and energy together is worth prototyping. An answered count and a direct meal-confirmation action reduce uncertainty. These are more actionable than my broad instruction to “reduce effort.” An answered count should not be mistaken for a valid-to-submit count.

**4. It offers a better emotional progress concept.** A monthly chapter that puts observations, photos, training achievements and the coach's explanation together can make the relationship feel continuous. My progress package should incorporate this after its underlying numbers are trustworthy.

**5. It gives the coach useful context.** “Ask about this workout/check-in” is stronger than an undifferentiated inbox. Add validated record references to the coaching model, then extend to individual sets when stable set identity exists.

**6. It suggests a cheap dictation experiment.** Using the keyboard's dictation avoids a custom speech service and can be tested cheaply. It is low-touch input, not a fully hands-free assistant. It needs a reviewed, atomic apply flow.

**7. It has stronger recent feature research in places.** Its Apple readiness announcement, Hevy update, Everfit release and Future human-coaching report resolve to live sources. These should inform the combined product research rather than be discarded in favor of my earlier report.

## Problems to correct in B before implementation

These are problems in the proposed code/specification unless explicitly identified as current-source findings. The checks do not establish that the app already contains these new bugs.

### Critical data and service issues

**B1 — The proposed web fix still changes the meaning of saved workouts.** Task 1.4 hardcodes `tracking: 'weight-reps'`, `kind: 'work'`, removes duration and derives completion from nonempty reps. Probe P01 reproduces a 60-second completed plank becoming a weight/reps entry without duration, and an unfinished warm-up becoming a completed work set. Preserving the v2 envelope is insufficient. Preserve all understood fields and unknown metadata, or make an unsupported record read-only.

**B2 — Dictation and suggestions conflict.** Task 8.3 calls `onChange` then `onComplete` in one event; Task 3.2's completion handler fills from the old captured empty set. P05 replays that exact order through the current real reducer: “8 at 62.5 done” becomes the historical suggestion of 10 reps at 60 kg. Use one atomic “apply confirmed values and complete” operation. This is an integration probe, not a mounted native test; it identifies a concrete handler-order defect that the mocked callback test misses.

**B3 — The meal ledger is not reliable enough to become daily intake.** Task 5.2 performs unsynchronized read/merge/write. P08 shows two successful selections leaving one entry. Tasks 5.1/5.3 return missing protein as zero and apply it to the form (P06). They store status by meal label, then calculate old intake using the current plan; changing breakfast from 550 to 800 calories changes the old tick's total (P07). The interaction is useful, but it needs stable entries, snapshots, serialized writes, nullable nutrients and explicit partial coverage.

**B4 — The client inbox is not a finished coaching service.** Task 2.7 leaves the web inbox and push to separate plans. Phase 2 permits a manually inserted SQL reply as acceptance. That proves rendering, not that a coach can operate the service. A real coach must receive, review, reply and manage pending work in the dashboard before calling the loop complete.

**B5 — Existing reliability gaps are treated as solved.** B asks to keep the outbox exactly as it is and grades offline reliability A. The source still contains the 24-hour workout and three-day check-in expiries, network-dependent setup gate and route-local replay. Retain the existing good implementation, but repair these particular gaps from A/F03–F07.

### Important correctness issues

**B6 — Messaging read/delivery semantics need work.** The query loads the latest 200 messages, but the RPC marks every incoming unread message in the thread read, including older messages not loaded. Sending has no client operation ID, so accepted-but-timed-out retries may duplicate a message. The draft survives a request error only in React state, not process termination. Context IDs are not validated against owned records, and old coach messages are rendered under the current coach's name after reassignment. Keep per-message authorship and confirmed visibility/acknowledgment distinct.

**B7 — Progress formulas can overstate or mislabel evidence.** P10 reproduces “four-week change” from two observations 36 days apart. This is not a rejection of exponential smoothing; the gap handling, time-window label and minimum evidence are underspecified. P11 shows comparison of an estimated maximum with raw weight while both are labeled “Estimated max.” P09 finds that invalid reps can still establish a weight PR. Match metric type, identity, units and valid observations; label missing history honestly.

**B8 — Android sleep duration is not automatically time asleep.** Task 4.3 sums SleepSession start/end intervals without inspecting sleep stages. Android's [official documentation](https://developer.android.com/health-and-fitness/health-connect/features/sleep-sessions) explicitly includes awake/out-of-bed stages within a session. Handle stages, pagination, source overlap and insufficient detail before labeling the result sleep hours. B's iOS branch already excludes awake categories; retain that distinction.

**B9 — Existing substitutions are not necessarily lighter sessions.** Task 8.2 assumes that any substitution means the coach has provided “lighter options.” A substitution can be equally or more demanding. Also, the nudge reads submitted daily check-ins, which may not exist before a workout under the required evening protocol. A simple client-to-coach question can ship first; automated readiness claims require appropriate same-day inputs and specifically approved alternatives.

**B10 — The inspection script does not preserve the evidence its next task needs.** Task 1.1 truncates all report cells to 400 characters, including `pg_get_functiondef`; Task 1.2 asks the implementer to copy that complete function from the report. P12 confirms the contradiction. Store full definitions separately. Failed queries also need savepoints/separate read-only transactions; catching an exception does not un-abort a PostgreSQL transaction. Introspection complements direct actor-based tests; it does not replace them.

**B11 — Optional features need tighter boundaries.** The quick parser treats “not done” as done and accepts a pounds expression into kg-only fields (P04). Decimal duration “1.5 min” becomes 300 seconds (P02). The lock-screen preference does not immediately reset on account change and independent hook instances can be stale. Form-video cleanup lacks a matching DELETE policy in its proposed storage policies, assumes every recorded file is MP4, and has no durable upload recovery; merely showing a video label is not client playback. These are reasons to correct and stage the features.

**B12 — The GLP-1 mode is not ready for the base product.** The proposed 1.6 g/kg default, medication-day behavior and strength-drop interpretation introduce a specialized service without a defined clinical/content owner or coach prescription workflow. Its “coach set a number” path has no corresponding authoring UI, and the profile read-merge-write can still race. If the real target cohort needs this, design a separately supervised program with explicit eligibility, approved targets and accurate claims. A general coaching app should not infer muscle preservation from these signals.

**B13 — Some small tests/instructions are inconsistent.** P03 shows that the exercise-search implementation contradicts its own expected result for “ben.” Several commit commands stage entire `src` or `app` directories despite the stated task-only staging rule. Use explicit reviewed file/hunk staging and preserve existing user changes.

## What I would change in A

- **Promote the current web v2 incompatibility and conditional photo-extension inventory into the first slice.** They should not be buried in general compatibility language.
- **Decouple simple UI gains from a full exercise catalog and plan-version system.** Steppers, a clearer set list and explicitly confirmed repeat values can be improved before T01, provided current data remains intact. Reserve stronger PR/adherence claims for the required identity/context.
- **Make the logger, check-in and meal interactions as concrete as B's.** Contracts alone do not decide a good phone interaction.
- **Reduce the first release's breadth.** Full grocery planning, extensive variants and a larger nutrition authoring system can follow a working coached loop. A minimal confirmed meal entry can capture its immutable source snapshot without waiting for every plan-version feature.
- **Do not front-load every infrastructure decision as a blocker to visual work.** The secure-storage compatibility proof remains necessary, but UI prototyping can proceed independently.
- **Treat the schedule and numeric gates as hypotheses to validate.** My 16–22 weeks is a staffing-based planning envelope, not a tested estimate. Twelve-user studies and beta thresholds are proposed decision aids, not universal market standards.
- **Freeze the current required protocol for this delivery.** U05 becomes a later explicitly requested experiment. B is right to keep the existing owner decision prominent.
- **Make historical scope changes explicit.** The older [project brief](../../../PROJECT_BRIEF.md) constrained web/backend edits and deployments. A proposes broader future implementation. This review is authorized documentation work; a unified execution contract must reconcile those older boundaries rather than silently inherit conflicting instructions.
- **Keep visual claims provisional.** Neither plan establishes current native visual quality. A has a better process for doing so, not a proven better-looking design.

## Market claims: what survives verification

B's current-news references are useful and several were confirmed live. However, “none pin feedback to the exact data point” is contradicted by Everfit's [Summer 2026 release](https://blog.everfit.io/everfit-may-2026-new-features): it advertises exercise comment history with form cues, progression notes, pain flags and client feedback, plus video notes in comments. It also describes matching set type for prefilled weights/reps.

Keep contextual coaching, monthly storytelling and approved alternatives because they solve Dawnage clients' problems. Position the combination and service execution as the opportunity. Do not advertise global novelty, superior retention, a muscle-preservation effect or an industry-leading metric without the relevant evidence.

## Decision and next action

| Option | Recommendation | Reason |
| --- | --- | --- |
| Execute A unchanged | No | Too broad for the fastest first outcome; misses B's better interaction detail and an explicit current blocker |
| Execute B unchanged | No | Incomplete coach-side service/lifecycle, plus verified defects in proposed code |
| Combine every feature from both | No | Expands cost and contradictions without improving the first coaching loop |
| **Create a selective combined plan** | **Yes** | Keeps B's practical interactions and A's data/service/validation requirements, while correcting both |

The [combined delivery plan](../../superpowers/plans/2026-09-26-combined-delivery.md) is a proposed consolidation, not an instruction to execute both originals. Its first increment is: native baseline, lossless web/mobile workout handling, truthful completion/recovery, then the improved logger and a real dashboard-to-client coach response.

Preserve the source plans for traceability. Use one implementation backlog with the corrections in this review; do not alternate between incompatible schemas, storage strategies and acceptance definitions.

## Verification limits

Read all 19 primary documents across both sets. Checked current source paths and selected code contracts at base commit `70c11b0` plus the current uncommitted tree. Ran 12 focused probes of exact plan examples or explicitly identified integration sequences. Rechecked seven public sources and one additional Everfit release.

No application feature was implemented, no existing plan was overwritten, and no live database or real client account was accessed. Full app verification/native builds were not rerun for this document review. The evidence runner's successful exit means its reproductions matched the reported problems; it does not mean those new features passed acceptance.

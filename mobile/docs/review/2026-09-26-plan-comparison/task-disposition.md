# Disposition of both roadmaps

26 September 2026 · Proposed consolidation; no application changes made.

Read with the [comparison](README.md) and [combined delivery plan](../../superpowers/plans/2026-09-26-combined-delivery.md). A means Product Excellence; B means Market Review. Adopt means retain the intent, not blindly copy the supplied code. Rewrite means a verified contract or implementation problem must be corrected first. Deferral removes the item from the initial delivery, not from future consideration.

## Every Market Review task

| B task | Decision | A counterpart | Required treatment |
| --- | --- | --- | --- |
| 1.1 Database security report | Strengthen | F01, F02 | Capture complete function definitions; isolate failed inspection queries; use staging and actor-based authorization tests. Do not treat introspection as proof of access behavior. |
| 1.2 Security hardening SQL | Rewrite | F02, F07 | Inventory existing permissive policies, grants and functions; verify the effective authorization boundary. Adding a policy without removing a permissive predecessor may not harden anything. |
| 1.3 Private photos/extensions | Adopt and verify | F01, F02, F08 | Inventory actual object names and bucket policy first; correct the allowed extension contract only where needed. Prove owner, assigned coach, unrelated user and signed-URL behavior. |
| 1.4 Web/mobile v2 compatibility | Promote; rewrite serializer | F01, F06, F07 | First implementation slice. Preserve tracking, duration, kind, explicit completion and metadata; unsupported versions stay read-only. Update all web consumers, not only the dialog. |
| 1.5 Default development client | Adopt | F01, Q01, Q02 | Confirm existing scripts; use an actual development client for native capabilities and retain a documented web-preview command. |
| 1.6 Physical-device acceptance | Adopt and expand | F01, Q01–Q04, R04 | Fresh iOS and Android evidence. An owner-deferred failure is not a passed release gate. |
| 2.1 Messages/RLS/read RPC | Merge; redesign | C01, F02, F07 | One coaching model for both plans. Validate owned context references, preserve authorship and assignment history, add operation IDs; mark only received/visible message IDs read. |
| 2.2 Message model | Merge | C01 | Include contextual messages and structured published coach responses without duplicate parallel schemas. Separate transport delivery, read state and explicit acknowledgment. |
| 2.3 Thread hooks | Rewrite | C03, F03–F05, F07 | Durable account-scoped drafts and idempotent retry; honest pagination/read state; no duplicate accepted-but-timed-out sends. |
| 2.4 Coach screen | Adopt and expand | C03, U02 | Keep the clear human relationship and context. Add unassigned/unavailable/reassigned states, service expectations, accessible loading/error/retry and real playback when media is supported. |
| 2.5 Contextual entry points | Adopt | C03, U03, T01 | Start with validated workout/check-in record context. Set-level references wait for stable IDs. Show the relevant date and author. |
| 2.6 Replies against weekly feedback | Merge | C01, C03, T05 | Link the actual feedback and published response revision; retain the coach's observation, next action and reason, plus acknowledgment/follow-up. |
| 2.7 Web inbox/push specification | Expand to implementation | C02, C04, C05 | Complete coach queue, reply publication and notification delivery. Manual SQL replies cannot satisfy service acceptance. |
| 3.1 Set suggestions | Adopt with corrections | T02 | Match exercise, tracking mode, set kind and comparable history; distinguish suggestions from completed work. Test warm-up indexing and unavailable history. |
| 3.2 One-tap completion | Rewrite event contract | T02, F06, F07 | Atomically apply explicitly confirmed values and completion. Do not infer completion from filled fields or overwrite newly entered values from a stale render. |
| 3.3 Weight/reps/duration steppers | Adopt | T02, U02, Q03 | Correct decimal duration parsing and units. Use appropriate increments, accessible labels and large targets; retain direct entry. |
| 3.4 Visible set list | Merge into 3.2 | T02 | Keep this interaction requirement, not a duplicate work item. Preserve selection, warm-up labels and undo. |
| 3.5 Exercise-name suggestions | Adopt with corrected test | T02, T01 | Ship useful search before a full catalog. Resolve the “ben” fixture mismatch; names alone do not establish identity for lifetime records. |
| 3.6 History and PRs | Rewrite calculations | T01, T04 | Valid completed sets, stable comparable identity, explicit history coverage, consistent metric types and units. Do not call a capped history lifetime evidence. |
| 3.7 Workout summary | Adopt | T02, T04, T05 | Reward recorded work and explain the next action. Keep saved/synced/completed distinct; label training volume correctly and omit unsupported PR claims. |
| 4.1 Morning/Your day groups | Adopt as prototype | U04 | Preserve all applicable required fields and normal submission. Evaluate morning capture and evening completion with actual clients. |
| 4.2 Answered counter/copy | Adopt | U04, U02 | Count applicable fields; distinguish answered from valid. Make errors discoverable and avoid implying an incomplete check-in is submitted. |
| 4.3 Sleep import | Correct and device-verify | Q01, U04 | Stage-aware Android calculation, pagination, overlap/source rules, correct reporting date and user confirmation. Permission denial and insufficient detail remain usable. |
| 5.1 Local meal model | Replace persistence design | N01, N02, F03–F05, F07 | Durable actual-intake entries with operation IDs, immutable portion/nutrient snapshots and nullable values. No label-keyed, mutable-plan reconstruction. |
| 5.2 Meal check-offs | Adopt interaction | N02, U03 | Confirm consumed portion, support changed/skipped entries and undo; serialize concurrent writes and show local/synced states. A prescription alone is not actual intake. |
| 5.3 Meal totals into check-in | Rewrite reconciliation | N04, U04 | Review partial coverage, unknown values, source and manual overrides before applying. Never silently replace unknown nutrients with zero. |
| 6.1 Immediate measurements chart | Verify and fix if reproduced | T05, Q04 | Capture the current native behavior first; isolate visibility/lazy-render defects. Existing web evidence is not proof of current device behavior. |
| 6.2 Weight trend | Retain smoothing; rewrite evidence rules | T05 | Use actual dates, explicit window coverage and sufficient observations; avoid a four-week claim from sparse observations outside that interval. |
| 6.3 Strength/progress summary | Rewrite calculations | T04, T05 | Do not compare estimated max to raw load under one label. State the metric, training context, observation count and coverage. |
| 6.4 Progress screen | Adopt and refine | T05, U01 | Goal-specific training, body, habit and coaching progress; missing data is a normal state. Connect observations to the coach's interpretation. |
| 6.5 Home progress links | Adopt | U03, T05 | Keep a clear next action and one useful progress signal; do not crowd the home screen with every metric. |
| 7.1 Fixed new tabs | Test before committing | U01 | Prototype Today/Training/Nutrition/Progress/Coach and a simpler alternative. Preserve access to required check-in, settings and deep links; choose from task evidence. |
| 7.2 Plain copy | Adopt | U02, U03 | Use client language and accurate statuses; review across errors, empty states and return after a break. |
| 7.3 Home model refactor | Adopt when modifying Home | U03 | Keep rendering/data derivation separable; preserve behavior with relevant existing tests. Avoid making a cosmetic refactor a release blocker. |
| 8.1 Lock-screen exercise/cue | Defer enhancement | Q02, F08 | Generic timer remains useful. Before richer content, isolate per-account consent, reset immediately on account switch and synchronize preference subscribers. |
| 8.2 Readiness nudge | Narrow first; defer automation | T03, C03, Q01 | First offer a contextual coach question. Automated recommendations need timely inputs and explicitly approved easier/shorter options; a generic substitution is not evidence. |
| 8.3 Dictation | Small later experiment | T02, Q03 | Use keyboard dictation with review and atomic application; reject ambiguity, negation errors and unsupported units. Keep ordinary controls equally usable. |
| 8.4 Monthly Chapter | Adopt after trustworthy progress | T05, C02, C03 | A concise coach-reviewed story with actual observations, decisions and next goals. Explain sparse data; keep production effort sustainable for coaches. |
| 8.5 GLP-1 mode | Defer outside base launch | R05 | Only reconsider with demonstrated cohort demand, an appropriate clinical/content owner and a complete coach-authored protocol. Do not ship the supplied medical defaults or implied preservation claims. |
| 8.6 Form-check video | Next increment after coach loop | C01–C04, F08–F10, T01 | Durable upload/cancel/retry, correct MIME, access tests, supported client/coach playback, cleanup and retention. Begin with workout/exercise context; set context needs stable IDs. |

## Every Product Excellence task

These dispositions correct A as well. A's original package checklists remain supporting detail; the combined plan and this comparison resolve conflicts.

| A task | Decision | B contribution / change |
| --- | --- | --- |
| F01 Baseline/staging | Retain and sharpen | B1.1, B1.3–1.6 add explicit current web compatibility, conditional photo extensions and development-client/device baseline. Re-estimate the actual tree. |
| F02 Authorization/profiles | Retain | Incorporate B1.2/2.1 after correcting policy assumptions; keep private coach notes out of the client projection. |
| F03 Protected local records | Retain; prove compatibility | Keep account isolation and migration evidence. Do not block independent UI prototypes on the entire storage migration. |
| F04 Offline recovery | Retain | B's outbox-preservation rule must permit fixing silent draft expiry and cold-start recovery. |
| F05 Central synchronization | Retain | Reuse good existing code; extend to coaching/intake rather than create isolated retry mechanisms. |
| F06 Truthful completion | Retain and promote | Needed for B1.4, B3.2 and progress. A saved v2 workout does not automatically mean a completed session. |
| F07 Atomic/idempotent writes | Retain and promote | Directly addresses B's message, meal and dictation interaction defects. |
| F08 Privacy/consent/support | Retain | Extend actual inventory to imported health data, contextual messages and later video; add consent to richer lock-screen content if shipped. |
| F09 Export | Retain for public release | Include any newly shipped messages/intake/media and private asynchronous download handling. |
| F10 Account deletion | Retain for public release | Include local records, pending operations and eventual media cleanup; verify using fictional accounts. |
| C01 Coaching contracts | Retain; add context | Adopt B2.1–2.2's contextual intent with verified ownership and stable references; one schema/model, not both plans' competing variants. |
| C02 Coach queue/composer | Retain as essential | Expand B2.7 from a deferred specification to an operational dashboard; include context and later Chapter authoring. |
| C03 Client coaching | Retain and enrich | Incorporate B2.4–2.6, contextual questions, unavailable/reassigned coach handling and explicit next actions. |
| C04 Notifications | Retain | Complete B2.7 with safe payloads and delivery jobs; disclose permission-denied behavior and keep in-app unread state accurate. |
| C05 Service operations | Retain | Define actual review/response commitments and coach capacity; no competing task in B fills this gap. |
| U01 Visual/navigation direction | Retain; test B's candidate | Current device captures and short task studies decide navigation. Do not treat either plan's proposed tabs as already validated. |
| U02 Shared UI/access states | Retain | Add B's concrete controls, counter and copy; accessibility applies while building each slice. |
| U03 First use/Home | Retain and focus | Bring in B2.5, B6.5 and B7.3; foreground today's action and coach relationship without dashboard clutter. |
| U04 Required check-in | Retain and specify | Adopt B4.1/4.2 and verified sleep import; keep required fields, manual confirmation and source/date visibility. |
| U05 Shorter protocol experiment | Defer | Keep the current owner-required protocol unchanged. Reopen only after an explicit decision to study a different coach-assigned protocol. |
| T01 Plan versions/exercise identity | Stage incrementally | Preserve context and immutable references where needed; full catalog/version authoring does not gate steppers or explicit repeat values. PRs/alternatives still need comparable identity and plan context. |
| T02 Gym execution | Retain; substantially improve detail | Adopt B3.1–3.5/3.7 with atomic handlers and mode-aware history; test dictation later as a small optional input method. |
| T03 Approved alternatives | Defer advanced set to next increment | Start with asking the coach in context. Offer automated easier/shorter options only after explicit alternative semantics and coach authoring exist. |
| T04 Training progression | Retain; correct B's formulas | Integrate B3.6/B6.3 after defining completed valid sets, comparable exercises, history coverage and metric labels. |
| T05 Goal-specific progress | Retain; add Chapter | Adopt B6's presentation and B8.4's monthly story; retain honest missing-data and time-window handling. |
| N01 Portion authoring | Reduce initial scope | First support reviewable portions and immutable consumed snapshots. A broad food database/authoring redesign is not a prerequisite for useful meal confirmation. |
| N02 Actual intake | Retain; simplify interaction | Use B5.2's direct meal confirmation over A's durable, idempotent ledger. Preserve unknown values and historical facts. |
| N03 Swaps/groceries | Split and defer | Small coach-approved alternatives can follow the first ledger; grocery generation and broad swap tooling are not initial launch gates. |
| N04 Intake reconciliation | Retain | Correct B5.3 so imported totals remain reviewable, partial and source-aware without clobbering manual entries. |
| Q01 Health imports | Retain | Incorporate B4.3 with proper Android sleep-stage interpretation and actual device validation. Optional imports cannot block manual entry. |
| Q02 Native lifecycle | Retain | Validate current timers first; treat B8.1's richer lock-screen data as a separate consent-bound enhancement. |
| Q03 Accessibility | Retain throughout | Steppers, sets, check-in groups, coach thread and progress need current VoiceOver/TalkBack, scaling and keyboard evidence. |
| Q04 Performance/stability | Retain throughout | Verify B6.1's suspected chart behavior rather than infer device behavior; measure realistic histories and low-end devices. |
| R01 Evidence/CI | Retain | Add regression coverage for reproduced B defects as those features are implemented. Do not call the review probe runner app acceptance. |
| R02 Formative studies | Retain | Study both plans' best interactions and navigation candidates with clients/coaches; quantify task success and effort. |
| R03 Expanded beta | Retain | Keep real service operation, stability and multi-week use; use thresholds as proposed decision rules, adjusted from baseline. |
| R04 Controlled release | Retain | Security/privacy/device acceptance, support, rollback and capacity remain release work even when UI looks finished. |
| R05 Operate/re-grade | Retain | Reassess the product from evidence; consider AI support, GLP-1 programs and other investments only after demand and ownership are clear. |

## What the first release excludes

The initial backlog does not contain every optional feature in both plans. It excludes the shorter check-in experiment, general AI coaching, a GLP-1 program, broad grocery tooling, automated readiness prescriptions and a large library of session variants. Rich lock-screen content, dictation, form video and the monthly Chapter are ordered experiments/increments after their prerequisites; they must not delay fixing the existing core service.

User value comes from a complete, trustworthy loop with better everyday interactions. A longer feature inventory is not the acceptance criterion.

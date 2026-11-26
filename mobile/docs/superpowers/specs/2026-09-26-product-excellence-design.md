# Dawnage premium coached experience — product design specification

Date: 26 September 2026  
Status: proposed design and delivery scope; the user requested the complete plan and confirmed **“Premium app for clients working with a human coach.”** No implementation or deployment is performed by this document.

## Purpose and product promise

Dawnage helps a coaching client know what to do today, record it with little friction, receive a meaningful response from their coach, and understand their progress. The target is a premium daily companion whose quality holds up during a real workout, a disrupted week, a poor connection, and a change of device.

“10/10” is the quality ambition. It is not a rating that completing a checklist can guarantee. The release must earn its assessment through current screenshots, physical-device evidence, client research, coach workload and production-like reliability. The prior provisional 6.5/10 review is the starting evidence, not a baseline measurement of every metric.

Sources: [review](../../review/2026-09-26-market-audit/README.md), [technical findings](../../review/2026-09-26-market-audit/code-review.md), [market comparison](../../review/2026-09-26-market-audit/market-research.md), [verification limits](../../review/2026-09-26-market-audit/validation.md).

## Chosen approach and alternatives

**Recommended: deepen the existing coached product.** Preserve Expo, Supabase, the web coach dashboard, the current visual system, reviewed health imports and the logger. Add the missing coach-response path, repair persistence, improve daily flows, and connect progress to actions. This concentrates investment on the service the user selected.

A broad fitness “super app” with social feeds, scanners, classes and a large food catalog has a much larger ongoing content/operations burden and weakens the initial product focus. A primarily autonomous AI coach conflicts with the confirmed human-coached positioning and introduces a separate evaluation and prescription problem. Neither is the default roadmap.

The first distinctive experience is a traceable coach decision. The second is a whole-session or meal alternative approved for the client in advance. Individual exercise swaps, health import, charts and iOS widgets already exist and must not be sold internally as new work.

## Global constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

Additional requirements: keep the current Expo 57 / React Native 0.86 / React 19 stack during feature work unless a demonstrated compatibility or security need requires a separately verified change. Use the existing theme tokens, platform controls, minimum targets, reduced-motion and reduced-transparency behavior. Keep production secrets in a server secret store. Use the current reporting date captured with a record; store UTC instants and the capture timezone separately when new provenance is needed. A timezone change must never silently move an old record to another day.

## Intended clients and service boundary

The primary client is enrolled with a named human coach and receives training and nutrition guidance. Invitations, self-registration, awaiting assignment, active coaching, reassignment and ended coaching each need explicit states. The app is not an emergency contact or a medical diagnosis service.

Initial language is the current English experience with localization-ready copy and units. India-specific food portions are a hypothesis supported by the repository's content, not an assumed universal audience. Build initial meal options from pilot clients' actual food habits. Metric units remain the storage canonical form; display preferences and conversion must be tested before advertising imperial support.

Keep existing business billing arrangements during this scope. Before adding payment, upgrade, external purchase or subscription links, classify the actual coaching offer against current store requirements. A billing expansion is a separate project; account access and clear plan/service status are included here.

## Target journeys and screen responsibilities

| Surface | Target behavior | Required states |
| --- | --- | --- |
| Account entry | Clear coaching proposition, secure sign-in/reset and actionable enrollment | Verification pending, invalid/expired link, unavailable network, wrong role |
| Setup | Goal, practical constraints, coach connection and one useful next step | Assigned, invitation pending, unassigned with real help action |
| Home | One primary next action, latest coach response, today's plan and compact progress | First day, active draft, partial session, queued delivery, rest day, overdue review |
| Daily check-in | Precise required answers with reviewed imports and incremental entry | Unanswered, partially entered, preserved invalid input, offline save, conflict, receipt |
| Training | Assigned plan with prescription/version, next session, history and approved alternatives | Template preview clearly labeled, no assignment, changed plan, partial/completed session |
| Workout | Large reachable entry, prescription vs actual values, quick repeat/undo and reliable recovery | Interrupted, offline, custom exercise, alternate plan, timer/background, partial finish |
| Nutrition | Meals and portions, approved swaps, actual intake and practical preparation | Missing amounts, estimate, mismatch, alternative unavailable, no assigned plan |
| Coach | Published response, one next action, follow-up question and response expectation | Awaiting review, coach unavailable, reassigned, notification denied |
| Progress | Goal-specific trend, workout progression, measurements/photos and coach interpretation | Sparse history, missing observations, estimated data, changed goal |
| You / account | Profile, assessment, preferences, data ownership and help | Export/deletion request progress, revoked session, unsent local work |
| Health / native surfaces | Optional imports with attribution; useful timers/shortcuts | Unsupported OS/build, denied/partial permissions, stale result, account change |

Navigation is a design decision with a defined experiment. Prototype the current five tabs with prominent Coach/Progress links and a candidate five-tab arrangement of Today, Training, Nutrition, Coach, Progress, with Check In directly on Today and profile via avatar. Compare finding a check-in, coach response, plan and progress with 12 representative users. Adopt the candidate only if at least 10/12 find every critical destination without help, the current arrangement does not meet that bar, and check-in discovery does not regress. If both pass or evidence is inconclusive, retain the current tabs. Keep old deep links and guarded editor exits in either outcome. This avoids treating a navigation hypothesis as a proven redesign.

A visual design package must precede production screen edits: current native captures, two targeted hierarchy/navigation options, chosen direction, shared components and state specifications. Preserve Dawnage's identity; no whole-app repaint is a prerequisite. The earlier audit could not render the app and is not evidence for pixel-level defects.

## Coaching service design

1. The client submits a weekly report. Submission time and assigned coach determine a review due time.
2. The coach sees a queue ordered by overdue/due reviews, with recent observations, previous commitments, missing information and workload.
3. The coach drafts three required parts: what I noticed, what changes or why the plan continues, and one next focus. A program change references its actual published plan version.
4. Publishing creates an immutable response revision, an in-app update and a generic notification job atomically.
5. The client can view it, acknowledge the specific revision, and ask a text follow-up. “Viewed” is not an inference of comprehension; acknowledge is an explicit action.
6. Editing a published response produces a new revision. Prior responses and their original acknowledgments remain traceable.
7. Coach reassignment revokes former-coach access under server policy; the client retains permitted published history. Unpublished coach material never becomes visible to the client.

Use the existing 48-hour wording only for an assigned service that has accepted a **48 elapsed-hour** response commitment and sufficient coverage. Otherwise show the actual configured window. Unassigned accounts receive a real support route instead of an invented due time. App support and coach response are separate channels. Text follow-up is scoped to coaching; attachments, video calls and generalized social messaging are not initial requirements.

## State and data contracts

Keep these dimensions separate:

```ts
type Delivery = 'local' | 'queued' | 'synced' | 'blocked';
type SessionCompletion = 'not_started' | 'partial' | 'completed' | 'unknown';
type ReviewState = 'awaiting_review' | 'published' | 'acknowledged';
type DateKey = string; // validated YYYY-MM-DD; never derived by slicing a UTC instant
type MetricSource = 'manual' | 'health_import' | 'confirmed_meal' | 'legacy_unknown';
```

A saved partial workout is not completed. An intentionally shortened session may be ended by the user while remaining partial relative to its prescription. A completed approved alternative is complete relative to that alternative. Legacy free text and unversioned records with insufficient information remain unknown. Counts and plan progression must use this one definition across mobile and web.

Unsubmitted drafts do not expire destructively. Archive old drafts visibly and retain recovery until explicit discard or successful submission. Submitted queues remain separate. Sign-out can lock retained local work for the same account; it must not leak it to another account. Account deletion is a different explicit lifecycle and clears associated local data when confirmed.

An offline recovery shell must let a previously authenticated account access its own encrypted retained records without fetching setup first. Cached onboarding/access context is for local presentation only; it never authorizes server operations. Known revocation locks network actions and requires reauthentication. Offline devices cannot learn a remote revocation immediately; do not claim instant remote erasure. Pending operations revalidate identity and permissions before sending.

New contracts use a generated staging-derived database type layer and explicit runtime validation at network/native boundaries. The checked-in shared schema is documented as stale, so migration decisions start with an applied-schema inventory.

### Additive server changes

| Contract | Required contents and invariants |
| --- | --- |
| Protected client profile | Explicit client-safe projection; role, coach assignment, package and private coach notes cannot be arbitrarily read/written by a client |
| Acknowledged measurement write | Unique client/date after safe duplicate reconciliation; compare revision on update; return owned persisted row, including normalized decimals |
| Coaching thread | UUID, client UUID, weekly report UUID, assigned coach, created/due times; one canonical thread per report |
| Coaching response | UUID, thread UUID, revision, author, three response sections, linked plan version IDs, draft/published times; published revisions immutable |
| Client acknowledgment / follow-up | Actor inferred from verified session; acknowledgment unique per client/response revision; follow-up text bounded to 4,000 characters |
| Training/meal plan versions | Immutable published snapshot, client, coach, revision, publication time and optional alternative linkage; original legacy plan remains readable |
| Workout context | Sidecar keyed by log UUID with plan version, variant and stable exercise references, allowing v2 log readers to remain valid during rollout |
| Meal entries | Stable client operation UUID, client/date, optional plan version and meal option, actual portion, known/estimated nutrient values and provenance |
| Notification jobs/tokens | Server-owned jobs with unique response/event key; account-owned device tokens, retries, receipts and invalid-token cleanup |
| Account operations | Idempotent export/deletion jobs; recent authentication, server-inferred account identity, progress and audit metadata without health content |

Use Supabase SQL/RPC for transactions and RLS-protected data. Use **new Supabase Edge Functions** for privileged export/deletion orchestration and push dispatch. The current Express `server/routes.ts` registers no API, and the deployed Vercel configuration is a static SPA; do not assume that adding an Express handler creates a deployed backend. Establish and test the Edge Function environment explicitly. No service-role key belongs in mobile or web bundles.

Migrations follow inspect → stage → reconcile → deploy backward-compatible readers → enable new writes per cohort → observe. Do not run historic destructive SQL files wholesale. Security-definer functions must have a fixed search path, explicit grants and verified actor/assignment checks. RLS tests include direct requests that bypass the UI.

## Product rules by domain

**Check-ins:** preserve the current strict protocol first. Reduce repeated work using existing reviewed health imports, confirmed meal totals, appropriate workout suggestions and per-field entry through the day. Subjective ratings require the client's answer. A separately versioned short-protocol pilot may add “not measured” and different required fields after the service owner approves the tradeoff; server, mobile and dashboard must agree on the version.

**Training:** stable catalog identifiers augment display names; unmapped legacy exercises remain readable and are not falsely merged. Previous values query the relevant exercise rather than only ten recent whole sessions. PR comparisons require the same exercise identity, tracking mode and comparable load units; warmups, incomplete sets and unknown load do not earn false records. Pain/injury responses request coach input rather than generate a new prescription automatically.

**Nutrition:** a prescribed meal is not intake. A client confirms a portion or records a different meal before anything contributes to actual totals. Household portion conversions and allowed alternatives must be authored/reviewed by the coach, with known allergens and uncertainty visible. Missing nutrient values remain null. Grocery lists are derived from selected prescribed options and are separate from consumption.

**Progress:** choose a primary outcome appropriate to the goal. Display an observed seven-day weight mean only with at least three valid distinct reporting dates; compare two non-overlapping seven-day windows only if both qualify. Otherwise show observed values and say there is insufficient history. Do not infer fat loss or causality from weight changes. Coach-authored interpretations reference the observation window and the next action.

**AI option:** after the core service is proven, test a coach-only draft summarizer against human-written summaries. It may propose text with source references; a coach edits/publishes it. It cannot auto-send, invent observations, diagnose, prescribe or change a plan. This option is excluded from the base estimate and is not required for launch.

## Quality targets and how they are measured

All numbers below are proposed product targets, not published market benchmarks. Phase 0 records the measurement method and baseline; changing a target requires a recorded product decision.

| Dimension | Target / release evidence |
| --- | --- |
| Task clarity | At least 11/12 formative participants complete each core task without facilitator intervention; report raw counts and critical errors |
| Reporting effort | Reviewed-import check-in median ≤60 seconds and p90 ≤120 seconds; manual strict-protocol median reduced ≥30% from baseline without lower coach-rated usefulness |
| Workout speed | Two deliberate actions or fewer from ready Home to assigned workout; set editing feedback p95 ≤100 ms and durable save acknowledgment p95 ≤500 ms on reference devices |
| Startup | Release-build cold first useful content p95 ≤3 seconds online under the recorded network profile; cached offline recovery p95 ≤2 seconds |
| Data integrity | Zero lost acknowledged entries across at least 500 automated fault-injection scenarios; real-device interruption/reconnect matrix passes |
| Sync | Queued records reach confirmed server state p95 ≤30 seconds after stable foreground connectivity, excluding server outages and cases requiring user conflict resolution |
| Coach service | At least 95% of eligible reports reviewed within the configured response window over at least 50 review events; every overdue report visible to the coach |
| Accessibility | All critical flows complete with VoiceOver/TalkBack and large text, no blocking contrast/focus/keyboard defects, reduced motion/transparency respected |
| Stability | ≥99.8% crash-free sessions across at least 1,000 consent-appropriate beta sessions; report sample count and uncertainty, and zero unresolved release-blocking native crashes/ANRs |
| Privacy/release | Direct authorization matrix, private photos, export/deletion, notifications and signed-build/store metadata checks pass |
| Client value | At least 10/12 participants can explain their current next action and latest coach decision; capture reasons for continued use and departure over four weeks |

Reference devices: initially iPhone 13 plus a recent iPhone, Pixel 6a and Samsung Galaxy A54, subject to the actual generated build's supported OS floor. Include the oldest supported OS and current OS across the matrix. Measure release builds with synthetic 90-day and multi-year histories; do not time Metro development startup as app performance.

## Product measurement and operational limits

Collect events such as checkin_started, checkin_submitted, delivery_confirmed, workout_started, workout_saved, review_published, review_viewed, review_acknowledged and recovery_failed. Attach pseudonymous/cohort ID, platform, app version, event time and a bounded reason code only where needed. Do not attach health values, free text, photos, food descriptions, access tokens or email.

The north-star operational measure is the fraction of active coached clients who have an agreed next action and received an on-time review in their service window. Track activation, D7/D28 return, completed prescribed sessions and workload alongside it. Define active as at least one client-initiated meaningful event in the last seven days; keep enrollment and coach-assignment delays visible rather than quietly excluding them. Small pilot retention is directional, not proof of market superiority.

A coach lead owns response coverage and escalation. A technical owner owns incidents, migrations, deletion retries and release rollback. Product/design owns usability and the evidence-based priority list. No metric should pressure clients to log fabricated data or make coaches rush important decisions.

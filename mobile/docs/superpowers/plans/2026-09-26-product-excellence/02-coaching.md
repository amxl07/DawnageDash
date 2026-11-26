# B — Coaching Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make human coaching visible, useful and operationally deliverable from weekly submission through the next action.
**Architecture:** Assignment-protected threads and immutable published responses in Supabase, a review queue in the existing coach dashboard, and a mobile Coach destination with explicit acknowledgment.
**Tech Stack:** Existing mobile/web stacks, shared TypeScript contracts, Supabase RPC/RLS and Edge Functions, Jest, pgTAP and Deno.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## Product contract

The differentiator is the **coach decision trail**: what the coach observed, what changes or why the plan continues, and one next focus. A report being submitted is not the same as being reviewed. A push being accepted is not evidence that a client read it.

Use the existing weekly report UUID as the anchor. The existing `weekly_check_ins.feedback` field is a client's answer and must not be repurposed for a coach response. Start with scoped text follow-up; attachments, calls and unrestricted social messaging are outside this package.

## C01 — Establish coaching contracts and access rules

**Priority:** P0. **Depends on:** F01/F02/F07.
**Create:** `shared/coaching.ts`, `supabase/migrations/20260926000400_coaching.sql`, `supabase/tests/database/coaching.test.sql`, `mobile/src/features/coaching/contracts.test.ts`.
**Modify:** generated database types; `mobile/src/features/weekly/useWeeklyFeedbackController.ts`.

- [ ] Define service assignment, a canonical thread per weekly report, private drafts, published immutable responses, acknowledgments and thread messages. Actor IDs come from verified sessions. Reassignment is enforced from current assignment, not a stale coach ID supplied by the client.
- [ ] Add transactional RPCs `submit_weekly_report_v1`, `save_coach_draft_v1`, `publish_coach_response_v1`, `acknowledge_response_v1`, `send_coaching_followup_v1`. Repeated operation UUIDs return the original result. The report and canonical thread must be created together.
- [ ] Separate private drafts from published client-visible records. Publishing requires the three sections, a valid current assignment and accessible published plan references. A change creates a new response revision; acknowledgment references its exact response ID/revision.
- [ ] Store the assigned service's response window and due time on submission. Use elapsed hours and UTC instants for deadlines, rendered in the client's locale. Local reporting dates remain separate. Unassigned submissions have an explicit unassigned state and a support route.
- [ ] Add direct RLS/RPC tests for clients A/B, assigned/unrelated/former coaches, draft leakage, tampered author IDs, duplicate publish and stale revision. Client history can retain permitted published responses after reassignment; unpublished former-coach material stays private.
- [ ] Include all tables in F09/F10 account lifecycle inventories.

```ts
// shared/coaching.ts — proposed public DTO, with runtime validation at the boundary.
type PublishedCoachResponse = {
  id: string;
  threadId: string;
  revision: number;
  observed: string;
  decision: string;
  nextFocus: string;
  planVersionIds: string[];
  publishedAt: string;
};
type ThreadMessageInput = { threadId: string; operationId: string; text: string };
// text: trimmed, nonempty, at most 4,000 characters.
// Client-supplied author/coach/client IDs are not accepted as authority.
```

**Acceptance:** one submission produces one report/thread; no client can see drafts or another client's content. Publishing without a real plan change remains valid when the decision explains why the plan continues.

## C02 — Build a coach review queue and response composer

**Priority:** P0. **Depends on:** C01; T01 for plan-change links.
**Create:** `client/src/pages/CoachReviewsPage.tsx`, `client/src/components/coaching/ReviewQueue.tsx`, `client/src/components/coaching/ResponseComposer.tsx`, `client/src/lib/coaching-client.ts`, `scripts/coaching-contract.test.mjs`.
**Modify:** `client/src/App.tsx`, `client/src/components/CoachSidebar.tsx`, `client/src/components/ClientWeeklyFeedbackView.tsx`, `client/src/components/ClientDetailsSheet.tsx`.

- [ ] Add overdue/due/awaiting-client filters, deterministic deadline sorting, client context and queue totals. Use server-side pagination and a shared definition of eligible work; show unassigned/coverage issues to the authorized service owner.
- [ ] Place recent client observations, missing data and the previous agreed action beside the composer. Distinguish measured values, estimates, absent records and historical dates. Avoid an unreadable wall of every metric.
- [ ] Provide three labeled response sections, autosaved private drafts, a client-view preview and explicit Publish. Show draft save/retry/conflict status; navigating away from an unsaved draft requires recovery.
- [ ] Select actual immutable plan versions from T01 when explaining changes. Before T01 is available, support “continue current plan” and honest text, without pretending a typed sentence changed a prescription.
- [ ] Cover duplicate publishing, two browser tabs editing, reassignment during editing and a failed publish after server acceptance. Retain draft content on failure; a revision conflict requires review.
- [ ] Observe two coaches handling five fictional weekly reports each. Remove redundant data gathering; record median review time and omissions as the workload baseline, not an arbitrary speed quota.

**Contract tests:** a published response must render the exact previewed revision and linked plan IDs; a stale draft revision cannot overwrite a newer draft; queue counts agree with eligible server rows. Add tests around extracted pure serializers and use a staging browser journey for permissions/navigation.

**Acceptance:** a coach can understand a report, make a decision and publish it without switching to manual database tools or external messaging. Queue totals reveal overdue work.

## C03 — Deliver the client Coach experience

**Priority:** P0. **Depends on:** C01/C02, F05, U02. **Navigation integration:** U01.
**Create:** `mobile/app/(app)/coach.tsx`, `mobile/app/(app)/coach-thread.tsx`, `mobile/src/features/coaching/CoachScreen.tsx`, `mobile/src/features/coaching/ThreadScreen.tsx`, `mobile/src/features/coaching/useCoachThreads.ts`, `mobile/src/features/coaching/coachingOutbox.ts`, `mobile/src/features/coaching/ThreadScreen.test.tsx`, `mobile/.maestro/coaching-roundtrip.yaml`.
**Modify:** `mobile/src/hooks/useCoach.ts`, `mobile/src/features/home/TodayBrief.tsx`, `mobile/src/features/weekly/WeeklyFeedbackHistoryCard.tsx`, Home links and F05 coordinator adapters.

- [ ] Add a Coach destination showing assigned identity, actual service window, current next action, newest response and report history. Keep a stable guarded deep link regardless of U01's tab choice.
- [ ] Render the three response sections and exact linked plans. Clearly separate “submitted”, “awaiting review”, “new response” and explicit acknowledgment. Opening a screen never silently counts as an acknowledgment.
- [ ] Add “I understand the next step” plus a follow-up action; a follow-up can be used without pretending comprehension. Keep a pending acknowledgment/message locally until an owned server receipt confirms it.
- [ ] Cache permitted published responses in F03 storage for offline reading. Queue follow-ups through F05 using stable operation IDs; validate length before save and again on the server.
- [ ] Cover no coach, no reports, late reply, notification denied, newly revised response, reassignment, stale cached history and send/retry states. Keep the client supported if the coach is unavailable.
- [ ] Test screen-reader reading order, long replies, copy selection, large text, keyboard avoidance and unsent text recovery.

**Example test:** client acknowledges response revision 1. The coach publishes revision 2. The UI labels revision 2 new and requires a separate acknowledgment; revision 1's historical receipt remains unchanged. Viewing either response sends no automatic acknowledgment.

**Acceptance:** the client can identify their coach, understand the last decision, inspect actual plan changes and ask a follow-up, including a reliable offline-to-online handoff.

## C04 — Deliver useful, private notifications with server receipts

**Priority:** P1, required before push is advertised. **Depends on:** C01/C03/F03/F05.
**Create:** `supabase/migrations/20260926000500_notification_jobs.sql`, `supabase/functions/push-dispatch/index.ts`, `supabase/functions/push-dispatch/dispatch.test.ts`, `mobile/src/features/coaching/notifications.ts`, `mobile/src/features/coaching/notifications.test.ts`.
**Modify:** `mobile/src/hooks/useNotificationRouting.ts`, settings, AuthContext cleanup and existing notification registration.

- [ ] Create account-owned device-token registration/revocation and a server-only notification outbox. Publishing a response and creating its event job happen in one transaction with a unique event/response revision key.
- [ ] Run an authenticated scheduled Edge worker with job leases, bounded retries, provider receipts and invalid-token cleanup. Configure the actual schedule and secrets in staging, then document deployment; a function file alone is not a working service.
- [ ] Use generic lock-screen copy such as “Your coach has sent an update.” Exclude weight, dietary details, photos and free text. Payloads contain an opaque event/resource ID, not health data.
- [ ] Validate deep-link IDs and current access after login; defer navigation until authentication is ready. A stale notification must not open another account's cached response.
- [ ] Support notification categories/preferences and quiet hours; process/mark delivery according to actual provider evidence. Do not equate accepted, delivered, opened and acknowledged.
- [ ] Test crash after provider acceptance, duplicate worker runs, expired leases, rate limits, token transfer/sign-out and revoked assignments. In-app updates remain available when push is denied.

**Acceptance:** one logical response event has one canonical job; retries are deduplicated as far as the provider permits, and delivery uncertainty is explicit. Generic notifications land in the correct authorized thread.

## C05 — Make the coaching promise sustainable

**Priority:** P0. **Depends on:** C01–C04/U03; coach lead owns service policy.
**Create:** `shared/coaching-service.ts`, `mobile/src/features/coaching/service-window.test.ts`, `mobile/docs/release/product-excellence/coaching-service.md`, `mobile/docs/release/product-excellence/coaching-roundtrip.md`.
**Modify:** coach queue, safe coach DTO, onboarding service explanation, existing weekly 48-hour copy.

- [ ] Define enrollment, assignment, review frequency, response window, coach absence cover, follow-up expectations and support escalation. Make the current 48-hour text conditional on a staffed 48-elapsed-hour service.
- [ ] Specify reassignment while work is pending: transfer queue ownership, keep the original client-facing deadline unless an explicit service update is communicated, and audit the change. Never reset overdue work merely to improve the metric.
- [ ] Define eligibility for response metrics: accepted weekly reports with a staffed service assignment and a due time. Report unassigned submissions and missing coverage separately; do not discard them from operational visibility.
- [ ] Run a fictional full journey on both devices: enrollment → submission → coach queue → draft → publish → notification → open → acknowledgment → follow-up → coach reply → reassignment. Include an outage and an unavailable coach.
- [ ] Set capacity using measured review duration, follow-up workload and available coach hours. Limit enrollment rather than promise more clients than the coach team can serve.
- [ ] Rehearse an overdue report escalation and a failed notification. Support must not depend on the founder watching a database manually.

```ts
// Proposed deterministic service helper; UTC instant arithmetic, not calendar-day rounding.
expect(reviewDueAt('2026-09-26T18:30:00Z', 48))
  .toBe('2026-09-28T18:30:00.000Z');
// Add DST-boundary and reassignment fixtures; rendering timezone does not change dueAt.
```

**Acceptance:** every displayed promise has an owner and coverage rule; the pilot can measure ≥95% on-time reviews over ≥50 eligible events. No service outcome is inferred from app code alone.

## Package verification

Run focused mobile tests, root contract tests via `node --import tsx --test scripts/coaching-contract.test.mjs`, `supabase test db`, and `deno test supabase/functions/push-dispatch/dispatch.test.ts`. Execute the real staging coach-web/mobile round trip with two accounts and preserve screenshots plus redacted job receipts. Full mobile verification and web build must pass at G2.

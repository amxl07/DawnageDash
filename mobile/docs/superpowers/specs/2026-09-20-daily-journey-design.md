# Dawnage daily journey design

Approved in the conversation: refine returning Home; connect plans to workout logging; make check-in/workout completion useful; keep existing dark/coral and pearl/slate identity; validate on device when possible. This extends the uncommitted guided-start implementation, which is preserved.

## Product rules

The first submitted daily check-in starts Day 1. Coach claiming, signup, drafts, practice and plan viewing do not start it. Pending delivery is distinct from server confirmation. Resume/recovery retains its original account, reporting date and record identity. Unavailable or refreshing data cannot prove absence. Plan/session availability must come from assigned data, never invented schedules or coach feedback.

## Home composition

Use a compact personal header and known program/coach status. One dominant next action remains driven by the existing recovery-first selector. Put the next assigned session immediately after that action, then a compact weekly check-in record. Existing weekly draft/retry surfaces stay visible; an empty weekly invitation and assessment/recent-record detail move into a deliberately secondary area. Avoid duplicate session actions when the hero already opens that same session. Keep all real errors and pending work reachable. Retain the new-client welcome/practice path.

## Training and navigation

Five user-facing tabs: Home, Check In, Training, Nutrition, You. Use the existing plans route for Training with Plan/History views, sharing the existing history implementation rather than duplicating fetching or nesting vertical lists. The existing logs route remains a compatible route into Training history. Nutrition receives its own tab using the existing meal-plan, supplement, coach-note and error rendering. Preserve all saved-record/deep-link destinations and training plan provenance. Session cards show focus, exercise count and available prescription details, with a clear start action for assigned plans. Templates stay labelled as templates and must not silently become assigned plans.

## Completion composition

Check-in receipt: distinctive but quiet saved-state header, reporting date and delivery status, compact recorded values, primary next step and secondary edit. For synced current-day records, offer Training only when a current assigned plan is confirmed and workout recovery is not being bypassed; otherwise primary returns Home. Historical and queued receipts remain date/delivery focused. Do not imply a workout is due or coach has read the record.

Workout review/receipt: completed sets first, incomplete work clearly separated, strength volume secondary and not misleading for duration/bodyweight-only sessions. Review/save/blocked/queued/synced are visibly distinct. Preserve incomplete-set review, validation, retry and editing. Completion gives a clear done action; no invented PRs, effort scores or medical interpretation.

## Visual and motion rules

Use existing theme tokens, large readable type for the main task, quiet labels for supporting data, fewer nested bordered cards, consistent 24px primary-surface padding/radii and 48pt actions. Text scales and content scrolls without a fixed height. Use existing reduced-motion-aware reveals for state changes, small transform/opacity feedback, no added navigation animation or permanent decorative loops. Haptics must have one owner per action; queued work never gets a server-success claim.

## Verification

Behavior tests cover Home recovery/unknown/pending states, navigation aliases, training history ownership, assigned-versus-template launch, receipt destinations, and all workout save states. Run TypeScript/lint/UI contracts and review against the pre-task source snapshot. Attempt fixture-only visual capture without touching production data. Phone keyboard, large text, reduced-motion feel and 3–5-person usability checks require actual device/participant evidence; do not claim them from source tests.

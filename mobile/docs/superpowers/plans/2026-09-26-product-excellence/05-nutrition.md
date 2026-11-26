# E — Nutrition in Daily Life Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a prescribed meal plan into practical, coach-approved choices and accurately reviewed intake.
**Architecture:** Add structured portions/options inside T01's immutable meal-plan versions, an idempotent actual-intake ledger and explicit reconciliation into daily check-ins.
**Tech Stack:** Existing mobile nutrition views and web meal editor, Supabase/RLS/RPC, shared TypeScript, F03/F05 local persistence/sync, Jest/pgTAP.
**Spec:** [Design specification](../../specs/2026-09-26-product-excellence-design.md); [master and gates](../2026-09-26-product-excellence.md).

## Global Constraints

- Scope is the human-coached product in `mobile/`, plus necessary `client/`, `shared/`, and Supabase changes; `mobile-2/` is excluded.
- Preserve existing working-tree changes, historical records, local reporting dates, and legacy readers; use additive migrations and reversible feature rollout.
- All applicable daily check-in fields remain required by default; a shorter protocol requires an explicit, versioned, coach-assigned experiment.
- Missing is not zero; prescribed is not consumed; saved, synced, completed, reviewed, and acknowledged are separate facts.
- Use fictional test records and least-privilege access; never put credentials or privileged keys in clients, or health values, photos, and free text in analytics.
- Core journeys must work on iOS and Android; native-only extras must have honest fallbacks, and release claims require fresh device and server evidence.

---

## Scope and positioning

This package supports the coach's selected meals and common repeats. It does not attempt to compete immediately with the food-database coverage of Healthify or MacroFactor. Start with a small, quality-controlled set of meals relevant to the actual clients, including culturally appropriate household portions where the coach can validate them.

Never populate actual calories/macros merely because a meal was prescribed. Unknown nutrition remains unknown. Allergens and dietary constraints need reviewed content, not inferred safety claims.

## N01 — Structure portions and improve prescribed meal presentation

**Priority:** P1. **Depends on:** F02/F07; T01 for publication. Content inventory can start sooner.
**Modify:** `client/src/components/EditableMealPlan.tsx`, `client/src/components/MealPlan.tsx`, `mobile/src/features/nutrition/nutrition-screen.tsx`, `mobile/src/features/nutrition/MealPlanDetails.tsx`.
**Create:** `shared/meal-plan.ts`, `mobile/src/features/nutrition/meal-plan.test.ts`, `mobile/docs/release/product-excellence/nutrition-content-standard.md`.

- [ ] Inventory current meal fields and missing quantities; retain the legacy display. Define a validated meal option with stable ID, ingredient quantities/units, portion description, nullable nutrient amounts, known allergens, author/reviewer and review date.
- [ ] Add editor support for measured portions and reviewed household equivalents. Record cooked/raw state where it affects meaning. Do not silently convert “one bowl” into a universal gram quantity.
- [ ] Publish immutable meal snapshots through T01. Keep prescription totals labeled as plan targets/estimates and separate from actual intake totals.
- [ ] Improve mobile hierarchy: meal purpose/name, portion, useful preparation note, available approved options and a clear confirmation action. Missing quantities receive a coach clarification path.
- [ ] Review a seed set of actual target-client meals with the coach lead. Verify units and known allergen labeling; do not label an unreviewed substitute allergy-safe.

```ts
type Nutrients = {
  kcal: number | null; proteinG: number | null;
  carbsG: number | null; fatG: number | null;
};
type Portion = { quantity: number; unit: 'g' | 'ml' | 'serving'; label: string };
// Test: missing protein stays null after scaling a portion;
// a legacy free-text meal remains readable without invented quantities.
```

**Acceptance:** clients understand what portion is prescribed and what is known/estimated; existing meal plans still render.

## N02 — Add confirmed intake, repeats and dependable offline saves

**Priority:** P1. **Depends on:** N01/T01/F03/F05/F07.
**Create:** `shared/meal-entry.ts`, `supabase/migrations/20260926000900_meal_entries.sql`, `supabase/tests/database/meal_entries.test.sql`, `mobile/src/features/nutrition/MealEntrySheet.tsx`, `mobile/src/features/nutrition/mealEntryOutbox.ts`, `mobile/src/features/nutrition/meal-entry.test.ts`.
**Modify:** nutrition screen, F05 coordinator and F09/F10 inventories.

- [ ] Add actual meal entries with stable operation UUID, client/local date, optional plan version/option, confirmed portion, nullable nutrition, provenance and revision. Identity comes from the verified session.
- [ ] Provide “Record this meal”, portion adjustment, “Repeat a recent meal”, edit and remove. A planned option is only a prefilled proposal until the client confirms it.
- [ ] Use an idempotent revision-aware RPC and the shared encrypted store/queue. Show local/queued/synced/blocked separately. Undo/removal needs a versioned operation so late retries cannot resurrect a removed meal.
- [ ] Keep an “other meal” option that accepts the client's own description/known totals without inventing missing nutrients. No photo-AI estimator or global food-catalog integration is required.
- [ ] Test two intentional identical meals versus one retried operation, edits while offline, date changes, uncertain quantities, delete/retry ordering and account switching.

**Example test:** one meal operation is accepted but its response is lost. Replaying it creates one intake entry. Recording the same meal again with a new operation ID creates a second intentional entry. Merely opening the prescribed plan creates none.

**Acceptance:** clients can record common meals quickly and reliably; the ledger distinguishes actual consumption from prescribed options.

## N03 — Offer approved swaps and practical grocery planning

**Priority:** P1 differentiator; a minimal public release may defer groceries. **Depends on:** N01/N02/T01/C01.
**Create:** `shared/meal-alternative.ts`, `mobile/src/features/nutrition/MealSwapSheet.tsx`, `mobile/src/features/nutrition/GroceryList.tsx`, `mobile/src/features/nutrition/meal-alternative.test.ts`.
**Modify:** coach meal editor, meal snapshot validation and mobile meal details.

- [ ] Let the coach publish allowed alternatives with applicable client/plan, portion and reason/context. A substitute is not automatically nutritionally equivalent; show differences the coach considers relevant.
- [ ] Offer choices for unavailable ingredients, vegetarian preferences, eating out or travel only when the coach has authored an appropriate option. Unsupported situations lead to a scoped coach question.
- [ ] Preserve the chosen option/version on actual intake; an updated plan never rewrites previously recorded food.
- [ ] Build an optional grocery list from selected planned days/options. Merge quantities only when ingredient identity, unit and raw/cooked basis are compatible. Keep ambiguous items separate.
- [ ] Keep grocery shopping independent from consumption: checking an item purchased never records a meal or marks nutritional adherence.
- [ ] Test allergy/preference exclusions, withdrawn options, unavailable quantities, repeated ingredients with incompatible units and offline cached approval freshness.

**Example test:** a coach-approved alternative is selected for tomorrow's plan. Today's actual totals stay unchanged. Purchasing its grocery ingredients also leaves intake unchanged.

**Acceptance:** clients can adapt common practical situations within the agreed plan; the app does not claim safety/equivalence it cannot substantiate.

## N04 — Reconcile actual nutrition into the daily check-in

**Priority:** P1. **Depends on:** N02/N03/U04/F07; Q01 health-source integration.
**Create:** `shared/intake-reconciliation.ts`, `mobile/src/features/nutrition/IntakeReview.tsx`, `mobile/src/features/nutrition/intake-reconciliation.test.ts`.
**Modify:** check-in review/editor, health review, web coach weekly context and meal-entry queries.

- [ ] Aggregate confirmed entries per local date with field-by-field completeness. A known sum from only some meals is labeled partial; an unknown nutrient does not become zero.
- [ ] Offer an explicit reviewed proposal for check-in calories/macros, preserving the user's existing manual values. Confirm the covered day and whether all intended intake was recorded before using a total as the day's complete intake.
- [ ] When health imports and meal entries describe potentially overlapping nutrition, select/review sources rather than summing both. Show conflicts and provenance without silently favoring the newest number.
- [ ] Save a snapshot of accepted totals plus source IDs/revisions. Later meal edits flag that the check-in may need review; they do not silently mutate a submitted report.
- [ ] Let the coach distinguish prescribed targets, confirmed intake, partial intake and manually reported totals. Use these differences in C02's review context without claiming nonadherence from missing logs.
- [ ] Test partial nutrient coverage, mixed sources, midnight/backfill, manual override, removed meal after submission and legacy reports with unknown provenance.

```ts
type IntakeProposal = {
  date: string;
  totals: Nutrients;
  complete: { kcal: boolean; proteinG: boolean; carbsG: boolean; fatG: boolean };
  entryRevisions: { id: string; revision: number }[];
};
// Test: two meals, one with unknown protein, yield a partial protein subtotal;
// accepting calories does not force acceptance of protein or overwrite manual water.
```

**Acceptance:** the whole journey works: coach publishes → client views/chooses → confirms actual portion → reviews daily totals → submits required check-in → coach sees truthful provenance.

## Package verification

Run mobile nutrition/reconciliation suites, `supabase test db`, root meal serialization contract tests added to R01 and full mobile/web checks at integration. Validate common meals with the coach lead and test actual portion entry on both phones. Record whether groceries ship or remain flagged off; confirmed intake and reconciliation cannot be represented as complete until the full round trip passes.


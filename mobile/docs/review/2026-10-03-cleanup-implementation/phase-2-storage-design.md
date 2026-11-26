# Assessment storage and compatibility design

Prepared before Phase 2 implementation; no database migration or live data writes.

- Retain flat answers JSON, completed_sections JSON, existing section IDs, and status columns.
- Put the immutable original 87-question catalog and revised active catalog in shared/questionnaire.ts; mobile and web import the same pure contract through their existing library entry points.
- Unchanged meanings retain q IDs, including Profile overlap q14/q56/q64/q33. Combined or meaning-changing prompts use descriptive v2 IDs, never reuse an old answer under a new meaning.
- A numeric __assessment_catalog_version: 2 key identifies records saved through the revised wizard. Unknown keys are preserved when merging into the latest stored answers. No bulk migration, answer deletion, or blanket completion reset.
- Records without a version remain readable using original labels. Revised summaries separate relevant current answers from earlier or currently hidden answers. Hidden drafts are stored and recover on Yes → No → Yes; they are never silently presented as current facts.
- Stable section completion survives the catalog revision. Newly combined prompts are optional; visible required questions determine validation. A section with missing relevant required answers cannot advance. Counts use known section IDs, deduplicated, rather than arbitrary stored array length.
- Each save reads the latest row, fails closed on read failure, and applies only changed fields; unrelated newer Profile answers and unknown keys survive. Both clients advance only after acknowledgment and ignore stale account requests.
- Known name/phone and overlapping Profile facts are editable initial values only when an assessment value is absent. Stored assessment answers take precedence, including explicit empty values. No live profile update occurs merely by viewing or accepting a suggested fact.
- Initial measurements remain intake values; no previous observation is copied into a new dated measurement.
- The historical waist instruction contains an unverifiable distance (“half a cam”). Preserve that historical definition, omit the ambiguous distance from the revised input, and record that detailed measurement guidance needs an approved protocol; do not invent a distance.

The final report will record the actual revised question count and ID mapping, conditional paths, compatibility tests, and any deviations from this design.

## Decisions after design review (binding over preliminary wording above)

1. Resolve readback labels, units and scale meaning by immutable question ID across the union of the original and revised catalogs. The record version records the writer only; it must not select one catalog for all retained answers. Readback classifies relevant current answers versus earlier/hidden answers independently of version. Metadata/unknown keys are retained but not rendered as questions.
2. Newly introduced conditional parents (including digestion) default unanswered. Historical child values remain under earlier answers until the relevant parent is answered Yes; never infer consent or symptoms from old scores.
3. Preserve completed_sections as completion history. Compute current valid completion separately from visible required answers and deduplicated known section IDs; use that count in wizard, summaries, Home and save status. Clearing a required value in a previously completed section must stop a completion claim without deleting the stored completion history.
4. Both wizards save changed fields against their acknowledged baseline, preserving explicit clears and hidden edited drafts. Read latest, merge the narrow patch, and condition existing-row updates on the original answers/completed_sections values. Check the returned row; a zero-row update is a conflict, never Saved. Retry a bounded conflict against refreshed data, with account guards around every await.
5. Avoid adding a production database migration. Inspect all insert consumers: if both application clients are the only writers, new rows can use the existing UUID user_id as their stable assessment primary key so simultaneous first inserts conflict instead of creating duplicate rows. Keep legacy random IDs unchanged. On duplicate-key conflict, re-read and merge. If another writer prevents this strategy, report the concrete evidence before choosing a different contract.
6. Profile saves must preserve unrelated profile_data and update only changed overlap fields. Keep the current policy of not creating an assessment from Profile. Web reads must fail closed, preserve explicit empty answers, and ignore stale-account results. Prefer the smallest shared save/presence helpers rather than copying a second persistence implementation.
7. Known Profile facts are reviewable editable initial values only; use persisted/acknowledged facts, never unsaved Profile edits. Do not treat phone as guaranteed WhatsApp identity without allowing review.
8. Preserve unknown answer values and version metadata without narrowing them to string/number or downgrading a higher existing version. Render only values appropriate for known questions. No silent conversion of old essays into combined new questions.
9. Meaningful validation tests cover Yes → No → Yes, hidden required fields, legacy/new mixed readback, zero ratings, whitespace required fields, partial/draft save completion, failed acknowledgment, concurrent narrow updates, account switching and unchanged Profile overlap.

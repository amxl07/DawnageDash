# Final compatibility corrections

Two additional Phase 2 integration gaps were found by the final independent review during Phase 4. They were corrected before final acceptance, under the plan's requirement to address confirmed incorrect readback/data-loss paths. Earlier phase snapshots remain intact; the Phase 4 package includes this follow-up.

- Profile recovery exit now compares and restores the pending journal through `restoreProfileForm`, applying only its owned fields over the current canonical baseline. Back without new edits goes directly to the pending-save choice. Discard removes only subsequent edits, preserves the pending goal, and retains newer unrelated phone/injury facts before Retry. Older maskless journals retain their original full-form intent.
- Mobile and web assessment summaries now receive the acknowledged record. Profile suggestions remain available in the editor, without appearing as saved assessment answers on initial completed readback or the existing web read-only view.

## Evidence

- Focused RED: 3 expected failures across Profile and mobile wizard (27.985 seconds), showing the incorrect exit prompt/stale values and suggested fields leaking into summary data. `compat-final-red.log` in the private task directory.
- Full affected GREEN: both suites pass, **43/43 tests**, exit 0, 4.324 seconds. Tests cover both direct recovered exit and explicit edit → Discard → Retry, narrow users/assessment payloads, retained history/unknown values and no write on summary load. `compat-final-green.log`.
- Actual web browser RED against the preserved Phase 3 wizard: `web-assessment-compat-red/manifest.json` fails because the unaccepted Profile injury is visible in a completed summary. No live database is involved.
- Actual current web browser reports all **13 checks passed**, zero runtime exceptions in `web-assessment-final/manifest.json`: original advance/acknowledgment/history checks plus completed and existing read-only summary readback. Process completion and final static checks are recorded in the final verification report.
- Scoped independent source re-review: PASS/PASS, zero open source findings; see `final-compatibility-review.md`.

No historical answers, migrations, production records or unrelated workspace changes were removed. Native behavior and a live PostgREST/RLS deployment are not validated by these fixtures.

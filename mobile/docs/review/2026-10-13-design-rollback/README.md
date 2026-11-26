# Design rollback — 13 October 2026

Restores the neutral light canvas, white cards and coral accents from before the October 10 theme change, and the fuller screens from before the October 9 minimization. The user requested both reversals because the minimalist version felt empty.

Home again shows the dated greeting, weekly record and recap, and fuller training cards. Training exposes its plan context and exercise previews; Nutrition shows the calorie target and meal amounts, with visible supplement/note sections. Check In regains its earlier hub copy, and You regains its grouped cards. The earlier welcome artwork and practice-guide explanation are restored.

The rollback uses verified working-source snapshots rather than Git HEAD. It preserves the earlier workout suggestions, steppers, one-tap completion and Undo; check-in grouping/counter and requirements; draft/save behavior; mobile/web compatibility; and native integrations. It also retains the accessibility and reliability fixes mixed into the October 9 session: wrapping web tab labels, queued-to-synced announcements, weekly exit errors, and the larger practice-guide sheet. Removed unused affirmations remain removed.

Thirty source, test, QA and documentation files are recorded in [source-manifest.json](source-manifest.json), with the exact changes in [rollback.diff](rollback.diff). Each pre-rollback file is backed up outside the repository at the path in the manifest. The final preservation check confirmed 553 other covered files were unchanged. No branch switch, Git reset, staging, commit, push, backend write or dependency change was performed.

## Verification

- Snapshot hashes and rollback target hashes verified. The reverse patch dry-run passed.
- Mobile TypeScript passed. UI contracts passed for all 254 production source files.
- The affected Jest run was interrupted after 13 minutes 27 seconds without suite results. Scoped lint reached its six-minute limit without results. Neither is counted as a pass; commands, timestamps and logs are retained in `verification/`.
- The full suite was interrupted after more than 17 minutes with one completed workout suite and no reported failure. A process sample showed filesystem/stat work during startup. `verification/full-suite-attempt.json` and `mobile-tests.log` retain that attempt; it is not counted as a full-suite pass.
- An independent source review found no functional issues. Three stale descriptions in DESIGN.md were corrected.
- The fixture-only preview did not serve HTML within the three-minute startup limit. No fresh browser captures or interaction checks completed, including the restored practice guide at 320 px with enlarged text. See `browser-results.json` and `preview-attempt.log`.

The repository-wide whitespace check reports an existing trailing blank line in `src/components/checkin/checkin-presentation.ts`, which this rollback does not change.

Native-device appearance, system text sizing, permissions and keyboard behavior require native verification; browser captures do not establish those behaviors. The inherited partial-workout progress-label issue identified in the October 11 review is outside this visual rollback.

The restored splash background in `app.json` takes effect in the next native build. The rest of the restored visual design is application source and takes effect on reload.

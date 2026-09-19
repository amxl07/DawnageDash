# Premium experience contract checkpoint

Approved redesign baseline: mobile source at `8ec16a7`, with planning snapshot `61fd7bd`. Implementation is isolated on `codex/mobile-premium-experience`. The original workspace's unrelated changes are preserved.

## Decisions retained during implementation

| Contract | Implementation decision |
| --- | --- |
| Check-in | Retain all 16 fields, labels, original order, required validation, enums and payload keys. Optional macros remain optional. Hidden workout performance serializes to null for No/Rest. |
| Number entry | Preserve the existing accepted bounds and rounding. Show an adjustment when normalization occurs; retain invalid text for correction. Commit focused values before submission. |
| Workout completion | Retain the existing policy. The proposed stricter reps/load/duration policy was not adopted as an unrequested coaching rule. |
| RPE | Retain the existing accepted input behavior. No new RPE scale or enforcement is introduced. |
| Workout content | Preserve V2 and legacy readers. Draft, revision, delivery and UI metadata never enter the workout content format. |
| Reporting date | Device-local calendar date, validated strictly. An active editor keeps its original reporting date through midnight. |
| Assignment progress | “Logged” means a corresponding saved V2 log exists. It does not assert that every prescribed set was completed. |
| Delivery | Acknowledged local draft, durable queued submission, blocked submission and remote acknowledgement are separate states. Retries are at least once. |
| Profile | Merge owned changes into the latest profile JSON, preserving unknown fields. Two-row assessment/profile writes are not atomic. An account-scoped local transaction journal retains the submitted profile values until the corresponding assessment synchronization is acknowledged; it is recovery data, separate from the 87-question assessment's server drafts. |
| Rest | Actual prescribed duration when supplied; otherwise an explicit user choice. Auto-start is opt-in, account/device scoped. |
| History | Show dated observations from available records. No invented baseline, score, all-time personal record or coach-read status. |

## Fixture and evidence boundaries

`src/testing/redesignFixtures.json` contains fictional Alex Morgan records only. The capture harness intercepts the fictional Supabase host in a temporary browser profile. Production routes have no fixture bypass.

The native gesture, keyboard, accessibility and performance checks require installed iOS/Android builds. Browser screenshots are layout evidence. Formative participant recruitment, the diary pilot, coach-web V2 reader/editor verification and progress-photo storage remediation remain separate release requirements.

## Compatibility handoff

Use `fixtureWorkoutContent` for both a legacy exercise array and a V2 object, including timed sets, warmup/work kinds, completed/incomplete sets and incomplete strings. Verify each supported coach-web reader **and editor** preserves the supported fields through a round trip. Mobile parsing tests cannot establish web-editor compatibility.

The existing progress-photo public-bucket and permanent-URL findings are recorded in `docs/ui-validation-matrix.md`. This redesign does not change storage policy or claim that UI disclosure resolves those findings.

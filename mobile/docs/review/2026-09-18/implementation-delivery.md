# Delivery boundary implementation

## Root cause and reproduced behavior

The installed `@supabase/postgrest-js` client converts a rejected fetch into a response envelope with outer `status: 0` and a nested error such as `TypeError: Network request failed`. Persistence adapters previously threw only the nested error, so delivery classification lost the transport status and blocked the outbox as `unknown`.

Check-in updates also used PostgREST's default `return=minimal` behavior. A PATCH matching zero rows therefore returned a normal 204 response, which the adapter treated as success and the outbox removed the durable intent.

Before implementation, the review harness reproduced:

- SDK offline response classified as `unknown`, save `blocked`, reconnect calls `0`.
- Zero-row check-in PATCH reported `synced`, retained queue length `0`.

## Implemented contract

- Delivery classification understands actual PostgREST response envelopes, including their outer HTTP/status-0 result, and the SDK's exact allowlisted wrapped transport messages.
- Explicit 401/403/409/400 status and recognized auth, permission, conflict, and validation provider codes take precedence over transport-looking message text.
- Status zero alone is not treated as transport. The installed SDK's allowlisted network/abort forms remain retryable; an arbitrary wrapped adapter exception remains blocked as `unknown`.
- Only transport, 429, 5xx, and the existing temporary PostgREST codes are retryable. Auth, permission, validation, conflict, and unknown failures remain nonretryable.
- Workout persistence now throws the complete SDK result on request errors so the classifier retains the outer status. Existing owned-ID acknowledgement behavior is unchanged.
- Check-in update and insert requests ask PostgREST to return `id,user_id`. Success requires the expected row identity and signed-in owner. Update filters include both row ID and owner.
- A zero-row or wrong-owner update is a blocked permission result, retaining the exact outbox payload. An insert with no returned ID is blocked as unknown; it is never acknowledged as synced.

## Focused verification

Command:

```sh
node --require /tmp/dawnage-premium-20260917/dependency-read-cache.cjs --max-old-space-size=768 node_modules/jest/bin/jest src/lib/delivery-errors.test.ts src/lib/asyncOutbox.test.ts src/features/checkin/persistence.test.ts --runInBand --watchman=false --testTimeout=60000
```

Result after the initial implementation: 3 suites passed, 41 tests passed, 0 snapshots, 245.651 seconds. This covered installed-SDK envelope classification, offline/reconnect delivery, the existing outbox state machine, and check-in adapter acknowledgement cases. An exact retained-intent assertion and workout outer-status regression were added afterward and still require the final focused rerun.

The original review harness is suitable as pre-fix evidence but assumes the offline item remains after flush. After the fix, reconnect empties the queue, so that old script exits while dereferencing the now-absent retained failure. The Jest regression asserts the corrected empty-queue outcome directly.

Review fixes also moved password-reset requests to `Linking.createURL('reset-password')`, so Expo Go and each installed app variant supply their active URL rather than always targeting production. Maestro check-in deep links derive `dawnage-dev`, `dawnage-preview`, or `dawnage` from an allowlisted installed app ID and stop on any other ID.

Focused review-fix command:

```sh
node --max-old-space-size=768 node_modules/jest/bin/jest src/lib/delivery-errors.test.ts src/lib/password-reset.test.ts src/__tests__/maestro-contract.test.ts --runInBand --watchman=false --testTimeout=60000
```

The first run exposed invalid YAML scalar quoting while the two TypeScript suites passed. After quoting the preflight script, the same command passed 3 suites and 30 tests in 16.862 seconds.

## Remaining verification

- Rerun the focused delivery suites after dependency installation completes.
- Run TypeScript checking and the repository-wide verification in integration.
- Live backend/RLS behavior remains outside this local injected-fetch test scope.

## Files

- `src/lib/delivery-errors.ts`
- `src/lib/delivery-errors.test.ts`
- `src/lib/workoutPersistence.ts`
- `src/lib/workoutPersistence.test.ts`
- `src/lib/asyncOutbox.test.ts`
- `src/features/checkin/persistence.ts`
- `src/features/checkin/persistence.test.ts`
- `src/lib/password-reset.ts`
- `src/lib/password-reset.test.ts`
- `app/(auth)/login.tsx`
- `.maestro/checkin-backfill.yaml`
- `.maestro/manual/checkin-offline-retention.yaml`
- `.maestro/manual/checkin-sync-recovery.yaml`
- `.maestro/README.md`
- `src/__tests__/maestro-contract.test.ts`


## Final integration handoff

The final source passed TypeScript, lint and iOS/Android/web export. The full mobile suite passed before the final persistence corrections; the affected regressions and reopening amendment then passed. The [release verification report](../../release/evidence/2026-09-19/README.md) supersedes earlier pending integration statements here and records precise scope, overlapping counts and external gates. No live migration or native-device validation is implied.

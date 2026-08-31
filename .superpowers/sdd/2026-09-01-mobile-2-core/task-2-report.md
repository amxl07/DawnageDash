# Task 2 Report: Domain contracts and repositories

## Delivered

- Added small, strict TypeScript domain contracts for summaries, meals, foods, nutrition, food entries, and food-entry inputs.
- Added Zod validation for every connected repository response used by this slice.
- Added `ApiError` with `network`, `http`, and `data-format` kinds plus HTTP status information.
- Added server URL normalization and policy validation: HTTPS everywhere, with development-only HTTP for localhost and private IPv4 LANs.
- Added injected-fetch connected repository support for daily summaries, food search, meal types, and food-entry creation. Requests send `Bearer` authorization and `X-Meal-Model-Version: 2`.
- Added deterministic, mutable per-instance demo data. Demo mutations alter only the owning repository instance.

## Test-first evidence

| Cycle | RED evidence | GREEN evidence |
| --- | --- | --- |
| URL policy | `npm test -- --runInBand src/data/__tests__/server-url.test.ts` failed because `@/data/server-url` did not exist. | The same command passed: 1 suite, 6 tests. |
| Connected repository | `npm test -- --runInBand src/data/__tests__/connected-fitness-repository.test.ts` failed because `@/data/connected-fitness-repository` did not exist. | The focused connected test passed after implementing the repository: 1 suite, 4 tests. |
| Demo repository | `npm test -- --runInBand src/data/__tests__/demo-fitness-repository.test.ts` failed because `@/data/demo-fitness-repository` did not exist. | The focused demo test passed after implementation: 1 suite, 2 tests. |
| Meal type methods | After removing the untested methods, focused tests failed with `TypeError: repository.getMealTypes is not a function`. | Reintroducing the minimal methods made the focused suite green. |

## Final verification

| Command | Result |
| --- | --- |
| `npm test -- --runInBand src/data/__tests__/server-url.test.ts src/data/__tests__/connected-fitness-repository.test.ts src/data/__tests__/demo-fitness-repository.test.ts` | Passed: 3 suites, 14 tests. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |

## Scope

Only Task 2 domain/data files, their focused tests, and this report are included. No files were imported or copied from `SparkyFitness/`.

## Concerns

- The binding spec defines compatible route paths and headers but not a canonical JSON payload schema. The Zod schemas therefore establish this slice’s explicit client contract and turn incompatible server payloads into `ApiError(kind: 'data-format')` rather than allowing unvalidated data into UI code.

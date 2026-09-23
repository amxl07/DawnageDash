# Account entry review — 2026-09-20

## Result

Task 1 now presents a single-step client signup with full name, email, and password. The screen uses the existing Dawnage wordmark, first-light glow, coral/pearl/slate theme tokens, shared controls, keyboard-safe scrolling, and reduced-motion-aware reveal.

Signup explains that coach assignment and program start are separate: a coach may connect later, and Day 1 begins only with the first submitted daily check-in. Phone number and country are deferred to the existing Profile editor.

When signup requires verification, the screen shows the submitted address, specific continuation instructions, a 60-second resend cooldown, an in-flight request lock, provider/rate-limit error copy, and a route back to account creation for a different address. That recovery retains name and email for editing, clears the submitted password, and explains that it starts a new account request rather than editing the pending account. Account fields and mode changes stay locked while authentication is in flight. This prevents overlapping requests from publishing competing Supabase sessions. Verification resend feedback is generation-guarded so a late response cannot replace the newer mode or apply feedback to a different email. Name, email, and password are non-editable while a submission owns the response, preventing the submitted address from diverging from a late successful response.

When Supabase returns an authenticated session from signup, the verification screen is skipped and the existing auth layout handles the redirect. Password reset still uses `requestPasswordReset`, its existing deep-link destination, and the existing reset route.

## Data-contract check

`plans/01-data-contracts.md` documents that the `public.users` row is created by `handle_new_user()` from auth metadata and that `phone_number` and `country` are nullable client fields. `app/(app)/profile.tsx` hydrates both with null-safe fallbacks and writes them from the Profile editor. The signup payload therefore keeps only `full_name` and `role: client`; no contact values are overwritten and no database or Supabase configuration changed.

## Files

- `app/(auth)/login.tsx`
- `src/features/auth/account-entry.ts`
- `src/features/auth/account-entry.test.ts`
- `src/features/auth/account-entry-screen.test.tsx`
- `src/__tests__/maestro-contract.test.ts` (stable signup-switch ID and source-shape-independent login assertion)

## Verification

- `npx jest --runInBand --runTestsByPath src/features/auth/account-entry.test.ts src/features/auth/account-entry-screen.test.tsx`: passed 2 suites / 13 tests before the final async-generation review additions.
- Direct Node runtime assertions for invalid-email short-circuiting, signup metadata, verification result, resend lock, and resend cooldown: passed.
- TypeScript `transpileModule` syntax checks for the login screen, helper, and both auth test files: passed.
- Direct stable-ID/login-source checks: passed.
- `npm run typecheck`: passed after the main implementation. A later rerun was interrupted because concurrent Jest/TypeScript processes entered macOS uninterruptible filesystem waits.
- `git diff --check -- "app/(auth)/login.tsx" src/features/auth src/__tests__/maestro-contract.test.ts`: passed.

## Remaining validation

The final async-generation and in-flight field-ownership regression tests, plus the stable signup-switch ID, still need a fresh Jest run once the concurrent filesystem stall clears. Focused ESLint also entered the same filesystem wait and produced no result. No live auth requests, Supabase writes, native/device verification, or new Metro process were used for this task.

The final shared verification results supersede the initial per-task checks above. No live auth requests or backend configuration changes were made.

Final integrated outcome: all relevant focused suites pass across the final runs, together with TypeScript, lint, UI contracts and diff checks. Source review has no outstanding findings. Visual/native acceptance remains open. See `../superpowers/plans/2026-09-20-guided-start-polish.md` for the evidence and next device checks.

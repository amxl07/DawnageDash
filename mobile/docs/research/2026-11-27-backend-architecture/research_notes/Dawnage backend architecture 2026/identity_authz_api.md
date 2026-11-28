# Identity, authorization and API surface: Dawnage on Supabase, current state vs late-2026 practice

How evidence is cited:
- **Repo evidence** is given as `path:line` from the repo root (`/Users/manojthomas/Documents/DAWNAGE/DawnageAIDash`).
- **"Live DB"** means a read-only catalog or aggregate query run through the Supabase MCP on project `hzifwkebzhzlxvigbcup` on 2026-11-27. Only SELECT and catalog queries were used, and no secrets or personal values are reproduced.
- **"Logs (24 h)"** means a Supabase MCP `query_logs` aggregate over the 24 hours ending 2026-11-27.
- **Web sources:** Supabase docs pages carry no date, so they are marked "accessed 2026-11-27". Anything older than 2025 is flagged.
- **Prior reviews:** these notes do not repeat findings already in `mobile/docs/review/2026-11-22-release-readiness/README.md` and `mobile/docs/review/2026-11-27-status-review/README.md`. Those include B1–B10, M1, M2, L2, the advisor counts, and "publishable key needed". They are referenced only where the design depends on them.

---

## Q1. How do the auth flows work today, which methods are on, how is the role decided, and what do the SECURITY DEFINER helpers do?

### Takeaway
Both apps use email and password only, through supabase-js with the default **implicit** flow. User JWTs are **HS256, signed by the legacy shared secret**, with a 1-hour lifetime. `public.users.role` is the authorization source. Since migration 06 it has been mirrored into **`raw_user_meta_data` (user_metadata), not app_metadata**, and both apps still route their UI on that user-editable field. The live data has already drifted once: one admin row has `coach` in metadata.

All authorization helpers sit in the exposed `public` schema. `is_admin()` and `is_coach_of()` are VOLATILE plpgsql functions that PUBLIC and anon can execute, which makes them per-row costs and callable RPC endpoints.

### Cited Findings

**Auth methods and configuration (live)**
- **Identities:** `auth.identities` holds only the `email` provider (154 identities). There are 154 auth users: 0 anonymous, 0 SSO, 152 with confirmed email. 2 auth users have no `public.users` row. (Live DB)
- **Logs (24 h):** 2 password logins, 33 `refresh_token` grants, and no other grant types. Every authenticated request carried a JWT with `amr = ["password"]` and a lifetime of 3,600 s. (Logs (24 h))
- **No PKCE or OAuth flows have run:** `auth.flow_state` has 0 rows. (Live DB)
- **No MFA:** there are 0 `auth.mfa_factors`, and all 784 `auth.sessions` are `aal1`. (Live DB)
- **No Postgres auth hooks:** no function name contains `hook`, and `supabase_auth_admin` holds no grants on `public` tables. HTTP hooks cannot be seen from the DB. (Live DB)
- **Signing keys:**
  - The project JWKS endpoint (`/auth/v1/.well-known/jwks.json`) returns **0 keys**. Every user JWT seen in the logs is `HS256`, and every request with an apikey used the legacy `anon` JWT key; 4 requests used `service_role`. (Live HTTP GET of the public JWKS, 2026-11-27; Logs (24 h))
  - Per the docs, JWKS excludes symmetric keys ([Supabase docs: self-hosted auth keys, accessed 2026-11-27](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys)), so 0 keys means the project still signs with the legacy shared secret.
- **API keys:** `get_publishable_keys` returns only the legacy `anon` key (type `legacy`, enabled). No `sb_publishable_…` key exists yet. (Supabase MCP, 2026-11-27)
- **Email confirmation is on:** mobile sign-up treats `data.session == null` as "verification required" (`mobile/src/features/auth/account-entry.ts:96-98`), and the web shows "check your email" (`client/src/pages/Login.tsx:145-151`). The 2 unconfirmed auth users fit this.

**Client setup**
- **Mobile** uses `createClient(url, anonKey, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`. There is no `flowType`, so the default `implicit` applies (`mobile/src/lib/supabase.ts:7-21`; auth-js default `flowType: 'implicit'` at `mobile/node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:24`). supabase-js is 2.112.4 on mobile and 2.79.0 on web (`mobile/node_modules/@supabase/supabase-js/package.json`, `node_modules/@supabase/supabase-js/package.json`).
- **Web** uses `persistSession`, `autoRefreshToken` and `detectSessionInUrl: true`, with an explicit `storageKey` (`client/src/lib/supabase.ts:14-21`). The env var is `VITE_SUPABASE_ANON_KEY` (`client/src/lib/supabase.ts:5`); on mobile it is `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`mobile/src/lib/env.ts:8`).

**Sign-up**
- **Mobile:** `auth.signUp({ email, password, options: { data: { full_name, role: 'client' } } })` (`mobile/src/features/auth/account-entry.ts:85-94`). There is no `emailRedirectTo` (known L2), and resend is gated client-side (`account-entry.ts:107-130`).
- **Web:** `signUp` sends `phone_number`, `country` and `role: isCoachSignup ? 'coach' : 'client'` in user_metadata (`client/src/pages/Login.tsx:133-145`). The coach "access key" is compared in the browser (`Login.tsx:126-129`; known B2).
- **Server side:** `handle_new_user()` (SECURITY DEFINER, `search_path=''`) always inserts `role='client'`. It records a coach request as `profile_data.requested_role='coach'` and rewrites `raw_user_meta_data.role` to `client` (live `pg_get_functiondef`; `sqlmigrationfiles/2026-11-22_06_admin_approved_coaches.sql:7-48`). It is attached as trigger `on_auth_user_created` on `auth.users`. (Live DB)

**Sign-in**
- `signInWithPassword` in mobile (`mobile/app/(auth)/login.tsx:97`) and web (`client/src/pages/Login.tsx:157`). There are no other methods.

**Password reset**
- **Web:** `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` (`client/src/pages/Login.tsx:101-103`). Recovery is detected from `type=recovery` in the URL hash (`client/src/contexts/AuthContext.tsx:33-39`), and the password is set with `updateUser({ password })` (`client/src/pages/ResetPassword.tsx:53`).
- **Mobile:** `resetPasswordForEmail(email, { redirectTo: Linking.createURL('reset-password') })` (`mobile/src/lib/password-reset.ts:11-15`). The reset screen **parses `access_token` and `refresh_token` from the deep-link fragment and calls `setSession`**, which is the implicit flow (`mobile/app/(auth)/reset-password.tsx:16-51`). A persisted `password-recovery-pending` flag resumes an interrupted reset (`mobile/src/contexts/AuthContext.tsx:13,39-43,58-71`). The password is set with `updateUser({ password })` (`reset-password.tsx:74`).

**Session refresh**
- **Mobile:** auto-refresh runs only while the app is in the foreground, using `AppState` (`mobile/src/lib/supabase.ts:51-66`). The offline outboxes call `refreshSession()` before retrying (`mobile/src/lib/outbox.ts:71`, `mobile/src/features/checkin/checkInOutbox.ts:61`). Corrupt refresh tokens are cleared (`supabase.ts:28-47`, `AuthContext.tsx:64-76`).
- **Web:** auto-refresh is on, and auth storage is cleared on errors and on `SIGNED_OUT` (`client/src/contexts/AuthContext.tsx:59-103`).
- **Docs:** access tokens default to 1 h, refresh tokens never expire but are single-use with a 10 s reuse interval, and reuse outside that window terminates the session ([Supabase docs: User sessions, accessed 2026-11-27](https://supabase.com/docs/guides/auth/sessions)).

**Sign-out**
- Both apps call `supabase.auth.signOut()` with no scope (`mobile/src/contexts/AuthContext.tsx:104`, `client/src/contexts/AuthContext.tsx:112`). The auth-js default is `{ scope: 'global' }`, and the supported scopes are `global | local | others` (`GoTrueClient.js:3405`, `lib/types.d.ts:1703`). Signing out on any device therefore revokes every session the user has.
- **Session hygiene (live):**
  - 784 sessions and 784 unrevoked refresh tokens for about 152 users.
  - Session age: median about 180 days, 90th percentile about 283 days, maximum about 337 days.
  - Only 71 sessions were refreshed in the last 30 days, and one user holds 184 sessions.
  - 0 sessions have `not_after`, so no time-box is configured.
  - Staff sessions: coaches 30, admins 5. (Live DB)
- **Account deletion:** Edge Function `delete-account` calls `admin.auth.getUser(token)`, then `admin.auth.admin.signOut(token,'global')`, then `deleteUser` (`supabase/functions/delete-account/index.ts:19-52`). It is deployed with `verify_jwt: true` (MCP `list_edge_functions`).

**How the role is decided**
- **Source of truth:** `public.users.role` (`client` 142, `coach` 7, `admin` 3; Live DB). Only admins can change it (`guard_users_privileged_columns` BEFORE INSERT/UPDATE trigger; `sqlmigrationfiles/2026-11-22_01_block_role_escalation.sql:35-62`, live). Admin approval of a coach writes `role='coach'` directly (`client/src/pages/AdminCoachesPage.tsx:101`).
- **Mirror:** an AFTER UPDATE OF role trigger, `sync_role_to_auth_metadata()`, writes `raw_user_meta_data.role`, which is **user_metadata** (`2026-11-22_06_admin_approved_coaches.sql:50-67`; live def). **0 users have `raw_app_meta_data.role`.** (Live DB)
- **Drift:** 1 user is `admin` in `users.role` but `coach` in user_metadata, the same drift B9 noted on 11-22 and still present. (Live DB)
- **UI routing reads `user_metadata.role` everywhere:**
  - Web: `client/src/App.tsx:46,186`; `client/src/pages/Plans.tsx:40-41`; `client/src/pages/TemplateBuilderPage.tsx:54`; `client/src/hooks/useTemplates.ts:60`; `client/src/pages/WorkoutLogs.tsx:25`; `client/src/components/QuestionnaireWizard.tsx:244`; `client/src/components/CoachSidebar.tsx:31`; `client/src/components/AppSidebar.tsx:35`.
  - Mobile: `mobile/src/contexts/AuthContext.tsx:122-124`, feeding `mobile/src/features/onboarding/routing.ts:9-10`.
- Both apps also write `user_metadata.full_name` with `updateUser({ data: { full_name } })` (`mobile/app/(app)/profile.tsx:229`, `client/src/pages/Profile.tsx:137`).
- Supabase says `raw_user_meta_data` "can be updated by the authenticated user" and is "not a good place to store authorization data", while `raw_app_meta_data` cannot be changed by the user ([Supabase docs: Row Level Security, accessed 2026-11-27](https://supabase.com/docs/guides/database/postgres/row-level-security)).

**SECURITY DEFINER helpers (all in schema `public`; live `pg_proc`)**

| Function | Lang / volatility | search_path | EXECUTE granted to | What it does | Used by |
|---|---|---|---|---|---|
| `is_admin()` | plpgsql **VOLATILE** | `''` | **PUBLIC, anon**, authenticated, service_role | `(select role from public.users where id = auth.uid()) = 'admin'` | 22 policies across 13 tables (unwrapped, `TO public`) plus `progress_photo_can_read` and the guard trigger |
| `is_coach_of(uuid)` | plpgsql **VOLATILE** | `''` | **PUBLIC, anon**, authenticated, service_role | `exists(select 1 from public.users where id = target and coach_id = auth.uid())` | 12 policies (body_measurements, daily_check_ins, meal_plans ×2, user_goals, weekly_progress_photos, workout_logs ×4, workout_plans ×2) |
| `is_coach()` | sql STABLE | `''` | authenticated, service_role | role in ('coach','admin') | 2 `users` policies (`(select auth.uid())` already wrapped) |
| `get_my_coach()` | sql STABLE | **`public`** | **anon**, authenticated, service_role | returns the coach's id, full_name, avatar_url | the only `.rpc()` in either app (`mobile/src/hooks/useCoach.ts:44`) |
| `progress_photo_can_read(text)` | sql STABLE | `''` | authenticated | owner, or coach of the folder owner, or admin | storage SELECT policy on `progress_photos` |
| `handle_new_user`, `guard_users_privileged_columns`, `sync_role_to_auth_metadata`, `auto_set_package_start_date` | plpgsql (trigger) | `''` | postgres, service_role | trigger bodies | triggers |

- Not every policy uses the helpers. Some coach checks are inline subqueries:
  - `onboarding_questionnaire`: `EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND users.coach_id = auth.uid())`
  - `weekly_check_ins`: `auth.uid() IN (SELECT coach_id FROM users WHERE users.id = weekly_check_ins.user_id)`
  - The 4 finance tables use inline `EXISTS (… users.role = 'admin')`.
  - The template policies use an inline `(SELECT users.can_edit_global_templates FROM users WHERE users.id = auth.uid())`.
  (Live `pg_policies`)
- Supabase warns never to create a SECURITY DEFINER function "in a schema listed under 'Exposed schemas'" ([Supabase docs: Row Level Security, accessed 2026-11-27](https://supabase.com/docs/guides/database/postgres/row-level-security)).

**Legacy server**
- `server/` is the unused Express template. `server/routes.ts:4-7` registers no routes. Vercel runs only `vite build` and serves the SPA through rewrites (`vercel.json`, `package.json:8`). `server/` exists only behind `npm run dev` / `build:full` (`package.json:7,9`) and has no API role.

### Inferences
- **Role spoofing is UI-only, but it still matters.**
  - A client can call `supabase.auth.updateUser({ data: { role: 'admin' } })` and the dashboard will render admin routes, because `App.tsx:46` routes on user_metadata.
  - Data access is still blocked, because RLS checks `users.role` through `is_admin()`/`is_coach()`.
  - Supporting a user-editable field takes a trigger mirror that has already drifted (1 admin routed as coach), and the fix is the same either way: route on a tamper-proof claim.
- **`is_admin()` and `is_coach_of()` are executable by `anon`** and live in the exposed `public` schema. They are therefore reachable as `POST /rest/v1/rpc/is_admin` and `/rpc/is_coach_of`. The data leaked is trivial: `is_coach_of(any_uuid)` lets a signed-in coach test whether a uuid is their client. Being VOLATILE plpgsql, they cannot be inlined, and they run per candidate row unless wrapped in `(select …)`. `is_coach_of(user_id)` depends on the row, so wrapping cannot cache it.
- **Implicit-flow risk on mobile.** The reset deep link carries live tokens in a custom-scheme URL fragment (`dawnage://reset-password#access_token=…`). PKCE (`flowType: 'pkce'`, `exchangeCodeForSession`) would make an intercepted link useless without the on-device code verifier. `flow_state = 0` confirms PKCE has never run. This is an inference: no source was fetched on Supabase's current RN deep-link recommendation.
- **Default global sign-out.** A client who signs out on a phone also kills their web session. A coach who signs out in one browser kills all their browsers. For staff, the useful control is the opposite, `scope: 'others'`, run after sign-in (see Q6).
- **Stale sessions are a standing risk.** About 713 sessions have not refreshed in 30 days but still hold valid, never-expiring refresh tokens. A leaked device backup or old browser profile is therefore a live credential indefinitely.

### Gaps
- The auth server config could not be read with the available MCP tools: password minimum length, "confirm email", secure password change, OTP expiry and the redirect allow-list. The 1 h JWT expiry was inferred from token `exp - iat` in the logs.
- The 2 auth users without a `public.users` row were not investigated. They are possibly the 2 unconfirmed sign-ups, or rows deleted by hand.
- Whether HTTP auth hooks are configured is unknown, since they are not visible from SQL. No Postgres hook exists.

---

## Q2. Should role and the coach relationship move into JWT claims through a Custom Access Token Hook, and what are the late-2026 facts on JWKS, `getClaims()`, publishable/secret keys and legacy-key retirement, with exact migration steps for this project?

### Takeaway
Put **only the app role** into the token, and leave the **coach↔client relationship out**.

The cheapest tamper-proof route here is to change the existing mirror trigger to also write `raw_app_meta_data.role`. That claim is in every JWT and in `session.user.app_metadata`, so it is available offline on mobile. A Custom Access Token Hook gives the same result and is only worth it if claims become multi-table or need shaping. Either way, RLS should keep using a cached DB lookup, so that demotion takes effect immediately.

On keys, the project has not started any of the migrations: there is no publishable key, JWKS is empty and signing is HS256. Supabase says the legacy keys "keep working until the end of 2026", with the final date "TBC". The first store build must ship the `sb_publishable_…` key, and `delete-account` must drop `verify_jwt` before the signing-key rotation.

### Cited Findings
**Custom Access Token Hook**
- The hook "runs before a token is issued" and can add claims. The required claims are `iss, aud, exp, iat, sub, role, aal, session_id, email, phone, is_anonymous`. Inputs include `authentication_method` (for example `password`, `token_refresh`, `anonymous`). The hook can also reject issuance by returning `{ error: { http_code, message } }` ([Supabase docs: Custom Access Token Hook, accessed 2026-11-27](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)).
- The RBAC guide's hook reads a `user_roles` table. It needs `grant execute … to supabase_auth_admin`, `revoke … from authenticated, anon, public`, and an RLS policy `for select to supabase_auth_admin using (true)`. The guide notes the hook "will only modify the access token JWT but not the auth response", so clients must decode the access token to read the claim ([Supabase docs: Custom Claims & RBAC, accessed 2026-11-27](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac)).
- **Freshness:** a JWT is not always current, so changes to `app_metadata` are not reflected in `auth.jwt()` until the token refreshes ([Supabase docs: Row Level Security, accessed 2026-11-27](https://supabase.com/docs/guides/database/postgres/row-level-security)).
- **Token lifetime:** access tokens are "usually between 5 minutes and 1 hour", with 1 h as the default. A signed-out access token stays usable until it expires, unless the code checks that `session_id` still exists in `auth.sessions` ([Supabase docs: User sessions, accessed 2026-11-27](https://supabase.com/docs/guides/auth/sessions)). The live lifetime is 3,600 s (Logs (24 h)).

**JWT signing keys and `getClaims()`**
- **Timeline:** "Starting October 1, 2025, all new projects will use asymmetric JWTs by default." Reminders about the new API keys began on 1 Nov 2025. "Late 2026, TBC": all projects "will be required to move away from `anon` and `service_role` keys" ([Supabase blog: Introducing JWT Signing Keys, 2025-07-14](https://supabase.com/blog/jwt-signing-keys)).
- **`getClaims()` with asymmetric keys** verifies locally through WebCrypto. With symmetric keys it still calls the Auth server. The JWKS lives at `/auth/v1/.well-known/jwks.json` ([same blog, 2025-07-14](https://supabase.com/blog/jwt-signing-keys)).
- **Migration path:** "Migrate JWT secret" imports the legacy secret and creates a standby asymmetric key. "Rotate keys" starts signing new tokens with it, and "non-expired access tokens will remain to be accepted, so no users will be forcefully signed out." Revoke the legacy secret only after "1 hour and 15 minutes" for a 1 h expiry. Edge Functions with the "Verify JWT" setting "might break" and must turn it off and use `getClaims()` ([Supabase docs: JWT Signing Keys, accessed 2026-11-27](https://supabase.com/docs/guides/auth/signing-keys)).
- **Installed auth-js 2.112.4 behaviour:** `getClaims()` falls back to `getUser()` (a network call) when the token is HS*, has no `kid`, or `globalThis.crypto.subtle` is missing (`mobile/node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:5355-5372`). In Hermes/React Native without a WebCrypto polyfill, `getClaims()` therefore stays a network call even after rotation. That last point is an inference about the runtime and was not tested on device.

**Publishable and secret keys; legacy retirement**
- "The legacy `anon` and `service_role` keys keep working until the end of 2026." Both key types work at the same time. `anon` maps to the publishable key for "Browsers, mobile and desktop apps"; `service_role` maps to the secret key for "Servers, Edge Functions" ([Supabase docs: Migrating to publishable and secret API keys, accessed 2026-11-27](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
- **Steps in the same doc:**
  1. Create keys. This "adds a publishable key and a secret key alongside" the legacy keys.
  2. Swap the publishable key into clients.
  3. Swap the secret key into backends.
  4. Edge Functions read `SUPABASE_SECRET_KEYS` / `SUPABASE_PUBLISHABLE_KEYS`, which are JSON objects keyed by name such as `default`. "The platform's built-in `verify_jwt` check only understands the legacy JWT-based keys, so set `verify_jwt = false` … and authorize the request in your own code, or let the `@supabase/server` SDK do it" (`withSupabase({ auth: 'user' })`).
  5. Verify that nothing uses legacy keys. "There's no automatic usage indicator", and the doc lists "Mobile or desktop app versions already in users' hands".
  6. Deactivate legacy keys. This is "reversible".
- **Known limitations:** new keys cannot go in `Authorization: Bearer`, and secret keys return 401 when used from a browser (matched on User-Agent) ([same doc](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
- I found no official page with an exact shutdown day. The docs say "end of 2026" and the blog says "Late 2026, TBC" ([Supabase blog, 2025-07-14](https://supabase.com/blog/jwt-signing-keys); [migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)). A community thread also exists ([GitHub discussion #40300](https://github.com/orgs/supabase/discussions/40300), not fetched).
- **Project state:**
  - The only key is the legacy `anon` (MCP `get_publishable_keys`), JWKS has 0 keys, and all traffic uses HS256 JWTs with legacy apikeys (Logs (24 h)).
  - `delete-account` has `verify_jwt: true` and reads `SUPABASE_SERVICE_ROLE_KEY` (`supabase/functions/delete-account/index.ts:19`).
  - No `pg_net` extension is installed, so there are no DB webhooks to migrate (Live DB extensions: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault).
  - The only EAS build ever made is an internal Android preview from 2026-09-19 (status review R3), so **no store binary carries the legacy key yet**.
- **Usage can be measured:** edge logs record `request.sb.jwt.apikey.payload.role` for JWT-style apikeys and `request.sb.apikey.apikey.prefix` for new-style keys. Both fields appear in this project's `edge_logs` (Logs (24 h), field inventory). This contradicts "no automatic usage indicator" in spirit: no dashboard indicator exists, but the logs can be queried.

### Inferences
**Where each claim should live**

| Claim | Put in JWT? | Why |
|---|---|---|
| `app_role` (client/coach/admin) | **Yes, for UI routing and coarse gating only.** | It is tamper-proof, available offline from the persisted session (the mobile gate runs at cold start), and changes rarely (10 staff). RLS for admin-only data keeps the DB check, so demotion works immediately. |
| coach→clients list | **No** | The list is unbounded and changes on every claim or unassign. A removed coach would keep reading the client for up to 1 h. Every request carries the JWT. A cached DB lookup (`private.my_client_ids()`, see Q3) costs one index scan per statement. |
| `aal` | Already present | Used for staff MFA gating (Q6). |

- **Lazier mechanism: extend the existing trigger** instead of adding a hook. Sign-ups are always `client`, so a missing claim on the first token after sign-up still routes correctly if apps default a missing claim to `client`.
  ```sql
  create or replace function public.sync_role_to_auth_metadata() returns trigger
  language plpgsql security definer set search_path = '' as $$
  begin
    update auth.users set
      raw_app_meta_data  = coalesce(raw_app_meta_data,  '{}'::jsonb) || jsonb_build_object('role', new.role),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role) -- keep until web routes on app_metadata
    where id = new.id;
    return new;
  end $$;
  -- one-time backfill (152 rows), also fixes the 1 drifted admin
  update auth.users a set raw_app_meta_data = coalesce(a.raw_app_meta_data,'{}'::jsonb) || jsonb_build_object('role', u.role)
  from public.users u where u.id = a.id;
  ```
  Clients then read `session.user.app_metadata.role` (web: `App.tsx:46` and the 8 other sites; mobile: `AuthContext.tsx:122`).
- **When a hook is worth it instead.** Use the hook if you need claims computed at issuance from several tables, a minimal token, or the ability to refuse issuance (for example, blocking staff tokens that come from the mobile client). Sketch:
  ```sql
  create or replace function private.custom_access_token_hook(event jsonb) returns jsonb
  language sql stable set search_path = '' as $$
    select jsonb_set(event, '{claims,app_role}', to_jsonb(coalesce(
      (select u.role from public.users u where u.id = (event->>'user_id')::uuid), 'client')))
  $$;
  grant usage on schema private to supabase_auth_admin;
  grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
  revoke execute on function private.custom_access_token_hook(jsonb) from public, anon, authenticated;
  grant select (id, role) on public.users to supabase_auth_admin;
  create policy users_read_for_auth_hook on public.users for select to supabase_auth_admin using (true);
  ```
  Cost: one PK lookup on every token issuance (about 33 refreshes/day today). A hook error means sign-in and refresh fail, so it must never throw.
- **Freshness policy.** UI role staleness is ≤ 1 h, which is acceptable. When an admin demotes someone, revoke that user's sessions (the user is signed out within ≤ 1 h). RLS on finance and admin tables keeps `(select private.is_admin())` against `users.role`, so data access ends at once.

**Exact key migration for this project (ordered; each step reversible)**
1. **Dashboard → Settings → API Keys → "Create new API keys".** This creates `default` publishable and secret keys. Legacy keys keep working.
2. **Web:** put the `sb_publishable_…` value into `VITE_SUPABASE_ANON_KEY` on Vercel (Production and Preview), redeploy, and rename the variable later. Bump web supabase-js from 2.79.0 toward mobile's 2.112.x first, so the client handles non-JWT keys correctly. The web is force-updated on deploy.
3. **Mobile:** put the publishable value into `EXPO_PUBLIC_SUPABASE_ANON_KEY` for EAS `production` and `preview` (the production env currently lacks it; status review R2). Ship **build 1 to stores with the publishable key only**. Never ship the `eyJ…` key to a store. The un-force-updatable population with the legacy key is 0 today, and this step keeps it at 0.
4. **`delete-account`:** redeploy with `verify_jwt = false`. Authorize in code with `withSupabase({ auth: 'user' })` from `npm:@supabase/server`, or with `createClient(...).auth.getClaims(token)`. Build the admin client from `JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS'))['default']`. Do this before step 6.
5. **Measure for 7 days** with this query; the target is 0 rows apart from your own tooling:
   ```sql
   select log_attributes['request.sb.jwt.apikey.payload.role'] r, count() from logs
   where source='edge_logs' and log_attributes['request.sb.jwt.apikey.payload.role'] in ('anon','service_role') group by r
   ```
   Also retire the internal 2026-09-19 Android preview build.
6. **Dashboard → JWT Keys → "Migrate JWT secret", then "Rotate keys".** The asymmetric key becomes current. Existing tokens are still accepted and nobody is signed out. Web `getClaims()` then verifies locally, and RN `getClaims()` keeps falling back to `getUser()`.
7. **Deactivate the legacy `anon` and `service_role` keys** (reversible).
8. **Revoke the legacy JWT secret** only after step 7 and at least 1 h 15 m after step 6. The legacy API keys are themselves JWTs signed with that secret, so revoking it earlier breaks any legacy-key caller.

Deadline: steps 1–5 should be done before 2026-12-31, because Supabase has not published a firmer date.

### Gaps
- Whether a Postgres hook function may live in a non-`public` schema such as `private` (the docs examples use `public`) was not verified.
- Whether supabase-js 2.79.0 (web) handles `sb_publishable_…` keys without sending them as Bearer when signed out was not verified. The bump in step 2 sidesteps this.
- Whether Supabase will extend the "end of 2026" legacy-key window is unknown. No official date or extension was found.
- Whether trigger-written `raw_app_meta_data` appears in the very first token GoTrue issues after sign-up (trigger timing) was not verified. It is harmless here because new users are always `client`.

---

## Q3. What should the target RLS policy architecture be, based on the live `pg_policies`, and what will it change?

### Takeaway
There are 92 live policies on 19 API tables. 85 of them are `TO public`, which includes anon, and every common table has 2–4 overlapping permissive SELECT policies. Coach access goes through an uncacheable per-row `is_coach_of(user_id)`.

The target is about 46 policies, one per (table, command) for `authenticated`. They should be built on three STABLE SECURITY DEFINER helpers in an unexposed `private` schema: `is_admin()`, `my_client_ids()` and `can_edit_global_templates()`. Each should be wrapped as an initPlan, and `users(coach_id)` needs an index.

At 152 users, the gain is correctness and headroom more than speed. The main change in behaviour: coach list queries go from O(rows × function call) to O(clients) index probes.

### Cited Findings
**Live inventory (Live DB `pg_policies`, `pg_class`, grants)**
- 92 policies in `public`. 85 are `{public}` and 7 are `{authenticated}`. Per table:

  | Table | Policies |
  |---|---|
  | users | 9 |
  | workout_logs | 9 |
  | daily_check_ins | 8 |
  | workout_plans | 8 |
  | meal_plans | 8 |
  | user_goals | 7 |
  | body_measurements | 6 |
  | meal_templates | 6 |
  | workout_templates | 6 |
  | weekly_check_ins | 5 |
  | progress_photos | 5 |
  | onboarding_questionnaire | 4 |
  | coach_client_history | 3 |
  | weekly_progress_photos | 3 |
  | food_items | 1 |
  | each of the 4 finance tables | 1 |

  There are also 4 storage policies, all `TO authenticated` and correctly wrapped.
- **Duplicates and overlaps:**
  - `daily_check_ins` has two identical INSERT policies ("check-ins" and "checkins") and two identical UPDATE policies.
  - `users` has two identical self-SELECT and two identical self-UPDATE policies.
  - `workout_logs` has three SELECT policies (owner; owner-or-coach; admin), two INSERT, two UPDATE and two DELETE.
  - `workout_plans` and `meal_plans` each combine an `ALL` policy with owner-only per-command policies and an admin `ALL`.
- **Anon exposure:**
  - The templates policy "Anyone can read global workout/meal templates" is `TO public USING (coach_id IS NULL)`.
  - anon holds `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` on **all 19** API tables.
  - So **anon can read every global workout template (about 171 rows) and meal template (about 27 rows)** with the key shipped in the app. This is inferred from policy, grant and RLS state; no request was made.
- **Default privileges still auto-expose:** `pg_default_acl` for schema `public` still grants anon and authenticated `arwdDxtm` on new tables and `X` on new functions (roles postgres and supabase_admin). This contradicts the 22-Nov review's statement that new tables are no longer auto-exposed since 2026-10-30. Either the setting is still on for this project or the rollout has not reached it (Live DB).
- **Legacy tables with no code path:** `user_goals` (7 policies) and the `progress_photos` table (5 policies) have no reads or writes in `client/src`, `mobile/src` or `mobile/app`. They are referenced only in `shared/schema.ts` (repo grep). Both report `reltuples = -1`, meaning never analysed (Live DB).
- **Indexes:**
  - Every client-owned table has a btree index led by `user_id`, and `daily_check_ins`, `body_measurements`, `weekly_progress_photos` and `weekly_check_ins` have unique `(user_id, date|week)` indexes.
  - **`users` has only its PK, with no `coach_id` index** (Live DB).
  - The templates have `coach_id` indexes.
- **Measured cost (pg_stat_statements, authenticated/anon/authenticator):**
  - A dashboard-shaped `daily_check_ins` SELECT with explicit columns: 1,783 calls, mean **22.3 ms**.
  - The owner `daily_check_ins.*` SELECT filtered by `user_id`: 9,211 calls, mean **4.0 ms**.
  - The `workout_logs` insert: mean 33.9 ms. The `daily_check_ins` insert: mean 18.6 ms.
  - The largest DB-time consumer is PostgREST schema-cache introspection: `pg_timezone_names` and type queries, about 2,532 reloads, about 836 s total.

**Supabase guidance (2026 docs)**
- **Index policy columns.** Wrap functions as `(select auth.uid())` so the result is cached per statement. Use security-definer functions with `search_path = ''` for lookups in other tables, never in an exposed schema. Use `TO` to name roles, because without it a policy applies to `public`, including `anon` ([Supabase docs: Row Level Security, accessed 2026-11-27](https://supabase.com/docs/guides/database/postgres/row-level-security)).
- **Benchmarks** ([Supabase troubleshooting: RLS performance and best practices, undated](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)). The page is undated, and these benchmarks likely predate 2025, so treat them as relative and possibly stale:

  | Change | Before | After |
  |---|---|---|
  | Add an index | 171 ms | < 0.1 ms |
  | Wrap `auth.uid()` | 179 ms | 9 ms |
  | Wrap `is_admin()` | 11,000 ms | 7 ms |
  | Wrapped security-definer `has_role()` | 178,000 ms | 12 ms |
  | Wrapped array-returning `user_teams()` | 173,000 ms | 16 ms |
  | Minimise joins | 9,000 ms | 20 ms |
  | `TO authenticated` (affects anon only) | 170 ms | < 0.1 ms |

  The faster join form is `team_id in (select team_id from team_user where user_id = auth.uid())`, rather than correlating on the row.
- **Restrictive vs permissive.** Permissive policies are OR'd, so cross-cutting rules (MFA, anonymous) need `AS RESTRICTIVE` ([Supabase docs: MFA](https://supabase.com/docs/guides/auth/auth-mfa); [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), both accessed 2026-11-27).
- **Grants plus RLS.** "Grants control whether a role can access an object. RLS controls which rows." The page recommends revoking default privileges and granting explicitly, a dedicated `api` schema, and keeping internal helpers in unexposed schemas ([Supabase docs: Securing your API, accessed 2026-11-27](https://supabase.com/docs/guides/api/hardening-data-api)).

### Inferences
**Target helpers (one migration; `private` is not in exposed schemas)**
```sql
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;          -- policies run as the caller

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select u.role = 'admin' from public.users u where u.id = (select auth.uid())), false)
$$;
create or replace function private.is_coach() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select u.role in ('coach','admin') from public.users u where u.id = (select auth.uid())), false)
$$;
create or replace function private.my_client_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select u.id from public.users u where u.coach_id = (select auth.uid())
$$;
create or replace function private.can_edit_global_templates() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select u.role = 'admin' or u.can_edit_global_templates
                   from public.users u where u.id = (select auth.uid())), false)
$$;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

create index concurrently if not exists users_coach_id_idx on public.users (coach_id);  -- run outside the txn
-- after policies are swapped: drop function public.is_admin(), public.is_coach_of(uuid), public.is_coach();
-- move get_my_coach into the API schema (Q5) with search_path = '' and no anon EXECUTE.
```

**Policy template, client-owned data** (`daily_check_ins`, `body_measurements`, `workout_logs`, `weekly_progress_photos`, `weekly_check_ins`, `onboarding_questionnaire`):
```sql
-- drop all existing policies on the table in the same transaction, then:
create policy sel on public.daily_check_ins for select to authenticated using (
  user_id = (select auth.uid())
  or user_id = any (array(select private.my_client_ids()))   -- initPlan: evaluated once per statement
  or (select private.is_admin()) );
create policy ins on public.daily_check_ins for insert to authenticated
  with check ( user_id = (select auth.uid()) );
create policy upd on public.daily_check_ins for update to authenticated
  using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
create policy del on public.daily_check_ins for delete to authenticated
  using ( user_id = (select auth.uid()) );
```
For `workout_logs`, coaches can write today (`is_coach_of` on I/U/D), so use the SELECT predicate without the admin branch for I/U/D as well.

**Coach-authored data** (`workout_plans`, `meal_plans`). This closes M1 without a separate fix:
```sql
create policy sel on public.workout_plans for select to authenticated using (
  user_id = (select auth.uid()) or user_id = any (array(select private.my_client_ids())) or (select private.is_admin()) );
create policy ins on public.workout_plans for insert to authenticated with check (
  user_id = any (array(select private.my_client_ids())) or (select private.is_admin()) );
-- upd (using + with check) and del: same predicate as ins
```

**`users`:**
```sql
create policy sel on public.users for select to authenticated using (
  id = (select auth.uid()) or coach_id = (select auth.uid()) or (select private.is_admin()) );
create policy upd on public.users for update to authenticated
  using ( id = (select auth.uid()) or coach_id = (select auth.uid()) or (select private.is_admin()) )
  with check ( id = (select auth.uid()) or coach_id = (select auth.uid()) or (select private.is_admin()) );
-- no INSERT policy: rows come from handle_new_user(); claim/unassign move to RPCs (Q4)
```
- Unassigned-client discovery moves to an RPC that returns only `id, full_name, created_at`. Today any coach can read every unassigned client's full row, including email, phone and `profile_data`.
- Column-level protection for coach and client writes stays in the existing guard trigger, extended per M2 (already recorded).

**Templates:**
```sql
create policy sel on public.workout_templates for select to authenticated using (
  coach_id is null or coach_id = (select auth.uid()) or (select private.is_admin()) );
create policy ins on public.workout_templates for insert to authenticated with check (
  coach_id = (select auth.uid()) or (coach_id is null and (select private.can_edit_global_templates())) );
-- upd/del: same predicate in USING (+ WITH CHECK on upd)
```

**Finance tables:** one `for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))` each.

**Grants hygiene, in the same migration:**
```sql
revoke all on all tables in schema public from anon;                 -- no anon use in either app
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke all on public.user_goals, public.progress_photos from authenticated;   -- no code path; keep data
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
```
Grant per table from then on. This matches Supabase's 2026 default ([changelog #45329, 2026-04-28](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)).

**Count and impact estimate**

| Table | Live | Target |
|---|---|---|
| users | 9 | 2 |
| daily_check_ins | 8 | 4 |
| body_measurements | 6 | 4 |
| workout_logs | 9 | 4 |
| workout_plans | 8 | 4 |
| meal_plans | 8 | 4 |
| weekly_check_ins | 5 | 3 |
| weekly_progress_photos | 3 | 4 |
| onboarding_questionnaire | 4 | 3 |
| workout_templates | 6 | 4 |
| meal_templates | 6 | 4 |
| coach_client_history | 3 | 1 (SELECT only; inserts by trigger, Q4) |
| finance (4 tables) | 4 | 4 |
| food_items | 1 | 1 |
| user_goals + progress_photos | 12 | 0 |
| **Total** | **92** | **≈46** |

- **Advisor effect:** the `multiple_permissive_policies` and `auth_rls_initplan` lints should drop to about 0. One permissive policy per (role, command) is exactly that lint's condition.
- **Runtime:**
  - The owner path is already cheap (4 ms mean).
  - Coach paths today evaluate `is_coach_of()` (a VOLATILE plpgsql call plus a `users` PK probe) for each candidate row, OR'd with 2–3 other SELECT policies. Over 2,094 `daily_check_ins` and 938 `workout_logs` rows, a coach list scan pays that per row.
  - With `= any(array(select private.my_client_ids()))` the client set is computed once. The planner can then use `idx_*_user_id`.
  - Expectation: coach list queries fall from about 22 ms to roughly the owner-query range of about 4–8 ms (about 60–80%). Admin queries drop the 22 unwrapped `is_admin()` calls per statement.
  - This is an estimate. Confirm with `EXPLAIN (ANALYZE, BUFFERS)` under `set local role authenticated; set local request.jwt.claims = '{"sub":"<coach uuid>","role":"authenticated"}'` on a branch before and after.
- **Growth headroom:** the per-row pattern grows with rows × policies, while the target grows with the number of clients. Supabase's benchmark ratios (seconds → tens of ms at about 100k rows) indicate the per-row design becomes user-visible long before 100k check-ins. That is the right reason to fix it now, while the policy set is small and no store build depends on it.
- **Bigger DB-time sink:** PostgREST schema-cache reloads (about 836 s) outweigh every policy-bound query combined. Avoid unnecessary DDL churn and `NOTIFY pgrst` loops. Adding versioned API schemas (Q5) adds a little introspection per reload; that cost is negligible at this size.

### Gaps
- No live `EXPLAIN ANALYZE` was run under an impersonated coach role, to stay strictly read-only. The 60–80% figure is a projection, not a measurement.
- Whether the 2026-10-30 "not auto-exposed" enforcement was meant to rewrite `pg_default_acl` in existing projects, or works only through a dashboard toggle, was not verified. The live ACL still auto-grants.
- The advisor counts were not re-fetched, per instructions.

---

## Q4. Where should business logic live, and what is the full write-path inventory?

### Takeaway
There are 93 write call sites: 75 in the dashboard, 15 in mobile and 3 in shared. All but one go straight to PostgREST tables. The only RPC is `get_my_coach`, and the only Edge Function is `delete-account`. The dashboard also invokes a `send-welcome-email` function that **is not deployed**.

Anything that is multi-step, concurrency-sensitive or idempotency-sensitive should become a SECURITY INVOKER Postgres function in the versioned API schema (Q5). That covers check-in, workout, measurement and photo saves, weekly submit, the profile and assessment CAS merges, coach claim and unassign, and plan assignment. Audit-like side effects belong in triggers: coach history, package start date and role mirror. Secret-key or third-party work belongs in Edge Functions: delete, invite, email, push. Single-row CRUD under RLS can stay direct.

### Cited Findings
**Inventory method:** a script resolved each `.insert/.update/.upsert/.delete/.rpc/storage/functions.invoke` call to its nearest `.from('<table>')` across `client/src`, `mobile/src`, `mobile/app`, `shared` and `supabase/functions`. Tests and `Set/Map.delete` were excluded (repo). The tables below list each site, its current behaviour, and the target placement.

**Mobile app (cannot be force-updated, so these define the long-lived contract)**

| # | Site | Table / API | Current pattern | Target |
|---|---|---|---|---|
| M-a | `mobile/src/features/checkin/persistence.ts:24-56` | daily_check_ins | SELECT id, then UPDATE or INSERT (2–3 round trips; races between web and app) | **RPC** `save_check_in`, an upsert on the existing unique `(user_id,date)` |
| M-b | `persistence.ts:66-75` | users.package_start_date | read, then a conditional UPDATE "fallback for the DB trigger" | **Delete**. Trigger `trg_auto_set_start_date` AFTER INSERT on daily_check_ins exists (Live DB) |
| M-c | `mobile/src/lib/workoutPersistence.ts:22-71` | workout_logs | find-by-date, then update or insert; the comment says "Concurrent-device uniqueness requires a server contract" (`:52`) | **RPC** `save_workout_log(p_client_mutation_id uuid, …)` with `unique(user_id, client_mutation_id)` |
| M-d | `mobile/src/hooks/useMeasurements.ts:58,62` | body_measurements | update or insert | **RPC** upsert (unique exists) |
| M-e | `mobile/src/hooks/useProgressPhotos.ts:64-65` | weekly_progress_photos | update or insert | **RPC** upsert, with the photo-path regex validated server-side |
| M-f | `mobile/src/lib/photos.ts:70` | storage upload | Storage RLS checks the folder (Live DB storage policies) | **Keep direct** (Storage API, unaffected by Data-API versioning) |
| M-g | `mobile/src/features/weekly/useWeeklyFeedbackController.ts:368` | weekly_check_ins | INSERT | **RPC** `submit_weekly_check_in`, idempotent on `(user_id, week_start_date)` (fixes L1) |
| M-h | `mobile/src/hooks/useOnboarding.ts:31`, `mobile/src/features/onboarding/useSetupController.ts:50` | users.onboarding_step | UPDATE | **RPC** `advance_onboarding(step)` using `greatest()` (monotonic), or direct under the column guard |
| M-i | `shared/profile-save.ts:12-34` (mobile and web) | users (full_name, phone_number, country, profile_data jsonb) | client CAS loop: read, shallow-merge (`mergeAnswers(...,false)` = `{...latest, ...patch}`, `shared/questionnaire.ts:82-86`), conditional UPDATE `eq(profile_data, JSON.stringify(latest))`, retry ×3 | **RPC** `save_profile`: `profile_data = coalesce(profile_data,'{}') \|\| patch` under the UPDATE row lock |
| M-j | `shared/assessment-save.ts:5-34` (mobile and web) | onboarding_questionnaire (`answers` and `completed_sections` are **text**, Live DB) | CAS on text equality, status computed client-side from the section catalog | **RPC** `save_assessment(patch jsonb, completed text[])` that merges atomically; convert the columns to jsonb using expand/contract |
| M-k | `mobile/app/(app)/profile.tsx:229` | auth user_metadata.full_name | `updateUser` | Keep (display), or drop and use `users.full_name` only |
| M-l | `mobile/src/features/account/deleteAccount.ts:12` | Edge `delete-account` | invoke | **Edge Function** (exists); migrate keys (Q2) |
| M-m | `mobile/src/hooks/useCoach.ts:44` | rpc `get_my_coach` | RPC | Move to the API schema, set `search_path=''`, revoke anon |
| M-n | `mobile/app/(auth)/reset-password.tsx:74` | auth `updateUser({password})` | Auth API | Keep |

**Dashboard (force-updated on every Vercel deploy)**

| # | Site(s) | Table | Current | Target |
|---|---|---|---|---|
| W-a | `client/src/components/CheckInForm.tsx:119,125`; `CheckInDialog.tsx:155,161` | daily_check_ins | update or insert | same **RPC** as M-a |
| W-b | `CheckInForm.tsx:145` | users.package_start_date | UPDATE | **Delete** (trigger) |
| W-c | `MeasurementDialog.tsx:119,125` | body_measurements | update or insert | **RPC** (M-d) |
| W-d | `PhotosUploadDialog.tsx:131,140`; `PhotoUploadCard.tsx:138` | weekly_progress_photos plus storage | update or insert, upload | **RPC** (M-e), plus storage direct |
| W-e | `WorkoutLogDialog.tsx:427,437` | workout_logs | update or insert (coach edits) | **RPC** (M-c), coach-aware |
| W-f | `client/src/pages/WeeklyFeedback.tsx:358` | weekly_check_ins | INSERT without `week_start_date` (M3) | **RPC** that computes `week_start_date` server-side |
| W-g | `client/src/hooks/useOnboarding.ts:33` | users.onboarding_step | UPDATE | M-h |
| W-h | `CardioStepsInput.tsx:47`, `TrainingNote.tsx:53`, `SupplementsPlan.tsx:73`, `Plans.tsx:754,790,826` | users (coach note columns `cardio_note`, `steps_note`, `training_note`, `nutrition_note`, `supplements_data`) | coach UPDATE of the client row | **Direct** under the column-guarded policy, or RPC `set_client_notes(client, patch)` |
| W-i | `CoachClientsPage.tsx:186` | users.coach_note | UPDATE | Move to a coach-only table (M2, known) |
| W-j | `CoachClientsPage.tsx:266-276` | users package_type/duration/start | UPDATE | **RPC** `update_client_package` (coach-of check plus column limits) |
| W-k | `CoachClientsPage.tsx:316-330` | users.coach_id=null, then INSERT coach_client_history | 2 writes; the history insert is not checked | **RPC** `unassign_client` plus **trigger** history |
| W-l | `CoachClaimPage.tsx:50-75` | users (coach_id, package_*, active_workout_plan), then coach_client_history | 2 writes; the history error is ignored | **RPC** `claim_client` plus **trigger** history |
| W-m | `CoachClaimPage.tsx:87` | Edge `send-welcome-email` (client-supplied `email`, `name`, `coachName`) | **function not deployed** (MCP `list_edge_functions` shows only `delete-account`) | **Edge Function** fired server-side (DB webhook or queue on a `coach_id` change), never with a client-chosen recipient |
| W-n | `Plans.tsx:424-716` (17 sites); `hooks/useTemplates.ts:699-782`; `EditableWorkoutPlan.tsx:270,298`; `EditableMealPlan.tsx:434,515` | workout_plans / meal_plans plus users.active_*_plan | DELETE rows, INSERT rows, UPDATE users (not atomic: a failure mid-way leaves the client with no plan). `active_workout_plan` is **text** and is written both as `JSON.stringify(cfg)` (`Plans.tsx:424`) and as a raw object (`:606`) | **RPC** `assign_plan(client, kind, config jsonb, rows jsonb)` in one transaction |
| W-o | `hooks/useTemplates.ts:237-558` (16 sites); `TemplateBuilderPage.tsx:712` | workout_templates / meal_templates | single-row CRUD, plus delete-then-insert for push-to-global and copy | CRUD **direct**; push-to-global and copy as an **RPC** (atomic) |
| W-p | `AdminCoachesPage.tsx:85,101` | users.can_edit_global_templates, role | admin UPDATE (guard trigger enforces admin) | Direct, or RPC `approve_coach` |
| W-q | `client/src/lib/admin-business-utils.ts:27-252` (11 sites) | coach_commissions, client_payments, payment_transactions, coach_payouts | select-then-update/insert | **Direct `upsert(onConflict)`**; unique keys exist (`client_payments_client_id_key`, `coach_commissions_coach_id_key`, `coach_payouts (coach_id,payout_month,payout_year)`; Live DB) |
| W-r | `client/src/pages/Profile.tsx:137`; `ResetPassword.tsx:53`; `Login.tsx:101,133,157` | Auth API | — | Keep |

- **Placement guidance from Supabase:**
  - Use security-definer functions with `search_path=''` for privileged lookups, kept out of exposed schemas ([RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)).
  - Edge Functions that use secret keys should authorize in code with `@supabase/server` (`auth: 'user'` / `'secret'`) ([key migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).
  - `pgrst.db_pre_request` is available for per-request checks, Data API only ([Securing your API](https://supabase.com/docs/guides/api/hardening-data-api)). All accessed 2026-11-27.

### Inferences
**Placement rules for this codebase**
1. **Postgres RPC (SECURITY INVOKER, in `api_v1`)** for anything that is more than one statement, needs idempotency, or merges JSON. RLS still applies, and one round trip replaces 2–4. Candidates: M-a, M-c, M-d, M-e, M-g, M-i, M-j; W-e, W-f, W-j, W-n, and push-to-global. Use **SECURITY DEFINER** only where the caller cannot see the row beforehand: `claim_client` on an unassigned client, `list_unassigned_clients`.
2. **Triggers** for invariants that must hold whichever client writes:
   - coach history on `coach_id` change (this replaces 2 client inserts and makes retention data tamper-proof);
   - `package_start_date` (already a trigger, so the 2 client fallbacks can be deleted);
   - `updated_at` (there is no `updated_at` trigger on any table; Live DB triggers list);
   - the role mirror.
3. **Edge Functions** only where the secret key or an external service is needed: `delete-account`, coach invite (`auth.admin.inviteUserByEmail`), welcome email, push and data export.
4. **Direct PostgREST** for single-row CRUD where RLS plus column guards fully express the rule: templates, finance upserts, coach notes, storage uploads.

**RPC sketches**
```sql
-- shallow merge identical to mergeAnswers(latest, patch, false); the row lock replaces the 3-try CAS loop
create or replace function api_v1.save_profile(p_fields jsonb, p_profile_patch jsonb)
returns table (id uuid, full_name text, phone_number text, country text, profile_data jsonb)
language sql security invoker set search_path = '' as $$
  update public.users u set
    full_name    = case when p_fields ? 'full_name'    then p_fields->>'full_name'    else u.full_name end,
    phone_number = case when p_fields ? 'phone_number' then p_fields->>'phone_number' else u.phone_number end,
    country      = case when p_fields ? 'country'      then p_fields->>'country'      else u.country end,
    profile_data = coalesce(u.profile_data, '{}'::jsonb) || coalesce(p_profile_patch, '{}'::jsonb)
  where u.id = (select auth.uid())
  returning u.id, u.full_name, u.phone_number, u.country, u.profile_data
$$;

-- idempotent daily save (unique (user_id,date) already exists); column list must be the explicit contract
create or replace function api_v1.save_check_in(p_date date, p_values jsonb)
returns uuid language sql security invoker set search_path = '' as $$
  insert into public.daily_check_ins as d (user_id, date /*, explicit columns … */)
  select (select auth.uid()), p_date /*, r.col … */
  from jsonb_populate_record(null::public.daily_check_ins, p_values) r
  on conflict (user_id, date) do update set /* col = excluded.col, … */ date = excluded.date
  returning d.id
$$;

-- coach claim: atomic, no hand-off between coaches; history written by trigger
create or replace function api_v1.claim_client(p_client uuid, p_package_type text, p_duration int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_coach()) then raise exception 'not a coach' using errcode = '42501'; end if;
  update public.users set coach_id = (select auth.uid()), package_type = p_package_type, package_duration = p_duration
   where id = p_client and role = 'client' and coach_id is null;
  if not found then raise exception 'client is no longer unassigned' using errcode = 'P0002'; end if;
end $$;

create or replace function private.log_coach_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.coach_id is not null then
    insert into public.coach_client_history (coach_id, client_id, event_type, package_type, package_duration)
    values (old.coach_id, new.id, 'unassigned', old.package_type, old.package_duration);
  end if;
  if new.coach_id is not null then
    insert into public.coach_client_history (coach_id, client_id, event_type, package_type, package_duration)
    values (new.coach_id, new.id, 'assigned', new.package_type, new.package_duration);
  end if;
  return new;
end $$;
create trigger log_coach_change after update of coach_id on public.users
  for each row when (old.coach_id is distinct from new.coach_id) execute function private.log_coach_change();
```
- **Admin acting as a coach.** The dashboard lets an admin act for a coach (`effectiveCoachId`). `claim_client` therefore needs an optional `p_coach uuid` that only `private.is_admin()` may set.
- **Welcome email.** A security concern exists independently of the redesign. If `send-welcome-email` were deployed as the dashboard calls it, any signed-in user could send branded mail with arbitrary body fields to any address. Trigger it from the `coach_id` change instead: an outbox table plus a DB webhook or `pg_net` call to the Edge Function, authenticated with the secret key on `apikey`.

**Flow sketch: client check-in, target**
```
App (offline outbox) --POST /rest/v1/rpc/save_check_in  [Accept/Content-Profile: api_v1, apikey: sb_publishable, Bearer: user JWT, X-Client-Info: …dawnage-mobile/1.0.0+12]
   -> PostgREST pre-request private.check_request() (version gate, Q5)
   -> api_v1.save_check_in (SECURITY INVOKER) -> INSERT … ON CONFLICT (user_id,date) DO UPDATE  [RLS ins/upd: user_id = (select auth.uid())]
   -> AFTER INSERT trigger trg_auto_set_start_date -> users.package_start_date
   -> returns id; a retry after a lost response is a no-op update (idempotent)
Dashboard coach view -> realtime postgres_changes on public.daily_check_ins (RLS sel: my_client_ids) -> refetch
```

### Gaps
- Assessment status is computed from the TS section catalog (`shared/questionnaire.ts`). To move it fully server-side, the catalog would have to live in SQL; alternatively, status could be derived on read. Whether the dashboard filters on the stored `status` was not checked.
- The `daily_check_ins` column list was not enumerated. The RPC sketch leaves placeholders on purpose rather than invent columns.
- `client/src/lib/admin-utils.ts` (a `coach_client_history` reader) and the dashboard's other read paths were not inventoried. Only writes were in scope.

---

## Q5. How should the API contract and versioning work so that months-old mobile builds keep working?

### Takeaway
Recommended combination:
- a versioned **`api_v1` schema** of explicit-column `security_invoker` views plus RPCs for every write, which is the only surface the mobile app touches, selected with supabase-js `db: { schema: 'api_v1' }`, which sends `Accept-Profile`/`Content-Profile`;
- an **expand/contract** rule for base tables;
- a **server-side minimum-version gate** in `pgrst.db_pre_request`, keyed on an app-version marker the app sends.

Create `api_v2` only for a change that cannot be made additively, and run both until the gate retires v1.

Rejected options:
- pg_graphql: not installed, off by default since 2026-05-18, and no versioning benefit.
- a version gate alone: it forces updates on users whose builds work fine.
- staying on raw `public` tables: today's mobile `select('*')` on 11 tables makes every column part of the contract.

### Cited Findings
- **Today's mobile contract:**
  - Mobile reads 11 tables. 11 of its read call sites use `select('*')`, spread over 10 of those tables; only the `workout_logs` reads list explicit columns. The `select('*')` sites hit users ×2, workout_plans, workout_templates, meal_plans, meal_templates, weekly_progress_photos, body_measurements, daily_check_ins, weekly_check_ins and onboarding_questionnaire (`mobile/src/hooks/usePlans.ts:140,171,208,243,275`; `useProgressPhotos.ts:37`; `useMeasurements.ts:25`; `useDashboardData.ts:18`; `features/weekly/useWeeklyFeedbackHistory.ts:14`; `features/onboarding/useSetupController.ts:50`; `components/questionnaire/QuestionnaireWizard.tsx:103`).
  - Mobile writes 7 tables (Q4).
  - **No OTA channel**: `expo-updates` is not installed and there is no `runtimeVersion` (`mobile/package.json`, `mobile/app.config.ts`). `expo-application` is installed, so the native version and build number are readable.
  - The app version is `1.0.0` (`mobile/app.json:6`). No custom headers are set on the client (`mobile/src/lib/supabase.ts:7-21`).
  - Edge logs already capture `request.headers.x_client_info` and `user_agent` per request (Logs (24 h), field inventory).
- **PostgREST schemas:**
  - `db-schemas` lists the exposed schemas. "To switch schemas, use the `Accept-Profile` and `Content-Profile` headers." With no header, the first schema in the list is the default. "Only the selected schema gets added to the search_path." Requesting a schema not listed returns `PGRST106`.
  - The docs give **no explicit guidance on using schemas for API versioning** ([PostgREST v13 docs: Schemas, undated version docs](https://docs.postgrest.org/en/v13/references/api/schemas.html)).
- **Supabase hardening:**
  - The docs recommend a dedicated schema such as `api` to define the exposed surface, with internal tables and helpers in unexposed schemas.
  - Per-request checks use `alter role authenticator set pgrst.db_pre_request = 'public.check_request'; notify pgrst, 'reload config';`, which "only works with the Data API, not Realtime or Storage."
  - Explicit grants per object ([Supabase docs: Securing your API, accessed 2026-11-27](https://supabase.com/docs/guides/api/hardening-data-api)).
- **2026 platform defaults:**
  - New tables in `public` need an explicit GRANT to be visible to the Data API: opt-in from 2026-04-28, default for new projects from 2026-05-30, applied to all existing projects on 2026-10-30.
  - "pg_graphql will not be enabled by default" from 2026-05-18 ([Supabase changelog #45329, 2026-04-28](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)).
  - Live: `pg_graphql` is **not installed**. The `graphql`/`graphql_public` schemas exist, but the extension list is plpgsql, pg_stat_statements, uuid-ossp, pgcrypto and supabase_vault (Live DB).
- **Engineering practice:**
  - Zable (formerly Lendable), 2026-05-14: a static minimum-version check "forces everyone below a threshold to update", including working versions. They prefer a server-controlled decision that can target the **API version the app consumes**, so "only app versions requiring a critical fix are subjected to a forced server update". OTA does not remove the need for mandatory native updates ([Zable engineering: A better forced update approach, 2026-05-14](https://careers.zable.com/blog/articles/a-better-forced-update-approach)).
  - Clerk shipped a minimum-app-version gate for iOS, Android and Expo in which older builds' requests are rejected and an update screen is shown. It needs an SDK new enough to render that screen, so **the gate must be in the first shipped build** ([Clerk changelog, 2026-11-03](https://clerk.com/changelog/2026-11-03-minimum-app-version)).
  - Firebase documents the Remote Config minimum-version pattern (blocking modal when version < minimum) ([Firebase docs](https://firebase.google.com/docs/remote-config/use-cases/minimum-version); seen via search summary only, not fetched).

### Inferences
**Options compared**

| Option | Keeps old builds working? | Cost here | Verdict |
|---|---|---|---|
| Raw `public` tables + discipline | Only if no column is ever renamed or dropped and no policy is tightened. `select('*')` returns every new column, including private ones (`coach_note` today) | 0 | No; too fragile without OTA |
| **`api_v1` views + RPCs** (one schema per *breaking* version) | Yes. Base tables evolve behind the views, and old builds pin `api_v1` through Accept-Profile | About 11 views + about 9 RPCs, written once | **Yes (core)** |
| `api_v1`/`api_v2` per *release* | Yes, but every release adds a schema to maintain | High | No; version only on breaking changes |
| Minimum-version gate only | Kill switch for broken builds; forces upgrades on working builds | Low | **Yes, as the safety net** (Zable's critique applies if it is the only tool) |
| pg_graphql | No inherent versioning; reflects SQL schema; adds a surface | Must install | No |

**Concrete design**
```sql
create schema api_v1;
grant usage on schema api_v1 to authenticated;          -- not anon
-- read contract: explicit columns, invoker rights so table RLS applies
create view api_v1.workout_plans with (security_invoker = true) as
  select id, user_id, level, workout_type, sub_category, days_per_week /*, explicit columns only */
  from public.workout_plans;
grant select on api_v1.workout_plans to authenticated;
-- … one view per mobile read (11), no coach_note in api_v1.my_profile
-- write contract: RPCs from Q4 (save_check_in, save_workout_log, save_measurement, save_progress_photos,
--   submit_weekly_check_in, save_profile, save_assessment, advance_onboarding, get_my_coach)
revoke execute on all functions in schema api_v1 from public, anon;
grant execute on all functions in schema api_v1 to authenticated;
-- Dashboard → Data API → Exposed schemas: add api_v1 (keep public for the dashboard for now)
```
Mobile client:
```ts
createClient(url, publishableKey, {
  db: { schema: 'api_v1' },
  global: { headers: { 'X-Client-Info': `supabase-js-react-native/${SDK} dawnage-mobile/${Application.nativeApplicationVersion}+${Application.nativeBuildVersion} ${Platform.OS}` } },
  auth: { /* unchanged */ },
});
```
Overriding `X-Client-Info` is a lazy choice: it is already logged by the edge, so version telemetry comes free. The other option is a dedicated `x-app-version` header.

**Version gate (Data API only; Auth, Storage, Functions and `delete-account` stay reachable, so an outdated user can still sign out or delete their account):**
```sql
create table private.min_app_version (platform text primary key, min_version int[] not null, message text);
create or replace function private.check_request() returns void
language plpgsql stable set search_path = '' as $$
declare
  ci  text := current_setting('request.headers', true)::json->>'x-client-info';
  m   text[] := regexp_match(ci, 'dawnage-mobile/(\d+)\.(\d+)\.(\d+)\+\d+ (ios|android)');
  req int[];
begin
  if m is null then return; end if;                       -- web and pre-marker builds pass
  select min_version into req from private.min_app_version where platform = m[4];
  if req is not null and array[m[1]::int, m[2]::int, m[3]::int] < req then
    raise exception 'APP_UPDATE_REQUIRED' using errcode = 'P0001', hint = 'update_required';
  end if;
end $$;
grant usage on schema private to anon, authenticated;     -- pre-request runs as the request role
grant execute on function private.check_request() to anon, authenticated;
alter role authenticator set pgrst.db_pre_request = 'private.check_request';
notify pgrst, 'reload config';
```
The app maps `hint = 'update_required'` to a blocking "Update Dawnage" screen. Sign-out and delete-account keep working because they go through the Auth API and the Edge Function. Gating is per platform and version, so Zable's targeting applies: raise `min_version` only for builds that are broken or whose API version is retired.

**Evolution rules (expand/contract)**
1. Additive base-table changes (a new nullable column, a new table) need no app change. Views do not pick them up until v2.
2. Renaming or retyping a column used by a view: add the new column, backfill, point the view at the new column with the old name, and drop the old column only when no view references it.
3. Tightening a policy, for example M1: check it against an `api_v1` contract test suite that runs in CI against a branch.
4. Truly breaking change: create `api_v2` alongside, ship builds that request `api_v2`, watch `x_client_info` in the edge logs until v1 traffic is below the threshold (or a support window such as 6 months passes), set `min_version`, then drop `api_v1`.

**Dashboard:** it can stay on `public` because it is force-updated, but its multi-step writes should call the same RPCs (Q4). Later, move it to an `api` schema and remove `public` from exposed schemas. Base-table grants must remain for `authenticated`, because `security_invoker` views check the invoker's table privileges. Realtime `postgres_changes` stays on `public` tables; only the dashboard uses realtime (`client/src/pages/CoachClientsPage.tsx:59-72`).

**Timing:** no store build exists, so adopting `api_v1` before build 1 costs nothing in migration. Every month it waits after launch adds a population of builds pinned to raw tables.

### Gaps
- Not verified that supabase-js 2.112 lets `global.headers['X-Client-Info']` override its default; a custom header is the fallback. Also not verified whether edge logs record arbitrary custom headers.
- Not verified whether PostgREST on Supabase supports `raise sqlstate 'PGRST'` to return a custom HTTP status such as 426. The sketch uses `P0001`, which returns 400, to avoid depending on it.
- Inserting through `security_invoker` views with `ON CONFLICT` was not tested. The design routes all writes through RPCs so it does not depend on this.
- No engineering write-up specific to PostgREST schema versioning for mobile clients was found. The recommendation combines the general PostgREST profile mechanism with mobile-versioning practice.

---

## Q6. How should coach and admin accounts be hardened (MFA, CAPTCHA, rate limits, session timeouts, single session)?

### Takeaway
There are 10 staff accounts (7 coaches, 3 admins), all password-only at `aal1`. Their sessions never expire; the oldest is about 337 days.
- **Now:** TOTP MFA for staff, enforced by a **restrictive `aal2` policy** that exempts clients, so the app and old builds are unaffected. Add `signOut({ scope: 'others' })` after a staff sign-in in place of project-wide single-session, and an inactivity timeout if the plan is Pro or higher.
- **Later:** passkeys (beta since 2026-05-28, experimental in JS, documented as a sign-in method rather than an MFA factor).
- **Before build 1:** decide on CAPTCHA, because enabling it is project-wide.

### Cited Findings
- **Live staff posture:**
  - 0 MFA factors and all 784 sessions at `aal1`.
  - Staff hold 35 sessions: coaches 30, admins 5.
  - No session has `not_after`. Session age: median about 180 days, maximum about 337 days.
  - One user has 184 sessions; 784 refresh tokens are unrevoked. (Live DB)
- **MFA factors.** Supabase MFA supports **TOTP and Phone** factors, and WebAuthn is not listed. Enforce with a restrictive policy:
  ```sql
  create policy … as restrictive to authenticated using ((select auth.jwt()->>'aal') = 'aal2');
  ```
  The docs also show opt-in variants that require `aal2` only for users with a verified factor. Unenrolling lowers `aal` only after refresh ([Supabase docs: MFA, accessed 2026-11-27](https://supabase.com/docs/guides/auth/auth-mfa)).
- **Phone MFA cost:** "Advanced MFA Phone" is **$75/month for the first project and $10/month for additional projects** on Pro and Team ([Supabase docs: Advanced MFA Phone, accessed 2026-11-27](https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone)). TOTP pricing was not stated on that page.
- **Passkeys:**
  - "Beta release of Passkeys for Supabase Auth — a passwordless, phishing-resistant credential built on the WebAuthn standard."
  - Methods: `auth.registerPasskey()`, `auth.signInWithPasskey()` and `auth.passkey.list/update/delete()`.
  - The JS API is "experimental and requires an explicit opt-in".
  - Native and mobile integration is still asking for feedback, and MFA use is not mentioned ([Supabase changelog #46458, 2026-05-28](https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta)).
  - The installed auth-js 2.112.4 ships passkey methods (`mobile/node_modules/@supabase/auth-js/dist/main/GoTrueAdminApi.d.ts`, repo grep).
- **Session controls:** time-box, inactivity timeout and "single session per user" (where the most recent sign-in survives and the rest end) are "only available on Pro Plans and up". They are not destroyed proactively; they are checked at the next refresh ([Supabase docs: User sessions, accessed 2026-11-27](https://supabase.com/docs/guides/auth/sessions)). These are project-level settings with no per-role variant on that page.
- **Sign-out scopes:** `global` (the default), `local` and `others` (`GoTrueClient.js:3405`, `lib/types.d.ts:1703`).
- **Default Auth rate limits** ([Supabase docs: Rate limits, accessed 2026-11-27](https://supabase.com/docs/guides/auth/rate-limits)):

  | Operation | Default |
  |---|---|
  | Emails, built-in provider | 2/hour (raisable only with custom SMTP or a Send Email hook) |
  | Sign-up / sign-in / recover / resend / otp | 30 per 5 min per IP |
  | `/token` (password and refresh) | 150 per 5 min per IP |
  | `/verify` | 30 per 5 min per IP |
  | MFA challenge/verify | 15/min per IP (not configurable) |
  | Anonymous sign-ins | 30/hour per IP |

  Limits can be changed in the dashboard or with the Management API `rate_limit_*` fields.
- **CAPTCHA:** hCaptcha and Cloudflare Turnstile protect the "sign-in, sign-up, and password reset forms". The token is passed as `options.captchaToken`. The page does not say how clients without a token are treated ([Supabase docs: CAPTCHA, accessed 2026-11-27](https://supabase.com/docs/guides/auth/auth-captcha)).
- **Coach self-registration:** the web form still lets anyone request coach access, recorded as `requested_role` (`client/src/pages/Login.tsx:126-145`; mig 06). No pending requests exist today (Live DB: 0 `requested_role='coach'` clients).

### Inferences
**Staff-only MFA enforcement that never touches clients or old app builds:**
```sql
-- one restrictive policy per table holding client data or business data
create policy staff_need_aal2 on public.daily_check_ins as restrictive for all to authenticated
  using ( (select private.app_role()) = 'client' or (select auth.jwt()->>'aal') = 'aal2' );
-- private.app_role(): stable security definer, select role from public.users where id = (select auth.uid())
-- finance tables: using ((select auth.jwt()->>'aal') = 'aal2')   -- admins only anyway
```
- **Dashboard flow:** after `signInWithPassword`, call `mfa.getAuthenticatorAssuranceLevel()`. If `nextLevel = aal2`, run `mfa.challenge` and `verify`. If a staff user has no factor, force `mfa.enroll({ factorType: 'totp' })` before routing.
- **Rollout:** add the policies only after all 10 staff have enrolled. The Supabase "verified factor" variant gives a soft launch.

**Single session for staff only:** a project-wide "single session per user" setting would also log clients out on a second device. Instead, after the staff `aal2` step the dashboard calls `supabase.auth.signOut({ scope: 'others' })`. That costs one line and needs no plan upgrade.
- **Optional hard check for admin-only RPCs:** also require that the `session_id` claim exists in `auth.sessions`, inside a security-definer helper. Supabase suggests this only "for the most sensitive actions" (sessions docs).

**Timeouts.** On Pro: inactivity timeout about 30 days for everyone, which also cleans out the about 713 stale client sessions; time-box about 90 days. Staff idle limits shorter than that cannot be expressed per role. Approximate them on the dashboard with an idle timer that calls `signOut({ scope: 'local' })` after about 12 h. If the plan is Free, the only lever is periodic hygiene: delete `auth.sessions` rows older than X with a scheduled job, which also revokes their refresh tokens.

**Coach onboarding.** Close coach self-sign-up. An admin invites coaches through an Edge Function using `auth.admin.inviteUserByEmail` with the secret key, and the invite sets `users.role` through the existing trigger path. This shrinks the sign-up surface that CAPTCHA would otherwise have to protect.

**CAPTCHA decision before build 1.** CAPTCHA is enabled per project. Once on, sign-up, sign-in and reset requests from builds that do not send `captchaToken` are presumably rejected (an inference; the docs do not say). Two choices:
- (a) Ship Turnstile in the app's sign-up and sign-in from build 1, then enable it.
- (b) Rely on the rate limits above, custom SMTP and email confirmation (already on), and keep CAPTCHA off.

For about 150 users and no anonymous sign-ins, (b) is defensible today. Revisit if sign-up abuse appears.

### Gaps
- The billing plan (Free vs Pro) was not determined. Time-box and inactivity settings depend on it.
- Not verified whether Supabase Auth's MFA accepts WebAuthn or passkeys as a second factor as of late 2026. Neither the MFA docs nor the passkeys changelog mention it, so treat it as unsupported.
- How Supabase Auth treats requests without a CAPTCHA token once CAPTCHA is enabled is not documented on the fetched page.
- Whether leaked-password protection and the password minimum length are set could not be read. They are recorded as owner actions in prior reviews.

---

## Q7. Are anonymous sign-ins and identity linking useful for onboarding here?

### Takeaway
Not now. Clients arrive through a coach and a paid package, the coach claim flow needs a real identity, and the current `handle_new_user` trigger would create `public.users` rows for anonymous users, polluting the coaches' unassigned-client list. Anonymous sign-ins also need CAPTCHA and restrictive policies on every table. Revisit only for a public "try the assessment" funnel. Keep identity linking in mind for adding Apple or Google sign-in later.

### Cited Findings
- **How they work:** `signInAnonymously()` creates a real `authenticated` user with an `is_anonymous` JWT claim. "Bad actors can abuse the endpoint to increase your database size drastically", so CAPTCHA or Turnstile is "strongly recommended". The IP limit defaults to 30/hour ([Supabase docs: Anonymous sign-ins, accessed 2026-11-27](https://supabase.com/docs/guides/auth/auth-anonymous)).
- **Conversion:**
  - Manual linking must be enabled first.
  - Email or phone: `updateUser()`, and the email must be verified before a password can be set.
  - OAuth: `linkIdentity({ provider })`.
  - Conflicts with an existing account need app-side merge logic ([same page](https://supabase.com/docs/guides/auth/auth-anonymous)).
- **RLS:** a restrictive policy is needed, for example:
  ```sql
  with check ((select (auth.jwt()->>'is_anonymous')::boolean) is false)
  ```
  "A restrictive policy alone fails unless another policy returns true." There is **no automatic cleanup**; the docs suggest deleting anonymous users older than 30 days ([same page](https://supabase.com/docs/guides/auth/auth-anonymous)).
- **Live:** 0 anonymous users. The only provider is email (Live DB). `handle_new_user` inserts a `public.users` row for **every** `auth.users` insert with `role='client'` and `coach_id` null (live def), and coaches can list every `role='client' AND coach_id IS NULL` row ("Coaches can view own and unassigned clients"; Live DB).

### Inferences
- **The cost here is concrete:**
  1. Every anonymous user becomes a visible "unassigned client" to all 7 coaches unless the trigger and claim list exclude `is_anonymous`.
  2. There are 19 tables that would each need a restrictive `is_anonymous is false` write policy, or a single gate in the `api_v1` RPCs.
  3. CAPTCHA would have to ship in the app (see Q6).
  4. A cleanup job is needed.
- **The benefit is small:** a prospect could fill in the assessment before creating an account. The app is installed after a coach relationship exists, so few users would hit that funnel.
- **If adopted later,** the minimum change is `if new.is_anonymous then return new; end if;` at the top of `handle_new_user`. Then add a separate `prospect_answers` table owned by the anonymous uid, and copy it into `onboarding_questionnaire` on conversion inside an RPC. This keeps anonymous users out of `public.users` entirely.
- **Identity linking matters if Sign in with Apple or Google is added to the app:**
  - Linking keeps one `auth.users` row per person, so the `public.users`/coach relationships survive.
  - Enable manual linking only when that work starts.
  - Apple's guideline requiring Sign in with Apple alongside other social logins was not re-verified in this session.

### Gaps
- There is no product data on how many prospects drop off before sign-up, so the funnel benefit cannot be sized.

---

## Q8. What are the ranked gaps and the rollout plan? (cross-cutting synthesis)

### Takeaway
The time-critical items are the **legacy-key deadline (end of 2026)** and the **first store build**. That build fixes the mobile contract for months, and today it would ship the legacy key, raw-table `select('*')` reads, multi-step writes, `user_metadata` role routing and no version kill switch. Everything else (policy consolidation, staff MFA, session hygiene) is reversible and can follow in small migrations.

### Cited Findings
All evidence is cited in Q1–Q7. Ranked new gaps, excluding the prior-review items B1–B10, M1–M3, L1–L5 and H1–H9:

| Rank | Gap | Evidence | Severity |
|---|---|---|---|
| 1 | Key migration not started. No `sb_publishable` key, JWKS empty (HS256 legacy secret), `delete-account` has `verify_jwt: true`, and Supabase says legacy keys work "until the end of 2026" | Q2 (MCP keys, JWKS GET, logs, `list_edge_functions`) | High, time-boxed |
| 2 | No stable mobile API contract and no kill switch: 11 `select('*')` reads, 7 tables written by multi-step PostgREST, no OTA, no version marker or gate | Q4, Q5 | High (permanent once build 1 ships) |
| 3 | Both apps route on user_metadata `role` (9 web sites, 1 mobile), which the user can edit; the mirror has already drifted (1 admin routed as coach) | Q1 | High (UI integrity) |
| 4 | anon can read all global workout and meal templates (`TO public USING (coach_id IS NULL)` plus anon grants). anon holds full DML grants on 19 tables. Default ACLs still auto-grant new tables and functions | Q3 | Medium-high |
| 5 | Helpers in exposed `public` (`is_admin`, `is_coach_of` executable by PUBLIC and anon; VOLATILE, so per-row); `get_my_coach` has `search_path=public` and anon EXECUTE | Q1, Q3 | Medium |
| 6 | Non-atomic multi-step writes (claim, unassign, plan assignment, check-in) and client-side CAS on TEXT JSON columns | Q4 | Medium (data integrity) |
| 7 | `send-welcome-email` is invoked but not deployed, and its client-supplied recipient design is a spam-relay risk | Q4 | Medium |
| 8 | Staff accounts: no MFA, sessions never expire (784 unrevoked refresh tokens, median age 180 days), global sign-out default | Q1, Q6 | Medium |
| 9 | Coaches can read full rows (email, phone, `profile_data`) of every unassigned client | Q3 | Medium (privacy) |
| 10 | Implicit flow for mobile reset deep links (tokens in a custom-scheme fragment) | Q1 | Low |
| 11 | Unused API-exposed legacy tables (`user_goals`, `progress_photos` table) with 12 policies | Q3 | Low |

### Inferences
**Rollout plan:** each phase is independently deployable and reversible, ordered by deadline and by lock-in.

- **Phase 0, before EAS store build 1 (about 2–3 dev days):**
  1. Create publishable and secret keys. Switch the web env and bump web supabase-js. Put the publishable key in the EAS production and preview envs. (Q2 steps 1–3)
  2. Mobile client: add the `dawnage-mobile/<ver>+<build> <os>` marker (in `X-Client-Info` or a custom header). Read role from `app_metadata.role`, defaulting to `client`. Optionally set `flowType: 'pkce'` for the reset deep link after testing the Expo redirect.
  3. DB: change the `sync_role_to_auth_metadata` trigger to write `app_metadata` and backfill. Install `private.check_request` with an empty `min_app_version` table.
  4. Create `api_v1` (views plus the mobile RPCs from Q4). Point mobile at `db: { schema: 'api_v1' }` and replace `select('*')`.
  5. Redeploy `delete-account` with `verify_jwt = false` and `@supabase/server`. (Q2 step 4)
- **Phase 1, DB authorization migration (one quiet window, about 1 day including tests):**
  - Create the `private` helpers and the `users_coach_id_idx` index (concurrently).
  - Consolidate policies table by table (drop and create inside one transaction per table).
  - Revoke anon grants, revoke `PUBLIC`/anon EXECUTE on the old helpers, alter default privileges, and un-expose `user_goals` and `progress_photos`.
  - Gate: rerun the status review's 39-check permission harness for client, coach, other coach, admin and anon, plus an `api_v1` contract test. Roll back per table if anything fails.
- **Phase 2, dashboard on RPCs (about 2–3 days):**
  - Build `claim_client`, `unassign_client`, `assign_plan`, `update_client_package`, `save_*`, plus the coach-history trigger. Delete the client-side `package_start_date` fallbacks (`CheckInForm.tsx:145`, `persistence.ts:66-75`) and the client history inserts.
  - Rebuild the welcome email as outbox → Edge Function, or remove the call (`CoachClaimPage.tsx:87`).
  - Switch web routing to `app_metadata.role` (9 sites), then stop mirroring to user_metadata once no mobile build reads it. No store build reads it if Phase 0 lands first.
- **Phase 3, staff hardening (about 1–2 days plus enrolment time):**
  - TOTP enrolment UI on the dashboard and `signOut({ scope: 'others' })` after staff sign-in.
  - Once all 10 staff have enrolled, add the restrictive `aal2` policies.
  - If on Pro: inactivity timeout about 30 days. If not: a scheduled cleanup of old `auth.sessions`.
  - Close coach self-sign-up in favour of admin invites.
- **Phase 4, signing keys and legacy shutdown (calendar-driven, by 2026-12-31):**
  1. After 7 days of zero legacy-key traffic in the edge logs, migrate the JWT secret, then rotate to the asymmetric key.
  2. Deactivate the legacy keys.
  3. Revoke the legacy secret at least 1 h 15 m after rotation.
- **Steady state:** `api_v1` is frozen for mobile, with additive changes only. Breaking changes go into `api_v2` with a support window. `min_app_version` serves as a targeted kill switch, and staff are at `aal2`. Policies are one per table and command, on cached helpers. Business invariants live in triggers and RPCs, and secrets live only in Edge Functions.

**Order constraints:**
- Phase 0 must land before the first store build, because it is the only window in which the mobile contract can still change for free.
- Q2 step 4 (`verify_jwt` off) must come before Phase 4 rotation.
- The legacy JWT secret is revoked only after the legacy API keys are deactivated.
- MFA policies go in only after enrolment.

### Gaps
- Dev-day estimates are judgement, not measurement.
- The billing plan, auth server settings and the exact legacy-key shutdown date remain unknown (see Q2 and Q6). They change Phase 3 and Phase 4 details, not their order.

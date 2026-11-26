# Phase 1: Launch blockers implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read [README.md](README.md) (Global Constraints) first. **Most tasks in this phase are 🔒 OWNER GATE.** Prepare the file or diff, show it to the owner, and stop until they reply "approved" for that task. Never run SQL against the live project yourself.

**Goal:** Close the problems that would sink a launch regardless of UI quality: open data (F1a), self-promotion to admin (F1b), public photos (F1c), the web dashboard corrupting mobile workouts (F1d), and never having run on a device (F1e).

**Architecture:** A read-only introspection script produces a report. The fixes are SQL files the owner applies, one web helper module used by the web's four workout readers, and a script/README change so the development build is the default.

**Tech stack:** Node 22 (`pg` from the repo root `node_modules`), Postgres/Supabase SQL, the web app (Vite + React 18) under `client/`, `node:test` via `tsx` for the web helper test, EAS Build.

**Spec:** [F1a–F1e](../../specs/2026-09-26-market-review-findings.md#f1-p0-launch-blockers). Background: `~/.claude/.../memory/dawnage_audit_2026_09_25.md` (owner's audit) and `docs/release/2026-09-19-hardening.md`.

---

### Task 1.1: Read-only database security report 🔒 OWNER GATE (the script connects to the live database)

**Files:**
- Create: `mobile/scripts/db-security-check.mjs`
- Create (by running it): `mobile/docs/release/2026-09-26-db-security-check.md`

**Interfaces:**
- Produces: the report file. Tasks 1.2 and 1.3 read its sections `rls`, `anonGrants`, `policies`, `buckets`, `handleNewUser`, `usersTriggers` and `photoExtensions`.

- [ ] **Step 1: Write the script**

```js
// mobile/scripts/db-security-check.mjs
// READ-ONLY. Opens one transaction with BEGIN READ ONLY and always rolls back.
// Prints no row data except counts, so the report is safe to commit.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const require = createRequire(path.join(repoRoot, 'package.json'));
const { Client } = require('pg');

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const url = process.env.DATABASE_URL ?? readEnv(path.join(repoRoot, '.env')).DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is missing (repo-root .env or environment).');
  process.exit(1);
}

const TABLES = [
  'users', 'daily_check_ins', 'weekly_check_ins', 'workout_logs', 'workout_plans',
  'meal_plans', 'weekly_progress_photos', 'body_measurements', 'food_items',
  'onboarding_questionnaire', 'workout_templates', 'meal_templates',
];

const QUERIES = {
  rls: [`select c.relname as "table", c.relrowsecurity as rls_enabled
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1) order by 1`, [TABLES]],
  anonGrants: [`select table_name as "table", string_agg(privilege_type, ',' order by privilege_type) as privileges
                from information_schema.role_table_grants
                where grantee = 'anon' and table_schema = 'public' and table_name = any($1)
                group by 1 order by 1`, [TABLES]],
  policies: [`select tablename as "table", policyname as policy, cmd, roles::text as roles, permissive,
                     coalesce(qual, '') as using_expr, coalesce(with_check, '') as check_expr
              from pg_policies where schemaname = 'public' and tablename = any($1) order by 1, 2`, [TABLES]],
  buckets: [`select id, public from storage.buckets order by id`, []],
  handleNewUser: [`select pg_get_functiondef('public.handle_new_user'::regproc) as definition`, []],
  usersTriggers: [`select t.tgname as "trigger", pg_get_triggerdef(t.oid) as definition
                   from pg_trigger t join pg_class c on c.oid = t.tgrelid
                   join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relname = 'users' and not t.tgisinternal order by 1`, []],
  photoExtensions: [`select coalesce(substring(ref from '\\.([A-Za-z0-9]+)$'), '(none)') as extension,
                            count(*) as refs,
                            count(*) filter (where regexp_replace(ref, '^.*/', '') ~ '^[a-z0-9_()-]+_[0-9]+\\.jpg$') as match_current_regex
                     from (select unnest(array[front_url, back_url, side_left_url, side_right_url]) as ref
                           from public.weekly_progress_photos) s
                     where ref is not null group by 1 order by 2 desc`, []],
};

function toMarkdown(rows) {
  if (!rows.length) return '_no rows_\n';
  const keys = Object.keys(rows[0]);
  const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 400);
  return [
    `| ${keys.join(' | ')} |`,
    `| ${keys.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${keys.map((key) => cell(row[key])).join(' | ')} |`),
  ].join('\n') + '\n';
}

// Verified TLS. Supabase signs with its own CA: if the connection fails with
// SELF_SIGNED_CERT_IN_CHAIN, download the CA (Project Settings → Database → SSL
// configuration) and run with PGSSLROOTCERT=/path/to/prod-ca-2021.crt.
// Never switch verification off.
const ssl = process.env.PGSSLROOTCERT ? { ca: fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8') } : true;
const client = new Client({ connectionString: url, ssl });
await client.connect();
const sections = [];
try {
  await client.query('BEGIN READ ONLY');
  for (const [name, [sql, params]] of Object.entries(QUERIES)) {
    try {
      const { rows } = await client.query(sql, params);
      sections.push(`## ${name}\n\n${toMarkdown(rows)}`);
    } catch (error) {
      sections.push(`## ${name}\n\nQuery failed: ${error.message}\n`);
    }
  }
} finally {
  await client.query('ROLLBACK').catch(() => {});
  await client.end();
}

const out = path.join(here, '..', 'docs', 'release', '2026-09-26-db-security-check.md');
fs.writeFileSync(out, `# Database security check (read-only)\n\nGenerated ${new Date().toISOString()} by scripts/db-security-check.mjs.\n\n${sections.join('\n')}`);
console.log(`Wrote ${path.relative(process.cwd(), out)}`);
```

- [ ] **Step 2: Ask the owner for approval to run it.** Show the file. Wait for "approved".
- [ ] **Step 3: Run it**
  Run (from `mobile/`): `node scripts/db-security-check.mjs`
  Expected: `Wrote docs/release/2026-09-26-db-security-check.md`. Open the file and confirm it has all seven `##` sections.
- [ ] **Step 4: Write a 5-line summary at the top of the report.** Under the title, state for each of F1a, F1b and F1c: "still open" or "already fixed", with the table or row that proves it.
- [ ] **Step 5: Commit**

```bash
git add scripts/db-security-check.mjs docs/release/2026-09-26-db-security-check.md
git commit -m "chore(mobile): add read-only database security report"
```

---

### Task 1.2: Security hardening SQL (F1a, F1b) 🔒 OWNER GATE

**Files:**
- Create: `mobile/plans/sql/2026-09-26_security_hardening.sql`

**Interfaces:**
- Consumes: the report from Task 1.1 (sections `rls`, `anonGrants`, `policies`, `handleNewUser`).

- [ ] **Step 1: Write part A.** This stops anyone changing their own role or coach assignment, and is safe to apply first.

```sql
-- ============================================================================
-- Dawnage 2026-09-26 · Security hardening
-- Part A — role and coach assignment can't be changed by the row owner.
-- Additive: new function + trigger. Reversible:
--   DROP TRIGGER IF EXISTS users_protect_role ON public.users;
--   DROP FUNCTION IF EXISTS public.protect_user_role();
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean;
BEGIN
  -- SQL editor / service role (no JWT) keeps full control.
  IF caller IS NULL THEN RETURN NEW; END IF;
  SELECT role = 'admin' INTO caller_is_admin FROM public.users WHERE id = caller;
  IF coalesce(caller_is_admin, false) THEN RETURN NEW; END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only an admin can change a user role' USING ERRCODE = '42501';
  END IF;
  -- Coaches may claim clients (CoachClaimPage). Only the row owner may not reassign themselves.
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id AND caller = OLD.id THEN
    RAISE EXCEPTION 'Only a coach or admin can change coach assignment' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_role ON public.users;
CREATE TRIGGER users_protect_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_role();
```

- [ ] **Step 2: Write part B.** New sign-ups are always `client`.
  Copy the **current** definition of `public.handle_new_user` from the report's `handleNewUser` section into the file under this header, then make exactly two edits:
  1. Replace `COALESCE(new.raw_user_meta_data->>'role', 'client')` with `'client'`.
  2. In the `ON CONFLICT (id) DO UPDATE SET` list, delete the line `role = EXCLUDED.role,`. If it was the last item in the list, also remove the trailing comma from the line above it.

  Write this comment above the copied function:

```sql
-- Part B — sign-up can no longer choose its own role. Admins promote coaches
-- from the admin dashboard (or: UPDATE public.users SET role = 'coach' WHERE id = '<uuid>';).
-- OWNER: confirm the web sign-up page no longer relies on sending role=coach.
```

- [ ] **Step 3: Write part C.** Turn RLS on for the tables where the report shows it off.
  For each of `workout_plans`, `meal_plans` and `food_items` whose `rls_enabled` is `false` in the report:
  1. Check the `policies` section against the table below.
  2. Add only the policies that are **missing** (no existing policy with the same `cmd` and an equivalent expression).
  3. Then add the `ENABLE` and `REVOKE` lines.

  | Table | Web/mobile flow that must keep working | Policy that allows it |
  |---|---|---|
  | workout_plans, meal_plans | Client reads own plan (mobile Training/Nutrition) | `FOR SELECT TO authenticated USING (user_id = auth.uid())` |
  | workout_plans, meal_plans | Coach assigns/edits a client plan (Template Builder "Assign") | `FOR ALL TO authenticated USING (public.is_coach_of(user_id)) WITH CHECK (public.is_coach_of(user_id))` |
  | workout_plans, meal_plans | Admin manages everything | `FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users a WHERE a.id = auth.uid() AND a.role = 'admin'))` |
  | food_items | Signed-in users read the food database | `FOR SELECT TO authenticated USING (true)` |
  | food_items | Admin maintains the food database | the admin `FOR ALL` policy above |

  Policy names: `<table>_client_read`, `<table>_coach_manage`, `<table>_admin_manage` and `food_items_read`. Template for each table:

```sql
-- Part C — <table>
CREATE POLICY workout_plans_client_read ON public.workout_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- (only the policies the report showed as missing)
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_plans FROM anon;
```

  `weekly_progress_photos` is **not** handled here. Task 1.3 covers it through the existing private-photo migration.

- [ ] **Step 4: Write the verification block at the bottom of the file**

```sql
-- ============================================================================
-- VERIFY (owner, after applying):
-- 1. Anonymous REST must return an error or [] for each hardened table:
--    curl "$SUPABASE_URL/rest/v1/workout_plans?select=id&limit=1" -H "apikey: $ANON_KEY"
-- 2. Signed in as a client: mobile Training + Nutrition still show the plan.
-- 3. Signed in as a coach on the web: Template Builder "Assign" still saves.
-- 4. Signed in as a client, this must FAIL with 42501:
--    UPDATE public.users SET role = 'admin' WHERE id = auth.uid();
-- 5. Re-run: node mobile/scripts/db-security-check.mjs and commit the new report.
-- ============================================================================
```

- [ ] **Step 5: Show the file to the owner and stop.** The owner applies it in the Supabase SQL editor, runs the VERIFY block, and replies with the results.
- [ ] **Step 6: Commit the SQL file** once the owner says it was applied (or approved as written).

```bash
git add plans/sql/2026-09-26_security_hardening.sql
git commit -m "chore(mobile): add security hardening SQL for owner review"
```

---

### Task 1.3: Private progress photos and the extension regex (F1c) 🔒 OWNER GATE (`shared/` and the live database)

**Files:**
- Modify: `shared/progress-photos.ts:27` (outside mobile, gate)
- Modify: `shared/progress-photos.test.ts`
- Owner applies: `sqlmigrationfiles/2026-09-19_private_progress_photos_preflight.sql`, then `sqlmigrationfiles/2026-09-19_private_progress_photos.sql`

**Interfaces:**
- Consumes: the `photoExtensions` section of the Task 1.1 report.
- Produces: `canonicalPhotoReference` accepts `.jpg`, `.jpeg` and `.png` in any case (plus any other extension the report lists with a non-zero count, added to the same group).

- [ ] **Step 1: Write the failing test.** Append to `shared/progress-photos.test.ts`:

```ts
test('accepts stored photo extensions regardless of case', () => {
  for (const name of ['front_1.jpeg', 'front_1.png', 'front_1.JPG', 'side_(left)_2.JPEG']) {
    const ref = `${owner}/2026-09-19/${name}`;
    assert.equal(canonicalPhotoReference(ref, project, owner), ref);
  }
  assert.throws(() => canonicalPhotoReference(`${owner}/2026-09-19/front_1.gif`, project, owner));
});
```

- [ ] **Step 2: Run it and confirm it fails**
  Run (repo root): `npx tsx --test shared/progress-photos.test.ts`
  Expected: FAIL in "accepts stored photo extensions regardless of case".
- [ ] **Step 3: Implement.** In `shared/progress-photos.ts:27`, replace

```ts
      !/^[a-z0-9_()-]+_[0-9]+\.jpg$/.test(parts[2]) || (ownerId && parts[0] !== ownerId)) {
```
  with

```ts
      !/^[a-z0-9_()-]+_[0-9]+\.(?:jpe?g|png)$/i.test(parts[2]) || (ownerId && parts[0] !== ownerId)) {
```

- [ ] **Step 4: Run the shared and mobile tests**
  Run (repo root): `npx tsx --test shared/progress-photos.test.ts`. Expected: PASS.
  Run (mobile): `npx jest src/lib/photos.test.ts src/hooks --runInBand`. Expected: PASS.
- [ ] **Step 5: Show the diff to the owner.** After approval, commit:

```bash
git add ../shared/progress-photos.ts ../shared/progress-photos.test.ts
git commit -m "fix(shared): accept jpeg and png progress photo references"
```

- [ ] **Step 6: Owner applies the private-photo migration.** Follow the order in `docs/release/2026-09-19-hardening.md` (the preflight SQL first, then the migration), then check photos in both the web and mobile apps. Record the outcome in `docs/release/2026-09-26-db-security-check.md` under a new heading `## Photo migration`, and commit that file.

---

### Task 1.4: The web reads and preserves mobile v2 workouts (F1d) 🔒 OWNER GATE (`client/`)

**Files:**
- Create: `client/src/lib/workout-log-content.ts`
- Create: `client/src/lib/workout-log-content.test.ts`
- Modify: `client/src/pages/WorkoutLogs.tsx` (lines ~97-104, ~114-124, ~373-377)
- Modify: `client/src/components/WorkoutLogDialog.tsx` (lines ~187-205, ~350, ~486-500)
- Modify: `client/src/hooks/usePreviousWorkoutData.ts` (lines ~36-55)

**Interfaces:**
- Produces:
  - `workoutLogEntries(content: unknown): { version: 2 | null; planDayNumber: number | null; entries: unknown[] } | null`
  - `exerciseName(entry: unknown): string`
  - `serializeWorkoutLogForSave(format: { version: 2 | null; planDayNumber: number | null } | null, exercises: { name: string; sets: { reps: string; weight: string; rpe: string }[] }[]): string`

- [ ] **Step 1: Write the failing test**

```ts
// client/src/lib/workout-log-content.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { exerciseName, serializeWorkoutLogForSave, workoutLogEntries } from './workout-log-content.ts';

const v2 = JSON.stringify({ version: 2, planDayNumber: 3, exercises: [
  { name: 'Bench press', tracking: 'weight-reps', sets: [{ setNumber: 1, reps: '8', weight: '60', rpe: '', completed: true }] },
] });
const legacy = JSON.stringify([{ exercise: 'Squat', sets: [{ setNumber: 1, reps: '5', weight: '100', rpe: '8' }] }]);

test('reads the mobile v2 envelope and the legacy array', () => {
  assert.deepEqual(workoutLogEntries(v2)?.planDayNumber, 3);
  assert.equal(workoutLogEntries(v2)?.entries.length, 1);
  assert.equal(workoutLogEntries(legacy)?.version, null);
  assert.equal(workoutLogEntries(legacy)?.entries.length, 1);
  assert.equal(workoutLogEntries('not json'), null);
  assert.equal(workoutLogEntries({ something: 'else' }), null);
});

test('names come from exercise, Exercise or name', () => {
  assert.equal(exerciseName({ exercise: 'Squat' }), 'Squat');
  assert.equal(exerciseName({ Exercise: 'Row' }), 'Row');
  assert.equal(exerciseName({ name: 'Bench press' }), 'Bench press');
  assert.equal(exerciseName('plain'), '');
});

test('saving a v2 log keeps the v2 envelope and plan day', () => {
  const saved = JSON.parse(serializeWorkoutLogForSave({ version: 2, planDayNumber: 3 }, [
    { name: 'Bench press', sets: [{ reps: '8', weight: '60', rpe: '' }, { reps: '', weight: '', rpe: '' }] },
  ]));
  assert.equal(saved.version, 2);
  assert.equal(saved.planDayNumber, 3);
  assert.equal(saved.exercises[0].name, 'Bench press');
  assert.equal(saved.exercises[0].sets[0].completed, true);
  assert.equal(saved.exercises[0].sets[1].completed, false);
});

test('saving a legacy log keeps the legacy array', () => {
  const saved = JSON.parse(serializeWorkoutLogForSave(null, [{ name: 'Squat', sets: [{ reps: '5', weight: '100', rpe: '8' }] }]));
  assert.ok(Array.isArray(saved));
  assert.equal(saved[0].exercise, 'Squat');
});
```

- [ ] **Step 2: Run it and confirm it fails**
  Run (repo root): `npx tsx --test client/src/lib/workout-log-content.test.ts`
  Expected: FAIL, because the module does not exist.
- [ ] **Step 3: Implement**

```ts
// client/src/lib/workout-log-content.ts
/**
 * workout_logs.content has two shapes:
 *   legacy (web):  [{ exercise, sets: [{ setNumber, reps, weight, rpe }] }]
 *   v2 (mobile):   { version: 2, planDayNumber, exercises: [{ name, tracking, sets: [{ …, completed, kind }] }] }
 * Every web reader must go through workoutLogEntries(). Saving must keep the shape it loaded.
 */
export type WorkoutLogFormat = { version: 2 | null; planDayNumber: number | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function workoutLogEntries(content: unknown): (WorkoutLogFormat & { entries: unknown[] }) | null {
  let parsed: unknown = content;
  if (typeof content === 'string') {
    try { parsed = JSON.parse(content); } catch { return null; }
  }
  if (Array.isArray(parsed)) return { version: null, planDayNumber: null, entries: parsed };
  if (isRecord(parsed) && parsed.version === 2 && Array.isArray(parsed.exercises)) {
    const day = parsed.planDayNumber;
    return { version: 2, planDayNumber: typeof day === 'number' && Number.isFinite(day) ? day : null, entries: parsed.exercises };
  }
  return null;
}

export function exerciseName(entry: unknown): string {
  if (!isRecord(entry)) return '';
  for (const key of ['exercise', 'Exercise', 'name'] as const) {
    const value = entry[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function serializeWorkoutLogForSave(
  format: WorkoutLogFormat | null,
  exercises: { name: string; sets: { reps: string; weight: string; rpe: string }[] }[],
): string {
  if (format?.version === 2) {
    return JSON.stringify({
      version: 2,
      planDayNumber: format.planDayNumber,
      exercises: exercises.map((exercise) => ({
        name: exercise.name,
        tracking: 'weight-reps',
        sets: exercise.sets.map((set, index) => ({
          setNumber: index + 1, reps: set.reps, weight: set.weight, rpe: set.rpe,
          kind: 'work',
          // The web records finished sets; a set with reps entered counts as done.
          completed: set.reps.trim() !== '',
        })),
      })),
    });
  }
  return JSON.stringify(exercises.map((exercise) => ({
    exercise: exercise.name,
    sets: exercise.sets.map((set, index) => ({ setNumber: index + 1, reps: set.reps, weight: set.weight, rpe: set.rpe })),
  })));
}
```

- [ ] **Step 4: Run the test**
  Run: `npx tsx --test client/src/lib/workout-log-content.test.ts`. Expected: PASS (4 tests).
- [ ] **Step 5: Use it in `client/src/pages/WorkoutLogs.tsx`.**
  Add `import { workoutLogEntries } from '@/lib/workout-log-content';` (check that the web uses the `@/` alias for `client/src`; if it doesn't, use a relative path).
  1. Lines ~97-104: replace the `try { const content = JSON.parse(log.content); return acc + (Array.isArray(content) ? content.length : 0); } catch { return acc; }` body with:

```tsx
            return acc + (workoutLogEntries(log.content)?.entries.length ?? 0);
```

  2. Lines ~373-377: replace the `try { … } catch { }` block with:

```tsx
                                                    const exerciseCount = workoutLogEntries(log.content)?.entries.length ?? 0;
```
     Also delete the now-unused `let exerciseCount = 0;` line.
  3. In `renderExerciseContent` (lines ~114-124), replace the parse block and the `if (Array.isArray(parsedContent))` line with:

```tsx
        const parsedLog = workoutLogEntries(content);
        if (!parsedLog) {
            return <p className="text-muted-foreground whitespace-pre-wrap">{typeof content === 'string' ? content : JSON.stringify(content)}</p>;
        }
        const parsedContent = parsedLog.entries as any[];
        if (parsedContent.length) {
```
     Keep the rest of the function. The name line already falls back to `exercise.name`.
- [ ] **Step 6: Use it in `client/src/components/WorkoutLogDialog.tsx`.**
  1. Replace `parseExercisesFromLog` (lines ~187-205) with:

```tsx
function parseExercisesFromLog(content: any): ExerciseRow[] {
    const parsed = workoutLogEntries(content);
    if (!parsed) return [];
    return parsed.entries.map((ex: any) => ({
        id: crypto.randomUUID(),
        name: exerciseName(ex),
        sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s: any) => ({
            reps: String(s?.reps ?? ""),
            weight: String(s?.weight ?? ""),
            rpe: String(s?.rpe ?? ""),
        })),
    }));
}
```

  2. Add component state next to the other `useState` calls:
     `const [loadedFormat, setLoadedFormat] = useState<WorkoutLogFormat | null>(null);`
  3. Where the log is loaded (line ~350, `const loadedExercises = parseExercisesFromLog(data.content);`), add on the next line:
     `setLoadedFormat(workoutLogEntries(data.content));`
     Wherever the dialog resets for a new log, also call `setLoadedFormat(null)`.
  4. In the save mutation (lines ~486-500), replace the `const content = exercises.map(...)` block and `content: JSON.stringify(content),` with:

```tsx
            const content = serializeWorkoutLogForSave(loadedFormat, exercises);
```
     and `content,` in the payload.
  5. Imports:
     `import { exerciseName, serializeWorkoutLogForSave, workoutLogEntries, type WorkoutLogFormat } from '@/lib/workout-log-content';`
- [ ] **Step 7: Use it in `client/src/hooks/usePreviousWorkoutData.ts`.** Replace the parse lines and the `if (!Array.isArray(content)) continue; for (const ex of content) { const name = (ex.exercise || "").toLowerCase().trim();` lines with:

```ts
          const parsed = workoutLogEntries(log.content);
          if (!parsed) continue;

          for (const ex of parsed.entries as any[]) {
            const name = exerciseName(ex).toLowerCase().trim();
```
  Keep the rest of the loop. Add the import.
- [ ] **Step 8: Verify the web build**
  Run (repo root): `npm run check && npm run build`
  Expected: TypeScript passes and Vite builds.
  Manual check (owner): open a mobile-logged workout on the web as a coach. It shows exercises and sets. Edit one rep and save. The mobile app still opens that workout with the same plan day.
- [ ] **Step 9: Show the diff to the owner.** After approval, commit:

```bash
git add ../client/src/lib/workout-log-content.ts ../client/src/lib/workout-log-content.test.ts ../client/src/pages/WorkoutLogs.tsx ../client/src/components/WorkoutLogDialog.tsx ../client/src/hooks/usePreviousWorkoutData.ts
git commit -m "fix(web): read and preserve mobile v2 workout logs"
```

---

### Task 1.5: Make the development build the default start (F1e)

**Files:**
- Modify: `mobile/package.json` (`scripts`)
- Modify: `mobile/README.md` (section "Run")

- [ ] **Step 1: Find anything that asserts the old scripts**
  Run: `grep -rn "start --go" src scripts .maestro README.md docs/release | head`
  Update any test or doc that checks the literal `"start": "expo start --go"` so it expects the new values below.
- [ ] **Step 2: Change the scripts.** In `package.json`, replace the three Expo Go scripts:

```json
    "start": "APP_VARIANT=development expo start --dev-client",
    "start:go": "expo start --go",
    "android": "APP_VARIANT=development expo start --dev-client --android",
    "ios": "APP_VARIANT=development expo start --dev-client --ios",
```
  Leave `start:dev` unchanged. Older docs refer to it.
- [ ] **Step 3: Update README "Run".** Replace the first code block and the sentence after it with:

```md
```bash
npm start            # development build (widgets, HealthKit, Live Activities work)
npm run start:go     # Expo Go — native-only features are unavailable
```

Install the development build first:
`npx eas-cli build --profile development --platform android`. Then open the
installed "Dawnage (dev)" app and scan the QR code from `npm start`.
```
- [ ] **Step 4: Verify.** Run `npm run verify`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add package.json README.md
git commit -m "chore(mobile): default to the development build"
```

---

### Task 1.6: First physical-device acceptance run (F1e) 🔒 OWNER GATE (EAS build and a real phone)

**Files:**
- Create: `mobile/docs/release/2026-09-26-device-acceptance.md`

- [ ] **Step 1: Owner builds.** Run: `npx eas-cli build --profile development --platform android`. Also run the iOS build if the Apple Developer account is active.
- [ ] **Step 2: Create the checklist file** with this exact content, then have the owner fill in the Result column on the device:

```md
# Device acceptance — 2026-09-26

Device: <model, OS version> · Build: <EAS build id> · Tester: <name>

| # | Flow | Steps | Result (pass/fail + note) |
|---|---|---|---|
| 1 | Sign in | Sign in with a client test account | |
| 2 | Onboarding | New account → onboarding → Home | |
| 3 | Check-in online | Complete all 4 steps → "Saved and synced" | |
| 4 | Check-in offline | Airplane mode → submit → "Saved on this device" → reconnect → synced | |
| 5 | Workout | Start today's session, complete 3 sets, rest timer runs, save | |
| 6 | Workout offline | Airplane mode mid-workout → save → reconnect → appears in History | |
| 7 | Photos | Capture 4 angles; ghost overlay visible from week 2 | |
| 8 | Health import | Check-in → Import from health app → review → apply | |
| 9 | Reminders | Enable daily reminder at now+2 min → tap notification → opens check-in | |
| 10 | Widgets / Live Activity (iOS) | Add widget; start workout → Lock Screen shows rest timer | |
| 11 | Dark mode | Switch system theme → all tabs readable | |
| 12 | Large text | Largest accessibility text size → Home, check-in and logger reflow, nothing clipped | |
| 13 | Screen reader | TalkBack/VoiceOver: complete one check-in step | |
| 14 | Web coach view | On the web, coach opens the workout from step 5 → sets visible (Task 1.4) | |
```

- [ ] **Step 3: Triage.** For every fail, add a line under a `## Issues` heading with the file or flow suspected. Do not fix anything in this task.
- [ ] **Step 4: Commit**

```bash
git add docs/release/2026-09-26-device-acceptance.md
git commit -m "docs(mobile): record first device acceptance run"
```

**Phase 1 exit:** Tasks 1.1–1.6 are checked, or the owner has explicitly deferred them. `npm run verify` passes.

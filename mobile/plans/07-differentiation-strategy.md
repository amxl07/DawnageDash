# 07 — What would actually make Dawnage the best fitness app

Second research pass over the ten repos, going deeper than the technique survey
in `06`. This one asks a different question: not "what effects can we copy" but
"what can Dawnage do that none of them can".

---

## 1. The finding

I checked every repo for a coach↔client relationship. Raw counts looked
promising — liftosaur mentions coach/trainer/client in 184 files — so I read
them. They are image preloaders, exercise descriptions, affiliate marketing
copy and a product tour. Its "AI" pages generate programs from a prompt.

**None of the ten apps has a second human reading your data.**

| Repo | What it is |
|---|---|
| liftosaur | Self-directed + a scripting DSL (Liftoscript) + AI program generation |
| LiftLog | Self-directed + a social *feed* (followers, profiles) |
| PerfectGymCoach | Self-directed, despite the name |
| skulpt, Flexify, Kenko, SwiftLift, FitnessApp, flutter_3_ui | Self-directed trackers |

Dawnage is structurally different: **77 of your 108 clients have a `coach_id`.**
A real person writes their plan, reads their weekly feedback, and replies.

**And the mobile app never renders that person anywhere.** The word "coach"
appears in exactly two places in the UI — a text placeholder ("Anything your
coach should know?") and a questionnaire caption. Everything else is a query
filter.

## 2. The strategic consequence

Competing on visual effects is a race Dawnage cannot win and does not need to.
liftosaur has ~10 years and 235 components. The Skia-heavy demos require
abandoning Expo Go. Adding a twelfth animation does not make an app the best.

**The differentiator is the relationship, and it is currently invisible.**

Every screen in Dawnage today is a solo experience that happens to send data
somewhere. The client submits a weekly check-in, gets told "detailed feedback
within 48 hours", and then — inside the app — nothing ever comes back.

---

## 3. Priority A — make the coach present

Grounded in data that already exists. No schema change needed for A1–A3.

**A1. Coach identity — ⛔ BLOCKED BY RLS. Needs your decision.**

I verified every SELECT policy on `public.users` across the migration files:

| Policy | Direction |
|---|---|
| `Users can view own profile` — `auth.uid() = id` | self only |
| `Coaches can view all clients` / `…assigned clients` | coach → client |
| `Admins can view all users` | admin → all |

**There is no policy letting a client read their coach's row.** The relationship
is one-directional. The coach's name is right there in the database
(`full_name: "Amal Manoj"` on the test account's `coach_id`), but a client's JWT
cannot select it. Building the UI would silently render nothing.

Unblocking needs one additive policy, e.g.:
```sql
CREATE POLICY "Clients can view their assigned coach"
ON public.users FOR SELECT
USING (id = (SELECT coach_id FROM public.users WHERE id = auth.uid()));
```
Per `00-MASTER-PLAN.md` rule 3 this is **your call, not mine to run.** Note it
exposes the coach's whole row to their clients — a column-limited view would be
tighter if `avatar_url`/`full_name` is all that's needed.

**A2. Plan provenance — ✅ SHIPPED.**
`workout_plans` and `meal_plans` both carry `created_at` + `updated_at`
(verified — and *missing from `01-data-contracts.md`*, now corrected there).

- `usePlanProvenance` derives the newest `updated_at` across the plan's days and
  compares it against a device-local "last seen" in AsyncStorage.
- Plans header shows "Last updated 3 days ago", or "**Updated by your coach**"
  with a dot when it changed since the client last looked.
- The Dashboard carries a tappable card when the plan changed — a coach update
  is news, so it belongs above the fold rather than behind a tab.
- Opening Training marks it seen.

**A3. Close the 48-hour loop — the single highest-value change.**
`weekly_check_ins` is insert-only and nothing is ever shown back. Make the
weekly feedback a **thread**, not a form submission:
- After submit: "Sent to {coach}. Typically replies within 48 hours."
- A visible pending state with elapsed time.
- The coach's reply rendered against the week it answers.

**This needs an additive DB change** (a reply column or a small
`weekly_check_in_replies` table) and the coach-side web UI to write it.
Per `00-MASTER-PLAN.md` rule 3, that is a **decision for you, not something to
implement unasked**. It is the highest-leverage item in this document.

**A4. Coach notes — ✅ ALREADY DONE (by you).** The Plans screen now groups
`training_note` / `cardio_note` / `steps_note` into one "Coach notes" card. The
original observation still stands: `cardio_note` = "30mins",
`steps_note` = "2333" on the test account; `training_note` and `nutrition_note`
are blank. Coaches are using the fields inconsistently. Surface them as
first-class "From your coach" cards so writing them has visible value.

---

## 4. Priority B — craft borrowed from the deeper read

**B1. `isNext` set highlighting — liftosaur `workoutExerciseSet.tsx`.**
Their set row marks which set you are *on*, so the logger guides rather than
presenting a passive table. Ours shows equal rows. Highest-value logger change.

**B2. Content-derived column widths — same file.** They compute set-row column
widths from the RPE label length, whether the lift is unilateral, and the
current font scale (`computeSetColumnWidths`). That is what makes a dense row
survive Dynamic Type. Ours uses fixed widths and will break at large text.

**B3. Warmup sets as a distinct type.** liftosaur marks warmups "W" and excludes
them from volume. Our schema stores flat straight sets; this would be additive
JSON, no migration.

**B4. `borderCurve: 'continuous'`** — iOS squircles instead of circular corner
radii. One property, applies to every Card. Free polish.

**B5. Progress-driven bars — `demos/miles-bar-chart`.** One shared value drives
height *and* colour through `interpolate` + `interpolateColor`, spring
`{dampingRatio: 1, duration: 500}`. Better than our static bars.

**B6. `drag-to-sort` (pure Reanimated)** — reorder exercises in the logger.
Uses `Gesture.Pan` + `scrollTo` + `useAnimatedReaction`.

---

## 5. Explicitly not worth chasing

| Rejected | Why |
|---|---|
| A Liftoscript-style DSL | Wrong user. Their coach writes the programming; the client should never author logic. |
| A social feed (LiftLog) | Dawnage's relationship is 1:1 and private. A public feed dilutes it and creates a moderation burden. |
| Skia visuals | Forfeits Expo Go, which is the entire dev loop on this machine. |
| More themes (Kenko's 4) | Light mode is not yet verified on device. |
| AI program generation | The coach is the product. Automating them away removes the differentiator. |

---

## 6. Sequencing

**First: A1, A2, A4** — coach identity, plan provenance, coach notes.
All read-only against existing data. No schema change, no coach-side work.
This alone converts the app from a tracker into a coached experience.

**Then: B1, B2** — the logger becomes a guide instead of a table.

**Then, if you approve the schema change: A3** — closing the feedback loop.
It is the most valuable item here and the only one needing a migration plus
coach-side web work.

**Last: B3–B6** — craft polish.

The honest summary: Dawnage does not need to out-animate liftosaur. It needs to
stop hiding the one thing liftosaur can never have.

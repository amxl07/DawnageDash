# Research & design brief — rework the Dawnage daily check-in

Copy everything between the rules below into a fresh research/brainstorming
session. It is written to be self-contained: the reader needs no access to this
repo. Update the "current design" section if the screen changes.

---

## THE PROMPT

You are a senior product designer specialising in habit-forming mobile
interfaces. I want you to **research widely, then design a daily check-in
experience from scratch.** Do not give me a list of generic UX tips — I want a
specific, opinionated, buildable design with a point of view.

### The product

**Dawnage** is a 1:1 online fitness-coaching app (React Native / Expo, iOS +
Android). It is **not** a self-directed tracker. Every client has a **real human
coach** who writes their training and nutrition plan, reads their data, and
replies with feedback. ~77 active coached clients today, mostly in India.

The daily check-in is the heart of the product. It is how the client reports
their day and how the coach knows what is happening between sessions.

### The problem

The client answers **the same 12 questions every single day, forever.** They
have been using this exact question set and grading for a long time and it works
— the coach depends on it.

The problem is not the questions. The problem is that doing them daily is
**monotonous**, and the app currently gives nothing back in the moment. It is
pure extraction: 16 fields in, a spinner, a checkmark, done. Retention on a
daily habit dies here.

I need a design that makes the same task feel **alive, tactile and worth doing
every morning** — for months — without changing what is asked.

### HARD CONSTRAINT — the data cannot change

These 12 fields are fixed. Do not add, remove, merge
any of them. Do not propose "ask fewer questions." Do not propose AI
auto-filling answers. The coach reads this exact shape.

| # | Field | Type | Range / options |
|---|---|---|---|
| 1 | Morning weight | decimal | 20–400 kg, 0.1 steps |
| 2 | Sleep hours | decimal | 0–24 h, 0.5 steps |
| 3 | Workout status | enum | Done · No · Cardio · Rest |
| 4 | Workout performance | integer | 1–10 (only if Done or Cardio) |
| 5 | Nutrition score | integer | 1–10 |
| 6 | Calorie intake | integer | 0–20,000 kcal |
| 7 | Water | decimal | 0–20 L, 0.25 steps |
| 8 | Daily steps | integer | 0–200,000 |
| 9 | Energy level | integer | 1–10 |
| 10 | Hunger level | integer | 1–10 |
| 11 | Stress level | integer | 1–10 |
| 12 | Digestion | enum | Normal · Bloated · Constipated · Diarrhea |

**Every field is not optional** — the client may submit a partial check-in. One
check-in per calendar day (database-enforced). Past days can be backfilled.

### What the app already knows (use this — it is the biggest unused asset)

Each client has **months of their own check-in history**, densely filled:
weight 100%, nutrition 100%, energy 100%, stress 100%, water 100%, sleep 98%,
steps 85% of days. The app currently never uses that history *while the client
is answering.*

### Technical constraints (a design I cannot build is worthless)

- **React Native + Expo SDK 54**, Reanimated 4, Gesture Handler, react-native-svg.
- **Must run in Expo Go** → **no Skia**, no custom native modules. Anything
  requiring a native build is out.
- Animations must run on the UI thread and degrade to nothing under the OS
  **Reduce Motion** setting.
- Must meet **WCAG AA**: 44pt touch targets, screen-reader labels, roles and
  values on every control, no meaning carried by colour alone, must survive the
  largest Dynamic Type setting.
- Phone, portrait only.

### Brand

Dark-first. Near-black ground `#0B0B0C`, cards `#131416`, one red accent
`#F04E45`. Inter for UI, Poppins for numbers. Restrained and premium — think
instrument, not toy. There is also a light theme.

### Tone — this one is easy to get wrong

The app **reports; it never judges.** Clients may be deliberately gaining weight
on a coach-prescribed bulk. A cheerful "great job, you're down!" is actively
wrong. **No praise, no scolding, no verdicts.** The coach interprets; the app
reflects. Neutral and factual.

Also: **no gamification.** No points, badges, levels, leaderboards or confetti.
This is a professional coaching relationship, not a mobile game. Streaks may
exist only as quiet fact, never as pressure.

### Current design (what you are replacing)

A 4-step wizard — Readiness → Recovery → Adherence → Finish — with a progress
bar and a sticky Continue/Submit bar. Inputs are `+`/`−` steppers for numbers,
tappable 1–10 rows for scales, and segmented buttons for the two enums. There is
a "Same as yesterday" chip that copies forward the previous entry's numbers.
Submit is only available on the final step. Fields are unevenly distributed:
~3 on step one, ~10 on step three.

It is competent and unremarkable. Feel free to keep, restructure, or discard it.

---

## WHAT I WANT FROM YOU

**Phase 1 — Research.** Go wide, then be specific. Look at:
- Daily-input products people genuinely keep using for years — mood and habit
  trackers, sleep and health logs, journalling apps, medical symptom diaries,
  finance apps with daily entry.
- Interfaces where *entering a value is itself pleasurable* — dials, drags,
  sliders, physical-feeling controls, haptics.
- Rituals in software: what makes a repeated action feel like a practice rather
  than a chore. Look outside fitness.
- The research on habit formation, self-monitoring and reflection — and where
  gamification demonstrably backfires for adults in a professional context.

For each reference: name it, say **specifically what it does**, and say whether
it would survive my constraints. Do not list apps without mechanisms.

**Phase 2 — Diagnose.** In your own words, why does a daily 16-field form get
boring, and what actually fixes it? Argue a position. If you think "faster" is
the answer, defend it against the objection that a 10-second form done 365 times
is still boring.

**Phase 3 — Design.** Give me **three genuinely distinct directions**, not one
idea in three costumes. For each:
- The central metaphor in one sentence
- How all 16 fields are grouped and sequenced
- What the client actually touches for each input type
- What the app gives back, and when
- What the finish/submit moment is
- Why someone still wants to do it on day 200
- Honest weaknesses and who it would annoy

Then **recommend one** and say why the others lose.

**Phase 4 — Specify.** For the recommended direction, give me enough to build:
screen-by-screen flow, every control named with its interaction, motion (with
durations and easing), haptic moments, the empty/first-run state, the
partial-submit state, the backfill-a-past-day state, error states, and the
accessibility model for every custom control.

### Rules for your answer

- Be concrete. "Add micro-interactions" is worthless; "drag horizontally with a
  selection haptic every 0.1 kg, odometer digits above the dial" is useful.
- Every idea must map to the 16 fields above. If it needs new data, cut it.
- Anything needing Skia or a native module is out — say so and give an
  alternative.
- Tell me what you would *not* do and why.
- If you think part of my brief is wrong, say so and argue it.

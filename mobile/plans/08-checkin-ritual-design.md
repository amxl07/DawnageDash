# 08 — Making the daily check-in worth doing

**Hard constraint: not one question changes. Not one column changes.** Every
idea below maps onto the 16 fields already collected. Clients keep the grading
they know; the coach keeps the data they read.

---

## 1. Diagnosis — and why "make it faster" was the wrong answer

I argued twice for a faster check-in. That was solving the wrong problem.

A ten-second form done 365 times is still boring. Speed is not the opposite of
boredom — **response** is.

The real defect: **the check-in only ever takes.** Sixteen fields of extraction,
a spinner, a checkmark, done. The client hands over their morning weight, their
sleep, how they actually felt — and the app says nothing back. Day after day
they narrate their life to something that never reacts.

Meanwhile the app is sitting on **64 check-ins of that same person's history**,
and never once uses it in the moment.

Verified density (last 40 entries): weight 100%, nutrition 100%, energy 100%,
stress 100%, water 100%, sleep 98%, steps 85%. There is more than enough
history for the app to have something to say about almost every value.

---

## 2. The idea — "Today's card", and an app that notices

Two moves, both free of schema change.

### A. The check-in is not a form. It is a card you are building.

A compact **Day Card** sits pinned at the top of every step and fills in as you
answer — weight becomes a number, workout becomes a glyph, energy becomes a bar.
You are not completing a questionnaire; you are **making today's entry in your
own record**, and you can see it taking shape.

On submit, the card does not vanish into a toast. It **files itself into the
consistency grid** — the same grid already on the Dashboard — landing in today's
cell. The artifact you just made becomes a permanent square in a year of squares.

That reframes the whole task: from *reporting to the system* to *adding to your
own record*.

### B. Every answer gets answered.

The instant a value is set, one quiet line appears beneath it, drawn from that
client's own history:

| They enter | The app says |
|---|---|
| Weight 82.4 | `−0.4 from yesterday · lowest in 9 days` |
| Sleep 7.5 | `your best this week · you average 6.9` |
| Steps 11,200 | `over 10k — 4th time this week` |
| Nutrition 8 | `5 days in a row at 8 or better` |
| Energy 9 | `highest since Tuesday` |
| Water 3.5 | `above your 2.9 average` |
| Stress 2 | `lowest in two weeks` |

**This is the anti-boredom mechanism.** The questions are identical every day;
the responses never are, because the history behind them changes daily. Same
ritual, different conversation.

### The rule that keeps it honest

**The app reports, it never judges.** This client's weight has gone 75.0 → 89.2.
That might be a bulk the coach prescribed. So: `+0.3 from yesterday`, never
"careful" or "great job". Neutral, factual, comparative.

Direction is coloured only where the client's own coach-set goal defines it —
and where there is no goal, it stays `mutedForeground`. **No praise, no scolding,
no emoji verdicts.** The coach is the one who interprets; the app just reflects.

---

## 3. Layer three — inputs that are pleasurable to touch

Answering should feel good in the hand, not just be quick.

| Field | Now | Proposed |
|---|---|---|
| Weight | ± stepper taps | **Drag dial** — sweep through values, `selectionAsync()` haptic tick per 0.1, odometer digits above (we already have the odometer) |
| Sleep | ± stepper | Same dial, 0.5 steps |
| Steps / calories | ± stepper | Dial with acceleration — drag further, move faster |
| Water | ± stepper | Dial, 0.25 steps |
| 1–10 scales | `CheckInRatingScale` | Already good — keep |
| Workout / digestion | Segmented | Already good — keep the new sliding thumb |

Technique from `demos/airbnb-slider` (verified pure Reanimated, no Skia):
`Gesture.Pan` + `clamp` + `withSpring`, with the odometer as the readout.

A dial is genuinely nicer than tapping `+` eleven times to move 1.1 kg — and it
makes the most-repeated action of the day feel like operating an instrument.

---

## 4. Layer four — one thing to notice today

A single line above step one, chosen from the data each morning:

> "Four days running at 8+ nutrition."
> "Sleep has been under 6.5 all week."
> "You're 0.6 kg from your lowest this month."

One per day, picked by whichever pattern is most notable. It gives the ritual a
**subject** — a reason today's check-in is not yesterday's. Purely derived; no
new data, no coach input required.

---

## 5. Layer five — the finish is a recap, not a spinner

The current celebration is a checkmark and one payoff line. Replace it with
**"what changed today"**: three or four lines the app noticed, then the Day Card
animating into the consistency grid.

That closes the loop. You gave something; you got a reading back; it is now part
of a visible record.

---

## 6. What this does NOT touch

- ❌ No question added, removed, or reworded
- ❌ No column, table, or payload shape changed
- ❌ No grading scale altered — 1–10 stays 1–10
- ❌ No streaks-as-pressure, no points, no badges, no confetti
- ❌ No AI, no auto-filled answers

Everything is derived at read time from `daily_check_ins` rows the client
already owns.

---

## 7. Build order

1. **`useCheckInInsights`** — pure functions over history: per-field comparison,
   personal bests, run lengths. Testable with zero UI. *(This is the whole
   product; build it first.)*
2. **Inline response lines** under each field. Highest value per line of code.
3. **`ValueDial`** — the drag input, replacing steppers for weight/sleep/water/steps.
4. **Day Card** — pinned, filling in across steps.
5. **"Notice" line** at the top of step one.
6. **Recap finish** + card-files-into-grid transition.

Steps 1–2 alone change the feel of the screen and can ship on their own.

### Gates
Pure Reanimated, no Skia · every animation via `useMotion()` · insight lines are
`accessibilityLiveRegion="polite"` so they are announced, not silently visual ·
no hex outside `src/theme/` · the contract verifier and 458 tests stay green.

---

## 8. One thing I will stop arguing about

The 4-step structure stays, and I will not raise submit-early again — you have
shaped it deliberately across seven commits. It is your call and it is made.

Worth noting only as a fact: step three (`adherence`) holds ~10 of the 16 fields
while step one holds ~3. If the dial and response lines slow that step down,
moving two fields to step two would even the rhythm without touching what is
asked.

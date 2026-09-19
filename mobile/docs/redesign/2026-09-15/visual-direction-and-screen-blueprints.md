# Visual direction and screen blueprints

These are proposed low-fidelity compositions and art-direction instructions, not rendered app screenshots or finished visual designs. They make the [master direction](../../superpowers/specs/2026-09-15-premium-experience-design.md) concrete before F01 produces matched visual frames.

## The visual idea

**Refined Dawnage:** the calm of a private coaching practice, the precision of a training instrument, and the readability of an editorial journal.

The product should feel personal because it remembers the right work and presents relevant context. Its visual quality comes from deliberate proportions, excellent type, precise controls, and smooth transitions. A new illustration on every screen is unnecessary.

| Layer | Treatment |
| --- | --- |
| Canvas | Deep graphite in dark appearance; warm off-white in light |
| Brand presence | Existing Dawnage mark, restrained coral, recognizable numeric treatment |
| Content | Open sections and aligned rows; stable opaque surfaces for data |
| Primary action | One clear coral-filled action or accented action surface |
| Personal context | Real first name, permitted coach identity, actual previous entry dates |
| Detail | Fine dividers, continuous corners where supported, tabular numbers, exact optical alignment |
| Depth | A small number of elevations; native material only in functional chrome |
| Motion | Immediate press/selection response, direct manipulation, short state transitions |

Light appearance must be composed and reviewed independently. It is not a white-background afterthought. Warm canvas and crisp neutral text should feel equally intentional.

## B01. Setup — a calm introduction

**Frame IDs:** D-O01 / L-O01, goal selection; D-O03 / L-O03, review. Prefix D/L indicates theme.

~~~text
[Back]                                      1 of 3

Dawnage

What are you
working toward?

Your coach will use this as context.

[icon] Fat loss                            [selected]
       Build a sustainable routine

[icon] Build muscle                           [circle]
       Train toward strength and size

[icon] Performance                            [circle]
       Support your training goals

[icon] Consistency                            [circle]
       Make your routine easier to maintain

[play] Meet the Dawnage approach       Optional

[                 Continue                  ]
~~~

Use the goal labels and stored keys already present. Supporting copy is proposed and must be checked against the actual service. Avoid health guarantees or implying that selecting a goal creates an individualized plan immediately.

The title is the dominant object. Selection rows are generous and easy to scan; a selected row gains a checkmark, stronger outline, and quiet fill. Continue stays stable. No automatic advance or success celebration after every choice.

Review shows chosen goal, timezone, and the three-part coaching rhythm with visible Edit controls. Finish copy is “Start with today,” after the persisted completion succeeds. On a short phone, content scrolls while the action remains reachable; at large text, the dock may move into the flow.

**Visible quality criteria:** no cramped four-option segmented control, no mandatory video interruption, no truncated labels, no unexplained permission prompt.

## B02. Home — Today Brief

**Frame IDs:** D-H01 / L-H01 populated; D-H02 / L-H02 first use; H-QUEUE pending variant.

~~~text
TUESDAY, 15 SEPTEMBER                 [profile]

Good morning, Alex
[real coach identity, when available]

YOUR NEXT STEP
Your daily check-in
A clear record for your coach.

[                 Check in                  ]

THIS WEEK                              View history
Mon     Tue     Wed     Thu     Fri     Sat     Sun
14      15      16      17      18      19      20
saved   today   future  future  future  future  future

NEXT SESSION                           View plan
Upper body
Day 2 · 5 exercises
[                 View session              ]

YOUR RECENT RECORD
Weight                         72.4 kg
Latest entry · 14 Sep
7-day sleep average             7.2 h
Based on 4 entries · 8–14 Sep

Assessment                             Resume
3 of 10 sections complete

[Home]    [Check In]    [Plans]    [Logs]    [You]
~~~

Alex and all values are fictional illustration data. Actual production metrics require the H03 selectors and explicit date windows. The blueprint's average uses the seven complete days 8–14 September; the implementation must label whichever explicit window the chosen selector uses.

One prominent action owns the first viewport. It can become “Resume workout” or “Continue your record” with the actual draft date. The action card's content changes; surrounding sections remain stable.

The seven dates are navigation, not seven tiny score rings. A saved/pending marker also has an accessible text state. Future dates are visibly unavailable. Long weekday labels may shorten visually while preserving full accessible names.

The next session shows an actual assignment and source. “View session” can lead to the pre-session summary; it does not imply a scheduled workout. If the record or plan is unavailable, replace that section with its honest state rather than reshuffling the entire page.

**Visual balance:** editorial header, one strong action, a quiet week strip, a useful session summary, then two concise observations. Avoid four competing hero metrics at the top.

## B03. Check-in — Daily Record

**Frame IDs:** D-C01 / L-C01 empty; D-C02 / L-C02 populated; C-KEYBOARD; C-ERROR; C-RECEIPT.

~~~text
Daily Record                         [calendar]
Tuesday, 15 September
Saved on this device

READINESS

Morning weight                             kg
                 72.4
       |   |   |   |   |   |   |
                 marker
[Type value]                 [Use 14 Sep value]
Recent range 72.1–72.8 kg · 6 earlier entries

Energy
[1] [2] [3] [4] [5]
[6] [7] [8] [9] [10]
[existing scale endpoint labels]

Stress
[accessible two-row rating]

RECOVERY
Sleep · Hunger · Digestion
[controls in their original order]

ADHERENCE
Workout · How did it go? · Nutrition score
Calories · Water · Steps
[Protein, Carbs, Fats disclosure]

NOTES
[Optional multiline input]

[Review]                   [Submit check-in]
~~~

This blueprint abbreviates lower sections for readability; it does not remove fields. The complete 16-field contract lives in C01. “How did it go?” remains conditional on Done/Cardio.

Large numeric values are tools. Keep units close enough to prevent ambiguity, a clear current marker, and direct typing visible. History is one supporting line, not a second dashboard below every field.

The submit region shows actual persistence state. A typed value under the keyboard must be included even if the user taps Submit before blur. Invalid submission reveals the field itself and explains the correction.

Receipt:

~~~text
[check icon] Saved and synced
Tuesday, 15 September

Your record is available to your coach.

[Compact factual summary]
[Up to two neutral, dated observations]

[Edit this record]                  [Back to Home]
~~~

For pending delivery, replace the heading with “Saved on this device · waiting to sync” and remove the coach-availability sentence. For newer unsaved edits after a successful submission, distinguish the submitted version from the current draft.

**Visible quality criteria:** selected-day clarity, strong field hierarchy, no reward animation for high/low health values, no disappearing failure message, and no extra mandatory confirmation step.

## B04. Workout — Workout Focus

**Frame IDs:** D-W01 / L-W01 active set; W-KEYBOARD; W-REST; W-OVERVIEW; W-FINISH.

~~~text
[Close]       Upper body                 [Overview]
Tuesday, 15 September · Draft saved

EXERCISE 2 OF 5

Bench press                              [demo]
3 × 8 · prescribed rest 90 sec
[Coach note, if actually supplied]

Previous session · 12 Sep
50 kg × 8

SET 1                         Work set
Weight                         Reps
[     50     ] kg              [      8      ]
[Details: optional RPE and set options]

[               Complete set                ]

2     Not completed                         [Edit]
3     Not completed                         [Edit]
[Add set]

[Previous exercise]                [Next exercise]

REST                                 [expand]
01:12                   [Pause]  [+15s]  [Skip]

[                 Finish workout            ]
~~~

The active set gets visual weight; surrounding sets remain accessible summaries. Completing it acknowledges the action and selects the next appropriate set without unexpectedly pulling the screen away.

The rest dock stays narrow and does not conceal weight/reps entry. At large text or with a short keyboard viewport, use the in-flow layout specified by the shared geometry rules. Detailed rest controls open only deliberately.

The overview shows exercise names, completed/incomplete set counts, and accessible jump actions. It does not create a new exercise-ordering feature. Finish provides a useful review with incomplete work clearly identified.

**Visible quality criteria:** exercise name wraps gracefully, units remain visible, advanced controls are discoverable, each set has stable identity, and the user can leave/resume without uncertainty.

## Microcopy system

Use plain factual language. Every status sentence must correspond to actual state.

| Situation | Proposed copy |
| --- | --- |
| Local write in progress | Saving on this device… |
| Local draft acknowledged | Saved on this device |
| Durable submission pending | Saved on this device · waiting to sync |
| Remote persistence acknowledged | Saved and synced |
| Remote permission/validation failure | Couldn't sync this record. Your changes are still on this device. |
| Local storage failure | Couldn't save on this device. Keep this screen open and try again. |
| Historical edit | Editing your record for 12 September |
| Missing plan after a successful lookup | No assigned workout is available yet. |
| Plan request failed | Couldn't load your plan. |
| Coach lookup unavailable | Couldn't load coach details. |
| Rest completed | Rest finished |
| Newer edit after submission | Earlier version synced · new changes saved on this device |
| Discard sheet | Keep editing / Save draft and leave / Discard local changes |

Use the failure text about retained local changes only when that write was actually acknowledged. A simultaneous storage failure needs the storage-failure message instead.

No “Perfect day,” “You failed,” “Best weight,” “Coach has seen this,” or invented response-time language. Copy may be warm, but it cannot manufacture judgment or service promises.

## Design review procedure

For each frame, review in this order:

1. **Task:** Is the next action obvious within five seconds?
2. **Hierarchy:** Do the first two visual focal points correspond to what matters?
3. **Information:** Are dates, units, source, and save status truthful?
4. **Geometry:** Can labels, keyboard, safe areas, and large text coexist?
5. **Interaction:** Does the component respond immediately and interrupt safely?
6. **Finish:** Are alignment, optical spacing, icon weight, number baselines, and transitions consistent?

Review grayscale screenshots for hierarchy and color-only mistakes, then both full-color themes. Compare a repeated daily task as well as a first-time impression. A striking hero screen cannot compensate for a slow daily form or unreliable workout editor.

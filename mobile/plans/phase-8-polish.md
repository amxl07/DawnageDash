# Phase 8 — Polish & Full UX Audit

Goal: the app reads as a deliberately designed premium product in BOTH themes, and every rule in `03-ux-standards.md` is provably satisfied. No new features; no data-layer changes.

**Reframe from the original plan:** accessibility, states, motion tokens, list virtualisation and both-theme support are *built in every phase* (`03-ux-standards.md` is binding from Phase 1). Phase 8 is the **audit that proves it**, plus the visual and identity work that genuinely can only be done once everything exists. If this phase turns into "adding the empty states we skipped", earlier phases were done wrong — say so in the summary rather than quietly catching up.

## A. Audit pass (screen by screen: Login, Onboarding, Questionnaire, Dashboard, Check-In, Measurements, Media, Weekly Feedback, Plans, Logger, Post-workout Summary, Profile, Settings)

Run the **per-phase quick check** from `03-ux-standards.md` against every screen, and record the result per screen in a table in the summary. Specifically verify:

1. **Token discipline** — `grep -rE '#[0-9A-Fa-f]{6}' mobile/src --include=*.tsx --include=*.ts | grep -v 'src/theme/'` returns **nothing**. Paste the command and its output in the summary.
2. **Accessibility sweep** — every interactive element has a label and role; `adjustable` controls expose values; decorative icons are hidden from the reader; charts have text equivalents; announcements fire on async success. Traverse the three highest-traffic screens (Dashboard, Check-In, Logger) end-to-end with VoiceOver **and** TalkBack.
3. **Contrast verification** — spot-measure the light theme in particular (it is where the original spec failed): primary text ≥4.5:1, secondary ≥3:1, interactive boundaries ≥3:1, chart series legible on white. Report measured numbers, not impressions.
4. **Dynamic Type** — every screen at the largest system text size: no clipping, no overlap, no truncated numbers. Cards grow.
5. **Reduced motion** — OS setting on: no translate/scale entrances, celebrations static, count-ups instant, haptics still firing. Nothing should feel broken, only calmer.
6. **Touch targets** — nothing under 44×44; adjacent targets ≥8 apart. The set-row steppers and the week strip are the likely offenders.
7. **Safe areas** — notched iOS, Android gesture nav: no tappable content under system chrome, no sticky bar covering the last field, no list hidden behind the tab bar.

## B. Consistency pass

1. Spacing rhythm (4/8/16/24/32), card radius and padding identical everywhere, all from tokens.
2. Typography hierarchy per `02-design-system.md` — Poppins + tabular figures wherever a metric appears; verify tabular figures actually render on Android and that fixed `minWidth` covers it where they don't.
3. Icon sizes from the `icon` token only, stroke 2 throughout, one family (lucide), filled vs outline never mixed at the same level.
4. Score-color rule applied uniformly — and never as the only signal.
5. **Emoji audit**: no emoji used as an icon, control, or status anywhere. Emoji in prose (streak line, welcome copy, notification text) stays.

## C. Motion pass

Reanimated, using the Phase-1 `useMotion()` tokens (150–250ms, `Easing.bezier(0.16,1,0.3,1)` in / faster out), restrained:
- screen fade/slide on tab focus; card press scale 0.97; staggered card entrance on dashboard first load only; animated number count-up on metric cards; progress-bar fill; the check-in celebration and PR celebration tuned with haptics choreographed to the visual beat; rest-timer ring smoothness.
- Nothing loops forever except the running rest-timer ring.
- Every one of these has a reduced-motion form already — verify, don't re-implement.

## D. App identity

Proper icon + splash from the Dawnage logo on brand background, all required sizes generated via `app.json`; adaptive icon for Android; status-bar style per theme; portrait lock confirmed.

## E. Performance

1. No dropped frames on the logger carousel, the dashboard scroll, or the media grid — test on a mid-range Android if one is available, and say which device.
2. Every unbounded list is a `FlatList` with `keyExtractor`, memoized rows, and a tuned window. Grep for `ScrollView` and justify each remaining one.
3. Chart data memoized; `expo-image` caching on every remote image; no anonymous functions passed as list-row props.
4. Cold start to interactive dashboard measured and reported.

## Acceptance criteria
- Per-screen audit table (all 13 screens × the quick-check items) in the summary, with honest fails listed rather than omitted.
- Screenshot pass of every screen in both themes, described or attached.
- The hex-grep command output is empty.
- VoiceOver and TalkBack traversals done on Dashboard, Check-In, Logger — findings reported.
- `tsc` clean; no console warning spam in Expo Go.

**STOP. Post summary. Wait for "continue".**

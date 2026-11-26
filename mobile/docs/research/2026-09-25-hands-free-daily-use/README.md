# Hands-free daily use: research and recommendations

Research date: 25 September 2026. Status: proposed product direction; no application features implemented in this research task.

## Recommendation

Make Dawnage usable through small captures throughout the day and a short, guided review when the day is finished. Voice, notifications, widgets and the ordinary editor should contribute to the same dated draft. The app should ask for information that is still missing and acknowledge what it actually saved.

The strongest first release combines actionable reminders, a few Siri quick-capture actions, interactive widgets and reliable shared drafts. Guided voice check-in is the signature next feature. Watch interactions and the newest system integrations follow after that foundation works on real devices.

**Every applicable daily check-in field remains required.** A partial capture is a draft, not a completed check-in. No shortcut should silently fill missing values, copy subjective ratings, estimate calories, or submit an incomplete record.

## Scope and evidence

This investigation combines the current repository, installed Expo native source, Apple and Android documentation, official product examples and two recent public Expo issue reports. API availability was checked against individual Apple symbol metadata and Android API references, rather than inferred from announcement dates. See [sources.json](sources.json) for retrieval dates, source URLs, evidence type and limitations, and [api-availability.json](api-availability.json) for the version matrix.

These are feasibility findings and product recommendations. There are no Dawnage user interviews, usage analytics or measured retention improvements behind the ranking. Product sites establish advertised interaction patterns, not their effectiveness. GitHub reports identify investigation targets, not the prevalence of a defect. Public documentation does not replace native device testing.

## What the app already provides

| Current foundation | Evidence | Opportunity |
| --- | --- | --- |
| Optional daily and weekly local reminders, with user-selected times | `src/lib/reminders.ts` | Replace generic repeating nudges with dated, actionable reminders reconciled with known completion state. |
| Notification taps open the editor | `src/hooks/useNotificationRouting.ts` | Handle action identifiers and text responses; preserve the reminder's intended date. Currently the daily date is calculated when the notification is tapped. |
| Persisted drafts, revision checks, validation and submission receipts/outbox | `src/features/checkin/useCheckInEditor.ts`, `persistence.ts`, `checkInOutbox.ts` | Reuse these rules across native entry points rather than create separate widget records. |
| Reviewed HealthKit / Health Connect import | `src/features/health/health-import.tsx` | Use accepted objective data to shorten a spoken review. Sleep import would be an additional integration. |
| iOS Home/Lock Screen shortcut widgets and workout/rest Live Activity | `src/features/native-surfaces/widgets.ios.ts`, `layouts.ios.tsx` | Evolve shortcuts into real capture actions and add controls to active workout surfaces. |
| Expo 57 and React Native 0.86 | `package.json` and installed modules | Native Swift/Kotlin work is needed for several recommendations; installing a JavaScript UI package is insufficient. |

The daily validator currently requires morning weight, sleep, energy, stress, hunger, digestion, training status, nutrition score, calories, water, steps, protein, carbs, fats and notes. Workout performance is additionally required when training status calls for it. The voice flow must use this same conditional validation. Explicitly dictated notes such as “Nothing else to add today” are a user answer; inserting that sentence automatically is not.

The prior [native verification report](../2026-09-25-native-daily-experience/verification.md) records generated iOS deployment 16.4 and Android minimum API 26, compile/target API 36. Native compilation and device acceptance remain outstanding because the required native toolchains were unavailable. Newer APIs need both build-time support and runtime fallbacks.

## Proposed experiences, in priority order

### 1. Reminders that help finish the actual record

Replace the single generic reminder with a small, user-controlled routine:

- An optional morning window for morning weight and the previous night's sleep.
- An evening window for daily totals, subjective ratings and notes.
- At most one gentle follow-up per chosen window, with snooze and a way to silence today's reminders.
- Cancel reminders when the relevant answers or a valid final submission are already saved locally. A complete submission waiting for network sync should not trigger a request to re-enter everything.

On an unlocked surface, a reminder can say “Your evening check-in has 3 answers left” **only when that count comes from current, applicable validation**. A private Lock Screen presentation can simply say “Continue your daily check-in.” Appropriate actions are “Continue” and “Later,” or a morning “Log weight” action with text input. OS keyboard dictation may reduce typing, but tapping a notification and dictating is low-touch, not completely hands-free.

Apple Health's medication experience is a useful interaction precedent: scheduled reminders, a follow-up when a log is missing, and quick logging/snooze on Apple Watch. Dawnage should borrow the contextual reminder pattern, without medication terminology or urgent medical alert behavior. [Apple example][medications]

Technical limit: a repeating local notification cannot consult fresh server state at the instant it fires. Start with dated, rolling local requests and reconcile after edits, submissions, native actions, app activation and time-zone changes. Delivery-time cross-device suppression would require additional backend/push design and still cannot know another device's unsynced draft. Do not advertise perfect suppression or exact delivery under every Focus/battery setting. [Notification actions][notification-actions] [Expo behavior][expo-notifications]

### 2. Siri quick capture

Provide a short list of well-defined App Shortcuts, using Dawnage's name in supported invocation phrases:

- “Log my morning weight in Dawnage: 74.2 kilograms.”
- “Add 250 millilitres of water in Dawnage.”
- “Start my Dawnage check-in.”
- “Undo my last Dawnage capture.”

These phrases illustrate the intended vocabulary; actual recognition and supported phrasing need device tests. Missing or ambiguous values prompt a question instead of guessing. A successful action returns a concise, truthful result such as “250 millilitres added to today's draft.” Undo should target the user's last applicable capture and respect later edits.

App Shortcuts are established platform functionality. iOS 26 interactive snippets add useful native confirmation and follow-up cards; `UndoableIntent` supplies platform integration, while Dawnage must still implement its own durable reversal rules. Siri exposure does not guarantee that every multi-step conversation will remain in Siri or work while locked. Begin with finite capture actions and use the app's voice session for the full check-in. [App Shortcuts][shortcuts] [Interactive snippets][snippets] [Undo][undo]

### 3. Interactive widgets and system controls

Upgrade the existing iOS shortcut widgets into a small, useful family:

| Surface | Proposed content/action |
| --- | --- |
| Small Home Screen widget | A dated record state and one primary action: continue, review or start voice. |
| Medium Home Screen widget | The same state, configured water portions and the next missing item. |
| Lock Screen widget | A compact private status or shortcut; use only the actions that fit its system family. |
| Control Center / Lock Screen control | “Voice check-in” or “Add my bottle,” with a configured volume. |
| Action button | A user-assigned Dawnage shortcut on compatible iPhones. |
| Android Home Screen widget | Equivalent quick capture and resume actions using Android-native widget support. |

Users should select which shortcuts they want. Avoid making the entire daily form miniature. A button must save an action durably before claiming success; changing the widget's displayed counter alone does not save the check-in. When the OS delays a widget refresh, show a dated status and avoid representing stale totals as live.

Interactive Apple widgets are available from iOS 17. System controls arrived in iOS 18. Android Lock Screen widgets depend on manufacturer rollout and device configuration, so Home Screen widgets and notifications remain the baseline. Expo's current widget package is iOS-only. [Widget interactions][widget-interactivity] [Apple controls][controls] [Android availability][android-lock-widgets] [Expo widgets][expo-widgets]

### 4. Guided voice check-in

This is the largest improvement to genuinely hands-free daily use. A person can give several answers in one sentence, correct them naturally, and answer only the remaining questions.

Example, with illustrative values:

> User: “My morning weight was 74.2 kilos. I slept seven and a half hours. Energy seven, stress four.”
>
> Dawnage: “I've captured those in today's draft. What's your hunger level, from one to ten?”
>
> User: “Six. Change energy to eight.”
>
> Dawnage: “Energy is eight. Hunger is six.”

The session continues through all remaining applicable fields, including nutrition totals and notes. At the end, it reads back the record or offers a compact visual review, then requests an explicit submission confirmation. “I'm not sure” preserves the unfinished draft. “Pause” ends recording and allows continuation later.

Use a restrained interface: one question, a live transcript, an explicit listening state, one clear stop control and a concise correction/undo affordance. An audible acknowledgement lets a person know whether input was understood and saved. Keep microphone recording separate from speech playback so the app does not transcribe its own prompts. Handle calls, audio interruptions, silence and headset disconnects.

Apple's current path is SpeechAnalyzer/SpeechTranscriber on supported iOS 26 devices and locales; iOS 27 adds microphone capture helpers. Android has an on-device speech recognizer from API 31 where a recognition service/model is available. Speech recognition only produces text: Dawnage still needs structured extraction, unit/date handling, validation and spoken output. Start with constrained field/value commands and correction rules; evaluate more open-ended parsing against real accents, decimal formats and noisy environments before widening the promise. Prefer local processing where supported and explain any network-based fallback. [Apple speech][speech] [iOS 27 capture][speech-capture] [Android speech][android-speech]

For a later system-initiated audio session, `AudioRecordingIntent` can integrate recording with App Intents. Apple's current documentation requires a Live Activity throughout recording; without it recording stops. This is an explicit, visible session, not an always-listening custom wake word. [Recording intent][recording]

### 5. Health-assisted spoken review

Reuse the existing reviewed imports to avoid asking people to dictate objective numbers already available. Present source, reporting day and partial-day status; ask permission to apply the candidate values. Then ask for remaining subjective answers and notes.

Weight and steps can come from supported providers and connected devices, but availability is not guaranteed. An afternoon weight must not become a morning measurement. Calories/macros must describe logged intake, not calories burned. Missing data must remain missing. Do not add Health water totals to manual bottle captures without a defined reconciliation rule; the same drink may be represented in both.

Sleep import is a worthwhile follow-on, but needs new permissions and explicit handling of overnight records, naps, overlapping sources and the reporting day. It is not part of the current import implementation. Background or locked-device Health access should not be assumed; use an authenticated review flow and the provider's actual availability.

### 6. Hands-free workout controls

During an explicitly active workout, support a limited vocabulary such as “Log ten reps at thirty kilos,” “Start a ninety-second rest,” “Add thirty seconds,” and “Pause workout.” Ask which exercise/set if the current context is ambiguous. Do not infer completed training from a timer finishing.

Add appropriate pause/resume/extend controls to the existing iOS workout Live Activity. On Android, use an eligible Live Update for an active workout, with an ordinary notification fallback. Android 17's new `Notification.MetricStyle` can display up to three metrics, making rest time, completed sets and elapsed time a particularly good fit. Promotion into the status chip is controlled by the system and user, not guaranteed by the app. [Android Live Updates][live-updates] [MetricStyle][metric-style]

For users who explicitly want an audible rest alarm, evaluate iOS 26 AlarmKit as a separate opt-in timer behavior. Do not turn routine daily check-in reminders into alarms. [AlarmKit][alarms]

### 7. Watch and headphone companion

An Apple Watch companion can provide configured water portions, short dictated answers, exact rating controls and a complication/Smart Stack entry that resumes today's draft. The existing workout Live Activity may already appear on supported Apple Watch configurations; a fully interactive Watch companion is additional work and requires cross-device conflict handling. Assess Wear OS after learning which watches Dawnage users actually own. [Widgets and complications][watch-widgets] [ActivityKit][activities]

For supported AirPods/Beats, explore user-enabled Siri notification announcements and compatible response actions. Do not promise that any Dawnage notification automatically gains hands-free replies or head-gesture controls. Test the precise category/action/device combination, and keep sensitive health information out of unsolicited spoken announcements. [Apple announcements][announcements]

### 8. Personal routines and emerging assistant integrations

Offer a few optional shortcut templates: a morning check-in routine, post-workout review, and a bedside/StandBy entry point. The person configures system automation triggers; Dawnage should not claim to detect every waking, charging or workout event itself. Home Screen placement and reminder settings remain useful even without automation. [Shortcuts triggers][automation]

iOS 27's `RunSystemShortcutIntent` is a promising configurable widget feature: users can choose a shortcut in widget configuration. It works through widget `Button(intent:)` and may open Shortcuts if interaction is required. It is an optional enhancement, not the prerequisite for Dawnage's ordinary Siri actions. [System shortcut intent][system-shortcut]

Android AppFunctions is the emerging route for authorized assistants such as Gemini to use native app actions. The documentation retrieved for this report explicitly calls the API experimental and Gemini integration a private preview with trusted testers. Prepare well-defined actions and evaluate a local pilot, but do not promise public Gemini support at launch. Older Google Assistant App Actions documentation is not evidence that the same integration works universally in Gemini. [AppFunctions][appfunctions]

## What is actually new, and what is established

| Capability | Documented availability | Decision for Dawnage |
| --- | --- | --- |
| App Shortcuts | iOS 16+ | Stable foundation for a few finite actions. |
| Interactive widgets / Live Activity buttons | iOS 17+ | Adopt after proving durable writes outside the running JS app. |
| Control Center / Lock Screen controls | iOS 18+ | Useful quick entry; user placement and device hardware matter. |
| SpeechAnalyzer/SpeechTranscriber, interactive snippets, UndoableIntent, AlarmKit | iOS 26+ | Selectively adopt with older-device and unavailable-model fallbacks. |
| CancellableIntent | iOS 26.4+ | Useful for cancellable operations; not essential for tiny writes. |
| CaptureInputSequenceProvider, RunSystemShortcutIntent, LongRunningIntent | iOS 27+ | New 2026 enhancements, gated by SDK/runtime support. LongRunningIntent is bounded user-triggered work with progress, not a permanent background service. |
| On-device Android SpeechRecognizer | API 31+, subject to service/model availability | Voice fallback strategy must be tested by device and locale. |
| Android Live Updates | Android 16+ foundation | Active workout use, with device/system fallback. |
| Android MetricStyle | API 37 / Android 17 | Strong latest visual upgrade for active workout metrics; current compile SDK 36 needs build work. |
| Android Lock Screen widgets | AOSP support following Android 16 QPR1; OEM rollout varies | Never advertise as universal phone support. |
| Android AppFunctions / Gemini | Android 16+; experimental / private preview respectively | Research pilot, not a launch dependency. |

Apple's June 2026 update pages were checked alongside individual symbol availability: appearing on a 2026 update page does not imply that every API first shipped in iOS 27. [App Intents updates][intents-updates]

## Interaction and visual design principles

Keep Dawnage's existing restrained brand colors, typography and spacing. Let system controls, Siri cards and notification layouts use their native rendering, tinting and accessibility behavior. Use Dawnage's accent for the primary action and status, without forcing a custom card onto every OS surface.

- Prefer one main action appropriate to the current state: capture, continue, review or view receipt.
- Use explicit states: listening, reviewing, draft saved, waiting to sync, submitted. Do not call all of them “done.”
- Keep exact numeric values, units and the reporting date visible during review. Voice corrections should immediately update the same content.
- Reserve animation for listening/processing/confirmation, respect Reduce Motion and avoid permanent pulsing elements.
- Give controls stable names that work with Apple Voice Control, Android Voice Access, VoiceOver and TalkBack. Native dictation is a useful fallback even before custom voice capture ships.
- Make Lock Screen content private by default. Any setting that exposes more detail should explain what becomes visible or spoken.
- Keep setup small: reminder windows, preferred voice language and selected quick actions. Enabling a capture method is optional; the fields required to submit remain unchanged.

Official examples worth borrowing from are WaterMinder's configured portions and quick logging, Waterllama's widget/watch access, Streaks' compact task state, and Apple Health's contextual reminders. These establish useful patterns, not evidence for copying their entire appearance or completion rules. Some product-site copy references older OS features, so implementation choices should follow current platform documentation. [WaterMinder][waterminder] [Waterllama][waterllama] [Streaks][streaks]

## The engineering prerequisite: one trustworthy capture path

Every entry point must act on the same account and dated draft. A native action should produce a persisted command and a truthful receipt, with enough identity to avoid applying it twice. Requirements include the account/session identity, intended reporting date and time zone, action ID, units, source, creation time, operation type and a conflict policy when the draft has changed.

“Add 250 ml” is an increment event. “Today's water total is 2 litres” is a replacement total. They cannot use identical merge behavior. Undo must compensate the intended event or restore a value only when doing so will not overwrite a later edit. Historical notification actions must not silently write into today, and signing out must invalidate old actions and visible account state.

The current editor controller lives in React/JavaScript and cannot simply be called from a Widget extension. Installed Expo widget source distinguishes persisted widget props from interaction notifications sent through `NotificationCenter`. Its Live Activity interaction posts an event without a durable command queue. Expo's notification task documentation also distinguishes Android background/terminated action handling from iOS support. A JavaScript listener alone is insufficient evidence that a native capture will survive process termination. [Expo widgets][expo-widgets] [Expo notifications][expo-notifications]

Two recent reports reinforce the need for a focused device spike:

- [Expo #49828](https://github.com/expo/expo/issues/49828), opened 7 September 2026, reports missing widget interaction events on SDK 57. It remained open with no comments at retrieval.
- [Expo #49477](https://github.com/expo/expo/issues/49477), opened 27 August 2026, reports a lost first Live Activity action when the app is not running. It was closed by a request for a minimal reproduction, not a documented fix.

These are unverified external reports, not a claim that the current Dawnage shortcut widgets lose records. The app does not yet use those widgets for data entry. Before adopting interactive capture, demonstrate persistence and deduplication with the app terminated, locked and offline. Select a native shared store/command inbox or an equivalent verified integration; do not prescribe a simplistic unsynchronized array append across processes.

## Boundaries that keep the experience dependable

1. A widget, notification and Live Activity serve different purposes. Use a widget for glanceable state, a notification for a reminder, and a Live Activity for a bounded active session. Apple's documented maximum is eight active hours, with up to four more on the Lock Screen. Current scheduling features do not make it a permanent daily reminder. [ActivityKit][activities]
2. Avoid always-listening microphone use. Android's recognizer explicitly is not intended for continuous recognition. Use OS assistants or short, explicitly started sessions. [Android speech][android-speech]
3. Choose App Intent authentication policies deliberately. Apple's default permits locked execution; health-history access and final submission should receive an explicit policy. Do not promise access to protected health data while locked. [Authentication][intent-auth]
4. Preserve ordinary manual entry when permissions, speech models, native modules or new OS APIs are unavailable.
5. Do not silently infer subjective ratings from sentiment, intake from a meal description, or observed values from goals. Any future estimates need separate product design and explicit review.

## Suggested delivery sequence and acceptance

| Phase | Scope | Evidence needed before expanding |
| --- | --- | --- |
| 1. Reliable capture foundation | Native proofs; shared dated drafts; increments/replacements; receipts; undo; account boundaries | No lost or duplicated captures across cold start, offline use, replay and account/date changes. |
| 2. Everyday quick capture | Actionable reminders, Siri single-value actions, interactive iOS widgets/controls and Android Home widget | Correctly suppress known-complete reminders; verify actual saved values from every surface, including locked-device policy. |
| 3. Guided voice | Multiple explicit answers, missing-field questions, correction, pause/resume, Health-assisted review, spoken submission confirmation | All applicable required fields validated; ambiguous speech prompts for correction; interruptions do not submit or lose the draft. |
| 4. Workout and wearable access | Live Activity controls, Android workout notification/MetricStyle where supported, Watch companion and tested headphone behavior | Timers agree with the app; exercise/set context is correct; cross-device edits remain consistent. |
| 5. New system experiments | iOS 27 configurable routine widgets; Android AppFunctions/Gemini pilot when eligible | Document actual supported OS/device/assistant paths; no dependency on unavailable public access. |

Voice testing should cover decimal separators, kilograms/pounds, litres/millilitres, noisy gyms, accents, changed answers and misunderstood field names. Notification testing should cover midnight, daylight-saving transitions, travel, delayed delivery, denied permission, snooze, queued submissions and replayed responses. Measure completion time, hands-on interactions, speech corrections, reminder dismissals/false reminders and successful completion without touching the app. Do not promise a specific speed or retention improvement before a small user pilot.

**Recommended next step:** prove durable native capture and then ship smarter reminders plus Siri quick logging. That foundation makes guided voice check-in, interactive widgets and Watch input reliable parts of one daily experience.

[medications]: https://support.apple.com/en-us/105064
[notification-actions]: https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types
[expo-notifications]: https://docs.expo.dev/versions/latest/sdk/notifications/
[shortcuts]: https://developer.apple.com/documentation/appintents/appshortcutsprovider
[snippets]: https://developer.apple.com/documentation/appintents/displaying-static-and-interactive-snippets
[undo]: https://developer.apple.com/documentation/appintents/undoableintent
[widget-interactivity]: https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities
[controls]: https://developer.apple.com/documentation/widgetkit/creating-controls-to-perform-actions-across-the-system
[android-lock-widgets]: https://android-developers.googleblog.com/2025/03/widgets-on-lock-screen-faq.html
[expo-widgets]: https://docs.expo.dev/versions/latest/sdk/widgets/
[speech]: https://developer.apple.com/documentation/speech/speechtranscriber
[speech-capture]: https://developer.apple.com/documentation/speech/captureinputsequenceprovider
[android-speech]: https://developer.android.com/reference/android/speech/SpeechRecognizer
[recording]: https://developer.apple.com/documentation/appintents/audiorecordingintent
[live-updates]: https://developer.android.com/develop/ui/views/notifications/live-update
[metric-style]: https://developer.android.com/reference/android/app/Notification.MetricStyle
[alarms]: https://developer.apple.com/documentation/alarmkit
[watch-widgets]: https://developer.apple.com/documentation/widgetkit/widgets-and-complications-collection
[activities]: https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities
[announcements]: https://support.apple.com/en-us/102536
[automation]: https://support.apple.com/guide/shortcuts/event-triggers-apd932ff833f/ios
[system-shortcut]: https://developer.apple.com/documentation/appintents/runsystemshortcutintent
[appfunctions]: https://developer.android.com/ai/appfunctions
[intents-updates]: https://developer.apple.com/documentation/updates/appintents
[waterminder]: https://waterminder.com/
[waterllama]: https://waterllama.com/
[streaks]: https://streaksapp.com/
[intent-auth]: https://developer.apple.com/documentation/appintents/appintent/authenticationpolicy

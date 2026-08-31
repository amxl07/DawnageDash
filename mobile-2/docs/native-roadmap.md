# Native follow-on roadmap

This roadmap deliberately keeps native, permission-heavy, and policy-sensitive work out of the Expo SDK 56 core. Each phase needs a custom development build and physical-device validation; none belongs in Expo Go. Treat every phase as a separately designed and reviewed subproject, not a switch to turn on.

## Phase 1 — Health data foundations

### Apple HealthKit

- Add HealthKit capability and explicit iOS usage descriptions for the precise read/write data types; request only the types the active feature needs.
- Define consent, revocation, sync direction, provenance, conflict resolution, and an on-device/off-device data retention model before implementation.
- Validate on a physical iPhone and include Health data use in App Store privacy disclosures. HealthKit access must not gate the rest of the app.

### Android Health Connect

- Support Health Connect’s Android-version/package availability and declare only granular Health Connect permissions required for the chosen records.
- Build an account-linking and sync policy independent of Apple HealthKit, then verify first-run, revocation, and unavailable-provider behavior on physical Android devices.
- Update Play Data safety and Health Connect declarations; do not promise parity until each platform’s data model and policy have been validated.

## Phase 2 — Scheduled and user-visible work

### Background tasks

- Use a native-aware scheduler (for example Expo Task Manager/background task support where its OS limits fit) only for bounded, idempotent sync and refresh work.
- Design for iOS/Android scheduling discretion, battery/network constraints, killed-app behavior, retry/backoff, and no guarantee of an exact run time.
- Add user controls, telemetry without health-content leakage, and real-device tests for delivery after reboot, backgrounding, and offline recovery.

### Notifications

- Add local and/or push notifications only after defining consent, frequency limits, quiet hours, deep links, and data-minimizing lock-screen copy.
- Request notification permission contextually; configure iOS push credentials/capability and Android notification channels, runtime permission behavior, and Play/App Store privacy disclosures.
- Test denied permission, changed system settings, time zones, and notification taps on real devices.

### Widgets and Live Activities

- iOS widgets need a WidgetKit extension, shared App Group data, timeline policy, and a minimal non-sensitive presentation; Live Activities need ActivityKit, supported iOS versions, lifecycle handling, and possibly push-update infrastructure.
- Android widgets need an AppWidget/Glance implementation, update scheduling, launch/deep-link behavior, and device/OEM testing.
- Do not surface private health details on a widget/Live Activity without a lock-screen privacy design and store-review assessment.

## Phase 3 — capture and assisted logging

### Barcode scanning

- Add camera permission copy, a native camera/scanner module, clear fallback to manual search, and device-specific scanner UX tests.
- Validate barcode database rights, malformed/duplicate codes, offline behavior, and photo/camera disclosures in App Store privacy and Play Data safety forms.

### Photo AI logging

- Decide whether inference is on-device or server-side before collecting photos; document retention, deletion, encryption, access controls, model limitations, and a correction-first UX.
- Request camera/photo-library permission only at the point of use, never upload without clear user action, and prevent sensitive image data from entering diagnostics.
- Add server abuse controls, cost limits, response validation, and platform privacy/disclosure review. AI estimates must be labeled as estimates, not medical or nutritional advice.

## Phase 4 — expanded health domains

### Workouts

- Add workout plans, live logging, exercise history, and optional HealthKit/Health Connect reconciliation as a standalone domain with its own schema and offline policy.
- Validate motion/health permissions only if actually used; test workout state transitions, background interruption, and multi-device consistency.

### Medications

- Treat medication names, schedules, reminders, and adherence as sensitive health data. Define jurisdiction, clinical-review boundary, emergency disclaimers, encryption, retention, and notification privacy before collecting it.
- Store review and legal/privacy assessment are required before shipping reminders or advice. Do not imply prescribing, diagnosis, or adherence guarantees.

### Cycle tracking and pregnancy

- Treat reproductive and pregnancy data as highly sensitive. Establish explicit consent, deletion/export, account recovery, regional availability, privacy policy, and non-medical guidance before UI work.
- Use an opt-in design; never infer these states from unrelated data. Obtain domain, privacy, and store-policy review before release.

### Family sharing

- Model separate people, roles, invitations, consent, audit history, revocation, and data ownership—not just shared login access.
- Address minors, guardianship, age gates, regional privacy laws, and account/data deletion flows before any shared health record is introduced.

### Localization

- Add locale-aware message catalogs, RTL layout validation, plural/date/number/unit formatting, translated accessibility labels, and content review.
- Keep health units, server time zones, notification scheduling, and regional medical copy separate from string translation. Test every supported locale on device.

## Release gate for every phase

Before merging a phase: add the needed config-plugin/native configuration, keep secrets out of `EXPO_PUBLIC_*`, update privacy/data-safety disclosures, test denial/revocation/offline paths on physical iOS and Android devices, run the core verification suite, and document any server migration or licensing effect. Compatibility with SparkyFitness remains HTTP-contract based: do not copy its source or assets, and preserve its non-commercial licensing boundary.

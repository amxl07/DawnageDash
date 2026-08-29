# Phase 7 — Reminders (on-device only)

No backend, no push tokens, no new tables. `npx expo install expo-notifications expo-device`.

## Requirements
1. **Settings screen** (`(app)/settings.tsx`, linked from More): 
   - Daily check-in reminder: on/off + time picker (default 08:00).
   - Weekly check-in reminder: on/off + day-of-week + time (default Sunday 18:00).
   - Theme override (system/light/dark) — bind UI to the Phase-1 AsyncStorage slot; switching must re-theme live, with no restart.
   - Each row is a labelled `Switch` (`accessibilityRole="switch"` + state); time pickers are the platform-native picker inside a `Sheet`, with the current value shown as text next to the label so the setting is readable at a glance.
   - Preferences persisted in AsyncStorage (`reminder-settings` JSON). (They are device-local by design; do NOT write them to the DB.)
2. **Permission flow**: before the OS prompt, show a friendly explainer card ("Get a nudge for your daily check-in — you can change this anytime"); request only when the user enables a reminder — never on app launch, which is the fastest way to get permanently denied. Denied → the toggle reverts to off with an inline hint and a "Open Settings" button (`Linking.openSettings()`), not a dead toggle that silently does nothing.
3. **Scheduling** (`src/lib/reminders.ts`):
   - Use `expo-notifications` **DAILY** and **WEEKLY** calendar-agnostic trigger types (`{ type: 'daily', hour, minute }` / `{ type: 'weekly', weekday, hour, minute }` — check current SDK enum names). These fire in the device's local timezone — no timezone math. Do NOT use the iOS-only calendar trigger.
   - Fixed identifiers `daily-checkin-reminder` / `weekly-checkin-reminder`; rescheduling = cancel that identifier then schedule → idempotent, no duplicates.
   - Notification content: daily → "Time for your daily check-in 💪" (encouraging, never guilt), data `{ url: '/check-in' }`; weekly → "Your weekly check-in is ready 📝", data `{ url: '/weekly-feedback' }`.
   - `reconcile()` on app foreground (AppState listener): read settings, `getAllScheduledNotificationsAsync()`, re-create anything missing/stale (OS may clear schedules).
4. **Deep link on tap**: notification response listener routes via Expo Router to the URL in `data`. Cold-start tap must also route (use the last-response API).
5. **Android specifics**: create a notification channel ("Reminders", default importance) **before scheduling anything** — a notification posted with no channel is silently dropped on Android 8+. Note that exact alarm timing may drift with Doze — acceptable for reminders. Set a brand-colored small icon and accent color per theme.
5b. **Copy discipline**: reminders are encouraging, never guilt-based, and never reference a broken streak. "Time for your daily check-in 💪" not "You missed yesterday". Emoji is fine in notification prose (§02.8).
6. **Future-proofing (structure only, do not build)**: keep `reminders.ts` behind a small interface (`scheduleDaily`, `scheduleWeekly`, `cancelAll`, `reconcile`) so a server-push module could sit beside it later. No push-token code now.

## Acceptance criteria
- Enable daily reminder 2 minutes out → fires on device (test both platforms if possible; document if only one tested); tap → lands on Check-In screen from background AND cold start.
- Changing the time reschedules without duplicates (`getAllScheduledNotificationsAsync` shows exactly one per type).
- Disabling cancels. Kill/relaunch app → reconcile restores schedules. Permission-denied path clean.
- Permission-denied path: toggle reverts, hint shows, Open Settings works, no crash and no dead toggle.
- Theme override switches live in both directions and survives a relaunch.
- §03 quick check passes; Settings traversed with a screen reader (switch states must be announced). `tsc` clean; both themes on Settings.

**STOP. Post summary. Wait for "continue".**

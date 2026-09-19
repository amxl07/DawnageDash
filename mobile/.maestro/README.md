# Dawnage Maestro smoke flows

Install a Dawnage development build (`com.dawnage.app.dev`) or device preview (`com.dawnage.app.preview`) before running these flows. Export these values from the test secret store; this directory intentionally contains no credential defaults:

- `DAWNAGE_E2E_APP_ID` matching the installed build
- `DAWNAGE_E2E_EMAIL`
- `DAWNAGE_E2E_PASSWORD`
- `DAWNAGE_E2E_ONBOARD_EMAIL`
- `DAWNAGE_E2E_ONBOARD_PASSWORD`

The general account must be a client with no check-in for the current local day, an assigned workout plan whose current day starts with a work set, and no active workout draft. The onboarding account must be dedicated test data reset to onboarding step zero before every run.

Run from `mobile/` with `maestro test -e DAWNAGE_E2E_APP_ID=com.dawnage.app.preview .maestro`. The progress flow opens the photo sheet and verifies its disclosure without choosing a source or uploading media; system permission dialogs remain in the physical-device validation matrix.

Deep-link flows derive and validate the scheme from the installed app ID: `com.dawnage.app.dev` uses `dawnage-dev`, `com.dawnage.app.preview` uses `dawnage-preview`, and `com.dawnage.app` uses `dawnage`. Any other app ID stops before opening a link.

The premium backfill flow also requires no server check-in two device-local calendar days before the run. It verifies an acknowledged local draft, its original reporting date, and process restart. The main flows target the current single-scroll check-in presentation; the retired wizard rollback is no longer available.

Photo staging is currently deferred. For the core check-in/workout pass, run `home-checkin.yaml` and `workout-interruption.yaml` individually instead of the whole directory. See the [device-preview guide](../docs/release/2026-09-19-device-preview.md) for the current backend decision and acceptance record. A separate preview app ID isolates local storage, not server records.

Offline delivery needs a controlled network condition and valid dedicated test data. The `manual/` flows are excluded by the root `*.yaml` selection. After submitting a valid record offline, set `DAWNAGE_E2E_QUEUED_DATE` to its local date and run `maestro test -e DAWNAGE_E2E_APP_ID=com.dawnage.app.preview .maestro/manual/checkin-offline-retention.yaml`. Restore networking, keep the same app data/account, then run `maestro test -e DAWNAGE_E2E_APP_ID=com.dawnage.app.preview .maestro/manual/checkin-sync-recovery.yaml`. Use the ID of the installed build; each flow derives its matching link scheme. Verify the dated values in the receipt and the server row in the test environment. These flows intentionally never clear application data. A queued or synced receipt is a storage/delivery state; it is not a coach read receipt.

These YAML scenarios have local syntax validation only until executed against an installed native build. VoiceOver/TalkBack, keyboard reachability, long text, gesture arbitration, OS notification changes and network conditioning remain in the device matrix.

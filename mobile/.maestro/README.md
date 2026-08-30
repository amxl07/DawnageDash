# Dawnage Maestro smoke flows

Install a Dawnage development build (`com.dawnage.app`) before running these flows. Export these values from the test secret store; this directory intentionally contains no credential defaults:

- `DAWNAGE_E2E_EMAIL`
- `DAWNAGE_E2E_PASSWORD`
- `DAWNAGE_E2E_ONBOARD_EMAIL`
- `DAWNAGE_E2E_ONBOARD_PASSWORD`

The general account must be a client with no check-in for the current local day, an assigned workout plan, and no active workout draft. The onboarding account must be dedicated test data reset to onboarding step zero before every run.

Run from `mobile/` with `maestro test .maestro`. The progress flow opens the photo sheet and verifies its disclosure without choosing a source or uploading media; system permission dialogs remain in the physical-device validation matrix.

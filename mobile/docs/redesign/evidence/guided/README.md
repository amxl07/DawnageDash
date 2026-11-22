# Guided daily flow evidence

See the [implementation record](../../../guided-daily-flows.md) and [design plan](../../../superpowers/plans/2026-09-17-guided-daily-flows.md).

The capture runner writes populated check-in and workout screens plus interaction checkpoints into `phone/` (390 × 844) and `compact/` (320 × 568), in both dark and light appearances. Each directory has a `capture-manifest.json` containing runtime errors, verified journey checks, fixture writes and source revision information. All records are fictional and network requests to non-fixture services are blocked.

Check-in checkpoints cover recovery, training and nutrition, review, and the saved receipt. Workout checkpoints cover completing an exercise, continuing to the next exercise, Overview, and reviewing a partial session. A failed journey records a failure frame and returns a nonzero status.

These captures verify the exported web app. Physical device behavior and native accessibility need separate checks; the existing release matrix remains the authority for those gates.

## Verified captures

All eight journeys passed with zero captured runtime errors. Forty screenshots cover both sizes and appearances. [Verification record](verification.json) includes 857 passing tests, TypeScript/lint/UI contracts, all three exports, and source/bundle hashes. Overview checkpoint layout files record the header/content boundary.

| Screen | Phone · dark | Phone · light | Compact · dark | Compact · light |
| --- | --- | --- | --- | --- |
| Check-in: readiness | [View](phone/checkin-dark-390.png) | [View](phone/checkin-light-390.png) | [View](compact/checkin-dark-320.png) | [View](compact/checkin-light-320.png) |
| Check-in: recovery | [View](phone/checkin-recovery-dark-390.png) | [View](phone/checkin-recovery-light-390.png) | [View](compact/checkin-recovery-dark-320.png) | [View](compact/checkin-recovery-light-320.png) |
| Check-in: training | [View](phone/checkin-adherence-dark-390.png) | [View](phone/checkin-adherence-light-390.png) | [View](compact/checkin-adherence-dark-320.png) | [View](compact/checkin-adherence-light-320.png) |
| Check-in: review | [View](phone/checkin-review-dark-390.png) | [View](phone/checkin-review-light-390.png) | [View](compact/checkin-review-dark-320.png) | [View](compact/checkin-review-light-320.png) |
| Check-in: receipt | [View](phone/checkin-saved-dark-390.png) | [View](phone/checkin-saved-light-390.png) | [View](compact/checkin-saved-dark-320.png) | [View](compact/checkin-saved-light-320.png) |
| Workout: current set | [View](phone/workout-dark-390.png) | [View](phone/workout-light-390.png) | [View](compact/workout-dark-320.png) | [View](compact/workout-light-320.png) |
| Workout: exercise complete | [View](phone/workout-exercise-complete-dark-390.png) | [View](phone/workout-exercise-complete-light-390.png) | [View](compact/workout-exercise-complete-dark-320.png) | [View](compact/workout-exercise-complete-light-320.png) |
| Workout: overview | [View](phone/workout-overview-dark-390.png) | [View](phone/workout-overview-light-390.png) | [View](compact/workout-overview-dark-320.png) | [View](compact/workout-overview-light-320.png) |
| Workout: review | [View](phone/workout-review-dark-390.png) | [View](phone/workout-review-light-390.png) | [View](compact/workout-review-dark-320.png) | [View](compact/workout-review-light-320.png) |

# Delivery boundary review evidence

Run from `mobile/` using the current checkout and installed dependencies. The harness is archived as text so review evidence is not treated as application source:

```sh
cp docs/review/2026-09-18/evidence/reproduce-delivery-boundaries.cjs.txt /tmp/dawnage-review-delivery.cjs
node /tmp/dawnage-review-delivery.cjs "$PWD"
```

The harness reads and transpiles the actual classifier, outbox, and check-in persistence source in memory. It runs the installed PostgREST client with an injected fake fetch, and uses only in-memory storage. It never accesses a live backend, production credentials, or persisted app storage. All fixture identifiers and values are fictional.

`delivery-boundary-results.json` contains the exact output captured on September 18, 2026.

The offline scenario demonstrates that the SDK's wrapped network failure is marked nonretryable and skipped by a later outbox flush.

The zero-row scenario supplies a standard successful HTTP response for a PATCH that matched no rows. It demonstrates that check-in persistence acknowledges it and the queue removes the retained intent. The scenario models a deletion or authorization visibility change between SELECT and PATCH; it does not claim either condition occurred in a live environment.

This harness is focused review evidence, not a complete mobile test run or native-device validation.

# Known Issues

## Most adapters have no test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** Of the 14 adapters under `src/adapters/`, only `HttpServerMessageQueueFeeder` has a
spec (plus the internal `enqueueAndAwaitOutcome` helper). Every Cloud Pub/Sub, Cloud Storage,
filesystem, and in-memory adapter is untested.
**Root cause:** Adapters were added over time without matching test coverage being required at
the time.
**Decision:** Leave as-is for now. Closing this isn't a small fix — it means writing real
coverage (happy path plus at least one failure case) for 12 adapters, not a one-line change.
**If this ever needs to be fixed:** Add a `*.spec.ts` per remaining adapter, following
`HttpServerMessageQueueFeeder.spec.ts`'s pattern — construct the layer, exercise it, and assert on
both the success and at least one mapped error case (e.g. `StorageWriteError`,
`MessageQueueError`).

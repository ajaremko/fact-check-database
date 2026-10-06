# Known Issues

## Most adapters have no test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** Of the 15 adapters under `src/adapters/`, two have a spec:
`HttpServerMessageQueueFeeder` and `CloudPubsubMessageBatch`. Every Cloud Storage adapter, the
Pub/Sub publisher and queue feeder, and every filesystem and in-memory adapter is untested.
**Root cause:** Adapters were added over time without matching test coverage being required at
the time.
**Decision:** Leave as-is for now. Closing this isn't a small fix — it means writing real
coverage (happy path plus at least one failure case) for 13 adapters, not a one-line change.
**If this ever needs to be fixed:** Add a `*.spec.ts` per remaining adapter, following
`HttpServerMessageQueueFeeder.spec.ts`'s pattern — construct the layer, exercise it, and assert on
both the success and at least one mapped error case (e.g. `StorageWriteError`,
`MessageQueueError`).

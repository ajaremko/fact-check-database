# Known Issues

## No test coverage for any SDK-wrapping client module

**Error:** No error — an accepted test-coverage gap.
**Where:** Only `pino/pino.spec.ts` and `pino-logging-gcp-config/pino-logging-gcp-config.spec.ts`
exist. None of the seven SDK-wrapping client modules have any test coverage: `AlgoliaSearchClient`,
`BigQueryClient`, the four `cloud-pubsub` modules (`PubsubClient`, `PubsubTopic`,
`PubsubSubscription`, `PubsubSubscriberClient`), the two `cloud-storage` modules (`StorageClient`,
`StorageBucket`), and `cloudRunInstanceId`.
**Root cause:** These modules mostly wrap thin, mechanical `Effect.tryPromise` calls around SDK
methods, and coverage wasn't prioritized against them the way it was for the logging modules
(which shape output other systems depend on parsing).
**Decision:** Leave as-is for now. Closing this means writing real coverage (happy path plus at
least one mapped-error case) for seven modules, not a small fix.
**If this ever needs to be fixed:** Add a `*.spec.ts` per module, following `pino.spec.ts`'s
pattern of exercising the real `layer` and asserting on both success and the module's own
`Data.TaggedError` case (e.g. mocking the underlying SDK client to reject).

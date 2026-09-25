# Known Issues

## Partial test coverage for SDK-wrapping modules

**Error:** No error. This is an accepted test-coverage gap.

**Where:** Coverage exists only where recent work touched a module:

- `cloud-storage/StorageBucket.spec.ts` covers `writeFile`, both success and SDK failure, including
  the log entries each produces.
- `cloud-pubsub/PubsubClient.spec.ts` covers the layer's release: `close()` is called, and a failed
  close is logged at `debug` and swallowed.
- `logAnnotationScope.spec.ts` checks that the `StorageClient` and `StorageBucket` layers don't
  leak log annotations into the consuming program.
- `internal/logSdkFailure.spec.ts` covers the shared helper every module uses to log SDK failures.
- `pino/pino.spec.ts` and `pino-logging-gcp-config/pino-logging-gcp-config.spec.ts` cover the
  logging modules.

These are not covered:

- `StorageBucket`: `moveFile`, `downloadFile`, `getFiles`, `getFilesStream`
- `PubsubTopic`: `publishMessage`
- `PubsubSubscriberClient`: `pull`, `acknowledge`, and its release
- `PubsubSubscription`: opening and closing the subscription
- `BigQueryClient`: `createJob`, `awaitJob`, `getJob`. These are exercised indirectly through the
  real SDK by `analysis-loader`'s `loadBatch.spec.ts`, but have no tests of their own.
- `AlgoliaSearchClient`: `saveObjects`, `saveObjectsWithTransformation`
- `cloudRunInstanceId`

**Root cause:** These modules are thin `Effect.tryPromise` wrappers around SDK methods. Coverage was
added only where the logging and release work changed their behavior. The rest was not prioritized.

**Decision:** Leave the remaining gap for now. Following
[docs/testing-guidelines.md](../../../docs/testing-guidelines.md), add coverage to a module when it
is next changed rather than in one large pass.

**If this ever needs to be fixed:** Add a `*.spec.ts` per module. Spy on a real SDK instance with
`vi.spyOn`, stubbing only the methods that would reach the network, rather than hand-writing a fake
client. Assert both the success path and the module's `Data.TaggedError` case, including the log
entry each produces. `StorageBucket.spec.ts` and `PubsubClient.spec.ts` are templates for actions
and releases respectively.

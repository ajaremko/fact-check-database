# Known Issues

## A malformed target's context fails outside the normal per-target isolation

**Error:** No distinct error message — the run may fail entirely rather than skipping just the
bad target, depending on how `Effect.all(..., { mode: 'either' })` and `NodeRuntime.runMain`
handle an unhandled defect versus a typed failure.
**Where:** `ingestFromSource.ts`'s `decodeContext`, which calls `Schema.decodeUnknownSync`
synchronously (not via `yield*`) at the top of `ingestFromSource`.
**Root cause:** Every other failure in this pipeline (`FetcherError`, `StorageWriteError`,
`ParseResult.ParseError`) is a typed failure in the Effect error channel, so
`Effect.all(..., { mode: 'either' })` isolates it to that one target. A synchronous throw from
`decodeUnknownSync` becomes an Effect defect instead, which `mode: 'either'` does not catch —
so a single target with, for example, an invalid `collection` value in the target list likely
behaves differently (and more severely) than every other failure mode this service otherwise
handles gracefully.
**Decision:** Leave as-is. This wasn't deliberately designed this way — it's an inconsistency —
but changing per-target error-handling behavior is more than a documentation fix and needs its
own review.
**If this ever needs to be fixed:** Change `decodeContext` to decode via `Schema.decodeUnknown`
inside the `Effect.gen` body (`yield* decodeContext(args)`) instead of calling
`Schema.decodeUnknownSync` outside it, so a decode failure becomes a typed failure like every
other error in this function.

## Fetch failures log at the same level as successes

**Error:** Not an error — a logging-design gap.
**Where:** `src/app/logging/index.ts`'s `logEvent` helper, used by both `logIngestionSucceeded`
and `logIngestionFailed`; both always log at `info`.
**Root cause:** Both functions share the same helper, which was written to always call
`Effect.logInfo`. Nothing currently distinguishes a failed fetch attempt from a successful one by
severity — only by message text (`Ingestion succeeded` vs. `Ingestion failed`) and the
`result.error` annotation.
**Decision:** Leave as-is for now. Changing production log-level semantics (e.g. anything with an
alert keyed on log level) isn't a call to make as part of a documentation pass.
**If this ever needs to be fixed:** Change `logIngestionFailed` to call `Effect.logWarning` (or
`Effect.logError`, if a per-target fetch failure should be that severe) instead of reusing the
`info`-only `logEvent` helper.

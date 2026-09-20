# Known Issues

## A publish path exists but is wired off

**Error:** Not an error — an observed inconsistency in the shipped code.
**Where:** `src/main.ts` has commented-out imports and layer wiring for `CloudPubsubPublisher`/
`FileSystemPublisher`, and `src/app/index.ts` has a commented-out block that would publish a
completion event after writing a batch.
**Root cause:** Unknown from the code alone — there's no README or Todo claiming this is planned
work, so this may be a half-built feature, a deliberately shelved one, or leftover experimentation.
Documenting it as-observed rather than guessing at intent.
**Decision:** Leave as-is. No downstream consumer currently expects a published event from this
service (the same storage-triggers-notification pattern used between the ingestor and sanitizer
would be the natural mechanism if one is ever needed).
**If this ever needs to be fixed:** Either remove the dead commented-out code, or finish wiring it
if a downstream consumer for a "batch written" event materializes — check with whoever authored it
before assuming either direction.

## Skipped and failed observations are indistinguishable from success by metrics alone

**Error:** No error — a monitoring gap.
**Where:** `src/app/extractFactChecks.ts`'s error handling (`Effect.catchAll(() =>
Effect.succeed([]))` around the extraction step) and `src/app/logging/index.ts`'s
`logExtractionFailed`, which logs at `info` despite its name.
**Root cause:** Skips (no content, no pointer) and in-extractor failures are both intentionally
non-fatal, so the run keeps going — but that design choice also means neither is visible in the
job-level success/failure counts or in the two `Metric` counters, only in per-item log lines.
**Decision:** Leave as-is. The non-fatal behavior itself is correct (one bad observation shouldn't
fail a batch); only the observability gap around it is the issue.
**If this ever needs to be fixed:** Add a dedicated `Metric.counter` for skips and for
in-extractor failures (distinct from the existing `extracted_fact_check_rows`/
`extracted_batches_written`), and consider moving `logExtractionFailed` to `Effect.logWarning` so
it's distinguishable from routine `info` traffic by level, not just by message text.

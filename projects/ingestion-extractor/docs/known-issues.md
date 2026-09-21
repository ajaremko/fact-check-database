# Known Issues

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

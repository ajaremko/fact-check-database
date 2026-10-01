# Known Issues

## Skipped and unparseable observations have no metrics of their own

**Error:** No error. This is a monitoring gap.

**Where:** `src/app/extractFactChecks.ts`. A skipped observation and a feed that can't be parsed
are both handled as a successful message with no rows: they are acknowledged, and they don't
count towards `job.failures`.

**Root cause:** Both are intentionally non-fatal: one bad observation shouldn't fail a batch, and
retrying an unparseable feed can't help. They are visible in the logs (`Observation skipped`, and
`Extraction failed` at `warning`, which also feeds the dashboard's Extraction Errors panel). But
the two `Metric` counters, `extracted_fact_check_rows` and `extracted_batches_written`, only count
the successful path, so neither shows up in metrics.

**Decision:** Leave as-is. The logs and the dashboard panel are enough to tell an empty run from
one where every feed failed.

**If this ever needs to be fixed:** Add a `Metric.counter` for skips (tagged with `skip.reason`)
and one for extraction failures (tagged with the error type), alongside the existing counters.

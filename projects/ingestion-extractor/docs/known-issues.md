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

## A run holds every row in memory and is not retried

**Error:** A container out-of-memory kill, if a run's rows outgrow the heap.

**Where:** `src/app/index.ts` collects every row of a run before `writeBatch` writes one file. The job runs as a single task with `maxRetries: 0` and 1 GiB of memory (`ingestion-infra/src/extractor/job.ts`).

**Root cause:** One batch file per run keeps the staging load simple: one file, one load job. The cost is that memory grows with `MESSAGE_BATCH_SIZE`. At 1,000 messages a run uses about 370 MB of heap. A killed run writes nothing, and its messages are redelivered after the 600-second ack deadline. That deadline is the Pub/Sub maximum, so a run cannot be made longer either.

**Decision:** Won't fix for now. Current volume is about 160 records per run against a limit of 1,000.

**If this ever needs to be fixed:** Stream rows to the batch file as each message is processed instead of collecting them, or write several smaller batch files per run and acknowledge each group as it is written. Either removes the link between throughput and memory, and lets a run be retried.

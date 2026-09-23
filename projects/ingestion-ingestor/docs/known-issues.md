# Known Issues

## Unchanged feeds are re-fetched and re-archived on every run

**Error:** No error — wasted work and storage.
**Where:** `src/adapters/HttpClientFetcher.ts` (no conditional request headers) and the archive
path layout, which includes `ingestor_run_id={runId}` so every run writes new objects.
**Root cause:** The ingestor is stateless: it records each response's `etag` and `lastModified`
but never sends them back as `If-None-Match`/`If-Modified-Since`, so every scheduled run
downloads each feed in full. Each fetch then flows through the sanitizer and extractor, and
every item in the feed lands in staging again. On 2026-09-23 in dev, 70 observations covered only
53 distinct feed bodies.
**Decision:** Leave as-is for now. Repeated observations are correct input to the staging
observation log, and `analysis-infra`'s curated `MERGE` collapses them into one row per fact
check, so this costs storage and compute rather than correctness.
**If this ever needs to be fixed:** Give the ingestor a source of last-seen validators per source
(e.g. the latest archived record for that source) and send conditional requests. Record a `304`
as its own observation outcome, so downstream stages can skip it instead of re-extracting
unchanged content.

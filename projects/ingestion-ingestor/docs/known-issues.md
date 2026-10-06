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

## Two sources block the crawler

**Error:** `Source returned an error status` with `result.status_code: 403` on every run, for
`africacheck` (`https://africacheck.org/feed/`) and the AFP `factcheck` source
(`https://factcheck.afp.com/rss.xml`). The sanitizer quarantines each response, so neither
source contributes fact checks.
**Where:** the publishers' servers, not this codebase. Both return `403` to the crawler's
User-Agent, `FactCheckDatabaseIngestor/1.0`, which looks like bot blocking. Seen consistently in
dev on 2026-10-02.
**Root cause:** The ingestor identifies itself honestly and doesn't disguise its origin (see
`docs/roadmap-bot-transparency.md`), so a publisher that blocks unknown crawlers blocks it.
**Decision:** Keep both sources in the list, so they start working if access is granted. They
cost one archived response and one quarantined record per run each. A non-2xx response counts as
a successful fetch, so they don't affect the run's success rate.
**If this ever needs to be fixed:** Contact the publishers to allow the crawler's User-Agent, or
remove the two sources from `ingestion-infra`'s `sources.*.csv`.

## Fetches have no per-request timeout

**Error:** No error. A slow publisher can stall a run.
**Where:** `src/adapters/HttpClientFetcher.ts`. No `Effect.timeout` wraps the request.
**Root cause:** The fetcher relies on the HTTP client's own defaults. Sources are fetched ten at a time (`MAX_CONCURRENCY`), so one publisher that accepts a connection and then sends nothing holds a slot until the client gives up.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Wrap the request in `Effect.timeout` with a duration read from config, and record a timeout as a `FetchFailure` like any other failed fetch.

## Metrics are labelled by source name

**Error:** No error. A cost that grows with the source list.
**Where:** `Effect.tagMetrics` in `src/app/ingestFromSource.ts`, which sets `source_name` and `source_collection` on `content_request_results` alongside the status and content-type labels.
**Root cause:** Per-source labels make the dashboard's per-source panels simple. Each distinct combination of source, status code and content type is its own time series in Cloud Monitoring, so the series count multiplies as sources are added.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Drop `source_name` from the metric and read per-source figures from the structured logs, which already carry `source.id`. Keep `source_collection`, which has two values.

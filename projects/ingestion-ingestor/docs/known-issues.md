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

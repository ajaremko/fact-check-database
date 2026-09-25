# Roadmap: Bot Transparency & Publisher Policy

This describes **intended** policy for how the ingestion crawler identifies itself and treats the
sites it fetches from. It is a roadmap item, not a current guarantee — see the status of each part
below. Tracked in the root [README.md](../README.md)'s TODOs.

## Already true today

**Honest identification.** Every request the crawler makes carries a real, identifying
`User-Agent` header:

```
FactCheckDatabaseIngestor/1.0 (+https://factcheckdatabase.com)
```

See `ingestion-ingestor/src/adapters/HttpClientFetcher.ts`. The crawler does not mask its origin,
rotate through proxies, or spoof a browser's headers.

## Not yet implemented

- **`robots.txt` honoring.** There is no code anywhere in the ingestion domain that fetches or
  evaluates a source's `robots.txt` before requesting its feed. A source that disallows automated
  access today has no way to have that respected automatically.
- **Per-host crawl delay.** `ingestion-ingestor` limits how many sources it fetches _concurrently_
  (`MAX_CONCURRENCY`, see [ingestion-ingestor's runbook](../projects/ingestion-ingestor/docs/runbook.md)),
  but that's a global parallelism cap, not a rate limit applied per host. There's no mechanism
  today that spaces out repeated requests to the same publisher.
- **A real publisher opt-out channel.** There is currently no published contact address or
  documented process for a publisher to request removal from the archive or ask to be excluded
  from future crawls.

## What this platform already does, independent of the above

Regardless of the gaps above, this platform's ingestion scope is narrow by design: it fetches
public RSS feeds and extracts structured metadata (claims, dates, verdicts), and does not host
full article text or hotlink publisher images — see the [root README](../README.md)'s scope
notes and each ingestion project's own README for what is and isn't extracted.

## Closing this out

Implementing the three gaps above would mean:

1. Fetching and caching each source's `robots.txt`, and skipping a source it disallows —
   most naturally added as a check in `ingestion-ingestor` before a fetch is attempted.
2. Adding a per-host minimum interval between requests, likely alongside the existing
   `MAX_CONCURRENCY` configuration.
3. Standing up a real, monitored contact address and documenting the takedown process here, once
   one exists.

Only once these are real should this document move out of "roadmap" framing and into a project's
own documentation as a stated guarantee.

# Extractor

The extractor turns fetched, sanitized RSS/Atom feed content into structured `FactCheck` records for downstream analysis. It is the third stage in the platform's data pipeline: its inputs are produced by the [sanitizer](../ingestion-sanitizer/README.md), and its outputs (batches of NDJSON rows) are loaded into the fact-checks staging table for research use.

## Responsibilities

- Read a batch of sanitizer-produced observations (one per fetched document)
- Select a feed-format extraction strategy by `source.collection` (`rss` or `atom`)
- Parse the feed and normalize each item into a `FactCheck` record
- Compute each fact check's `fact_check_id` — the single definition of fact-check identity (see [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md))
- Drop repeated rows for the same fact check from the same fetch attempt (e.g. a message delivered twice)
- Write extracted records as an NDJSON batch to storage
- Emit structured logs and metrics for successes, failures, and skipped observations

## What this service does not do

- Fetch content from the network (the [ingestor](../ingestion-ingestor/README.md)'s job)
- Apply content policy or sanitization (the sanitizer's job)
- Perform verdict/claim classification
- Deduplicate fact checks across fetches or runs. A fact check that appears in several fetches of a
  feed produces one row per fetch — the staging table is an observation log. Collapsing observations
  into one record per fact check is the analysis domain's curated `MERGE` (see
  [analysis-infra](../analysis-infra/README.md#curated-dataset)).
- Parse HTML/XHTML article bodies into structured content — `content` is captured as-is (may include raw markup) when the feed exposes it as plain text; structurally nested content (e.g. Atom `type="xhtml"`) is left unparsed

## Supported feed fields

Both extraction strategies populate the same `FactCheck` shape from format-specific source elements:

| `FactCheck` field                          | RSS 2.0 source                                                                                                                      | Atom source                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `guid`                                     | `<guid>`                                                                                                                            | `<id>`                                              |
| `link`                                     | `<link>`                                                                                                                            | `<link rel="alternate">` (or the sole link)         |
| `canonicalUrl`                             | `<guid>` when `isPermaLink` and URL-shaped, else `link`                                                                             | the alternate `<link>`, else `<id>` when URL-shaped |
| `title` / `claim`                          | `<title>`                                                                                                                           | `<title>`                                           |
| `author`                                   | `<dc:creator>` or `<author>`                                                                                                        | `<author><name>`                                    |
| `categories`                               | `<category>` (repeatable)                                                                                                           | `<category term>` (repeatable)                      |
| `summary`                                  | `<description>`                                                                                                                     | `<summary>`                                         |
| `content`                                  | `<content:encoded>`                                                                                                                 | `<content>` (plain-text only)                       |
| `enclosureUrl`                             | `<enclosure>`, `<media:thumbnail>`, or `<media:content>`                                                                            | always `null` — Atom has no equivalent element      |
| `imageUrl`                                 | `<enclosure>`, `<media:thumbnail>`, or `<media:content>`                                                                            | always `null` — Atom has no equivalent element      |
| `language`                                 | `xml:lang` is RSS-only so this falls back to the feed's channel-level `<language>` element (not a guarantee for multilingual feeds) | `xml:lang` attribute on the entry, if present       |
| `publishedAtRaw` / `publishedAtNormalized` | `<pubDate>`                                                                                                                         | `<published>`, falling back to `<updated>`          |

Strategy selection is a direct lookup keyed by `source.collection` (see `src/integration/extraction-strategy/index.ts`) — there is exactly one strategy per collection type, so there's no ambiguity to resolve at runtime.

## Project Structure

```
projects/ingestion-extractor/
├── src/
│   ├── main.ts                          # Entry point: builds layers, runs the job
│   ├── app/
│   │   ├── index.ts                     # Core processing sequence (decode → extract → write)
│   │   ├── extractFactChecks.ts         # Per-observation extraction + row mapping
│   │   ├── Observation.ts               # Sanitizer record → internal Observation shape
│   │   ├── FactCheck.ts                 # FactCheck domain schema + BigQuery row encoding
│   │   ├── ExtractionBatch.ts           # Batch event + staging path schema
│   │   ├── writeBatch.ts                # NDJSON batch write
│   │   ├── NormalizedText.ts            # Size-bounded, Unicode-normalized string schema
│   │   ├── NumberFromDate.ts            # Date <-> epoch-ms schema
│   │   ├── ContentBlob.ts               # Content-addressed (sha256) blob path, written per fact-check
│   │   └── logging/                     # Structured job/event log helpers
│   └── integration/
│       └── extraction-strategy/         # Pure feed-parsing logic, one file per format
│           ├── ExtractionStrategy.ts    # Strategy shape (id, version, extractor)
│           ├── RssExtractor.ts
│           ├── AtomExtractor.ts
│           ├── buildFactCheck.ts        # Shared hash + FactCheck construction
│           ├── decodeFeedXml.ts         # Shared XML decode pipeline
│           └── index.ts                 # Strategy registry, keyed by collection type
└── .env.template                        # Required environment variables for local runs
```

This app has no app-specific `ports`/`adapters`/`environments` split: all I/O goes through `@fact-check-database/core-io`'s shared storage/messaging ports, wired directly in `main.ts`. Introducing a local ports/adapters layer here would wrap those shared ports without adding a real seam.

## Development

```bash
nx serve ingestion-extractor       # run locally
nx test ingestion-extractor        # run the vitest suite
nx typecheck ingestion-extractor
nx lint ingestion-extractor
nx build ingestion-extractor
```

Seven spec files cover both extraction strategies against real-world feed quirks, the schema round-trips, and the extract/write-batch paths, including the skip case.

### Local setup

```bash
cp projects/ingestion-extractor/.env.template projects/ingestion-extractor/.env
```

| Variable                    | Purpose                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `STORAGE_MODE=filesystem`   | Read/write the archive and staging output on a local directory instead of GCS                            |
| `STORAGE_OUTPUT_DIR`        | Directory batches and content blobs are written to (also where sanitizer/ingestor records are read from) |
| `MESSAGING_MODE=filesystem` | Read queued messages from a local directory                                                              |
| `MESSAGE_QUEUE_INPUT_DIR`   | Directory to populate with notification JSON files (e.g. from a local sanitizer run)                     |

See [docs/runbook.md](./docs/runbook.md) for the complete configuration reference, including production values.

## Related documentation

| Document                                                           | Purpose                                                                             |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [docs/runbook.md](./docs/runbook.md)                               | Configuration reference, output contract, and diagnosing failures                   |
| [docs/known-issues.md](./docs/known-issues.md)                     | Accepted, long-lived gaps and deferred fixes                                        |
| [core-contracts](../core-contracts/README.md)                      | The canonical `FactChecksTableRowSchema`/`StagingPathSchema` this service writes to |
| [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md) | `fact_check_id` (computed here) and the staging dedup rule                          |

# Extractor

The extractor turns fetched, sanitized RSS/Atom feed content into structured `FactCheck` records for downstream analysis. It is the third stage in the platform's data pipeline: its inputs are produced by the [sanitizer](../ingestion-sanitizer/README.md), and its outputs (batches of NDJSON rows) are loaded into the fact-checks staging table for research use.

## Responsibilities

- Read a batch of sanitizer-produced observations (one per fetched document)
- Select a feed-format extraction strategy by `source.collection` (`rss` or `atom`)
- Parse the feed and normalize each item into a `FactCheck` record
- Write extracted records as an NDJSON batch to storage
- Emit structured logs and metrics for successes, failures, and skipped observations

## What this service does not do

- Fetch content from the network (the [ingestor](../ingestion-ingestor/README.md)'s job)
- Apply content policy or sanitization (the sanitizer's job)
- Perform verdict/claim classification beyond opportunistic pattern matching on an explicit `<verdict>` element, if a feed happens to include one — no known real-world feed does, so `verdict_raw`/`verdict_normalized` are usually absent
- Parse HTML/XHTML article bodies into structured content — `content` is captured as-is (may include raw markup) when the feed exposes it as plain text; structurally nested content (e.g. Atom `type="xhtml"`) is left unparsed

## Supported feed fields

Both extraction strategies populate the same `FactCheck` shape from format-specific source elements:

| `FactCheck` field | RSS 2.0 source | Atom source |
| --- | --- | --- |
| `guid` | `<guid>` | `<id>` |
| `link` | `<link>` | `<link rel="alternate">` (or the sole link) |
| `canonicalUrl` | `<guid>` when `isPermaLink` and URL-shaped, else `link` | the alternate `<link>`, else `<id>` when URL-shaped |
| `title` / `claim` | `<title>` | `<title>` |
| `author` | `<dc:creator>` or `<author>` | `<author><name>` |
| `categories` | `<category>` (repeatable) | `<category term>` (repeatable) |
| `summary` | `<description>` | `<summary>` |
| `content` | `<content:encoded>` | `<content>` (plain-text only) |
| `language` | not populated | `xml:lang` attribute on the entry, if present |
| `publishedAtRaw` / `publishedAtNormalized` | `<pubDate>` | `<published>`, falling back to `<updated>` |
| `verdictRaw` / `verdictNormalized` | `<verdict>`, if present (non-standard) | `<verdict>`, if present (non-standard) |

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
│   │   └── NumberFromDate.ts            # Date <-> epoch-ms schema
│   └── integration/
│       └── extraction-strategy/         # Pure feed-parsing logic, one file per format
│           ├── ExtractionStrategy.ts    # Strategy shape (id, version, extractor)
│           ├── RssExtractor.ts
│           ├── AtomExtractor.ts
│           ├── buildFactCheck.ts        # Shared hash + FactCheck construction
│           ├── decodeFeedXml.ts         # Shared XML decode pipeline
│           ├── verdict.ts               # Shared opportunistic verdict pattern matching
│           └── index.ts                 # Strategy registry, keyed by collection type
└── .env.template                        # Required environment variables for local runs
```

This app has no app-specific `ports`/`adapters`/`environments` split: all I/O goes through `@news-research/core-io`'s shared storage/messaging ports, wired directly in `main.ts`. Introducing a local ports/adapters layer here would wrap those shared ports without adding a real seam.

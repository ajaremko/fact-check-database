# website-loader

Loads staged fact-check batches into the website's Algolia search index. It's the bridge between
the ingestion pipeline's output and the public-facing search experience: when `ingestion-extractor`
writes a new NDJSON batch to core-infra's staging bucket, this service receives a push
notification, reads that batch itself, transcodes each row into a search record, and saves the
batch to Algolia.

Unlike [`analysis-loader`](../analysis-loader/README.md) — the other consumer of the same staging
batches — this service **does** read and parse the batch itself. Algolia has no equivalent of
BigQuery's server-side `gs://` load job, so the NDJSON bytes have to be fetched, decoded, and
transcoded here before they can be saved.

## Responsibilities

- Receive a Pub/Sub push notification identifying a newly-staged batch object
- Read that batch from GCS and decode each row as a `FactChecksTableRowSchema`
- Transcode each row into a `SearchResult` ([`website-contracts`](../website-contracts/README.md))
- Save the batch to the configured Algolia index, waiting for the indexing task to complete
- Acknowledge or reject the push message based on the outcome

## What this service does not do

- **Support local development.** There's no dev-mode adapter and no `.env.template` — see
  [docs/known-issues.md](./docs/known-issues.md).
- **Apply content policy, extraction, or classification** — that's upstream, in
  `ingestion-sanitizer`/`ingestion-extractor`.
- **Own the search schema.** The shape of a search record (`SearchResultSchema`) and its mapping
  from the staging row are this project's own logic, but the schema itself is defined in
  `website-contracts`.

## How it works

```
Pub/Sub push subscription (provisioned by website-infra, subscribed to a
core-project topic — the same staging-write notification analysis-loader consumes)
      │
      ▼
 POST /load-jobs
      │
      ▼
 Decode the push envelope's bucketId / objectId attributes
      │
      ▼
 Read the NDJSON batch from GCS
      │
      ▼
 Decode each row (FactChecksTableRowSchema) and transcode it into a SearchResult,
 with objectID = fact_check_id
      │
      ▼
 Save the batch to Algolia (saveObjects, waitForTasks: true)
      │
      ├── Success ──► 201 (acks the Pub/Sub message)
      │
      └── Failure ──► error response (nacks; redelivered, dead-lettered after 5 attempts)
```

Search records are keyed by `fact_check_id`, so Algolia's upsert keeps one record per fact check:
a later batch carrying an edited title or summary overwrites the existing record instead of adding
a second one. Within a batch, a later row for the same fact check overwrites an earlier one.

## Development

```bash
nx build website-loader
nx serve website-loader
nx typecheck website-loader
nx lint website-loader
nx test website-loader
```

`transcodeBatch` has spec coverage; the `/load-jobs` route itself doesn't yet — see
[docs/known-issues.md](./docs/known-issues.md).

### Local setup

There is currently no supported way to run this service locally. It has no dev-mode storage
adapter and no `.env.template`. Running it outside Cloud Run would require Application Default
Credentials and manually setting `ALGOLIA_API_KEY`, `ALGOLIA_APP_ID`, `ALGOLIA_INDEX_NAME`, `PORT`,
and `OTEL_SERVICE_NAME` (or `SERVICE_NAME`) by hand — see [docs/runbook.md](./docs/runbook.md) for
the complete configuration reference and [docs/known-issues.md](./docs/known-issues.md) for this
gap.

## Related documentation

| Document                                                           | Purpose                                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [docs/runbook.md](./docs/runbook.md)                               | Configuration reference and diagnosing failures                               |
| [docs/known-issues.md](./docs/known-issues.md)                     | Accepted, long-lived gaps and deferred fixes                                  |
| [core-io](../core-io/README.md)                                    | `StorageReader`, used to read the staged batch                                |
| [core-vendor](../core-vendor/README.md)                            | `AlgoliaSearchClient`, used to save the transcoded batch                      |
| [website-contracts](../website-contracts/README.md)                | The `SearchResult` schema this service writes to Algolia                      |
| [analysis-loader](../analysis-loader/README.md)                    | The other consumer of the same staging batches, loading into BigQuery instead |
| [docs/fact-check-lifecycle.md](../../docs/fact-check-lifecycle.md) | Why search records are keyed by `fact_check_id`                               |

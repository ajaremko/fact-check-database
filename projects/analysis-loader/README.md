# Analysis Loader

Loads staged fact-check batches into BigQuery. It's the bridge between the ingestion pipeline's output and the analysis domain's staging table: when `ingestion-extractor` writes a new NDJSON batch to core-infra's staging bucket, this service receives a push notification and loads that batch straight into BigQuery.

## Responsibilities

- Receive a Pub/Sub push notification identifying a newly-staged batch object
- Fetch (and cache) the BigQuery table schema that `core-infra` uploads alongside the staging bucket
- Submit a native BigQuery load job pointing directly at the batch's GCS location, at most once
  per batch object version
- Acknowledge or reject the push message based on the outcome

## What this service does not do

- **Read or parse the batch itself.** BigQuery loads directly from the `gs://` URI server-side — this service never downloads or streams the NDJSON bytes.
- **Support local development.** There's no dev-mode adapter and no `.env.template` — see "Local setup" below.
- **Apply content policy, extraction, or classification** — that's upstream, in `ingestion-sanitizer`/`ingestion-extractor`.

## How it works

```
Pub/Sub push subscription (provisioned by analysis-infra)
      │
      ▼
 POST /load-jobs
      │
      ▼
 Decode the push envelope's bucketId / objectId / objectGeneration / schemaObjectId attributes
      │
      ▼
 Fetch the BigQuery table schema from GCS (cached for the process's lifetime)
      │
      ▼
 Submit a BigQuery load job: sourceUris=[gs://{bucketId}/{objectId}], NEWLINE_DELIMITED_JSON,
 jobId=load_<sha256 of bucket/object#generation>
      │
      ├── Job id already exists and succeeded/running ──► reuse that job (no second append)
      ├── Job id already exists and failed ──► submit again under a new id
      ▼
 Await the job
      │
      ├── Success ──► 201 (acks the Pub/Sub message)
      │
      └── Failure ──► error response (nacks; redelivered, dead-lettered after 5 attempts)
```

The load job is given both an explicit `schema` (fetched from GCS) and `autodetect: true`.

### Idempotent loads

Pub/Sub delivers at least once, and a push is redelivered whenever the response misses the
subscription's ack deadline — even if the load job behind it succeeded. Load jobs append
(`WRITE_APPEND`), so without protection a redelivery would load the same batch twice.

The job id is therefore derived from the batch object's bucket, name and generation. A redelivery
tries to create a job with the same id; BigQuery rejects it as already existing, and the loader
awaits the existing job instead of appending again. If that existing job had failed, the batch is
submitted once more under a fresh id — failed load jobs are atomic and append nothing, so this
can't duplicate rows. Re-uploading a batch object (a new generation) is treated as a new batch.

## Development

```bash
nx build analysis-loader
nx serve analysis-loader
nx typecheck analysis-loader
nx lint analysis-loader
```

**No automated tests exist for this project today** — see [docs/known-issues.md](./docs/known-issues.md).

### Local setup

There is currently no supported way to run this service locally. It has no dev-mode storage
adapter and no `.env.template`. Running it outside Cloud Run would require Application Default
Credentials and manually setting `PROJECT_ID`, `BIGQUERY_DATASET`, `BIGQUERY_TABLE`, `PORT`, and
`OTEL_SERVICE_NAME` (or `SERVICE_NAME`) by hand — see [docs/runbook.md](./docs/runbook.md) for the
complete configuration reference and [docs/known-issues.md](./docs/known-issues.md) for this gap.

## Related documentation

| Document                                       | Purpose                                                 |
| ---------------------------------------------- | ------------------------------------------------------- |
| [docs/runbook.md](./docs/runbook.md)           | Configuration reference and diagnosing failures         |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes            |
| [core-vendor](../core-vendor/README.md)        | `BigQueryClient`, used to submit and await the load job |
| [core-contracts](../core-contracts/README.md)  | The canonical staging schema this service loads against |

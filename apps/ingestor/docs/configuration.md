# Configuration

The ingestor is configured entirely through environment variables. There are no configuration files read at runtime beyond the target list.

A `.env.template` file at the project root documents all required variables for local development.

## Environment Variables

### Development (filesystem adapters)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `TARGET_LIST_PATH` | Yes | — | Path to the target list CSV file |
| `ARCHIVER_OUTPUT_DIR` | Yes | — | Directory where archived bodies and records are written |
| `PUBLISHER_OUTPUT_DIR` | Yes | — | Directory where published events are written as JSON files |
| `SUCCESS_THRESHOLD` | No | `0.8` | Minimum fraction of targets (0–1) that must succeed for the run to pass |
| `MAX_CONCURRENCY` | No | `10` | Maximum number of targets fetched in parallel |
| `LOG_LEVEL` | No | `info` | Log verbosity: `trace`, `debug`, `info`, `warning`, `error`, `fatal`, `none` |

### Production (GCP adapters)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ARCHIVE_BUCKET_NAME` | Yes | — | GCS bucket where raw bodies and records are written |
| `TARGET_LIST_BUCKET_NAME` | Yes | — | GCS bucket containing the target list CSV |
| `TARGET_LIST_URI` | Yes | — | Object path within `TARGET_LIST_BUCKET_NAME` for the target list CSV |
| `PUBSUB_TOPIC_NAME` | Yes | — | Pub/Sub topic to which `IngestionAttempted` events are published |
| `SUCCESS_THRESHOLD` | No | `0.8` | Same as development |
| `MAX_CONCURRENCY` | No | `10` | Same as development |
| `LOG_LEVEL` | No | `info` | Same as development |

GCP credentials are provided via Application Default Credentials. In production, the service runs under a dedicated service account with a workload identity binding. No long-lived keys are used.

## Target List Format

The target list is a CSV file with a required header row and three columns:

| Column | Description |
| --- | --- |
| `collection` | Logical grouping for the source (e.g. `rss`, `gdelt`) |
| `name` | Unique identifier for the source, used in archive paths and log annotations |
| `url` | The URL to fetch |

### Example

```csv
collection,name,url
rss,politifact.com,https://www.politifact.com/rss/all/
rss,snopes.com,https://www.snopes.com/feed/
rss,factcheck.org,https://www.factcheck.org/feed/
```

### Notes

- `name` must be stable across runs — it appears in GCS archive paths and in published events. Changing a source's name will break path continuity in the archive.
- `collection` is currently treated as a label. Future versions of the platform may route collections differently.
- Rows with unreachable URLs are not removed automatically. Fetch failures are recorded and archived as `no_response` records.

## Adding or Modifying Targets

To add a new source, append a row to the target list CSV and redeploy (or restart the service for the next scheduled run). No code changes are required.

To remove a source, delete its row. Historical records for that source remain in the archive.

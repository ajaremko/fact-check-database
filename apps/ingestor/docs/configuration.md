# Configuration & Environments

The ingestor is configured via environment variables and supports two builds — local development and production — each using a different set of adapters. This is accomplished by providing different esbuild config files.

The list of targets to ingest data from is configured via a `target-list.csv` file accessed by an environment specific adapter.

## Common Environment Variables

| Variable            | Required | Default | Description                                                                  |
| ------------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `SUCCESS_THRESHOLD` | No       | `0.8`   | Minimum fraction of targets (0–1) that must succeed for the run to pass      |
| `MAX_CONCURRENCY`   | No       | `10`    | Maximum number of targets fetched in parallel                                |
| `LOG_LEVEL`         | No       | `info`  | Log verbosity: `trace`, `debug`, `info`, `warning`, `error`, `fatal`, `none` |

A `.env.template` file at the project root documents all required variables for local development.

## Target List Format

The target list is a CSV file with a required header row and three columns:

| Column       | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `collection` | Logical grouping for the source (e.g. `rss`, `gdelt`)                       |
| `name`       | Unique identifier for the source, used in archive paths and log annotations |
| `url`        | The URL to fetch                                                            |

### Example

```csv
collection,name,url
rss,politifact.com,https://www.politifact.com/rss/all/
rss,snopes.com,https://www.snopes.com/feed/
rss,factcheck.org,https://www.factcheck.org/feed/
```

## Adding or Modifying Targets

To add a new source, append a row to the target list CSV and redeploy (or restart the service for the next scheduled run). No code changes are required.

To remove a source, delete its row. Historical records for that source remain in the archive.

### Notes

- `name` must be stable across runs — it appears in GCS archive paths and in published events. Changing a source's name will break path continuity in the archive.
- `collection` is currently treated as a label. Future versions of the platform may route collections differently.
- Rows with unreachable URLs are not removed automatically. Fetch failures are recorded and archived as `no_response` records.

## Local Development

The development environment uses filesystem adapters for all I/O. No GCP credentials or infrastructure are required.

### Setup

1. Copy the environment template:

   ```bash
   cp apps/ingestor/.env.template apps/ingestor/.env
   ```

2. Review the defaults in `.env`. The default target list is at `apps/ingestor/assets/target-list.csv`.

3. Run the ingestor:

   ```bash
   nx serve ingestor
   ```

Output files are written to the directories configured by `ARCHIVE_OUTPUT_DIR` and `PUBLISHER_OUTPUT_DIR`.

### Environment Variables

| Variable               | Required | Default | Description                                                |
| ---------------------- | -------- | ------- | ---------------------------------------------------------- |
| `TARGET_LIST_PATH`     | Yes      | —       | Path to the target list CSV file                           |
| `ARCHIVE_OUTPUT_DIR`   | Yes      | —       | Directory where archived bodies and records are written    |
| `PUBLISHER_OUTPUT_DIR` | Yes      | —       | Directory where published events are written as JSON files |

### Adapter Behavior

| Adapter        | Behavior                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| **TargetList** | Reads CSV from `TARGET_LIST_PATH`                                                                           |
| **Archiver**   | Writes `.bin` (body), `.yml` (record), and `.metadata.json` (metadata) files flat into `ARCHIVE_OUTPUT_DIR` |
| **Publisher**  | Writes one JSON file per event to `PUBLISHER_OUTPUT_DIR`                                                    |
| **Fetcher**    | Makes real HTTP requests                                                                                    |

## Production

The production environment uses GCP adapters: Cloud Storage for archiving and Pub/Sub for event publishing. It is deployed as a containerized Cloud Run job using Application Default Credentials.

All GCP resources are provisioned by the [infra project](../../infra/README.md).

### Container

The ingestor is packaged as a Docker image using `node:20-slim` as the base. The image is built via:

```bash
nx docker:build ingestor
```

### Environment Variables

| Variable                  | Required | Default | Description                                                          |
| ------------------------- | -------- | ------- | -------------------------------------------------------------------- |
| `ARCHIVE_BUCKET_NAME`     | Yes      | —       | GCS bucket where raw bodies and records are written                  |
| `TARGET_LIST_BUCKET_NAME` | Yes      | —       | GCS bucket containing the target list CSV                            |
| `TARGET_LIST_URI`         | Yes      | —       | Object path within `TARGET_LIST_BUCKET_NAME` for the target list CSV |
| `PUBSUB_TOPIC_NAME`       | Yes      | —       | Pub/Sub topic to which `IngestionAttempted` events are published     |

### Adapter Behavior

| Adapter        | Behavior                                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| **TargetList** | Downloads CSV from `gs://{TARGET_LIST_BUCKET_NAME}/{TARGET_LIST_URI}`         |
| **Archiver**   | Writes to `gs://{ARCHIVE_BUCKET_NAME}` with date/source/run partitioned paths |
| **Publisher**  | Publishes to Pub/Sub topic `{PUBSUB_TOPIC_NAME}`                              |
| **Fetcher**    | Makes real HTTP requests                                                      |

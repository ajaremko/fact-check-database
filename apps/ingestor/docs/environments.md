# Environments

The ingestor supports two deployment modes: a local development environment backed by the filesystem, and a production environment backed by GCP services. Both modes run the same core program logic — only the storage and messaging adapters differ.

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

Output files are written to the directories configured by `ARCHIVER_OUTPUT_DIR` and `PUBLISHER_OUTPUT_DIR` (defaults: `tmp/ingestor-archiver-output` and `tmp/ingestor-publisher-output`).

### Filesystem Adapter Behavior

| Adapter        | Dev behavior                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **TargetList** | Reads CSV from `TARGET_LIST_PATH`                                                                     |
| **Archiver**   | Writes `.bin` (body), `.yml` (record), and `.metadata.json` (metadata) files to `ARCHIVER_OUTPUT_DIR` |
| **Publisher**  | Writes one JSON file per event to `PUBLISHER_OUTPUT_DIR`                                              |
| **Fetcher**    | Makes real HTTP requests (no mock)                                                                    |

The filesystem archiver uses a flat directory layout — no date or run partitioning — which makes local output easy to inspect.

## Production

The production environment uses GCP adapters: Cloud Storage for archiving and Pub/Sub for event publishing. It is deployed as a containerized Cloud Run job, triggered on a schedule by Cloud Scheduler.

### GCP Services Used

| Service         | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| Cloud Storage   | Reads the target list; archives raw bodies and records |
| Cloud Pub/Sub   | Publishes `IngestionAttempted` events                  |
| Cloud Run       | Container execution environment                        |
| Cloud Scheduler | Triggers runs on a cron schedule                       |

All GCP resources are provisioned by the [infra project](../../infra/README.md).

### Authentication

The service uses Application Default Credentials. In Cloud Run, credentials are provided automatically via the service's attached service account. The service account is granted least-privilege access to the specific bucket and topic it requires. No long-lived keys are issued or stored.

See [infra/docs/iam-model.md](../../infra/docs/iam-model.md) for the full IAM model.

### Container

The ingestor is packaged as a Docker image using `node:20-slim` as the base. The image runs the compiled `main.js` entry point directly.

```dockerfile
FROM node:20-slim
...
CMD ["node", "main.js"]
```

The image is built via:

```bash
nx docker:build ingestor
```

### Production Behavior

| Adapter        | Production behavior                                                           |
| -------------- | ----------------------------------------------------------------------------- |
| **TargetList** | Downloads CSV from `gs://{TARGET_LIST_BUCKET_NAME}/{TARGET_LIST_URI}`         |
| **Archiver**   | Writes to `gs://{ARCHIVE_BUCKET_NAME}` with date/source/run partitioned paths |
| **Publisher**  | Publishes to Pub/Sub topic `{PUBSUB_TOPIC_NAME}`                              |
| **Fetcher**    | Makes real HTTP requests (same as dev)                                        |

## Environment Wiring

The service selects its environment at build time via the entry point. The development entry point (`src/environments/environment.ts`) composes filesystem layers; the production entry point (`src/environments/environment.prod.ts`) composes GCP layers. Both wire into the same `Program` export from `src/program.ts`.

This means the core processing logic is identical across environments. Differences are limited to how I/O is performed, not what is computed.

# Configuration & Environments

The sanitizer is configured via environment variables and supports two builds — local development and production — each using a different set of adapters. This is accomplished by providing different esbuild config files.

The sanitization policy is loaded from a YAML document whose location is configured per environment.

## Common Environment Variables

| Variable    | Required | Default | Description                                                                  |
| ----------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `LOG_LEVEL` | No       | `info`  | Log verbosity: `trace`, `debug`, `info`, `warning`, `error`, `fatal`, `none` |

A `.env.template` file at the project root documents all required variables for local development.

## Policy Document Format

The sanitization policy is a YAML file that drives all content classification decisions. Its schema is defined in `src/data/SanitizerPolicy.ts`.

### Top-level fields

| Field              | Type       | Description                                                                     |
| ------------------ | ---------- | ------------------------------------------------------------------------------- |
| `version`          | `number`   | Policy schema version                                                           |
| `stripQueryParams` | `string[]` | Query parameter names to strip from all URLs before archiving                   |
| `dropHeaders`      | `string[]` | Response header names to remove from sanitized records (case-insensitive match) |
| `collections`      | array      | Per-collection classification rules (see below)                                 |
| `overrides`        | array      | Per-source overrides that extend or replace collection rules (optional)         |

### Collection rules

Each entry in `collections` defines the policy applied to a named collection:

| Field                          | Type          | Required | Description                                                                                         |
| ------------------------------ | ------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `collection`                   | `string`      | Yes      | Collection label to match (e.g. `rss`, `gdelt`)                                                     |
| `maxBytes`                     | `number`      | Yes      | Maximum response body size in bytes; records exceeding this are quarantined                         |
| `defaultLabel`                 | `PolicyLabel` | Yes      | Label assigned when no other rule quarantines the record (`SAFE_PUBLIC` or `RESTRICTED`)            |
| `allowedContentTypeSubstrings` | `string[]`    | No       | Substrings that must appear in the content-type; records with non-matching types are quarantined    |
| `onMissingContentType`         | `string`      | No       | Behaviour when content-type is absent: `ALLOW`, `RESTRICT`, or `QUARANTINE` (default: `QUARANTINE`) |
| `rewriteBody`                  | `boolean`     | No       | Reserved for future body rewriting; has no effect in the current implementation                     |

### Source overrides

Each entry in `overrides` applies to a specific named source and extends the matching collection rule:

| Field                          | Type           | Description                                              |
| ------------------------------ | -------------- | -------------------------------------------------------- |
| `sourceName`                   | `string`       | Source name to match (must match ingestor target `name`) |
| `maxBytes`                     | `number?`      | Overrides the collection's `maxBytes`                    |
| `defaultLabel`                 | `PolicyLabel?` | Overrides the collection's `defaultLabel`                |
| `allowedContentTypeSubstrings` | `string[]?`    | Overrides the collection's content-type allowlist        |
| `rewriteBody`                  | `boolean?`     | Overrides the collection's `rewriteBody` flag            |

### Example

```yaml
version: 1
stripQueryParams:
  - utm_
  - fbclid
  - gclid
  - mc_cid
  - mc_eid
dropHeaders:
  - set-cookie
  - cookie
  - authorization
collections:
  - collection: rss
    allowedContentTypeSubstrings:
      - xml
      - rss
      - atom
    onMissingContentType: ALLOW
    maxBytes: 8000000
    defaultLabel: SAFE_PUBLIC
    rewriteBody: false
  - collection: api
    allowedContentTypeSubstrings:
      - json
    onMissingContentType: RESTRICT
    maxBytes: 16000000
    defaultLabel: SAFE_PUBLIC
    rewriteBody: false
  - collection: html
    allowedContentTypeSubstrings:
      - html
    onMissingContentType: RESTRICT
    maxBytes: 20000000
    defaultLabel: RESTRICTED
    rewriteBody: false
  - collection: default
    maxBytes: 1000000
    defaultLabel: RESTRICTED
    onMissingContentType: RESTRICT
    rewriteBody: false
overrides:
  - sourceName: dangerous
    defaultLabel: QUARANTINED
```

## Local Development

The development environment uses filesystem adapters for all I/O. No GCP credentials or infrastructure are required.

### Setup

1. Copy the environment template:

   ```bash
   cp apps/sanitizer/.env.template apps/sanitizer/.env
   ```

2. Review the defaults in `.env`. A default policy document is at `apps/sanitizer/assets/policy.yml`.

3. Populate `MESSAGE_QUEUE_INPUT_DIR` with `IngestionAttempted` JSON files (e.g. from a local ingestor run).

4. Run the sanitizer:

   ```bash
   nx serve sanitizer
   ```

Output files are written to the directory configured by `SANITIZER_OUTPUT_DIR`.

### Environment Variables

| Variable                  | Required | Default | Description                                                                      |
| ------------------------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `MESSAGE_QUEUE_INPUT_DIR` | Yes      | —       | Directory containing `IngestionAttempted` event JSON files to process at startup |
| `SANITIZER_OUTPUT_DIR`    | Yes      | —       | Directory where sanitizer records and metadata files are written                 |
| `SANITIZER_POLICY_PATH`   | Yes      | —       | Local filesystem path to the policy YAML document                                |

### Adapter Behavior

| Adapter                     | Behavior                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **MessageQueue**            | Loads all JSON files from `MESSAGE_QUEUE_INPUT_DIR` at startup into an in-memory queue; `ack`/`nack` are no-ops           |
| **Archiver**                | Reads ingestor records from `MESSAGE_QUEUE_INPUT_DIR`; writes `.yml` and `.metadata.json` files to `SANITIZER_OUTPUT_DIR` |
| **SanitizerPolicyDocument** | Reads YAML from `SANITIZER_POLICY_PATH`                                                                                   |

## Production

The production environment uses GCP adapters: Cloud Pub/Sub for message consumption and Cloud Storage for reading ingestor records, writing sanitizer records, and loading the policy document. It is deployed as a containerized Cloud Run service using Application Default Credentials.

All GCP resources are provisioned by the [infra project](../../infra/README.md).

### Container

The sanitizer is packaged as a Docker image using `node:20-slim` as the base. The image is built via:

```bash
nx docker:build sanitizer
```

### Environment Variables

| Variable                   | Required | Default | Description                                                              |
| -------------------------- | -------- | ------- | ------------------------------------------------------------------------ |
| `PUBSUB_SUBSCRIPTION_NAME` | Yes      | —       | Pub/Sub subscription from which `IngestionAttempted` events are consumed |
| `ARCHIVE_BUCKET_NAME`      | Yes      | —       | GCS bucket for reading ingestor records and writing sanitizer records    |
| `ASSETS_BUCKET_NAME`       | Yes      | —       | GCS bucket containing the policy document                                |
| `SANITIZER_POLICY_URI`     | Yes      | —       | Object path within `ASSETS_BUCKET_NAME` for the policy YAML document     |

### Adapter Behavior

| Adapter                     | Behavior                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| **MessageQueue**            | Subscribes to `{PUBSUB_SUBSCRIPTION_NAME}`; delivers messages with `ack`/`nack` callbacks |
| **Archiver**                | Reads from and writes to `gs://{ARCHIVE_BUCKET_NAME}`                                     |
| **SanitizerPolicyDocument** | Downloads policy YAML from `gs://{ASSETS_BUCKET_NAME}/{SANITIZER_POLICY_URI}`             |

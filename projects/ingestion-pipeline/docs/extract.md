# Extract Stage

[One paragraph: purpose of this document. Covers the extract stage in detail — how fact checks are parsed from sanitized observations, how extraction strategies are selected, what the `FactCheck` and `FactCheckRow` types represent, how batches are staged for loading, and what the BigQuery table schema looks like.]

---

## Purpose

[Explain why the extract stage exists. The ingest and sanitize stages archive raw responses with minimal interpretation. The extract stage is the first point in the pipeline where structured meaning is pulled from content:]

- [Parses feed documents (RSS, Atom) into individual fact check items]
- [Normalises text, dates, and verdicts into consistent typed fields]
- [Produces `FactCheckRow` records ready for BigQuery ingestion]
- [Is designed to be extended with new extraction strategies without modifying stage logic]

---

## Eligibility

[Describe the conditions under which `extractFactChecks` will attempt extraction vs. skip:]

An observation is eligible for extraction if all of the following are true:

| Condition             | Field                                | Notes                                                             |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| Fetch succeeded       | `observation.http` is present        | [Observations with no HTTP metadata (failed fetches) are skipped] |
| Content was archived  | `observation.content` is present     | [Quarantined or stripped responses have no content]               |
| Extraction is enabled | `observation.shouldExtract === true` | [Flag set by the sanitizer or sourced from the sanitized record]  |

[If any condition is unmet, `extractFactChecks` returns `[]` and logs at `Info` level. This is not an error — it is expected behaviour for quarantined or unsupported observations.]

---

## Extraction Strategy Selection

[Describe how `extractFactChecks` selects an extractor (`src/extract/extractFactChecks.ts`):]

- [The `extractors` registry (`src/extract/extraction-strategy/index.ts`) holds all registered strategies]
- [The first strategy where `canHandle({ collection, name })` returns `true` is used]
- [`canHandle` matches primarily on `collection`; `name` allows source-specific overrides within a collection]
- [If no strategy matches, a warning is logged and `[]` is returned]

### Registered strategies

| Strategy        | `id`           | Matches              | Description                                           |
| --------------- | -------------- | -------------------- | ----------------------------------------------------- |
| `RssExtractor`  | [extractor ID] | `collection: 'rss'`  | [Parses RSS 2.0 feed XML; extracts `<item>` elements] |
| `AtomExtractor` | [extractor ID] | `collection: 'atom'` | [Parses Atom feed XML; extracts `<entry>` elements]   |

### Response data source

[Extraction reads from the best available pointer on the sanitized observation:]

1. `observation.sanitized` — preferred; sanitized/rewritten bytes if the sanitizer rewrote the body
2. `observation.raw` — fallback; original archived bytes

---

## FactCheck

[Describe `FactCheck` (`src/extract/FactCheck.ts`) — the normalised intermediate representation produced by each strategy before being mapped to `FactCheckRow`:]

| Field                   | Type                                                                          | Description                                                 |
| ----------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `sha256`                | `string`                                                                      | [Content hash of the fact check item; used as row identity] |
| `canonicalUrl`          | `string \| null`                                                              | [Canonical URL of the fact check article]                   |
| `title`                 | `string \| null`                                                              | [Article or item title; normalised to medium length]        |
| `claim`                 | `string \| null`                                                              | [The claim being checked; normalised to medium length]      |
| `link`                  | `string \| null`                                                              | [Link to the source article]                                |
| `summary`               | `string \| null`                                                              | [Summary or description; normalised to XXL length]          |
| `verdictRaw`            | `string \| null`                                                              | [Raw verdict string as it appears in the feed]              |
| `verdictNormalized`     | `'true' \| 'false' \| 'misleading' \| 'unsupported' \| 'exaggerated' \| null` | [Normalised verdict category]                               |
| `publishedAtRaw`        | `string \| null`                                                              | [Raw publication date string from the feed]                 |
| `publishedAtNormalized` | `Date \| null`                                                                | [Parsed publication date]                                   |

[Text fields use `NormalizedText` schemas (`src/extract/NormalizedText.ts`) that trim and truncate strings to bounded lengths. This prevents unbounded strings from reaching BigQuery.]

---

## Writing a Batch

[Describe `writeBatch` (`src/extract/writeBatch.ts`) — called after extraction to stage rows for loading:]

- [Accepts `{ runId, rows, timestamp, tableId, datasetId }`]
- [Serialises `rows` to newline-delimited JSON (NDJSON) using `@news-research/ingestion-data/Ndjson`]
- [Writes the NDJSON file to storage at the staging path]
- [Returns an `ExtractionBatchReady` event for the loader to consume]

### Staging path

```
v1/datasetId={datasetId}/tableId={tableId}/date={YYYY-MM-DD}/{extractionId}.ndjson
```

[Defined by `StagingPath` (`src/extract/contracts/v1/StagingPath.ts`). Date is derived from `extractedAt`.]

---

## Contracts

### ExtractionBatchReady event (`src/extract/contracts/v1/ExtractionBatchReady.ts`)

[Event returned by `writeBatch` and consumed by the loader:]

| Field                 | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `version`             | `1`                                                   |
| `extraction_batch_id` | [ID of the extraction run]                            |
| `extracted_at`        | [Unix timestamp of extraction]                        |
| `pointer`             | [`FilePointer` to the NDJSON staging file in GCS]     |
| `table.table_id`      | [Target BigQuery table name]                          |
| `table.dataset_id`    | [Target BigQuery dataset name]                        |
| `source_format`       | [`'NEWLINE_DELIMITED_JSON'`]                          |
| `schema`              | [BigQuery table schema object passed to the load job] |

### FactChecksTableRow schema (`src/extract/contracts/v1/FactChecksTable.ts`)

[The BigQuery row schema. All fields use `RECORD` (not `STRUCT`) and `INTEGER` (not `INT64`) to avoid Pulumi redeployment of the table on schema updates:]

| Field                | BigQuery type | Mode       | Description                       |
| -------------------- | ------------- | ---------- | --------------------------------- |
| `content_lineage_id` | `STRING`      | `REQUIRED` | [Observation identity hash]       |
| `content_sha256`     | `STRING`      | `REQUIRED` | [SHA-256 of the response body]    |
| `extracted_at`       | `TIMESTAMP`   | `REQUIRED` | [When extraction ran]             |
| `fetched_at`         | `TIMESTAMP`   | `REQUIRED` | [When the source was fetched]     |
| `ingestion_id`       | `STRING`      | `REQUIRED` | [Ingestion batch ID]              |
| `extraction_id`      | `STRING`      | `REQUIRED` | [Extraction batch ID]             |
| `extractor_id`       | `STRING`      | `REQUIRED` | [Strategy ID]                     |
| `extractor_version`  | `STRING`      | `REQUIRED` | [Strategy version]                |
| `source`             | `RECORD`      | `NULLABLE` | [`{ id, collection, name, url }`] |
| `fact_check`         | `RECORD`      | `REQUIRED` | [See fact_check fields below]     |
| `http`               | `RECORD`      | `REQUIRED` | [See http fields below]           |

**`fact_check` sub-fields:**

| Field                     | Type        | Mode       |
| ------------------------- | ----------- | ---------- |
| `sha256`                  | `STRING`    | `NULLABLE` |
| `canonical_url`           | `STRING`    | `NULLABLE` |
| `language`                | `STRING`    | `NULLABLE` |
| `title`                   | `STRING`    | `NULLABLE` |
| `claim`                   | `STRING`    | `NULLABLE` |
| `summary`                 | `STRING`    | `NULLABLE` |
| `link`                    | `STRING`    | `NULLABLE` |
| `verdict_raw`             | `STRING`    | `NULLABLE` |
| `verdict_normalized`      | `STRING`    | `NULLABLE` |
| `published_at_raw`        | `STRING`    | `NULLABLE` |
| `published_at_normalized` | `TIMESTAMP` | `NULLABLE` |

**`http` sub-fields:**

| Field           | Type      | Mode       |
| --------------- | --------- | ---------- |
| `final_url`     | `STRING`  | `NULLABLE` |
| `status_code`   | `INTEGER` | `NULLABLE` |
| `etag`          | `STRING`  | `NULLABLE` |
| `content_type`  | `STRING`  | `NULLABLE` |
| `last_modified` | `STRING`  | `NULLABLE` |
| `headers`       | `JSON`    | `NULLABLE` |

---

## Adding a New Extraction Strategy

[Outline the steps needed to add a new extraction strategy without modifying `extractFactChecks`:]

1. [Create a new file in `src/extract/extraction-strategy/` implementing `ExtractionStrategy<E, R>`]
2. [Set a stable `id` string and initial `version: 1`]
3. [Implement `canHandle` to match the appropriate `collection` (and optionally `name`)]
4. [Implement `extractor` to parse `data: Uint8Array` and return `FactCheck[]`]
5. [Register the strategy in `src/extract/extraction-strategy/index.ts`]

[Note: strategies are matched in registration order. Place more specific strategies (matching by `name`) before general collection-level strategies.]

---

## Related

- [README.md — Extract module overview](../README.md#extract)
- [docs/sanitize.md — Sanitize stage, which produces the records consumed here](./sanitize.md)

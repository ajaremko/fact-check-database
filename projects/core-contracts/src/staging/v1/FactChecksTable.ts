import { Schema } from 'effect'

/**
 * BigQuery table definition for the staging `fact_checks` table, in the JSON
 * schema format BigQuery accepts for table creation and load jobs.
 *
 * This is the single source of truth for the table's columns. It is consumed
 * in two places that must agree:
 *
 * - `analysis-infra` passes `fields` to Pulumi to create the table.
 * - `core-infra` serializes the whole object to a JSON file in the staging
 *   bucket, and the analysis loader reads that file back to supply the schema
 *   for each batch load job. That keeps the loader free of a build-time
 *   dependency on the infrastructure that owns the table.
 *
 * Column modes mirror {@link FactChecksTableRowSchema}: a field that is
 * required in the row schema is `REQUIRED` here, and an optional field is
 * `NULLABLE`. Column types mirror the row schema's *encoded* form, so
 * `extractor_version` is a `STRING` column because the row schema encodes it
 * as a string. The two definitions are kept in step by hand; a change to one
 * must be applied to the other.
 */
export const FactChecksTableDBSchema = {
  fields: [
    { name: 'fact_check_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestor_run_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extractor_run_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extractor_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extractor_version', type: 'STRING', mode: 'REQUIRED' },
    {
      name: 'source',
      type: 'RECORD',
      mode: 'REQUIRED',
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'url', type: 'STRING', mode: 'REQUIRED' },
      ],
    },
    {
      name: 'fact_check',
      type: 'RECORD',
      mode: 'REQUIRED',
      fields: [
        { name: 'sha256', type: 'STRING', mode: 'REQUIRED' },
        { name: 'guid', type: 'STRING', mode: 'NULLABLE' },
        { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
        { name: 'language', type: 'STRING', mode: 'NULLABLE' },
        { name: 'title', type: 'STRING', mode: 'NULLABLE' },
        { name: 'author', type: 'STRING', mode: 'NULLABLE' },
        { name: 'categories', type: 'STRING', mode: 'REPEATED' },
        { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
        { name: 'content', type: 'STRING', mode: 'NULLABLE' },
        { name: 'enclosure_url', type: 'STRING', mode: 'NULLABLE' },
        { name: 'image_url', type: 'STRING', mode: 'NULLABLE' },
        { name: 'link', type: 'STRING', mode: 'NULLABLE' },
        { name: 'published_at_raw', type: 'STRING', mode: 'NULLABLE' },
        {
          name: 'published_at_normalized',
          type: 'TIMESTAMP',
          mode: 'NULLABLE',
        },
      ],
    },
    {
      name: 'http',
      type: 'RECORD',
      mode: 'REQUIRED',
      fields: [
        { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
        { name: 'status_code', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'etag', type: 'STRING', mode: 'NULLABLE' },
        { name: 'content_type', type: 'STRING', mode: 'NULLABLE' },
        { name: 'last_modified', type: 'STRING', mode: 'NULLABLE' },
        { name: 'headers', type: 'JSON', mode: 'NULLABLE' },
      ],
    },
  ],
} as const

/**
 * One row of the staging `fact_checks` table, as an Effect schema.
 *
 * This is the record contract between the ingestion and analysis domains.
 * The extractor encodes rows with this schema when it writes an NDJSON batch
 * to the staging bucket, and the website loader decodes the same batches
 * before transcoding them into search records. The BigQuery column definition
 * for the same table is {@link FactChecksTableDBSchema}.
 *
 * Field groups:
 *
 * - Identity (see `docs/fact-check-lifecycle.md` at the repository root):
 *   `fact_check_id` identifies the fact check itself (source + article URL)
 *   and stays the same when its content is edited; `fact_check.sha256`
 *   identifies the version of its content; `content_sha256` identifies the
 *   fetched feed body the row was extracted from. `source.id` +
 *   `ingestor_run_id` identify the fetch attempt, and `extractor_run_id` the
 *   extractor run that wrote the row.
 * - Provenance: `extractor_id` and `extractor_version` record which
 *   extractor produced the row; `fetched_at` and `extracted_at` are the
 *   pipeline timestamps (the table is partitioned on `extracted_at`).
 *   `extractor_version` is a `number` in code and a string in the encoded
 *   row, matching the `STRING` column in {@link FactChecksTableDBSchema}.
 * - `source`: the feed the item came from, copied from the source list.
 * - `fact_check`: the item itself. Every field except `sha256` is optional
 *   because feeds vary in what they publish. Text fields are already
 *   normalized by the extractor (`summary` and `content` are Markdown).
 *   `published_at_raw` preserves the publisher's original date string and
 *   `published_at_normalized` is the parsed form.
 * - `http`: the response metadata of the fetch that produced the content.
 *
 * Optional fields are absent rather than `null`. Producers use
 * `omitNullKeys` from `core-data` to drop nulls before encoding.
 */
export const FactChecksTableRowSchema = Schema.Struct({
  fact_check_id: Schema.String,
  content_sha256: Schema.String,
  extracted_at: Schema.Date,
  fetched_at: Schema.Date,
  ingestor_run_id: Schema.String,
  extractor_run_id: Schema.String,
  source: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    url: Schema.String,
    collection: Schema.String,
  }),
  extractor_id: Schema.String,
  extractor_version: Schema.NumberFromString,
  fact_check: Schema.Struct({
    sha256: Schema.String,
    guid: Schema.optional(Schema.String),
    title: Schema.optional(Schema.String),
    author: Schema.optional(Schema.String),
    categories: Schema.optional(Schema.Array(Schema.String)),
    summary: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    enclosure_url: Schema.optional(Schema.String),
    image_url: Schema.optional(Schema.String),
    link: Schema.optional(Schema.String),
    published_at_raw: Schema.optional(Schema.String),
    published_at_normalized: Schema.optional(Schema.Date),
    canonical_url: Schema.optional(Schema.String),
    language: Schema.optional(Schema.String),
  }),
  http: Schema.Struct({
    final_url: Schema.optional(Schema.String),
    status_code: Schema.optional(Schema.Number),
    etag: Schema.optional(Schema.String),
    content_type: Schema.optional(Schema.String),
    last_modified: Schema.optional(Schema.String),
    headers: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: Schema.String,
      })
    ),
  }),
}).annotations({
  identifier: 'v1FactChecksTableRow',
  title: 'FactChecksTableRow',
  description: `
    A row in the fact checks table, representing a fact check extracted
    from an observation along with its metadata.`,
})

/** Decoded form of {@link FactChecksTableRowSchema}. */
export type FactChecksTableRow = Schema.Schema.Type<
  typeof FactChecksTableRowSchema
>

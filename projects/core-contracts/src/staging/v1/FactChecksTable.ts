import { Schema } from 'effect'

// Using STUCT instead of RECORD or X instead of INTEGER causes pulumi to redeploy table
// on every update. Add this to list of problems/mitigations in documentation about
// BigQuery and Pulumi.
export const FactChecksTableDBSchema = {
  fields: [
    { name: 'content_lineage_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extractor_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'extractor_version', type: 'STRING', mode: 'REQUIRED' },
    {
      name: 'source',
      type: 'RECORD',
      mode: 'NULLABLE',
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
        { name: 'sha256', type: 'STRING', mode: 'NULLABLE' },
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
        { name: 'verdict_raw', type: 'STRING', mode: 'NULLABLE' },
        { name: 'verdict_normalized', type: 'STRING', mode: 'NULLABLE' },
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

export const FactChecksTableRowSchema = Schema.Struct({
  content_lineage_id: Schema.String,
  content_sha256: Schema.String,
  extracted_at: Schema.Date,
  fetched_at: Schema.Date,
  ingestion_id: Schema.String,
  extraction_id: Schema.String,
  source: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    url: Schema.String,
    collection: Schema.String,
  }),
  extractor_id: Schema.String,
  extractor_version: Schema.Number,
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
    verdict_raw: Schema.optional(Schema.String),
    verdict_normalized: Schema.optional(Schema.String),
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
    from an observation along with its metadata and verdict.`,
})

export type FactChecksTableRow = Schema.Schema.Type<
  typeof FactChecksTableRowSchema
>

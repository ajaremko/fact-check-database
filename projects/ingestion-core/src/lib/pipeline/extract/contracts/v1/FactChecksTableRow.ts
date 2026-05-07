import { Schema } from 'effect'
import { SourceSchema } from '../../../shared/contracts/v1'

export const FactChecksTableRowSchema = Schema.Struct({
  content_lineage_id: Schema.String,
  content_sha256: Schema.String,
  extracted_at: Schema.Date,
  fetched_at: Schema.Date,
  ingestion_id: Schema.String,
  extraction_id: Schema.String,
  source: SourceSchema,
  fact_check: Schema.Struct({
    sha256: Schema.String,
    title: Schema.optional(Schema.String),
    claim: Schema.optional(Schema.String),
    verdict: Schema.optional(Schema.String),
    summary: Schema.optional(Schema.String),
    published_at: Schema.optional(Schema.String),
    canonical_url: Schema.optional(Schema.String),
    language: Schema.optional(Schema.String),
    normalized_verdict: Schema.optional(Schema.String),
    extractor_id: Schema.String,
    extractor_version: Schema.Number,
    extracted_from: Schema.optional(Schema.String),
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

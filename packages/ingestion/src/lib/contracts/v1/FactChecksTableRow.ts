import { Schema } from 'effect'

export const FactCheckVerdictSchema = Schema.Literal(
  'true',
  'false',
  'misleading',
  'unsupported',
  'exaggerated'
)

export type FactCheckVerdict = Schema.Schema.Type<typeof FactCheckVerdictSchema>

export const FactChecksTableRowSchema = Schema.Struct({
  content_hash: Schema.String,
  observation_id: Schema.String,
  ingestion_id: Schema.String,
  extraction_id: Schema.String,
  extracted_at: Schema.Date,
  fetched_at: Schema.Date,
  collection: Schema.String,
  source: Schema.String,
  url: Schema.String,
  final_url: Schema.String,
  published_at: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  claim: Schema.optional(Schema.String),
  verdict: Schema.optional(FactCheckVerdictSchema),
  summary: Schema.optional(Schema.String),
}).annotations({
  identifier: 'v1FactChecksTableRow',
  title: 'FactChecksTableRow',
  description: `
    A row in the fact checks table, representing a fack check extracted 
    from an observation along with its metadata and verdict.`,
})

export type FactChecksTableRow = Schema.Schema.Type<
  typeof FactChecksTableRowSchema
>

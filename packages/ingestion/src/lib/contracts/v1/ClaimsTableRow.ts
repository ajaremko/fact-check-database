import { Schema } from 'effect'

export const ClaimVerdictSchema = Schema.Literal(
  'true',
  'false',
  'misleading',
  'unsupported',
  'exaggerated'
)

export type ClaimVerdict = Schema.Schema.Type<typeof ClaimVerdictSchema>

export const ClaimsTableRowSchema = Schema.Struct({
  id: Schema.String,
  observation_id: Schema.String,
  ingestion_id: Schema.String,
  extraction_id: Schema.String,
  source: Schema.Struct({
    name: Schema.String,
    collection: Schema.String,
  }),
  url: Schema.String,
  final_url: Schema.String,
  fetched_at: Schema.String,
  extracted_at: Schema.String,
  published_at: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  claim: Schema.optional(Schema.String),
  verdict: Schema.optional(ClaimVerdictSchema),
  summary: Schema.optional(Schema.String),
}).annotations({
  identifier: 'v1ClaimsTableRow',
  title: 'ClaimsTableRow',
  description: `
    A row in the claims table, representing a claim extracted 
    from an observation along with its metadata and verdict.`,
})

export type ClaimsTableRow = Schema.Schema.Type<typeof ClaimsTableRowSchema>

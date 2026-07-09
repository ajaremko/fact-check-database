import { Schema } from 'effect'

export const ExtractionFailedSchema = Schema.Struct({
  event: Schema.Literal('extraction_failed'),
  type: Schema.String,
  error: Schema.String,
})

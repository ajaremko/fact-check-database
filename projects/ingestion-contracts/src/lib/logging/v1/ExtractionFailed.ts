import { Schema } from 'effect'

export const ExtractionFailedKey = 'extraction_failed'

export const ExtractionFailedSchema = Schema.Struct({
  event: Schema.Literal(ExtractionFailedKey),
  type: Schema.String,
  error: Schema.String,
})

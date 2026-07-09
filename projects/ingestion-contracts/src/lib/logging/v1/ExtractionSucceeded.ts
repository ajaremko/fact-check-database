import { Schema } from 'effect'

export const ExtractionSucceededKey = 'extraction_succeeded'

export const ExtractionSucceededSchema = Schema.Struct({
  event: Schema.Literal(ExtractionSucceededKey),
  count: Schema.Number,
})

import { Schema } from 'effect'

export const ExtractionSucceededSchema = Schema.Struct({
  event: Schema.Literal('extraction_succeeded'),
  count: Schema.Number,
})

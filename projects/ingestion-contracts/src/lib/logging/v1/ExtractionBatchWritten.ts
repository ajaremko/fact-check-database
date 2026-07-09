import { Schema } from 'effect'

export const ExtractionBatchWrittenSchema = Schema.Struct({
  event: Schema.Literal('batch_written'),
  'batch.path': Schema.String,
  'batch.format': Schema.String,
})

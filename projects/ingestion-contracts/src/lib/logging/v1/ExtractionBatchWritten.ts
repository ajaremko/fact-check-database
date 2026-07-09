import { Schema } from 'effect'

export const ExtractionBatchWrittenKey = 'batch_written'

export const ExtractionBatchWrittenSchema = Schema.Struct({
  event: Schema.Literal(ExtractionBatchWrittenKey),
  'batch.path': Schema.String,
  'batch.format': Schema.String,
})

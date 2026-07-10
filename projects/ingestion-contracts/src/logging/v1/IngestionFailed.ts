import { Schema } from 'effect'

export const IngestionFailedKey = 'fetch_failure'

export const IngestionFailedSchema = Schema.Struct({
  event: Schema.Literal(IngestionFailedKey),
  'result.error': Schema.String,
})

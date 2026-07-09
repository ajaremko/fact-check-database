import { Schema } from 'effect'

export const IngestionFailedSchema = Schema.Struct({
  event: Schema.Literal('fetch_failure'),
  'result.error': Schema.String,
})

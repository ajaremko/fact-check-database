import { Schema } from 'effect'

export const IngestionSucceededSchema = Schema.Struct({
  event: Schema.Literal('fetch_success'),
  'result.status': Schema.String,
  'result.status_code': Schema.Number,
  'result.content_type': Schema.String,
})

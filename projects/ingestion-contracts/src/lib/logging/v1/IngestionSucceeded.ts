import { Schema } from 'effect'

export const IngestionSucceededKey = 'fetch_success'

export const IngestionSucceededSchema = Schema.Struct({
  event: Schema.Literal(IngestionSucceededKey),
  'result.status': Schema.String,
  'result.status_code': Schema.Number,
  'result.content_type': Schema.String,
})

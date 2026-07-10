import { Schema } from 'effect'

export const RecordSanitizedKey = 'record_sanitized'

export const RecordSanitizedSchema = Schema.Struct({
  event: Schema.Literal(RecordSanitizedKey),
  'decision.label': Schema.String,
  'decision.error': Schema.NullOr(Schema.String),
  'source.collection': Schema.String,
  'source.id': Schema.String,
  'source.name': Schema.String,
  'source.url': Schema.String,
})

import { Schema } from 'effect'

export const RecordSanitizedSchema = Schema.Struct({
  event: Schema.Literal('record_sanitized'),
  'decision.label': Schema.String,
  'decision.error': Schema.NullOr(Schema.String),
  'source.collection': Schema.String,
  'source.id': Schema.String,
  'source.name': Schema.String,
  'source.url': Schema.String,
})

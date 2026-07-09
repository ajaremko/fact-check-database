import { Effect, Schema, flow } from 'effect'

import { RecordSanitizedSchema } from '@news-research/ingestion-contracts/logging/v1'

function logEvent<Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>,
  message: string
) {
  return flow(
    schema.make,
    Schema.encode(schema),
    Effect.andThen((annotations) =>
      Effect.annotateLogs(Effect.logInfo(message), annotations)
    )
  )
}

export const logRecordSanitized = logEvent(
  RecordSanitizedSchema,
  'Record sanitized'
)

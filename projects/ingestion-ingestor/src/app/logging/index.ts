import { Effect, Schema, flow } from 'effect'

import {
  IngestionSucceededSchema,
  IngestionFailedSchema,
  IngestionJobCompletedSchema,
} from '@news-research/ingestion-contracts/logging/v1'

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

export const logIngestionSucceeded = logEvent(
  IngestionSucceededSchema,
  'Ingestion succeeded'
)

export const logIngestionFailed = logEvent(
  IngestionFailedSchema,
  'Ingestion failed'
)

export const logIngestionJobCompleted = logEvent(
  IngestionJobCompletedSchema,
  'Ingestion job completed'
)

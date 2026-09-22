import { Effect, Schema, flow } from 'effect'

import {
  IngestionSucceededSchema,
  IngestionFailedSchema,
  IngestionJobCompletedSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'

// This whole file should probably be removed or reimagined
// its an abstracted procedure for logging events which is
// probably an unnecessary abstraction
function logEvent<Fields extends Schema.Struct.Fields>(
  schema: Schema.Struct<Fields>,
  message: string,
  log: (message: string) => Effect.Effect<void> = Effect.logInfo
) {
  return flow(
    schema.make,
    Schema.encode(schema),
    Effect.andThen((annotations) =>
      Effect.annotateLogs(log(message), annotations)
    )
  )
}

export const logIngestionSucceeded = logEvent(
  IngestionSucceededSchema,
  'Ingestion succeeded'
)

export const logIngestionFailed = logEvent(
  IngestionFailedSchema,
  'Ingestion failed',
  Effect.logWarning
)

export const logIngestionJobCompleted = logEvent(
  IngestionJobCompletedSchema,
  'Ingestion job completed'
)

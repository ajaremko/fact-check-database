import { Effect, Schema, flow } from 'effect'

import {
  ExtractionBatchWrittenSchema,
  ExtractionFailedSchema,
  ExtractionJobCompletedSchema,
  ExtractionSucceededSchema,
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

export const logExtractionBatchWritten = logEvent(
  ExtractionBatchWrittenSchema,
  'Extraction batch written'
)

export const logExtractionFailed = logEvent(
  ExtractionFailedSchema,
  'Extraction failed'
)

export const logExtractionJobCompleted = logEvent(
  ExtractionJobCompletedSchema,
  'Extraction job completed'
)

export const logExtractionSucceeded = logEvent(
  ExtractionSucceededSchema,
  'Extraction succeeded'
)

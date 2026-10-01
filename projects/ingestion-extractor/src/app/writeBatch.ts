import { Effect, Metric, pipe, Schema } from 'effect'

import * as Ndjson from '@fact-check-database/core-data/Ndjson'
import * as Node from '@fact-check-database/core-data/Node'
import { writeFile } from '@fact-check-database/core-io'
import {
  ExtractionBatchWrittenKey,
  ExtractionBatchWrittenSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'

import {
  ExtractionBatchSchema,
  ExtractionBatchPathSchema,
} from './ExtractionBatch'

const encodeNdjson = pipe(
  Schema.Object,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeExtractionBatchPath = Schema.encode(ExtractionBatchPathSchema)

const batchesWritten = Metric.counter('extracted_batches_written')

export const writeBatch = Effect.fn('writeBatch')(
  function* (input: {
    extractorRunId: string
    rows: object[]
    timestamp: number
    type: 'fact_checks'
  }) {
    yield* Effect.annotateLogsScoped({
      'batch.type': input.type,
      'batch.rows': input.rows.length,
    })
    const path = yield* encodeExtractionBatchPath({
      extractorRunId: input.extractorRunId,
      extractedAt: input.timestamp,
      type: input.type,
    })

    const data = yield* encodeNdjson(input.rows)
    const pointer = yield* writeFile({
      path,
      data,
      contentType: 'application/x-ndjson',
    })

    const batch = ExtractionBatchSchema.make({
      extractorRunId: input.extractorRunId,
      extractedAt: input.timestamp,
      type: input.type,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      pointer,
    })

    // The event fields feed the extraction dashboard, which counts one line
    // per event, so they are attached to this line only rather than scoped
    yield* Effect.logInfo('Batch written').pipe(
      Effect.annotateLogs(
        ExtractionBatchWrittenSchema.make({
          event: ExtractionBatchWrittenKey,
          'batch.path': path,
          'batch.format': batch.sourceFormat,
        })
      )
    )

    yield* Metric.increment(batchesWritten)

    return batch
  },
  Effect.scoped,
  (effect, input) =>
    effect.pipe(
      Effect.tagMetrics({
        batch_type: input.type,
      })
    )
)

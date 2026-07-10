import { Effect, Metric, pipe, Schema } from 'effect'

import * as Ndjson from '@news-research/core-data/Ndjson'
import * as Node from '@news-research/core-data/Node'
import { FactChecksTableDBSchema } from '@news-research/core-contracts'
import { writeFile } from '@news-research/core-io'

import {
  ExtractionBatchSchema,
  ExtractionBatchPathSchema,
} from './ExtractionBatch'
import { logExtractionBatchWritten } from './logging'

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
    runId: string
    rows: object[]
    timestamp: number
    type: 'fact_checks'
  }) {
    const path = yield* encodeExtractionBatchPath({
      batchId: input.runId,
      extractedAt: input.timestamp,
      type: input.type,
    })

    const data = yield* encodeNdjson(input.rows)
    const pointer = yield* writeFile({
      path,
      data,
      contentType: 'application/x-ndjson',
      meta: FactChecksTableDBSchema,
    })

    const batch = ExtractionBatchSchema.make({
      batchId: input.runId,
      extractedAt: input.timestamp,
      type: input.type,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      pointer,
    })

    yield* logExtractionBatchWritten({
      event: 'batch_written',
      'batch.path': path,
      'batch.format': batch.sourceFormat,
    })

    yield* Metric.increment(batchesWritten)

    return batch
  },
  (effect, input) =>
    effect.pipe(
      Effect.annotateLogs({
        'batch.type': input.type,
        'batch.rows': input.rows.length,
      }),
      Effect.tagMetrics({
        batch_type: input.type,
      })
    )
)

import { Effect, Metric, pipe, Schema } from 'effect'

import * as Ndjson from '@news-research/ingestion-data/Ndjson'
import * as Node from '@news-research/ingestion-data/Node'

import { writeFile } from '../shared'

import {
  ExtractionBatchSchema,
  ExtractionBatchEventSchema,
  ExtractionBatchPathSchema,
} from './ExtractionBatch'

const encodeNdjson = pipe(
  Schema.Object,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeExtractionBatchEvent = Schema.encode(ExtractionBatchEventSchema)
const encodeExtractionBatchPath = Schema.encode(ExtractionBatchPathSchema)

const batchesWritten = Metric.counter('extracted_batches_written')

export const writeBatch = Effect.fn('writeBatch')(
  function* (input: {
    runId: string
    rows: object[]
    timestamp: number
    tableId: string
    datasetId: string
  }) {
    const path = yield* encodeExtractionBatchPath({
      batchId: input.runId,
      extractedAt: input.timestamp,
      tableId: input.tableId,
      datasetId: input.datasetId,
    })
    const data = yield* encodeNdjson(input.rows)
    const pointer = yield* writeFile({
      path,
      data,
      contentType: 'application/x-ndjson',
    })

    const batch = ExtractionBatchSchema.make({
      batchId: input.runId,
      extractedAt: input.timestamp,
      table: {
        tableId: input.tableId,
        datasetId: input.datasetId,
      },
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      pointer,
    })

    yield* Effect.logInfo(`Batch written with ${input.rows.length} rows`).pipe(
      Effect.annotateLogs({
        event: 'batch_written',
        'batch.path': path,
        'batch.format': batch.sourceFormat,
      })
    )

    yield* Metric.increment(batchesWritten)

    return yield* encodeExtractionBatchEvent(batch)
  },
  (effect, input) =>
    effect.pipe(
      Effect.annotateLogs({
        'batch.tableId': input.tableId,
        'batch.datasetId': input.datasetId,
        'batch.rows': input.rows.length,
      }),
      Effect.tagMetrics({
        table_dataset_id: input.datasetId,
        table_table_id: input.tableId,
      })
    )
)

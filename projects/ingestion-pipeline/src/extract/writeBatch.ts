import { Effect, Metric, MetricBoundaries, pipe, Schema } from 'effect'

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

const batchesWrittenCounter = Metric.counter('extracted_batches_written')

const rowsPerBatchHistogram = Metric.histogram(
  'extracted_rows_per_batch',
  MetricBoundaries.exponential({ start: 1, factor: 2, count: 20 })
)

export const writeBatch = Effect.fn('writeBatch')(
  function* (input: {
    runId: string
    rows: object[]
    timestamp: number
    tableId: string
    datasetId: string
  }) {
    const encodePath = yield* encodeExtractionBatchPath({
      batchId: input.runId,
      extractedAt: input.timestamp,
      tableId: input.tableId,
      datasetId: input.datasetId,
    })
    const data = yield* encodeNdjson(input.rows)
    const pointer = yield* writeFile({
      path: encodePath,
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

    yield* Metric.increment(batchesWrittenCounter)
    yield* Metric.update(rowsPerBatchHistogram, input.rows.length)

    return yield* encodeExtractionBatchEvent(batch)
  },
  (effect, input) =>
    effect.pipe(
      Effect.annotateLogs({
        'batch.tableId': input.tableId,
        'batch.datasetId': input.datasetId,
        'batch.rows': input.rows.length,
      })
    )
)

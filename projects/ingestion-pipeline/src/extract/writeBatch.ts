import { Effect, pipe, Schema } from 'effect'

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

export function writeBatch(input: {
  runId: string
  rows: object[]
  timestamp: number
  tableId: string
  datasetId: string
}) {
  return Effect.gen(function* () {
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
    return yield* encodeExtractionBatchEvent(batch)
  }).pipe(
    Effect.annotateLogs({
      tableId: input.tableId,
      datasetId: input.datasetId,
      rows: input.rows.length,
    }),
    Effect.withSpan('writeBatch')
  )
}

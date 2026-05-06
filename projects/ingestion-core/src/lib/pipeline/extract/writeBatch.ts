import { Effect, pipe, Schema } from 'effect'

import { Node, Ndjson } from '../../data'

import { StorageWriter } from '../shared'

import * as FactChecksTableSchema from './FactChecksTableSchema'
import {
  ExtractionBatchSchema,
  ExtractionBatchEventSchema,
} from './ExtractionBatch'
import { FactCheckRowSchema, FactCheckRows } from './FactCheck'

const encodeFactChecks = pipe(
  FactCheckRowSchema,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeExtractionBatchEvent = Schema.encode(ExtractionBatchEventSchema)

export function writeBatch(input: {
  runId: string
  extracted: FactCheckRows
  extractedAt: number
  datasetId: string
}) {
  return Effect.gen(function* () {
    const schema = yield* FactChecksTableSchema.FactChecksTableSchema
    const data = yield* encodeFactChecks(input.extracted)
    const tableId = 'fact-checks'
    const pointer = yield* StorageWriter.writeFile({
      path: `${tableId}/${input.runId}.ndjson`,
      data,
      contentType: 'application/x-ndjson',
    })
    const batch = ExtractionBatchSchema.make({
      batchId: input.runId,
      extractedAt: input.extractedAt,
      table: {
        tableId,
        datasetId: input.datasetId,
      },
      schema,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      pointer,
    })
    return yield* encodeExtractionBatchEvent(batch)
  }).pipe(
    Effect.annotateLogs({ rowCount: input.extracted.length }),
    Effect.withSpan('writeBatch')
  )
}

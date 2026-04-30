import { Effect, pipe, Schema } from 'effect'

import { Node, Ndjson } from '../../data'

import { StorageWriter } from '../shared'

import { FactCheckRowSchema, FactCheckRows } from './FactCheck'
import { ExtractionBatchReady } from './ExtractionBatchReady'

const encodeFactChecks = pipe(
  FactCheckRowSchema,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.encode
)

export function writeBatch(input: {
  runId: string
  extracted: FactCheckRows
  extractedAt: number
  datasetId: string
  schema: { fields: readonly { name: string; type: string; mode: string }[] }
}) {
  return Effect.gen(function* () {
    const data = yield* encodeFactChecks(input.extracted)
    const tableId = 'fact-checks'
    const pointer = yield* StorageWriter.writeFile({
      path: `${tableId}/${input.runId}.ndjson`,
      data,
      contentType: 'application/x-ndjson',
    })
    return new ExtractionBatchReady({
      batchId: input.runId,
      extractedAt: input.extractedAt,
      table: {
        tableId,
        datasetId: input.datasetId,
      },
      schema: input.schema,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      pointer,
    })
  }).pipe(
    Effect.annotateLogs({ rowCount: input.extracted.length }),
    Effect.withSpan('writeBatch')
  )
}

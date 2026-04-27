import { Effect, pipe, Schema } from 'effect'

import { Node, Ndjson } from '../../util'
import { StorageWriter } from '../../ports'

import { FactCheckSchema, ExtractedFactChecks } from './FactCheck'
import { ExtractionBatchReady } from './ExtractionBatchReady'

const encodeFactChecks = pipe(
  FactCheckSchema,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.encode
)

export function writeBatch(input: {
  runId: string
  factChecks: ExtractedFactChecks
  extractedAt: number
  datasetId: string
  schema: { fields: readonly { name: string; type: string; mode: string }[] }
}) {
  return Effect.gen(function* () {
    const data = yield* encodeFactChecks(input.factChecks)
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
    Effect.annotateLogs({ rowCount: input.factChecks.length }),
    Effect.withSpan('writeBatch')
  )
}

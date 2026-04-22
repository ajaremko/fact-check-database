import { Effect, pipe, Schema } from 'effect'

import { Node, Ndjson } from '../../util'
import { StorageWriter } from '../../ports'

import { ExtractedClaimSchema, ExtractedClaims } from './Claim'
import { ExtractionBatchReady } from './ExtractionBatchReady'

const encodeExtractedRows = pipe(
  ExtractedClaimSchema,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.encode
)

export function writeExtractedRows(input: {
  runId: string
  rows: ExtractedClaims
  extractedAt: number
}) {
  return Effect.gen(function* () {
    const data = yield* encodeExtractedRows(input.rows)
    const pointer = yield* StorageWriter.writeFile({
      path: `claims/${input.runId}.ndjson`,
      data,
      contentType: 'application/x-ndjson',
    })
    return new ExtractionBatchReady({
      batchId: input.runId,
      extractedAt: input.extractedAt,
      table: {
        tableId: 'claims',
        datasetId: 'default_dataset',
      },
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      pointer,
    })
  }).pipe(
    Effect.annotateLogs({ rowCount: input.rows.length }),
    Effect.withSpan('writeExtractedRows')
  )
}

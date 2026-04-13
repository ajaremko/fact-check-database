import { Effect, pipe, Schema } from 'effect'

import { Node, Ndjson } from '../util'
import { StorageWriter } from '../ports'

import { ExtractedClaimSchema, ExtractedClaims } from './ExtractedClaim'
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
    const storageWriter = yield* StorageWriter
    const data = yield* encodeExtractedRows(input.rows)
    const pointer = yield* storageWriter.write({
      path: `claims/${input.runId}.ndjson`,
      data,
      contentType: 'application/x-ndjson',
    })
    return new ExtractionBatchReady({
      batchId: input.runId,
      pointer,
    })
  })
}

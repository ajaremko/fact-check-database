import { Effect, pipe, Schema } from 'effect'

import { Node, Ndjson } from '../util'

import { ExtractedClaimSchema, ExtractedClaims } from './ExtractedClaim'
import { StorageWriter } from '../ports'

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

    yield* Effect.logInfo(
      `Writing ${input.rows.length} extracted rows for run ${input.runId}`
    )

    yield* storageWriter.write({
      path: `claims/${input.runId}.ndjson`,
      data,
      contentType: 'application/x-ndjson',
    })
  })
}

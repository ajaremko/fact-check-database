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
      table: {
        tableId: 'claims',
        datasetId: 'default_dataset',
      },
      meta: {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        schema: {
          fields: [
            { name: 'id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'observation_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
            { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
            {
              name: 'source',
              type: 'STRUCT',
              fields: [
                { name: 'name', type: 'STRING', mode: 'REQUIRED' },
                { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
              ],
              mode: 'REQUIRED',
            },
            { name: 'url', type: 'STRING', mode: 'REQUIRED' },
            { name: 'final_url', type: 'STRING', mode: 'REQUIRED' },
            { name: 'fetched_at', type: 'STRING', mode: 'REQUIRED' },
            { name: 'extracted_at', type: 'STRING', mode: 'REQUIRED' },
            { name: 'published_at', type: 'STRING' },
            { name: 'title', type: 'STRING' },
            { name: 'claim', type: 'STRING' },
            { name: 'verdict', type: 'STRING' },
            { name: 'summary', type: 'STRING' },
          ],
        },
      },
    })
  })
}

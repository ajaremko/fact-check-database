import { ParseResult, Schema } from 'effect'

import { StagingPathSchema } from '@fact-check-database/core-contracts/staging/v1'
import { FilePointerSchema } from '@fact-check-database/ingestion-contracts/archive/v1'

/**
 * Schema for one extraction batch: the fact check rows written by a single
 * extractor run. The file is named by `extractorRunId`, so each run writes a new file; rows
 * are not deduplicated across batches (staging is an observation log). The
 * `pointer` field references the batch file in cloud storage.
 */
export const ExtractionBatchSchema = Schema.Struct({
  extractorRunId: Schema.String,
  extractedAt: Schema.Number,
  pointer: FilePointerSchema,
  type: Schema.Literal('fact_checks'),
  sourceFormat: Schema.Union(
    Schema.Literal('NEWLINE_DELIMITED_JSON'),
    Schema.String
  ),
})

export const ExtractionBatchPathSchema = Schema.transformOrFail(
  StagingPathSchema,
  Schema.Struct({
    extractorRunId: Schema.String,
    extractedAt: Schema.Number,
    type: Schema.Literal('fact_checks'),
  }),
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ExtractionBatchPath not implemented'
        )
      ),
    encode: (input) => {
      return ParseResult.succeed({
        version: 1,
        type: input.type,
        ext: 'batch.ndjson',
        date: input.extractedAt,
        extractorRunId: input.extractorRunId,
      })
    },
  }
)

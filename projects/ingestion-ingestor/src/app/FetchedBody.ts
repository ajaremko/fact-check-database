import { Schema, ParseResult } from 'effect'

import { ArchivePathSchema } from '@fact-check-database/ingestion-contracts/archive/v1'
import { TimestampSchema } from '@fact-check-database/ingestion-contracts/shared/v1'

/**
 * The raw response body of one fetch attempt, archived under its
 * `contentSha256` so identical bytes are recognizable by name.
 */
export const FetchedBodySchema = Schema.Struct({
  contentSha256: Schema.String,
  ingestorRunId: Schema.String,
  body: Schema.instanceOf(Uint8Array),
  sourceId: Schema.String,
  fetchedAt: TimestampSchema,
  contentType: Schema.NullOr(Schema.String),
})

export const FetchedBodyPathSchema = Schema.transformOrFail(
  ArchivePathSchema,
  FetchedBodySchema,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ArchivePath not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        version: 1 as const,
        collectionName: 'raw',
        ext: `bin`,
        sourceId: input.sourceId,
        date: input.fetchedAt,
        ingestorRunId: input.ingestorRunId,
        fileName: input.contentSha256,
      }),
  }
)

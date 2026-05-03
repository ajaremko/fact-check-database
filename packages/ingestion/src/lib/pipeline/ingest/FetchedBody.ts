import { Schema, ParseResult } from 'effect'

import { ArchivePathSchema } from '../shared/contracts/v1'

import { TimestampSchema } from '../shared'

export const FetchedBodySchema = Schema.Struct({
  observationId: Schema.String,
  ingestionId: Schema.String,
  body: Schema.instanceOf(Uint8Array),
  sourceName: Schema.String,
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
        sourceName: input.sourceName,
        date: input.fetchedAt,
        ingestionId: input.ingestionId,
        observationId: input.observationId,
      }),
  }
)

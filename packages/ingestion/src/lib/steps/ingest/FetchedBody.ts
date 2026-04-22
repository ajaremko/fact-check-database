import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

export class FetchedBody extends Schema.Class<FetchedBody>('FetchedBody')({
  observationId: Schema.String,
  ingestionId: Schema.String,
  body: Schema.instanceOf(Uint8Array),
  sourceName: Schema.String,
  fetchedAt: Schema.Number,
  contentType: Schema.optional(Schema.String),
}) {}

export const FetchedBodyPathSchema = Schema.transformOrFail(
  v1.ArchivePathSchema,
  FetchedBody,
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

import { ParseResult, Schema } from 'effect'

import * as v1 from '../../contracts/v1'

import { SourceSchema, TimestampSchema } from '../shared'

import { FetchResult } from './FetchResult'

export const ObservationIdSchema = Schema.transformOrFail(
  v1.ContentLineageIdSchema,
  Schema.Struct({
    fetchedAt: TimestampSchema,
    result: FetchResult,
    source: SourceSchema,
  }),
  {
    strict: true,
    encode: (input) => {
      if (input.result._tag === 'FetchFailure') {
        return ParseResult.succeed({
          version: 1,
          success: false as const,
          url: input.source.url,
          fetchedAt: input.fetchedAt,
          error: input.result.error,
        })
      }
      return ParseResult.succeed({
        version: 1,
        success: true as const,
        url: input.source.url,
        sha256: input.result.sha256,
      })
    },
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding observation IDs not implemented'
        )
      ),
  }
)

export type ObservationId = Schema.Schema.Type<typeof ObservationIdSchema>

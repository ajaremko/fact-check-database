import { ParseResult, Schema } from 'effect'

import * as v1 from '../../contracts/v1'

import { FetchResult } from './FetchResult'

export const ObservationIdSchema = Schema.transformOrFail(
  v1.ObservationIdSchema,
  FetchResult,
  {
    strict: true,
    encode: (input) => {
      if (input._tag === 'FetchFailure') {
        return ParseResult.succeed({
          version: 1,
          success: false as const,
          url: input.url,
          fetchedAt: input.fetchedAt,
          error: input.error,
        })
      }
      return ParseResult.succeed({
        version: 1,
        success: true as const,
        url: input.url,
        sha256: input.sha256,
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

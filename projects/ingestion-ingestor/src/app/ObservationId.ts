import { ParseResult, Schema } from 'effect'

import {
  ContentLineageIdSchema,
  TimestampSchema,
} from '@news-research/ingestion-contracts'

import { FetchResultSchema } from '../ports/Fetcher'
import { SourceSchema } from '../contracts/Source'

export const ObservationIdSchema = Schema.transformOrFail(
  ContentLineageIdSchema,
  Schema.Struct({
    fetchedAt: TimestampSchema,
    result: FetchResultSchema,
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

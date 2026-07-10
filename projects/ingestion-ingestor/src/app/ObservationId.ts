import { ParseResult, Schema } from 'effect'

import { ContentLineageIdSchema } from '@news-research/ingestion-contracts/archive/v1'
import { SourceConfigSchema } from '@news-research/ingestion-contracts/config/v1'

import { TimestampSchema } from '@news-research/ingestion-contracts/shared/v1'

import { FetchResultSchema } from '../ports/Fetcher'

export const ObservationIdSchema = Schema.transformOrFail(
  ContentLineageIdSchema,
  Schema.Struct({
    fetchedAt: TimestampSchema,
    result: FetchResultSchema,
    source: SourceConfigSchema,
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

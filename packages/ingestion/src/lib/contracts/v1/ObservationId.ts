import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from '../../data'

export const ObservationIdSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Union(
    Schema.Struct({
      version: Schema.Literal(1),
      success: Schema.Literal(false),
      url: Schema.String,
      fetchedAt: NumberFromFormattedDate('yyyy-MM-dd'),
      error: Schema.String,
    }),
    Schema.Struct({
      version: Schema.Literal(1),
      success: Schema.Literal(true),
      url: Schema.String,
      sha256: Schema.String,
    })
  ),
  {
    strict: true,
    encode: (input) => {
      if (!input.success) {
        const id = `v${input.version}|url=${input.url}|t=${input.fetchedAt}|error=${input.error}`
        return ParseResult.succeed(id)
      }
      const id = `v${input.version}|url=${input.url}|sha256=${input.sha256}`
      return ParseResult.succeed(id)
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

import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from '@news-research/core-contracts/shared/v1'

export const ContentLineageIdSchema = Schema.transformOrFail(
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
          'Decoding Content Lineage IDs not implemented'
        )
      ),
  }
).annotations({
  identifier: 'v1ContentLineageId',
  title: 'ContentLineageId',
  description: `
    A unique identifier of an observation encoding the 
    version, success status, URL, and either fetch timestamp 
    with error message (for failures) or content hash (for successes).`,
})

export type ContentLineageId = Schema.Schema.Type<typeof ContentLineageIdSchema>

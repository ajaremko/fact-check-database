import { ParseResult, Schema } from 'effect'
import { NumberFromFormattedDate } from '../../data/NumberFromFormattedDate'

const FailedObservationIdSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    url: Schema.String,
    fetchedAt: NumberFromFormattedDate('yyyy-MM-dd'),
    error: Schema.String,
  }),
  {
    strict: true,
    encode: ({ version, url, fetchedAt, error }) => {
      const id = `v${version}|url=${url}|t=${fetchedAt}|error=${error}`
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

const SuccessfulObservationIdSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    url: Schema.String,
    sha256: Schema.String,
  }),
  {
    strict: true,
    encode: ({ version, url, sha256 }) => {
      const id = `v${version}|url=${url}|sha256=${sha256}`
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

export const ObservationIdSchema = Schema.Union(
  FailedObservationIdSchema,
  SuccessfulObservationIdSchema
)

export type ObservationId = Schema.Schema.Type<typeof ObservationIdSchema>

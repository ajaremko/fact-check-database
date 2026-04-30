import { ParseResult, Schema } from 'effect'
import { NumberFromFormattedDate } from './NumberFromFormattedDate'

/**
 * Schema for the GCS object path where extracted data is staged. Encodes the
 * `collectionName`, `date`, `extractionId`, and `ext` fields into a structured path for
 * queryable organization in GCS.
 *
 * Example path: `v1/fact_checks/date=2024-01-01/extraction-1.ndjson`
 */
export const StagingPathSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    collectionName: Schema.String,
    ext: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    extractionId: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const output = [
        `v${input.version}`,
        input.collectionName,
        `date=${input.date}`,
        `${input.extractionId}.${input.ext}`,
      ].join('/')
      return ParseResult.succeed(output)
    },
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding StagingPath not implemented'
        )
      ),
  }
).annotations({
  identifier: 'v1StagingPath',
  title: 'StagingPath',
  description: `
    Schema for the GCS object path where extracted data is staged.`,
})

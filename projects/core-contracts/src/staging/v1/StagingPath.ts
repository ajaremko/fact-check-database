import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from '../../shared/v1'

export function stagingPathPrefix(type: string, version: number): string {
  return `v${version}/type=${type}`
}

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
    type: Schema.Literal('fact_checks'),
    ext: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    extractionId: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const prefix = stagingPathPrefix(input.type, input.version)
      const output = `${prefix}/date=${input.date}/${input.extractionId}.${input.ext}`
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

export type StagingPath = Schema.Schema.Type<typeof StagingPathSchema>

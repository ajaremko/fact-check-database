import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from './NumberFromFormattedDate'

/**
 * The leading path segments under which every staged object of one type and
 * contract version lives: `v{version}/type={type}`.
 *
 * Exposed separately from {@link StagingPathSchema} for use with GCS bucket
 * notification config and for filtering and organizing staged objects.
 *
 * @example
 * stagingPathPrefix('fact_checks', 1) // → "v1/type=fact_checks"
 */
export function stagingPathPrefix(type: string, version: number): string {
  return `v${version}/type=${type}`
}

/**
 * Schema for the object path under which the extractor stages a batch in the
 * staging bucket.
 *
 * The layout is `v{version}/type={type}/date={yyyy-MM-dd}/{extractorRunId}.{ext}`,
 * so paths sort by contract version, then record type, then day, and a bucket
 * listing or notification filter can select any of those levels by prefix.
 * The `date` component is a Unix-millisecond `number` in code and is
 * formatted by {@link NumberFromFormattedDate}.
 *
 * This schema is **encode-only**. Decoding is not currently required.
 *
 * @example
 * Schema.encodeSync(StagingPathSchema)({
 *   version: 1,
 *   type: 'fact_checks',
 *   date: 1704067200000,
 *   extractorRunId: 'run-1',
 *   ext: 'ndjson',
 * })
 * // → "v1/type=fact_checks/date=2024-01-01/run-1.ndjson"
 */
export const StagingPathSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    type: Schema.Literal('fact_checks'),
    ext: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    extractorRunId: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const prefix = stagingPathPrefix(input.type, input.version)
      const output = `${prefix}/date=${input.date}/${input.extractorRunId}.${input.ext}`
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

/** Decoded form of {@link StagingPathSchema}: the parts of a staging path, with `date` in Unix milliseconds. */
export type StagingPath = Schema.Schema.Type<typeof StagingPathSchema>

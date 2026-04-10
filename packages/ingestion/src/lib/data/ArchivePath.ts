import { ParseResult, Schema } from 'effect'
import { NumberFromFormattedDate } from './NumberFromFormattedDate'

/**
 * Schema for the GCS object path where a sanitizer record is stored. Encodes the
 * `collectionName`, `sourceName`, `date`, `runId`, `id`, and `ext` fields into a structured path for
 * queryable organization in GCS.
 *
 * Example path: `v1/records/source=example_source/date=2024-01-01/run=abc123/record_id.sanitizer.yml`
 */
export const ArchivePathSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    collectionName: Schema.String,
    ext: Schema.String,
    sourceName: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    runId: Schema.String,
    id: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const output = [
        `v${input.version}`,
        input.collectionName,
        `source=${input.sourceName}`,
        `date=${input.date}`,
        `run=${input.runId}`,
        `${input.id}.${input.ext}`,
      ].join('/')
      return ParseResult.succeed(output)
    },
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding archive paths not implemented'
        )
      ),
  }
)

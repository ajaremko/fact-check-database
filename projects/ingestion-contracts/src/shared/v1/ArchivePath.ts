import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from '@news-research/core-contracts/shared/v1'

/**
 * Schema for the GCS object path where a sanitizer record is stored. Encodes the
 * `collectionName`, `sourceName`, `date`, `ingestionId`, `observationId`, and `ext` fields into a structured path for
 * queryable organization in GCS.
 *
 * Example path: `v1/records/source=example_source/date=2024-01-01/ingestion_id=abc123/observation_id.sanitizer.yml`
 */
export const ArchivePathSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    collectionName: Schema.String,
    ext: Schema.String,
    sourceName: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    ingestionId: Schema.String,
    observationId: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const output = [
        `v${input.version}`,
        input.collectionName,
        `source=${input.sourceName}`,
        `date=${input.date}`,
        `ingestion_id=${input.ingestionId}`,
        `${input.observationId}.${input.ext}`,
      ].join('/')
      return ParseResult.succeed(output)
    },
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ArchivePath not implemented'
        )
      ),
  }
).annotations({
  identifier: 'v1ArchivePath',
  title: 'ArchivePath',
  description: `
    Schema for the GCS object path where a sanitizer record is stored.`,
})

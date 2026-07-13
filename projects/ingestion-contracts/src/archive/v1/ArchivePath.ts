import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from './NumberFromFormattedDate'

export function archivePathPrefix(collection: string, version: number): string {
  return `v${version}/${collection}`
}

/**
 * Schema for the GCS object path where a sanitizer record is stored. Encodes the
 * `collectionName`, `sourceName`, `date`, `ingestionId`, `observationId`, and `ext` fields into a structured path for
 * queryable organization in GCS.
 *
 * Example path: `v1/records/ingestion/source=example_source/date=2024-01-01/ingestion_id=abc123/observation_id.sanitizer.yml`
 */
export const ArchivePathSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    collectionName: Schema.String,
    ext: Schema.String,
    sourceId: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    ingestionId: Schema.String,
    observationId: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const output = [
        archivePathPrefix(input.collectionName, input.version),
        `source=${input.sourceId}`,
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

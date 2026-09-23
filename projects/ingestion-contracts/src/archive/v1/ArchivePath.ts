import { ParseResult, Schema } from 'effect'

import { NumberFromFormattedDate } from './NumberFromFormattedDate'

export function archivePathPrefix(collection: string, version: number): string {
  return `v${version}/${collection}`
}

/**
 * Schema for the GCS object path of an archived object (raw body or record).
 * Encodes the `collectionName`, `sourceId`, `date`, `ingestorRunId`,
 * `fileName`, and `ext` fields into a structured path for queryable
 * organization in GCS.
 *
 * One ingestor run fetches each source once, so `source` + `ingestor_run_id`
 * identify a single fetch attempt; `fileName` only distinguishes the objects
 * written for that attempt (e.g. `fetch_attempt` for records, the body's
 * `content_sha256` for raw bytes).
 *
 * Example path: `v1/records/ingestion/source=example_source/date=2024-01-01/ingestor_run_id=abc123/fetch_attempt.yml`
 */
export const ArchivePathSchema = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({
    version: Schema.Literal(1),
    collectionName: Schema.String,
    ext: Schema.String,
    sourceId: Schema.String,
    date: NumberFromFormattedDate('yyyy-MM-dd'),
    ingestorRunId: Schema.String,
    fileName: Schema.String,
  }),
  {
    strict: true,
    encode: (input) => {
      const output = [
        archivePathPrefix(input.collectionName, input.version),
        `source=${input.sourceId}`,
        `date=${input.date}`,
        `ingestor_run_id=${input.ingestorRunId}`,
        `${input.fileName}.${input.ext}`,
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
    Schema for the GCS object path of an archived body or record.`,
})

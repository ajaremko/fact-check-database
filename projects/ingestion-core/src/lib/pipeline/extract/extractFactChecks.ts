import { Array, Effect, pipe, Schema } from 'effect'

import { Node, Yaml } from '../../data'

import { FilePointer, StorageReader } from '../shared'

import { FactCheckRow, FactCheckRowSchema } from './FactCheck'
import { ObservationSchema } from './Observation'
import { extractors } from './extraction-strategy'

const decodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeFactCheckRows = Schema.encode(Schema.Array(FactCheckRowSchema))

export function extractFactChecks(ctx: {
  extractionId: string
  observationId: string
  pointer: FilePointer
  extractedAt: number
}) {
  return Effect.gen(function* () {
    const recordData = yield* StorageReader.readFile(ctx.pointer)
    const observation = yield* decodeObservation(recordData)
    const { content, http } = observation
    if (!http || !content || !observation.shouldExtract) {
      yield* Effect.logInfo(
        `Skipping extraction for observation ${ctx.observationId}`
      )
      return []
    }

    const extractor = extractors.find((e) =>
      e.canHandle({
        collection: observation.source.collection,
        name: observation.source.name,
      })
    )

    if (!extractor) {
      yield* Effect.logWarning(
        `No extractor available for collection ${observation.source.collection} for observation ${ctx.observationId}, skipping extraction`
      )
      return []
    }

    yield* Effect.logInfo(
      `Extracting fact checks for observation ${ctx.observationId} from sanitized record`
    )

    const responsePointer = observation.sanitized ?? observation.raw

    if (!responsePointer) {
      yield* Effect.logWarning(
        `No pointer available for observation ${ctx.observationId}, skipping extraction`
      )
      return []
    }

    const responseData = yield* StorageReader.readFile(responsePointer)
    const factChecks = yield* extractor
      .extractor({
        timestamp: ctx.extractedAt,
        record: observation,
        data: responseData,
      })
      .pipe(
        Effect.map(
          Array.map(
            (factCheck): FactCheckRow => ({
              id: factCheck.sha256,
              observationId: ctx.observationId,
              extractionId: ctx.extractionId,
              fetchedAt: observation.fetchedAt,
              extractedAt: ctx.extractedAt,
              ingestionId: observation.ingestionId,
              factCheck,
              extractor: {
                id: extractor.id,
                version: extractor.version,
              },
              http: {
                contentSha256: content.sha256,
                finalUrl: http.finalUrl,
                status: http.status,
                contentType: http.contentType,
                etag: http.etag,
                lastModified: http.lastModified,
                headers: http.headers,
              },
              source: observation.source,
            })
          )
        ),
        Effect.tapError(Effect.logWarning),
        Effect.catchAll(() => Effect.succeed([])),
        Effect.annotateLogs({
          observationId: ctx.observationId,
          collection: observation.source.collection,
          name: observation.source.name,
          extractorId: extractor.id,
        }),
        Effect.withSpan('extractor')
      )

    const rows = yield* encodeFactCheckRows(factChecks)
    return rows
  }).pipe(
    Effect.annotateLogs({ extractionId: ctx.extractionId }),
    Effect.withSpan('extractRowsFromSanitized')
  )
}

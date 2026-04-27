import { Effect, pipe, Schema } from 'effect'

import { Node, Yaml } from '../../util'
import { StorageReader } from '../../ports'

import { ObservationSchema } from './Observation'
import { extractors } from './extraction-strategy'

const decodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export function extractFactChecks(ctx: {
  extractionId: string
  observationId: string
  pointer: { object: string; bucket: string }
  extractedAt: number
}) {
  return Effect.gen(function* () {
    const recordData = yield* StorageReader.readFile(ctx.pointer)
    const record = yield* decodeObservation(recordData)

    if (!record.shouldExtract) {
      yield* Effect.logInfo(
        `Skipping extraction for observation ${ctx.observationId}`
      )
      return []
    }

    const extractor = extractors.find((e) =>
      e.canHandle({
        collection: record.source.collection,
        name: record.source.name,
      })
    )

    if (!extractor) {
      yield* Effect.logWarning(
        `No extractor available for collection ${record.source.collection} for observation ${ctx.observationId}, skipping extraction`
      )
      return []
    }

    yield* Effect.logInfo(
      `Extracting fact checks for observation ${ctx.observationId} from sanitized record`
    )

    const responsePointer = record.sanitized ?? record.raw

    if (!responsePointer) {
      yield* Effect.logWarning(
        `No pointer available for observation ${ctx.observationId}, skipping extraction`
      )
      return []
    }

    const responseData = yield* StorageReader.readFile(responsePointer)
    return yield* extractor
      .extractor({
        extractionId: extractor.id,
        ingestionId: record.ingestionId,
        observationId: ctx.observationId,
        extractedAt: ctx.extractedAt,
        record,
        data: responseData,
      })
      .pipe(
        Effect.tapError(Effect.logWarning),
        Effect.catchAll(() => Effect.succeed([])),
        Effect.annotateLogs({
          observationId: ctx.observationId,
          collection: record.source.collection,
          name: record.source.name,
          extractorId: extractor.id,
        }),
        Effect.withSpan(`extractor.${extractor.id}`)
      )
  }).pipe(
    Effect.annotateLogs({ extractionId: ctx.extractionId }),
    Effect.withSpan('extractRowsFromSanitized')
  )
}

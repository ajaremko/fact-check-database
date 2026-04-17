import { Effect, pipe, Schema } from 'effect'

import { FilePointer, SanitizerRecordSchema } from '../../data'
import { Node, Yaml } from '../../util'
import { StorageReader } from '../../ports'

import { extractors } from './extraction-strategy'

const decodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export function extractRowsFromSanitized(input: {
  runId: string
  observationId: string
  pointer: FilePointer
  extractedAt: number
}) {
  return Effect.gen(function* () {
    const storageReader = yield* StorageReader
    const recordData = yield* storageReader.read(input.pointer)
    const record = yield* decodeSanitizerRecord(recordData)

    const extractor = extractors.find((e) =>
      e.canHandle({
        collection: record.source.collection,
        name: record.source.name,
      })
    )

    if (!extractor) {
      yield* Effect.logWarning(
        `No extractor available for collection ${record.source.collection} for observation ${input.observationId}, skipping extraction`
      )
      return []
    }

    yield* Effect.logInfo(
      `Extracting rows for observation ${input.observationId} from sanitized record`
    )

    const responsePointer = record.sanitizedRaw ?? record.input.raw

    if (!responsePointer) {
      yield* Effect.logWarning(
        `No pointer available for observation ${input.observationId}, skipping extraction`
      )
      return []
    }

    const responseData = yield* storageReader.read(responsePointer)
    return yield* extractor
      .extractor({
        extractionId: extractor.id,
        ingestionId: record.ingestionId,
        observationId: input.observationId,
        extractedAt: input.extractedAt,
        record,
        data: responseData,
      })
      .pipe(
        Effect.tapError(Effect.logWarning),
        Effect.catchAll(() => Effect.succeed([])),
        Effect.annotateLogs({
          observationId: input.observationId,
          collection: record.source.collection,
          name: record.source.name,
          extractorId: extractor.id,
        }),
        Effect.withSpan(`extractor.${extractor.id}`)
      )
  }).pipe(
    Effect.annotateLogs({ runId: input.runId }),
    Effect.withSpan('extractRowsFromSanitized')
  )
}

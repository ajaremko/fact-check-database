import { Effect, pipe, Schema } from 'effect'

import { Yaml } from '@news-research/yaml'
import { Node } from '@news-research/node'

import { FilePointer, SanitizerRecordSchema } from '../data'
import { Archive } from '../ports'

const decodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export function extractRowsFromSanitized(
  observationId: string,
  pointer: FilePointer
) {
  return Effect.gen(function* () {
    const archive = yield* Archive
    const recordData = yield* archive.read(pointer)
    const record = yield* decodeSanitizerRecord(recordData)

    yield* Effect.logInfo(
      `Extracting rows for observation ${observationId} from sanitized record`
    )

    const responsePointer = record.sanitizedRaw ?? record.input.raw

    if (!responsePointer) {
      yield* Effect.logWarning(
        `No  pointer available for observation ${observationId}, skipping extraction`
      )
      return []
    }

    yield* archive.read(responsePointer)
    return []
  })
}

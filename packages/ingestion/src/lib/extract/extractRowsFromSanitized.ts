import { Effect } from 'effect'

import { FilePointer } from '../data'

import { Archiver } from './Archive'

export function extractRowsFromSanitized(
  observationId: string,
  pointer: FilePointer
) {
  return Effect.gen(function* () {
    const archiver = yield* Archiver
    const record = yield* archiver.readSanitizerRecord(pointer)

    yield* Effect.logInfo(
      `Extracting rows for observation ${observationId} from sanitized record`
    )

    const rawPointer = record.sanitizedRaw ?? record.input.raw

    if (!rawPointer) {
      yield* Effect.logWarning(
        `No raw pointer available for observation ${observationId}, skipping extraction`
      )
      return []
    }

    yield* archiver.readSanitizedBody(rawPointer)
    return []
  })
}

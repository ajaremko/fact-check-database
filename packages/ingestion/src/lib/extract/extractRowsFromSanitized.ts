import { Effect, pipe, Schema } from 'effect'

import { FilePointer, SanitizerRecordSchema } from '../data'
import { Node, Xml, Yaml } from '../util'
import { Archive } from '../ports'

const decodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const decodeRss = pipe(
  Schema.Struct({}),
  Xml.parseXml(),
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

    if (record.source.collection !== 'rss') {
      yield* Effect.logWarning(
        `Unsupported collection ${record.source.collection} for observation ${observationId}, skipping extraction`
      )
      return []
    }

    yield* Effect.logInfo(
      `Extracting rows for observation ${observationId} from sanitized record`
    )

    const responsePointer = record.sanitizedRaw ?? record.input.raw

    if (!responsePointer) {
      yield* Effect.logWarning(
        `No pointer available for observation ${observationId}, skipping extraction`
      )
      return []
    }

    const responseData = yield* archive.read(responsePointer)
    const rss = yield* decodeRss(responseData)
    console.log({ rss })
    return []
  })
}

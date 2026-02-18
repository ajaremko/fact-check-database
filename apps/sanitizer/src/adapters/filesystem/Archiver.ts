import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { FilePointer, IngestionRecord } from '@news-research/contracts'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

import { Archiver, ArchiverError } from '../../ports/Archiver'

// Record -> YAML -> Buffer
const decodeFetchAttemptRecord = pipe(
  IngestionRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

// Record -> YAML -> Buffer
const encodeFetchAttemptRecord = pipe(
  IngestionRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

// Metadata -> JSON -> Buffer
const encodeMetadata = pipe(
  IngestionRecord.IngestionRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')
  yield* fs.makeDirectory(outputDir, { recursive: true })

  function readRawBody(pointer: FilePointer) {
    return fs
      .readFile(pointer.object)
      .pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function readFetchAttemptRecord(pointer: FilePointer) {
    return fs.readFile(pointer.object).pipe(
      Effect.andThen(decodeFetchAttemptRecord),
      Effect.mapError((cause) => new ArchiverError({ cause }))
    )
  }

  function writeSanitizedBody(id: string, body: Uint8Array) {
    return Effect.gen(function* () {
      const rawObject = `${outputDir}/${id}.bin`
      yield* fs.writeFile(rawObject, Buffer.from(body))

      return {
        bucket: 'local',
        object: rawObject,
      }
    }).pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function writeSanitizerRecord(
    id: string,
    record: IngestionRecord.IngestionRecord,
    metadata: IngestionRecord.IngestionRecordMetadata
  ) {
    return Effect.gen(function* () {
      const recordObject = `${outputDir}/${id}.yml`
      const data = encodeFetchAttemptRecord(record)
      yield* fs.writeFile(recordObject, data)

      const metaObject = `${outputDir}/${id}.metadata.json`
      const metaDataEncoded = encodeMetadata(metadata)
      yield* fs.writeFile(metaObject, metaDataEncoded)

      return {
        bucket: 'local',
        object: recordObject,
      }
    }).pipe(
      Effect.catchAll((cause) => Effect.fail(new ArchiverError({ cause })))
    )
  }

  return Archiver.of({
    readFetchAttemptRecord,
    readRawBody,
    writeSanitizedBody,
    writeSanitizerRecord,
  })
})

export const layer = Layer.effect(Archiver, make)

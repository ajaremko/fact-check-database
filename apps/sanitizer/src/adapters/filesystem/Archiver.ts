import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import {
  FilePointer,
  IngestorRecord,
  SantizerRecord,
} from '@news-research/contracts'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

import { Archiver, ArchiverError } from '../../ports/Archiver'

// Record -> YAML -> Buffer
const decodeIngestorRecord = pipe(
  IngestorRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

// Record -> YAML -> Buffer
const encodeSanitizerRecord = pipe(
  SantizerRecord.SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

// Metadata -> JSON -> Buffer
const encodeMetadata = pipe(
  SantizerRecord.SantizerRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const outputDir = yield* Config.string('SANITIZER_OUTPUT_DIR')
  yield* fs.makeDirectory(outputDir, { recursive: true })

  function readRawBody(pointer: FilePointer) {
    return fs
      .readFile(pointer.object)
      .pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function readFetchAttemptRecord(pointer: FilePointer) {
    return fs.readFile(pointer.object).pipe(
      Effect.andThen(decodeIngestorRecord),
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
    record: SantizerRecord.SanitizerRecord,
    metadata: SantizerRecord.SantizerRecordMetadata
  ) {
    return Effect.gen(function* () {
      const recordObject = `${outputDir}/${id}.yml`
      const data = yield* encodeSanitizerRecord(record)
      yield* fs.writeFile(recordObject, data)

      const metaObject = `${outputDir}/${id}.metadata.json`
      const metaDataEncoded = yield* encodeMetadata(metadata)
      yield* fs.writeFile(metaObject, metaDataEncoded)

      return {
        bucket: 'local',
        object: recordObject,
      }
    }).pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  return Archiver.of({
    readFetchAttemptRecord,
    readRawBody,
    writeSanitizedBody,
    writeSanitizerRecord,
  })
})

export const layer = Layer.effect(Archiver, make)

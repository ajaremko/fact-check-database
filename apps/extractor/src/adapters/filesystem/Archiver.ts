import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Archiver, ArchiverError } from '@news-research/ingestion/extract'
import {
  FilePointer,
  IngestionRecordSchema,
  SanitizerRecordSchema,
  SanitizerRecordMetadataSchema,
  SanitizerRecord,
  SanitizerRecordMetadata,
} from '@news-research/ingestion'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

const decodeIngestorRecord = pipe(
  IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeMetadata = pipe(
  SanitizerRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function parentDir(filePath: string): string {
  return filePath.split('/').slice(0, -1).join('/')
}

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const outputDir = yield* Config.string('SANITIZER_OUTPUT_DIR')

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

  function writeSanitizedBody(baseDir: string, id: string, body: Uint8Array) {
    return Effect.gen(function* () {
      const rawObject = `${outputDir}/sanitized/${baseDir}/${id}.bin`
      yield* fs.makeDirectory(parentDir(rawObject), { recursive: true })
      yield* fs.writeFile(rawObject, Buffer.from(body))

      return {
        bucket: 'local',
        object: rawObject,
      }
    }).pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function writeSanitizerRecord(
    baseDir: string,
    record: SanitizerRecord,
    metadata: SanitizerRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = record.sanitizationId
      const recordObject = `${outputDir}/records/${baseDir}/${id}.sanitizer.yml`
      yield* fs.makeDirectory(parentDir(recordObject), { recursive: true })

      const data = yield* encodeSanitizerRecord(record)
      yield* fs.writeFile(recordObject, data)

      const metaObject = `${outputDir}/records/${baseDir}/${id}.sanitizer.metadata.json`
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

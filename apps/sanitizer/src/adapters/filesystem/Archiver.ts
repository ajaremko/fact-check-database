import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Archiver, ArchiverError } from '@news-research/ingestion-sanitize'
import {
  FilePointer,
  IngestorRecord,
  SantizerRecord,
} from '@news-research/contracts'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'
import { archiveBaseDir } from '@news-research/ingestion-shared'

const decodeIngestorRecord = pipe(
  IngestorRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSanitizerRecord = pipe(
  SantizerRecord.SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeMetadata = pipe(
  SantizerRecord.SantizerRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const makeBaseDir = (sourceName: string, fetchedAt: number, runId: string) =>
  archiveBaseDir(sourceName, fetchedAt, runId)

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

  function writeSanitizedBody(id: string, body: Uint8Array) {
    return Effect.gen(function* () {
      const rawObject = `${outputDir}/sanitized/${id}.bin`
      yield* fs.makeDirectory(parentDir(rawObject), { recursive: true })
      yield* fs.writeFile(rawObject, Buffer.from(body))

      return {
        bucket: 'local',
        object: rawObject,
      }
    }).pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function writeSanitizerRecord(
    record: SantizerRecord.SanitizerRecord,
    metadata: SantizerRecord.SantizerRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = record.sanitizationId
      const baseDir = makeBaseDir(
        record.source.name,
        record.fetchedAt,
        record.runId
      )
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

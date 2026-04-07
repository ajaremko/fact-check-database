import { Config, Effect, Either, Layer, pipe, Schema } from 'effect'

import {
  Archiver,
  ArchiverError,
  FetchAttempt,
} from '@news-research/ingestion/ingest'
import { FileSystem } from '@effect/platform'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'
import {
  IngestionRecordSchema,
  IngestionRecord,
  IngestionRecordMetadataSchema,
  IngestionRecordMetadata,
  archiveBaseDir,
} from '@news-research/ingestion'

const encodeFetchAttemptRecord = pipe(
  IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

const encodeMetadata = pipe(
  IngestionRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

const makeId = (attempt: FetchAttempt) =>
  Either.match(attempt.result, {
    onLeft: () => `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`,
    onRight: (result) => result.sha256,
  })

const makeBaseDir = (attempt: FetchAttempt) =>
  archiveBaseDir(attempt.source.name, attempt.fetchedAt, attempt.runId)

function parentDir(filePath: string): string {
  return filePath.split('/').slice(0, -1).join('/')
}

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')

  function archiveBody(attempt: FetchAttempt, response: Uint8Array) {
    return Effect.gen(function* () {
      const id = makeId(attempt)
      const baseDir = makeBaseDir(attempt)
      const rawObject = `${outputDir}/raw/${baseDir}/${id}.bin`
      yield* fs.makeDirectory(parentDir(rawObject), { recursive: true })
      yield* fs.writeFile(rawObject, Buffer.from(response))

      return {
        bucket: 'local',
        object: rawObject,
      }
    }).pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function archiveRecord(
    attempt: FetchAttempt,
    record: IngestionRecord,
    recordMetadata: IngestionRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = makeId(attempt)
      const baseDir = makeBaseDir(attempt)
      const recordObject = `${outputDir}/records/${baseDir}/${id}.ingestor.yml`
      yield* fs.makeDirectory(parentDir(recordObject), { recursive: true })

      const data = encodeFetchAttemptRecord(record)
      yield* fs.writeFile(recordObject, data)

      const metaObject = `${outputDir}/records/${baseDir}/${id}.ingestor.metadata.json`
      const metaDataEncoded = encodeMetadata(recordMetadata)
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
    archiveBody,
    archiveRecord,
  })
})

export const layer = Layer.effect(Archiver, make)

import { Config, Effect, Layer, pipe, Schema } from 'effect'

import {
  Archiver,
  ArchiverError,
} from '@news-research/ingestion/ingest'
import {
  IngestionRecordSchema,
  IngestionRecord,
  IngestionRecordMetadataSchema,
  IngestionRecordMetadata,
} from '@news-research/ingestion'
import { FileSystem } from '@effect/platform'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

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

function parentDir(filePath: string): string {
  return filePath.split('/').slice(0, -1).join('/')
}

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')

  function archiveBody(
    baseDir: string,
    id: string,
    response: Uint8Array
  ) {
    return Effect.gen(function* () {
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
    baseDir: string,
    id: string,
    record: IngestionRecord,
    recordMetadata: IngestionRecordMetadata
  ) {
    return Effect.gen(function* () {
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

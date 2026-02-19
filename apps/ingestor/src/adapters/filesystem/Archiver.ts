import { Config, Effect, Either, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { IngestorRecord } from '@news-research/contracts'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

import { Archiver, ArchiverError } from '../../ports/Archiver'
import { FetchAttempt } from '../../data/FetchAttempt'

// Record -> YAML -> Buffer
const encodeFetchAttemptRecord = pipe(
  IngestorRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

// Metadata -> JSON -> Buffer
const encodeMetadata = pipe(
  IngestorRecord.IngestionRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

const makeId = (attempt: FetchAttempt) =>
  Either.match(attempt.result, {
    onLeft: () => `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`,
    onRight: (result) => result.sha256,
  })

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')
  yield* fs.makeDirectory(outputDir, { recursive: true })

  function archiveBody(attempt: FetchAttempt, response: Uint8Array) {
    return Effect.gen(function* () {
      const id = makeId(attempt)
      const rawObject = `${outputDir}/${id}.bin`
      yield* fs.writeFile(rawObject, Buffer.from(response))

      return {
        bucket: 'local',
        object: rawObject,
      }
    }).pipe(Effect.mapError((cause) => new ArchiverError({ cause })))
  }

  function archiveRecord(
    attempt: FetchAttempt,
    record: IngestorRecord.IngestionRecord,
    recordMetadata: IngestorRecord.IngestionRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = makeId(attempt)
      const recordObject = `${outputDir}/${id}.yml`
      const data = encodeFetchAttemptRecord(record)
      yield* fs.writeFile(recordObject, data)

      const metaObject = `${outputDir}/${id}.metadata.json`
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

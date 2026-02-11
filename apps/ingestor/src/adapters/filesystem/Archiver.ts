import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import {
  FetchAttemptRecordSchema,
  MetadataSchema,
} from '@news-research/contracts'
import { Node } from '@news-research/node'

import {
  createDataFetched,
  createMetadata,
  createNoResponse,
} from '../../domain/createAttemptRecord'
import { Archiver, ArchiverError } from '../../ports/Archiver'
import { ArchivePointer } from '../../domain/Observation'
import { FetchAttempt } from '../../domain/FetchAttempt'

// Object -> JSON -> Buffer
const encodeFetchAttemptRecord = pipe(
  FetchAttemptRecordSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

const encodeMetadata = pipe(
  MetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('ARCHIVER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem

  yield* fs.makeDirectory(outputDir, { recursive: true })

  function archive(attempt: FetchAttempt) {
    return Effect.gen(function* () {
      if (attempt._tag === 'Fetched') {
        // Write raw data and meta for successful fetches
        const id = attempt.content.sha256
          ? attempt.content.sha256
          : `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`

        // Write raw object
        const rawObject = `${outputDir}/${id}.bin`
        yield* fs.writeFile(rawObject, Buffer.from(attempt.body))

        // Access raw object pointer
        const respPointer: ArchivePointer = {
          bucket: 'local',
          object: rawObject,
        }

        // Write meta object
        const recordObject = `${outputDir}/${id}.json`
        const record = createDataFetched(attempt, respPointer)
        const data = encodeFetchAttemptRecord(record)
        const metaObject = `${outputDir}/${id}.metadata.json`
        const recordMetadata = createMetadata(id, attempt)
        const metadata = encodeMetadata(recordMetadata)
        yield* fs.writeFile(recordObject, data)
        yield* fs.writeFile(metaObject, metadata)

        // Access meta object pointer
        const metaPointer: ArchivePointer = {
          bucket: 'local',
          object: recordObject,
        }

        return metaPointer
      } else {
        // Write only meta for unsuccessful fetches
        const id = `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`

        // Write meta object
        const recordObject = `${outputDir}/${id}.json`
        const record = createNoResponse(attempt)
        const data = encodeFetchAttemptRecord(record)
        const metaObject = `${outputDir}/${id}.metadata.json`
        const recordMetadata = createMetadata(id, attempt)
        const metadata = encodeMetadata(recordMetadata)
        yield* fs.writeFile(recordObject, data)
        yield* fs.writeFile(metaObject, metadata)

        // Access meta object pointer
        const metaPointer: ArchivePointer = {
          bucket: 'local',
          object: recordObject,
        }

        return metaPointer
      }
    }).pipe(
      Effect.catchAll((cause) => Effect.fail(new ArchiverError({ cause })))
    )
  }

  return Archiver.of({ archive })
})

export const layer = Layer.effect(Archiver, make)

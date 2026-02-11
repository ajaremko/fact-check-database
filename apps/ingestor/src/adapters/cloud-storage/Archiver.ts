import { Config, ConfigError, Effect, flow, Layer, pipe, Schema } from 'effect'
import { format } from 'date-fns'

import {
  FetchAttemptRecordSchema,
  MetadataSchema,
} from '@news-research/contracts'
import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Node } from '@news-research/node'

import {
  createDataFetched,
  createMetadata,
  createNoResponse,
} from '../../domain/createAttemptRecord'
import { Archiver, ArchiverError } from '../../ports/Archiver'
import type { ArchivePointer } from '../../domain/Observation'
import type { FetchAttempt } from '../../domain/FetchAttempt'

const encodeFetchAttemptRecord = pipe(
  FetchAttemptRecordSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

const encodeMetadata = Schema.encodeSync(MetadataSchema)

function ymd(ms: number): string {
  const d = new Date(ms)
  return format(d, 'yyyy-MM-dd')
}

const decodeGeneration = pipe(
  Schema.Tuple(
    Schema.Struct({
      generation: Schema.optional(
        Schema.Union(Schema.NumberFromString, Schema.Number)
      ),
    }),
    Schema.Unknown
  ),
  Schema.decodeSync
)

const readFileGeneration = flow(
  StorageBucket.readFileMetadata,
  Effect.map(decodeGeneration),
  Effect.map(([{ generation }]) => generation)
)

export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket

  function archive(attempt: FetchAttempt) {
    return Effect.gen(function* () {
      const date = ymd(attempt.fetchedAt)
      const baseDir = `source=${attempt.sourceName}/date=${date}/run=${attempt.runId}`

      if (attempt._tag === 'Fetched') {
        // Write raw data and meta for successful fetches
        const id = attempt.content.sha256
          ? attempt.content.sha256
          : `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`

        // Write raw object
        const rawObject = `raw/${baseDir}/${id}.bin`
        yield* StorageBucket.writeFile(rawObject, Buffer.from(attempt.body), {
          resumable: false,
          contentType: attempt.http.contentType ?? 'application/octet-stream',
        })

        // Access raw object pointer
        const respGeneration = yield* readFileGeneration(rawObject)
        const respPointer: ArchivePointer = {
          bucket: bucket.name,
          object: rawObject,
          generation: respGeneration,
        }

        // Write meta object
        const metaObject = `meta/${baseDir}/${id}.json`
        const record = createDataFetched(attempt, respPointer)
        const data = encodeFetchAttemptRecord(record)
        const recordMetadata = createMetadata(id, attempt)
        const metadata = encodeMetadata(recordMetadata)
        yield* StorageBucket.writeFile(metaObject, data, {
          resumable: false,
          contentType: 'application/json',
          metadata: { metadata },
        })

        // Access meta object pointer
        const metaGeneration = yield* readFileGeneration(metaObject)
        const metaPointer: ArchivePointer = {
          bucket: bucket.name,
          object: metaObject,
          generation: metaGeneration,
        }

        return metaPointer
      } else {
        // Write only meta for unsuccessful fetches
        const id = `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`

        // Write meta object
        const metaObject = `meta/${baseDir}/${id}.json`
        const record = createNoResponse(attempt)
        const data = encodeFetchAttemptRecord(record)
        const recordMetadata = createMetadata(id, attempt)
        const metadata = encodeMetadata(recordMetadata)
        yield* StorageBucket.writeFile(metaObject, data, {
          resumable: false,
          contentType: 'application/json',
          metadata: { metadata },
        })

        // Access meta object pointer
        const metaGeneration = yield* readFileGeneration(metaObject)
        const metaPointer: ArchivePointer = {
          bucket: bucket.name,
          object: metaObject,
          generation: metaGeneration,
        }

        return metaPointer
      }
    }).pipe(
      Effect.catchTag('StorageBucketIOError', (cause) =>
        Effect.fail(new ArchiverError({ cause }))
      ),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }
  return Archiver.of({ archive })
})

export const layer: Layer.Layer<
  Archiver,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(Archiver, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ARCHIVE_BUCKET_NAME')))
)

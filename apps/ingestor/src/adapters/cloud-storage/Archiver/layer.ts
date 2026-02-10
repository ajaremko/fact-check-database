import { Config, Effect, flow, Layer, pipe, Schema } from 'effect'
import { Storage } from '@google-cloud/storage'
import { format } from 'date-fns'

import { Archiver, ArchiverError } from '../../../ports/Archiver'
import type { ArchivePointer } from '../../../domain/Observation'
import type { FetchAttempt } from '../../../domain/FetchAttempt'

import { provideBucket, writeFile, readFileMetadata } from './Bucket'
import * as Envelope from './FetchAttemptRecord'

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
  readFileMetadata,
  Effect.map(decodeGeneration),
  Effect.map(([{ generation }]) => generation)
)

export const make = Effect.gen(function* () {
  const bucketName = yield* Config.string('ARCHIVER_BUCKET_NAME')

  const client = new Storage()
  const bucket = client.bucket(bucketName)

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
        yield* writeFile(rawObject, Buffer.from(attempt.body), {
          resumable: false,
          contentType: attempt.http.contentType ?? 'application/octet-stream',
        })

        // Access raw object pointer
        const respGeneration = yield* readFileGeneration(rawObject)
        const respPointer: ArchivePointer = {
          bucket: bucketName,
          object: rawObject,
          generation: respGeneration,
        }

        // Write meta object
        const metaObject = `meta/${baseDir}/${id}.json`
        const data = Envelope.createDataFetched(attempt, respPointer)
        const metadata = Envelope.encodeMetadata({
          url: attempt.url,
          sourceName: attempt.sourceName,
          sourceCollection: attempt.sourceCollection,
          runId: attempt.runId,
          fetchedAt: attempt.fetchedAt,
          id,
        })
        yield* writeFile(metaObject, data, {
          resumable: false,
          contentType: 'application/json',
          metadata: { metadata },
        })

        // Access meta object pointer
        const metaGeneration = yield* readFileGeneration(metaObject)
        const metaPointer: ArchivePointer = {
          bucket: bucketName,
          object: metaObject,
          generation: metaGeneration,
        }

        return metaPointer
      } else {
        // Write only meta for unsuccessful fetches
        const id = `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`

        // Write meta object
        const metaObject = `meta/${baseDir}/${id}.json`
        const data = Envelope.createNoResponse(attempt)
        const metadata = Envelope.encodeMetadata({
          url: attempt.url,
          sourceName: attempt.sourceName,
          sourceCollection: attempt.sourceCollection,
          runId: attempt.runId,
          fetchedAt: attempt.fetchedAt,
          id,
        })
        yield* writeFile(metaObject, data, {
          resumable: false,
          contentType: 'application/json',
          metadata: { metadata },
        })

        // Access meta object pointer
        const metaGeneration = yield* readFileGeneration(metaObject)
        const metaPointer: ArchivePointer = {
          bucket: bucketName,
          object: metaObject,
          generation: metaGeneration,
        }

        return metaPointer
      }
    }).pipe(
      Effect.catchTag('StorageBucketIOError', (e) =>
        Effect.fail(new ArchiverError({ cause: e }))
      ),
      provideBucket(bucket)
    )
  }
  return Archiver.of({ archive })
})

export const layer = Layer.effect(Archiver, make)

import { Config, ConfigError, Effect, flow, Layer, pipe, Schema } from 'effect'
import { format } from 'date-fns'

import {
  DataFetchedSchema,
  NoResponseSchema,
  FilePointer,
} from '@news-research/contracts'
import { StorageBucket, StorageClient } from '@news-research/cloud-storage'

import type {
  FetchFailure,
  FetchSuccess,
  FetchAttempt,
} from '../../domain/FetchAttempt'
import { Archiver, ArchiverError } from '../../ports/Archiver'
import type { ArchivePointer } from '../../domain/Observation'
import { parseBuffer, parseJson } from '../../utils/schema'

const encodeDataFetched = pipe(
  DataFetchedSchema,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

function createDataFetched(attempt: FetchSuccess, pointer: FilePointer) {
  return encodeDataFetched({
    version: 1,
    kind: 'fetch_attempt',
    outcome: 'data_fetched',
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
    url: attempt.url,
    source: {
      name: attempt.sourceName,
      collection: attempt.sourceCollection,
    },
    http: {
      status: attempt.http.status,
      contentType: attempt.http.contentType,
      etag: attempt.http.etag,
      lastModified: attempt.http.lastModified,
      headers: attempt.http.headers,
    },
    content: {
      sha256: attempt.content.sha256,
      bytes: attempt.content.bytes,
    },
    pointer,
  })
}

const encodeNoResponse = pipe(
  NoResponseSchema,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

function createNoResponse(attempt: FetchFailure) {
  return encodeNoResponse({
    version: 1,
    kind: 'fetch_attempt',
    outcome: 'no_response',
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
    url: attempt.url,
    finalUrl: attempt.finalUrl,
    source: {
      name: attempt.sourceName,
      collection: attempt.sourceCollection,
    },
    error: attempt.error,
  })
}

const encodeMetadata = Schema.encodeSync(
  Schema.Struct({
    url: Schema.String,
    sourceName: Schema.String,
    sourceCollection: Schema.String,
    runId: Schema.String,
    fetchedAt: Schema.NumberFromString,
    id: Schema.String,
  })
)

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
        const data = createDataFetched(attempt, respPointer)
        const metadata = encodeMetadata({
          url: attempt.url,
          sourceName: attempt.sourceName,
          sourceCollection: attempt.sourceCollection,
          runId: attempt.runId,
          fetchedAt: attempt.fetchedAt,
          id,
        })
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
        const data = createNoResponse(attempt)
        const metadata = encodeMetadata({
          url: attempt.url,
          sourceName: attempt.sourceName,
          sourceCollection: attempt.sourceCollection,
          runId: attempt.runId,
          fetchedAt: attempt.fetchedAt,
          id,
        })
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
      Effect.catchTag('StorageBucketIOError', (e) =>
        Effect.fail(new ArchiverError({ cause: e }))
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

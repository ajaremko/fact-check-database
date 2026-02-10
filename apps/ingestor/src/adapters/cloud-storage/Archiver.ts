// adapters/archive/GcsArchiver.ts
import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { File, Storage } from '@google-cloud/storage'
import { format } from 'date-fns'

import { Archiver, ArchiverError } from '../../ports/Archiver'
import type { ArchivePointer } from '../../domain/Observation'
import type {
  FetchAttempt,
  FetchFailure,
  FetchSuccess,
} from '../../domain/FetchAttempt'

function ymd(ms: number): string {
  const d = new Date(ms)
  return format(d, 'yyyy-MM-dd')
}

type RawPointer = {
  bucket: string
  object: string
  generation?: number
}

type FetchedMeta = {
  version: 1
  kind: 'fetch_attempt'
  runId: string
  fetchedAt: number
  url: string
  finalUrl?: string
  source: { name: string; collection: string }
  outcome: 'Fetched'
  http: {
    status: number
    contentType?: string
    etag?: string
    lastModified?: string
    headers: Record<string, string>
  }
  content: { sha256?: string; bytes?: number }
  raw: RawPointer
}

type UnfetchedMeta = {
  version: 1
  kind: 'fetch_attempt'
  runId: string
  fetchedAt: number
  url: string
  finalUrl?: string
  source: { name: string; collection: string }
  outcome: 'NoResponse'
  error: string
}

type MetaEnvelope = FetchedMeta | UnfetchedMeta

const decodeGeneration = pipe(
  Schema.Struct({
    generation: Schema.optional(
      Schema.Union(Schema.NumberFromString, Schema.Number)
    ),
  }),
  Schema.decodeSync
)

function writeFile(file: File, attempt: FetchSuccess) {
  return Effect.gen(function* () {
    const contentType = attempt.http.contentType
      ? attempt.http.contentType
      : 'application/octet-stream'

    const data = Buffer.from(attempt.body)

    yield* Effect.tryPromise({
      try: () =>
        file.save(data, {
          resumable: false,
          contentType,
          metadata: {
            metadata: {
              url: attempt.url,
              sourceName: attempt.sourceName,
              sourceCollection: attempt.sourceCollection,
              runId: attempt.runId,
              fetchedAt: String(attempt.fetchedAt),
              status: String(attempt.http.status),
              sha256: attempt.content.sha256 ?? '',
            },
          },
        }),
      catch: (cause) => new ArchiverError({ cause }),
    })

    const [md] = yield* Effect.tryPromise({
      try: () => file.getMetadata(),
      catch: (cause) => new ArchiverError({ cause }),
    })

    return decodeGeneration(md)
  })
}

function writeSuccessMeta(
  file: File,
  id: string,
  attempt: FetchSuccess,
  pointer: RawPointer
) {
  return Effect.gen(function* () {
    const meta: MetaEnvelope = {
      version: 1,
      kind: 'fetch_attempt',
      runId: attempt.runId,
      fetchedAt: attempt.fetchedAt,
      url: attempt.url,
      finalUrl: attempt.finalUrl,
      source: {
        name: attempt.sourceName,
        collection: attempt.sourceCollection,
      },
      outcome: 'Fetched',
      http: {
        status: attempt.http.status,
        contentType: attempt.http.contentType,
        etag: attempt.http.etag,
        lastModified: attempt.http.lastModified,
        headers: attempt.http.headers,
      },
      content: attempt.content,
      raw: pointer, // present because _tag === "Fetched"
    }
    const data = Buffer.from(JSON.stringify(meta), 'utf8')
    yield* Effect.tryPromise({
      try: () =>
        file.save(data, {
          resumable: false,
          contentType: 'application/json',
          metadata: {
            metadata: {
              url: attempt.url,
              sourceName: attempt.sourceName,
              sourceCollection: attempt.sourceCollection,
              runId: attempt.runId,
              fetchedAt: String(attempt.fetchedAt),
              id,
            },
          },
        }),
      catch: (cause) => new ArchiverError({ cause }),
    })
    const [md] = yield* Effect.tryPromise({
      try: () => file.getMetadata(),
      catch: (cause) => new ArchiverError({ cause }),
    })
    return decodeGeneration(md)
  })
}

function writeFailureMeta(file: File, id: string, attempt: FetchFailure) {
  return Effect.gen(function* () {
    const meta: MetaEnvelope = {
      version: 1,
      kind: 'fetch_attempt',
      runId: attempt.runId,
      fetchedAt: attempt.fetchedAt,
      url: attempt.url,
      finalUrl: attempt.finalUrl,
      source: {
        name: attempt.sourceName,
        collection: attempt.sourceCollection,
      },
      outcome: 'NoResponse',
      error: attempt.error,
    }
    const data = Buffer.from(JSON.stringify(meta), 'utf8')
    yield* Effect.tryPromise({
      try: () =>
        file.save(data, {
          resumable: false,
          contentType: 'application/json',
          metadata: {
            metadata: {
              url: attempt.url,
              sourceName: attempt.sourceName,
              sourceCollection: attempt.sourceCollection,
              runId: attempt.runId,
              fetchedAt: String(attempt.fetchedAt),
              id,
            },
          },
        }),
      catch: (cause) => new ArchiverError({ cause }),
    })
    const [md] = yield* Effect.tryPromise({
      try: () => file.getMetadata(),
      catch: (cause) => new ArchiverError({ cause }),
    })
    return decodeGeneration(md)
  })
}

export const make = Effect.gen(function* () {
  const bucketName = yield* Config.string('ARCHIVER_BUCKET_NAME')

  const client = new Storage()
  const bucket = client.bucket(bucketName)

  const archive = (
    attempt: FetchAttempt
  ): Effect.Effect<ArchivePointer, ArchiverError> =>
    Effect.gen(function* () {
      const date = ymd(attempt.fetchedAt)

      // Use content sha256 as stable ID when present; otherwise fall back to time-based key.
      // (Normalization step should ideally always compute sha256 for Fetched.)
      const id =
        attempt._tag === 'Fetched' && attempt.content.sha256
          ? attempt.content.sha256
          : `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`

      const baseDir = `source=${attempt.sourceName}/date=${date}/run=${attempt.runId}`
      const rawObject = `raw/${baseDir}/${id}.bin`
      const metaObject = `meta/${baseDir}/${id}.json`

      const rawFile = bucket.file(rawObject)
      const metaFile = bucket.file(metaObject)

      // 1) Write raw bytes only if we have them
      if (attempt._tag === 'Fetched') {
        const md = yield* writeFile(rawFile, attempt)
        const md2 = yield* writeSuccessMeta(metaFile, id, attempt, {
          bucket: bucketName,
          object: rawObject,
          generation: md.generation,
        })
        return {
          bucket: bucketName,
          object: rawObject,
          generation: md2.generation,
        }
      }

      const md2 = yield* writeFailureMeta(metaFile, id, attempt)
      return {
        bucket: bucketName,
        object: rawObject,
        generation: md2.generation,
      }
    })

  return Archiver.of({ archive })
})

export const layer = Layer.effect(Archiver, make)

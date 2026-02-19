import {
  Config,
  ConfigError,
  Effect,
  Either,
  Layer,
  pipe,
  Schema,
} from 'effect'
import { format } from 'date-fns'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { IngestorRecord } from '@news-research/contracts'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

import { Archiver, ArchiverError } from '../../ports/Archiver'
import type { FetchAttempt } from '../../data/FetchAttempt'

const encodeFetchAttemptRecord = pipe(
  IngestorRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

const encodeMetadata = Schema.encodeSync(
  IngestorRecord.IngestionRecordMetadataSchema
)

function ymd(ms: number): string {
  const d = new Date(ms)
  return format(d, 'yyyy-MM-dd')
}

const makeId = (attempt: FetchAttempt) =>
  Either.match(attempt.result, {
    onLeft: () => `${attempt.fetchedAt}_${Math.random().toString(16).slice(2)}`,
    onRight: (result) => result.sha256,
  })

const makeBaseDir = (attempt: FetchAttempt) => {
  const date = ymd(attempt.fetchedAt)
  return `source=${attempt.source.name}/date=${date}/run=${attempt.runId}`
}

export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket

  function archiveBody(
    attempt: FetchAttempt,
    response: Uint8Array,
    contentType?: string
  ) {
    return Effect.gen(function* () {
      const id = makeId(attempt)
      const baseDir = makeBaseDir(attempt)
      const rawObject = `raw/${baseDir}/${id}.bin`
      yield* StorageBucket.writeFile(rawObject, Buffer.from(response), {
        resumable: false,
        contentType: contentType ?? 'application/octet-stream',
      })
      return {
        bucket: bucket.name,
        object: rawObject,
      }
    }).pipe(
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  function archiveRecord(
    attempt: FetchAttempt,
    record: IngestorRecord.IngestionRecord,
    recordMetadata: IngestorRecord.IngestionRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = makeId(attempt)
      const baseDir = makeBaseDir(attempt)
      const recordObject = `records/${baseDir}/${id}.ingestor.yml`
      const data = encodeFetchAttemptRecord(record)
      const metadata = encodeMetadata(recordMetadata)
      yield* StorageBucket.writeFile(recordObject, data, {
        resumable: false,
        contentType: 'application/yaml',
        metadata: { metadata },
      })
      return {
        bucket: bucket.name,
        object: recordObject,
      }
    }).pipe(
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  return Archiver.of({ archiveBody, archiveRecord })
})

export const layer: Layer.Layer<
  Archiver,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(Archiver, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ARCHIVE_BUCKET_NAME')))
)

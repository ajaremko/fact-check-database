import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'

import {
  FilePointer,
  IngestorRecord,
  SantizerRecord,
} from '@news-research/contracts'
import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

import { archiveBaseDir } from '@news-research/ingestion-shared'

import { Archiver, ArchiverError } from '../../ports/Archiver'

const decodeIngestorRecord = pipe(
  IngestorRecord.IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSantizerRecord = pipe(
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

export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket

  function readRawBody(pointer: FilePointer) {
    return StorageBucket.downloadFile(pointer.object).pipe(
      Effect.andThen(([data]) => data),
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  function readFetchAttemptRecord(pointer: FilePointer) {
    return StorageBucket.downloadFile(pointer.object).pipe(
      Effect.andThen(([data]) => decodeIngestorRecord(data)),
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  function writeSanitizedBody(
    id: string,
    body: Uint8Array,
    contentType?: string
  ) {
    return Effect.gen(function* () {
      const rawObject = `sanitized/${id}.bin`
      yield* StorageBucket.writeFile(rawObject, Buffer.from(body), {
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

  function writeSanitizerRecord(
    record: SantizerRecord.SanitizerRecord,
    recordMetadata: SantizerRecord.SantizerRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = record.sanitizationId
      const baseDir = makeBaseDir(
        record.source.name,
        record.fetchedAt,
        record.runId
      )
      const recordObject = `records/${baseDir}/${id}.sanitizer.yml`
      const data = yield* encodeSantizerRecord(record)
      const metadata = yield* encodeMetadata(recordMetadata)
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

  return Archiver.of({
    readFetchAttemptRecord,
    readRawBody,
    writeSanitizedBody,
    writeSanitizerRecord,
  })
})

export const layer: Layer.Layer<
  Archiver,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(Archiver, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ARCHIVE_BUCKET_NAME')))
)

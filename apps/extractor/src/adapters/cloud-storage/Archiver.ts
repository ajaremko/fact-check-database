import { Config, ConfigError, Effect, Layer, pipe, Schema } from 'effect'

import { Archiver, ArchiverError } from '@news-research/ingestion/extract'
import {
  FilePointer,
  IngestionRecordSchema,
  SanitizerRecordSchema,
  SanitizerRecord,
  SanitizerRecordMetadataSchema,
  SanitizerRecordMetadata,
} from '@news-research/ingestion'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'
import { Node } from '@news-research/node'
import { Yaml } from '@news-research/yaml'

const decodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeSanitizerRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeMetadata = pipe(
  SanitizerRecordMetadataSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket

  function readSanitizedBody(pointer: FilePointer) {
    return StorageBucket.downloadFile(pointer.object).pipe(
      Effect.andThen(([data]) => data),
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  function readSanitizerRecord(pointer: FilePointer) {
    return StorageBucket.downloadFile(pointer.object).pipe(
      Effect.andThen(([data]) => decodeSanitizerRecord(data)),
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  function writeSanitizedBody(
    baseDir: string,
    id: string,
    body: Uint8Array,
    contentType?: string
  ) {
    return Effect.gen(function* () {
      const rawObject = `sanitized/${baseDir}/${id}.bin`
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

  function writeBatch(
    baseDir: string,
    record: SanitizerRecord
    // recordMetadata: SanitizerRecordMetadata
  ) {
    return Effect.gen(function* () {
      const id = record.sanitizationId
      const recordObject = `records/${baseDir}/${id}.sanitizer.yml`
      const data = yield* encodeSanitizerRecord(record)
      // const metadata = yield* encodeMetadata(recordMetadata)
      yield* StorageBucket.writeFile(recordObject, data, {
        resumable: false,
        contentType: 'application/yaml',
        // metadata: { metadata },
      })
      // return {
      //   bucket: bucket.name,
      //   object: recordObject,
      // }
      return []
    }).pipe(
      Effect.mapError((cause) => new ArchiverError({ cause })),
      Effect.provideService(StorageBucket.StorageBucket, { bucket })
    )
  }

  return Archiver.of({
    readSanitizedBody,
    readSanitizerRecord,
    // writeBatch,
  })
})

export const layer: Layer.Layer<
  Archiver,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(Archiver, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ARCHIVE_BUCKET_NAME')))
)

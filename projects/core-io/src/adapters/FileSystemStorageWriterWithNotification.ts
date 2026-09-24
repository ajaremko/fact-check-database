import { Effect, Layer, Schema, flow } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'
import {
  StorageObjectAttributesSchema,
  StorageObjectDataSchema,
} from '@fact-check-database/core-contracts/gcp/v1'

import { StorageWriter } from '../ports/StorageWriter'
import { Publisher } from '../ports/Publisher'

import * as FileSystemStorageWriter from './FileSystemStorageWriter'

const adapter = 'FileSystemStorageWriterWithNotification'

const encodeStorageObjectData = StorageObjectDataSchema.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeStorageObjectAttributesSchema = Schema.encode(
  StorageObjectAttributesSchema
)

/**
 * Builds a {@link StorageWriter} that writes to
 * `{STORAGE_OUTPUT_DIR}/{path}`, creating parent directories as needed. If
 * `meta` is provided, it's also written as a `*.meta.json` sidecar file
 * alongside the object. Writes also trigger a notification to the {@link Publisher}
 * with the object finalized message.
 */
export function make(prefix: string) {
  return Effect.gen(function* () {
    const publisher = yield* Publisher
    const writer = yield* FileSystemStorageWriter.make

    function publishNotification(
      path: string,
      pointer: { bucket: string; object: string }
    ) {
      return Effect.gen(function* () {
        const data = yield* encodeStorageObjectData({
          kind: 'storage#object',
          id: path,
          name: path,
          bucket: pointer.bucket,
        })
        const attributes = yield* encodeStorageObjectAttributesSchema({
          bucketId: pointer.bucket,
          objectId: pointer.object,
          eventTime: new Date(),
          eventType: 'OBJECT_FINALIZE',
          payloadFormat: 'JSON_API_V1',
        })
        yield* publisher.publish(data, attributes)
        yield* Effect.logTrace('Notification published')
      }).pipe(
        Effect.tapErrorCause((cause) =>
          Effect.logFatal('Failed to publish notification', cause)
        ),
        Effect.orDie
      )
    }

    return StorageWriter.of({
      write: (opts) =>
        Effect.gen(function* () {
          yield* Effect.annotateLogsScoped({
            adapter,
            prefix,
            'opts.path': opts.path,
          })

          const pointer = yield* writer.write(opts)
          yield* Effect.annotateLogsScoped({
            'pointer.bucket': pointer.bucket,
            'pointer.object': pointer.object,
          })

          if (!opts.path.includes(prefix)) {
            yield* Effect.logTrace('Notification skipped')
            return pointer
          }
          yield* publishNotification(opts.path, pointer)
          return pointer
        }).pipe(Effect.scoped),
    })
  })
}

/** Layer providing {@link StorageWriter} backed by the `STORAGE_OUTPUT_DIR` local directory.
 * Writes also trigger a notification to the {@link Publisher} with the object finalized
 * message. Development adapter. */
export const layer = flow(make, Layer.effect(StorageWriter))

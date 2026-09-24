import { Clock, Config, Effect, Layer, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@fact-check-database/core-data/Node'
import { PubsubMessagePayload } from '@fact-check-database/core-contracts/gcp/v1'

import { Publisher, PublisherError } from '../ports/Publisher'

const adapter = 'FileSystemPublisher'

const encodePubsubMessagePayload = PubsubMessagePayload.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

/**
 * Builds a {@link Publisher} that writes each published message to its own
 * file (`{PUBLISHER_OUTPUT_DIR}/{messageId}.json`), keyed by a UUID rather
 * than a timestamp — callers publish concurrently, and two messages landing
 * in the same millisecond would otherwise collide on filename and silently
 * overwrite one another (no error, no warning, message just disappears).
 */
export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('PUBLISHER_OUTPUT_DIR')
  yield* Effect.annotateLogsScoped({ adapter, outputDir })

  const fs = yield* FileSystem.FileSystem
  yield* fs.makeDirectory(outputDir, { recursive: true })
  yield* Effect.logTrace('Publisher created')

  return Publisher.of({
    publish: (data, attributes) =>
      Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({ adapter, outputDir })

        const publishedAtMillis = yield* Clock.currentTimeMillis
        const messageId = yield* Node.generateUUID()
        const path = `${outputDir}/${messageId}.json`
        yield* Effect.annotateLogsScoped({ messageId, path })

        const message = yield* encodePubsubMessagePayload({
          data: data.toString('utf-8'),
          attributes,
          messageId,
          publishTime: new Date(publishedAtMillis),
        }).pipe(
          Effect.tapErrorCause((cause) =>
            Effect.logFatal('Failed to encode message payload', cause)
          ),
          Effect.orDie
        )

        yield* fs.writeFile(path, message).pipe(
          Effect.mapError(
            (cause) =>
              new PublisherError({
                cause,
                message: 'Failed to write message to file system',
              })
          )
        )

        yield* Effect.logTrace('Message published')
      }).pipe(Effect.scoped),
  })
}).pipe(Effect.scoped)

/** Layer providing {@link Publisher} backed by the `PUBLISHER_OUTPUT_DIR` local directory. Development adapter. */
export const layer = Layer.effect(Publisher, make)

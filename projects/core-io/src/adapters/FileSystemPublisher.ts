import { Clock, Config, Effect, Layer, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@news-research/core-data/Node'
import { PubsubMessagePayload } from '@news-research/core-contracts/gcp/v1'

import { Publisher, PublisherError } from '../ports/Publisher'

const encodePubsubMessagePayload = PubsubMessagePayload.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

/**
 * Builds a {@link Publisher} that writes each published message to its own
 * timestamped file (`{PUBLISHER_OUTPUT_DIR}/{epochMillis}.json`).
 */
export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('PUBLISHER_OUTPUT_DIR')

  yield* Effect.logTrace(
    `Writing published messages to directory: ${outputDir}`
  )
  const fs = yield* FileSystem.FileSystem
  yield* fs.makeDirectory(outputDir, { recursive: true })

  return Publisher.of({
    publish: (data, attributes) =>
      Effect.gen(function* () {
        const id = yield* Clock.currentTimeMillis
        const path = `${outputDir}/${id}.json`

        yield* Effect.logTrace(`Publishing message: ${path}`)

        const message = yield* Effect.orDie(
          encodePubsubMessagePayload({
            data: data.toString('utf-8'),
            attributes,
            messageId: String(id),
            publishTime: new Date(id),
          })
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
      }),
  })
})

/** Layer providing {@link Publisher} backed by the `PUBLISHER_OUTPUT_DIR` local directory. Development adapter. */
export const layer = Layer.effect(Publisher, make)

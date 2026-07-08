import { Clock, Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { Publisher, PublisherError } from '../ports/Publisher'

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
    publish: (data) =>
      Effect.gen(function* () {
        const id = yield* Clock.currentTimeMillis
        const path = `${outputDir}/${id}.json`
        yield* Effect.logTrace(`Publishing message: ${path}`)
        yield* fs.writeFile(path, data).pipe(
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

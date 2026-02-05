import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { Publisher, PublisherError } from '../../ports/Publisher'

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('PUBLISHER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem
  yield* fs.makeDirectory(outputDir, { recursive: true })
  return Publisher.of({
    publish: (event) =>
      Effect.try(() => {
        const data = JSON.stringify(event)
        return Buffer.from(data)
      }).pipe(
        Effect.flatMap((buf) =>
          fs.writeFile(
            `${outputDir}/${event.runId}_${event.source.name}.txt`,
            buf
          )
        ),
        Effect.mapError(
          (raw) =>
            new PublisherError({
              raw,
            })
        )
      ),
  })
})

export const layer = Layer.effect(Publisher, make)

import { Clock, Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { Publisher } from '..'

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('PUBLISHER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem
  yield* fs.makeDirectory(outputDir, { recursive: true })
  return Publisher.Publisher.of({
    publish: (data) =>
      Effect.gen(function* () {
        const id = yield* Clock.currentTimeMillis
        const path = `${outputDir}/${id}.json`
        yield* fs
          .writeFile(path, data)
          .pipe(
            Effect.mapError((cause) => new Publisher.PublisherError({ cause }))
          )
      }),
  })
})

export const layer = Layer.effect(Publisher.Publisher, make)

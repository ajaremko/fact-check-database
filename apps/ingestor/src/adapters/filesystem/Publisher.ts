import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Publisher, PublisherError } from '../../ports/Publisher'
import { ObservationFetchedSchema } from '../../domain/Observation'
import { parseBuffer, parseJson } from '../../utils/schema'

// ObservationFetched -> JSON -> Buffer
const encodeMessage = pipe(
  ObservationFetchedSchema,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('PUBLISHER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem

  yield* fs.makeDirectory(outputDir, { recursive: true })

  return Publisher.of({
    publish: (event) =>
      Effect.gen(function* () {
        const path = `${outputDir}/${event.runId}_${event.source.name}.json`
        const data = yield* encodeMessage(event).pipe(
          Effect.mapError((raw) => new PublisherError({ raw }))
        )
        yield* fs
          .writeFile(path, data)
          .pipe(Effect.mapError((raw) => new PublisherError({ raw })))
      }),
  })
})

export const layer = Layer.effect(Publisher, make)

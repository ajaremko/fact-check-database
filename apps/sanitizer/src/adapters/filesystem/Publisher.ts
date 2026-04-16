import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { SanitizationAttempted } from '../../../../../packages/ingestion/dist/lib/steps/sanitize'
import { Node } from '@news-research/ingestion/util'

import { Publisher, PublisherError } from '../../Publisher'

const encodeMessage = pipe(
  SanitizationAttempted,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export const make = Effect.gen(function* () {
  const outputDir = yield* Config.string('PUBLISHER_OUTPUT_DIR')
  const fs = yield* FileSystem.FileSystem

  yield* fs.makeDirectory(outputDir, { recursive: true })

  return Publisher.of({
    publish: (event) =>
      Effect.gen(function* () {
        const path = `${outputDir}/${event.observationId}_${event.source.name}.json`
        const data = yield* encodeMessage(event).pipe(
          Effect.mapError((cause) => new PublisherError({ cause }))
        )
        yield* fs
          .writeFile(path, data)
          .pipe(Effect.mapError((cause) => new PublisherError({ cause })))
      }),
  })
})

export const layer = Layer.effect(Publisher, make)

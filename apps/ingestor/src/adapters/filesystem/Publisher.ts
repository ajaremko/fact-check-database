import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { Node } from '@news-research/node'
import { IngestionAttemptedSchema } from '@news-research/ingestion/ingest'

import { Publisher, PublisherError } from '../../ports/Publisher'

const encodeMessage = pipe(
  IngestionAttemptedSchema,
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
        const path = `${outputDir}/${event.runId}_${event.source.name}.json`
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

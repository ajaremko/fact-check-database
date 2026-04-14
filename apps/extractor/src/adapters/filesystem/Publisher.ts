import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { ExtractionBatchReady } from '@news-research/ingestion/extract'
import { Node } from '@news-research/ingestion/util'

import { Publisher, PublisherError } from '../../Publisher'

const encodeMessage = pipe(
  ExtractionBatchReady,
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
        const path = `${outputDir}/${event.batchId}_${event.extractedAt}.json`
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

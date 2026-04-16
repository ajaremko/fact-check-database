import { Config, Effect, Layer, pipe, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { IngestionAttempted } from '../../../../../packages/ingestion/dist/lib/steps/ingest'
import { Node } from '@news-research/ingestion/util'

import { MessageQueue } from '../../MessageQueue'

const decodeObservationFetched = pipe(
  IngestionAttempted,
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)

  const { messages } = yield* MessageQueue

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    yield* messages.offer({
      ack: Effect.void,
      nack: Effect.void,
      read: decodeObservationFetched(data),
    })
  }
})

export const layer = Layer.effectDiscard(make)

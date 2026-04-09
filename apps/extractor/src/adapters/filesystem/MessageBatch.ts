import { Config, Effect, Layer, Schema, pipe } from 'effect'
import { FileSystem } from '@effect/platform'

import { SanitizationAttemptedSchema } from '@news-research/ingestion/sanitize'
import { Node } from '@news-research/node'

import { MessageBatch, Message } from '../../MessageBatch'

const decodeObservationFetched = pipe(
  SanitizationAttemptedSchema,
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)
  const messages: Message[] = []

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    messages.push({
      ack: Effect.void,
      read: decodeObservationFetched(data),
    })
  }

  return messages
})

export const layer = Layer.effect(MessageBatch, make)

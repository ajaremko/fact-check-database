import { Config, Effect, Layer, Schema, pipe } from 'effect'
import { FileSystem } from '@effect/platform'

import { SanitizationAttempted } from '../../../../../packages/ingestion/dist/lib/steps/sanitize'
import { Node } from '@news-research/ingestion/util'

import { MessageBatch, Message } from '../../MessageBatch'

const decodeSanitizationAttempted = pipe(
  SanitizationAttempted,
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
      read: decodeSanitizationAttempted(data),
    })
  }

  return messages
})

export const layer = Layer.effect(MessageBatch, make)

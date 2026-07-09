import { Effect, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import * as Node from '@news-research/core-data/Node'
import { PubsubMessagePayload } from '@news-research/core-contracts'

import { MessageBody } from '../ports/MessageBody'

/** A message read from a file, paired with the path it was read from. */
export interface DirectoryMessage {
  /** Path the file was read from, relative to the configured input directory. */
  readonly path: string
  /** The file's contents, wrapped as a {@link MessageBody}. */
  readonly message: MessageBody
}

const decodePubsubMessagePayload = PubsubMessagePayload.pipe(
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

/**
 * Reads every file in a directory into a MessageBody, paired with the
 * source path each message was read from.
 */
export function readDirectoryMessages(inputDir: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const contents = yield* fs.readDirectory(inputDir)

    return yield* Effect.forEach(contents, (file) =>
      Effect.gen(function* () {
        const path = `${inputDir}/${file}`
        const data = yield* fs.readFile(path)

        const messagePayload = yield* decodePubsubMessagePayload(data)

        const message: MessageBody = {
          ...messagePayload,
          data: Buffer.from(messagePayload.data),
        }
        return { path, message } as DirectoryMessage
      })
    )
  })
}

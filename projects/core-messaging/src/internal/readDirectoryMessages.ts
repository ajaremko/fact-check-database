import { Effect } from 'effect'
import { FileSystem } from '@effect/platform'
import type { PlatformError } from '@effect/platform/Error'

import { MessageBody } from '../ports/MessageBody'

export interface DirectoryMessage {
  readonly path: string
  readonly message: MessageBody
}

/**
 * Reads every file in a directory into a MessageBody, paired with the
 * source path each message was read from.
 */
export function readDirectoryMessages(
  inputDir: string
): Effect.Effect<
  ReadonlyArray<DirectoryMessage>,
  PlatformError,
  FileSystem.FileSystem
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const contents = yield* fs.readDirectory(inputDir)

    return yield* Effect.forEach(contents, (file) =>
      Effect.gen(function* () {
        const path = `${inputDir}/${file}`
        const data = yield* fs.readFile(path)
        const message: MessageBody = {
          data: Buffer.from(data),
          attributes: {},
          messageId: file,
          publishTime: new Date(),
        }
        return { path, message }
      })
    )
  })
}

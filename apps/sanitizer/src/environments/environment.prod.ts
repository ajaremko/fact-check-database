import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import * as FilesystemMessageQueue from '../adapters/filesystem/MessageQueue'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FilesystemMessageQueue.layer),
  Effect.provide(NodeFileSystem.layer)
)

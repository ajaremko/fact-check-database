import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import * as FilesystemMessageBatch from '../adapters/filesystem/MessageBatch'
import * as FilesystemArchiver from '../adapters/filesystem/Archiver'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FilesystemArchiver.layer),
  Effect.provide(FilesystemMessageBatch.layer),
  Effect.provide(NodeFileSystem.layer)
)

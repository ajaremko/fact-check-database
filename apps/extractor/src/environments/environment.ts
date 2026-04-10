import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import { FileSystemArchive } from '@news-research/ingestion/adapters'

import * as FileSystemMessageBatch from '../adapters/filesystem/MessageBatch'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FileSystemArchive.layer),
  Effect.provide(FileSystemMessageBatch.layer),
  Effect.provide(NodeFileSystem.layer)
)

import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import { FileSystemArchive } from '@news-research/ingestion/adapters'

import * as FilesystemMessageQueue from '../adapters/filesystem/MessageQueue'
import * as FilesystemPublisher from '../adapters/filesystem/Publisher'
import * as FilesystemSanitizerPolicyDocument from '../adapters/filesystem/SanitizerPolicyDocument'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FileSystemArchive.layer),
  Effect.provide(FilesystemMessageQueue.layer),
  Effect.provide(FilesystemPublisher.layer),
  Effect.provide(FilesystemSanitizerPolicyDocument.layer),
  Effect.provide(NodeFileSystem.layer)
)

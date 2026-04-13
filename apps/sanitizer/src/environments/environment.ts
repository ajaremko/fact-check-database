import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
} from '@news-research/ingestion/adapters'

import * as FilesystemMessageQueueFeeder from '../adapters/filesystem/MessageQueueFeeder'
import * as FilesystemPublisher from '../adapters/filesystem/Publisher'
import * as FilesystemSanitizerPolicyDocument from '../adapters/filesystem/SanitizerPolicyDocument'
import * as MessageQueue from '../MessageQueue'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FilesystemMessageQueueFeeder.layer),
  Effect.provide(FilesystemPublisher.layer),
  Effect.provide(FilesystemSanitizerPolicyDocument.layer),
  Effect.provide(MessageQueue.layer),
  Effect.provide(NodeFileSystem.layer)
)

import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
} from '@news-research/ingestion/adapters'

import * as FileSystemMessageBatch from '../adapters/filesystem/MessageBatch'
import * as FileSystemPublisher from '../adapters/filesystem/Publisher'
import * as JobContext from '../JobContext'
import * as Logger from '../Logger'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FileSystemMessageBatch.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.layer)
)

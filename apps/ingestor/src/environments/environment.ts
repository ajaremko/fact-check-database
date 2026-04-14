import { Effect } from 'effect'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
} from '@news-research/ingestion/adapters'

import * as FileSystemPublisher from '../adapters/filesystem/Publisher'
import * as FileSystemTargetList from '../adapters/filesystem/TargetList'
import * as HttpClientFetcher from '../adapters/http-client/Fetcher'
import * as JobContext from '../JobContext'
import * as Logger from '../Logger'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(FileSystemTargetList.layer),
  Effect.provide(HttpClientFetcher.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(NodeHttpClient.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(Logger.layer)
)

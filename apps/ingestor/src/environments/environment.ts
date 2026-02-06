import { Effect } from 'effect'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'

import * as FilesystemArchiver from '../adapters/filesystem/Archiver'
import * as FilesystemPublisher from '../adapters/filesystem/Publisher'
import * as FilesystemTargetList from '../adapters/filesystem/TargetList'
import * as HttpClientFetcher from '../adapters/http-client/Fetcher'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FilesystemArchiver.layer),
  Effect.provide(FilesystemPublisher.layer),
  Effect.provide(FilesystemTargetList.layer),
  Effect.provide(HttpClientFetcher.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(NodeHttpClient.layer)
)

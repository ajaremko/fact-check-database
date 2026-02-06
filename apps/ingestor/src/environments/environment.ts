import { Effect } from 'effect'
import { FetchHttpClient } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'

import * as FilesystemPublisher from '../adapters/filesystem/Publisher'
import * as FilesystemArchiver from '../adapters/filesystem/Archiver'
import * as FetchFetcher from '../adapters/fetch/Fetcher'
import * as FilesystemTargetList from '../adapters/filesystem/TargetList'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(FilesystemPublisher.layer),
  Effect.provide(FilesystemArchiver.layer),
  Effect.provide(FetchFetcher.layer),
  Effect.provide(FilesystemTargetList.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(FetchHttpClient.layer)
)

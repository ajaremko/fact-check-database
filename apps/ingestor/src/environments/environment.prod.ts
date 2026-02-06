import { Effect } from 'effect'
import { FetchHttpClient } from '@effect/platform'

import * as CloudPubsubPublisher from '../adapters/cloud-pubsub/Publisher'
import * as CloudStorageArchiver from '../adapters/cloud-storage/Archiver'
import * as CloudStorageTargetList from '../adapters/cloud-storage/TargetList'
import * as FetchFetcher from '../adapters/fetch/Fetcher'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageArchiver.layer),
  Effect.provide(CloudStorageTargetList.layer),
  Effect.provide(FetchFetcher.layer),
  Effect.provide(FetchHttpClient.layer)
)

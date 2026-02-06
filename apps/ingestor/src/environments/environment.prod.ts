import { Effect } from 'effect'
import { NodeHttpClient } from '@effect/platform-node'

import * as CloudPubsubPublisher from '../adapters/cloud-pubsub/Publisher'
import * as CloudStorageArchiver from '../adapters/cloud-storage/Archiver'
import * as CloudStorageTargetList from '../adapters/cloud-storage/TargetList'
import * as HttpClientFetcher from '../adapters/http-client/Fetcher'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageArchiver.layer),
  Effect.provide(CloudStorageTargetList.layer),
  Effect.provide(HttpClientFetcher.layer),
  Effect.provide(NodeHttpClient.layer)
)

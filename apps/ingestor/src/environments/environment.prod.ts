import { Effect } from 'effect'
import { NodeHttpClient } from '@effect/platform-node'

import { CloudStorageStorageWriter } from '@news-research/ingestion/adapters'
import { PubsubClient } from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'

import * as CloudPubsubPublisher from '../adapters/cloud-pubsub/Publisher'
import * as CloudStorageTargetList from '../adapters/cloud-storage/TargetList'
import * as HttpClientFetcher from '../adapters/http-client/Fetcher'
import * as JobContext from '../JobContext'
import * as Logger from '../Logger'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(CloudStorageTargetList.layer),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(HttpClientFetcher.layer),
  Effect.provide(NodeHttpClient.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(Logger.layer)
)

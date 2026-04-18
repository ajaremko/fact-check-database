import { Effect } from 'effect'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
  CloudPubsubMessageBatch,
  CloudPubsubPublisher,
} from '@news-research/ingestion/adapters'
import {
  PubsubSubscriberClient,
  PubsubClient,
} from '@news-research/cloud-pubsub'
import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'

import * as JobContext from '../JobContext'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubMessageBatch.layer),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(PubsubSubscriberClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(JobContext.layer)
)

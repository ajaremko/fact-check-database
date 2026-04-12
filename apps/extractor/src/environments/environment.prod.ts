import { Effect } from 'effect'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
} from '@news-research/ingestion/adapters'
import { PubsubSubscriberClient } from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'

import * as CloudPubsubMessageBatch from '../adapters/cloud-pubsub/MessageBatch'
import * as JobContext from '../JobContext'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubMessageBatch.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubSubscriberClient.layer()),
  Effect.provide(JobContext.layer)
)

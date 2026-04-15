import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
} from '@news-research/ingestion/adapters'
import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'
import { PubsubClient } from '@news-research/cloud-pubsub'

import * as HttpServerMessageQueueFeeder from '../adapters/http-server/MessageQueueFeeder'
import * as CloudPubsubPublisher from '../adapters/cloud-pubsub/Publisher'
import * as CloudStorageSanitizerPolicyDocument from '../adapters/cloud-storage/SanitizerPolicyDocument'
import * as MessageQueue from '../MessageQueue'
import * as Logger from '../Logger'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(HttpServerMessageQueueFeeder.layer),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageSanitizerPolicyDocument.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(MessageQueue.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.layer)
)

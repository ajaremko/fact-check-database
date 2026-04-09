import { Effect } from 'effect'

import { PubsubClient } from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'

import * as CloudPubsubMessageBatch from '../adapters/cloud-pubsub/MessageBatch'
import * as CloudStorageArchiver from '../adapters/cloud-storage/Archiver'
import * as CloudStorageSanitizerPolicyDocument from '../adapters/cloud-storage/SanitizerPolicyDocument'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubMessageBatch.layer),
  Effect.provide(CloudStorageSanitizerPolicyDocument.layer),
  Effect.provide(CloudStorageArchiver.layer),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubClient.layer())
)

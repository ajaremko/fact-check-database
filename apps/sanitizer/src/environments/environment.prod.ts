import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import { PubsubClient } from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'

import * as CloudPubsubMessageQueue from '../adapters/cloud-pubsub/MessageQueue'
import * as CloudStorageSanitizerPolicyDocument from '../adapters/cloud-storage/SanitizerPolicyDocument'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubMessageQueue.layer),
  Effect.provide(CloudStorageSanitizerPolicyDocument.layer),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(NodeFileSystem.layer)
)

import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import { PubsubClient } from '@news-research/cloud-pubsub'

import * as CloudPubsubMessageQueue from '../adapters/cloud-pubsub/MessageQueue'
import { Program } from '../program'

export const main = Program.pipe(
  Effect.provide(CloudPubsubMessageQueue.layer),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(NodeFileSystem.layer)
)

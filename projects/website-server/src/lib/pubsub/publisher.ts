import { Config, Effect, Layer } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import * as CloudPubsubPublisher from '@news-research/ingestion-messaging/adapters/CloudPubsubPublisher'
import * as FileSystemPublisher from '@news-research/ingestion-messaging/adapters/FileSystemPublisher'
import * as PubsubClient from '@news-research/core-vendor/cloud-pubsub/PubsubClient'
import { Publisher } from '@news-research/ingestion-messaging'

const MessagingModeConfig = Config.literal('gcp', 'filesystem')('MESSAGING_MODE')

const publisherLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const mode = yield* Config.withDefault(MessagingModeConfig, 'gcp')
    if (mode === 'filesystem') {
      return Layer.empty.pipe(
        Layer.merge(FileSystemPublisher.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    return Layer.empty.pipe(
      Layer.merge(CloudPubsubPublisher.layer),
      Layer.provide(PubsubClient.layer())
    )
  }).pipe(Effect.map(Layer.mergeAll))
)

export async function publishFormSubmission(record: unknown): Promise<void> {
  const data = Buffer.from(JSON.stringify(record))
  await Effect.runPromise(
    Publisher.pipe(
      Effect.flatMap((pub) => pub.publish(data)),
      Effect.provide(publisherLayer)
    )
  )
}

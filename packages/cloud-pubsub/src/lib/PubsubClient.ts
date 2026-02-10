import { Context, Effect, Config, flow, Layer } from 'effect'
import { PubSub, ClientConfig } from '@google-cloud/pubsub'

export class PubsubClient extends Context.Tag('PubsubClient')<
  PubsubClient,
  {
    readonly client: PubSub
  }
>() {}

type PubsubOptionsConfig = {
  [k in keyof ClientConfig]?: Config.Config<NonNullable<ClientConfig[k]>>
}

function make(config?: PubsubOptionsConfig) {
  return Effect.gen(function* () {
    if (config) {
      const options = yield* Config.all(config)
      const client = new PubSub(options)
      return { client }
    }
    const client = new PubSub()
    return { client }
  })
}

export const layer = flow(make, Layer.effect(PubsubClient))

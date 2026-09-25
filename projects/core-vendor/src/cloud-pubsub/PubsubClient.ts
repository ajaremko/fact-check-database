import { Context, Data, Effect, Config, flow, Layer } from 'effect'
import { PubSub, ClientConfig } from '@google-cloud/pubsub'

import { logSdkFailure } from '../internal/logSdkFailure'

/**
 * Provides a shared Google Cloud `PubSub` client instance.
 *
 * This is the base layer required by both `PubsubTopic` and `PubsubSubscription`.
 * The layer is **scoped**: the client is closed when the enclosing scope is
 * released, after any subscriptions built on it have closed.
 * Credentials default to Application Default Credentials (ADC), which are
 * resolved automatically in Cloud Run via the attached service account.
 */
export class PubsubClient extends Context.Tag('PubsubClient')<
  PubsubClient,
  {
    readonly client: PubSub
  }
>() {}

type PubsubOptionsConfig = {
  [k in keyof ClientConfig]?: Config.Config<NonNullable<ClientConfig[k]>>
}

const moduleName = 'PubsubClient'

function make(config?: PubsubOptionsConfig) {
  const acquire = Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ module: moduleName })
    const client = config ? new PubSub(yield* Config.all(config)) : new PubSub()
    yield* Effect.logTrace('Client created')
    return { client }
  }).pipe(Effect.scoped)

  function release({ client }: Effect.Effect.Success<typeof acquire>) {
    return Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({ module: moduleName })
      yield* Effect.tryPromise({
        try: () => client.close(),
        catch: (cause) =>
          new PubsubClientIOError({ cause, message: 'Failed to close client' }),
      }).pipe(
        Effect.tap(() => Effect.logTrace('Client closed')),
        logSdkFailure('Client close failed'),
        Effect.ignore
      )
    }).pipe(Effect.scoped)
  }

  return Effect.acquireRelease(acquire, release)
}

/** Thrown when closing the underlying `PubSub` client fails. Logged and swallowed on release. */
export class PubsubClientIOError extends Data.TaggedError(
  'PubsubClientIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * Creates an Effect layer providing a `PubsubClient`.
 *
 * `config` is optional. When omitted, the client uses Application Default
 * Credentials with no additional options. When provided, each key is a
 * `Config.Config<T>` resolved at Effect runtime (e.g. from environment variables).
 *
 * @example
 * // Using ADC (typical in Cloud Run)
 * Effect.provide(PubsubClient.layer())
 *
 * // With explicit project
 * Effect.provide(PubsubClient.layer({ projectId: Config.string('PUBSUB_PROJECT_ID') }))
 */
export const layer = flow(make, Layer.scoped(PubsubClient))

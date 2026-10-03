import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import { ClientConfig, v1 } from '@google-cloud/pubsub'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

import { logSdkFailure } from '../internal/logSdkFailure'

/**
 * Provides a shared Google Cloud Pub/Sub v1 `SubscriberClient` instance, for
 * pull-based access to a subscription (see `pull` and `acknowledge` below).
 *
 * This is a separate client from `PubsubClient`: `PubsubTopic` and
 * `PubsubSubscription` do not depend on it. Credentials default to
 * Application Default Credentials (ADC), which are resolved automatically in
 * Cloud Run via the attached service account. The layer is **scoped**: the
 * client is closed when the enclosing scope is released.
 */
export class PubsubSubscriberClient extends Context.Tag(
  'PubsubSubscriberClient'
)<
  PubsubSubscriberClient,
  {
    readonly client: v1.SubscriberClient
  }
>() {}

type PubsubOptionsConfig = {
  [k in keyof ClientConfig]?: Config.Config<NonNullable<ClientConfig[k]>>
}

const moduleName = 'PubsubSubscriberClient'

function make(config?: PubsubOptionsConfig) {
  const acquire = Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ module: moduleName })
    const client = config
      ? new v1.SubscriberClient(yield* Config.all(config))
      : new v1.SubscriberClient()
    yield* Effect.logTrace('Client created')
    return { client }
  }).pipe(Effect.scoped)

  function release({ client }: Effect.Effect.Success<typeof acquire>) {
    return Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({ module: moduleName })
      yield* Effect.tryPromise({
        try: () => client.close(),
        catch: (cause) =>
          new PubsubSubscriberClientIOError({
            cause,
            message: 'Failed to close client',
          }),
      }).pipe(
        Effect.tap(() => Effect.logTrace('Client closed')),
        logSdkFailure('Client close failed'),
        Effect.ignore
      )
    }).pipe(Effect.scoped)
  }

  return Effect.acquireRelease(acquire, release)
}

/**
 * Creates an Effect layer providing a `PubsubSubscriberClient`.
 *
 * `config` is optional. When omitted, the client uses Application Default
 * Credentials with no additional options. When provided, each key is a
 * `Config.Config<T>` resolved at Effect runtime (e.g. from environment variables).
 *
 * @example
 * // Using ADC (typical in Cloud Run)
 * Effect.provide(PubsubSubscriberClient.layer())
 *
 * // With explicit project
 * Effect.provide(PubsubSubscriberClient.layer({ projectId: Config.string('PUBSUB_PROJECT_ID') }))
 */
export const layer = flow(make, Layer.scoped(PubsubSubscriberClient))

/**
 * Thrown when a `pull()` or `acknowledge()` call rejects.
 *
 * @example
 * yield* pull('projects/p/subscriptions/s', 100).pipe(
 *   Effect.catchTag('PubsubSubscriberClientIOError', (err) => Effect.logError('Pull failed', err.cause))
 * )
 */
export class PubsubSubscriberClientIOError extends Data.TaggedError(
  'PubsubSubscriberClientIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

/** The ack ID of a single pulled message, as returned by {@link pull}. */
export type AckId = google.pubsub.v1.IReceivedMessage['ackId']

/**
 * Pulls up to `maxMessages` messages from a subscription. Requires
 * `PubsubSubscriberClient` in context.
 *
 * This is a single synchronous pull, not a streaming pull: it returns
 * whatever is immediately available, which may be far fewer than
 * `maxMessages` even when more are waiting, so a caller that needs a full
 * batch has to pull again. Any rejection is caught and wrapped as a
 * {@link PubsubSubscriberClientIOError}.
 *
 * On an empty subscription the call waits for messages until its deadline
 * and then rejects; {@link isDeadlineExceeded} identifies that case.
 * `options.timeoutMillis` shortens the deadline from the client's default.
 *
 * @example
 * const [{ receivedMessages }] = yield* pull('projects/p/subscriptions/s')
 */
export function pull(
  subscriptionId: string,
  maxMessages = 10,
  options?: { readonly timeoutMillis?: number }
) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      subscriptionId,
      maxMessages,
    })
    const request = { subscription: subscriptionId, maxMessages }
    const timeoutMillis = options?.timeoutMillis
    const { client } = yield* PubsubSubscriberClient
    const result = yield* Effect.tryPromise({
      try: (): Promise<
        [
          google.pubsub.v1.IPullResponse,
          google.pubsub.v1.IPullRequest | undefined,
          // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {} | undefined
        ]
      > =>
        timeoutMillis === undefined
          ? client.pull(request)
          : client.pull(request, { timeout: timeoutMillis }),
      catch: (cause) =>
        new PubsubSubscriberClientIOError({
          cause,
          message: 'Failed to pull messages from subscription',
        }),
    }).pipe(logSdkFailure('Pull failed'))

    yield* Effect.annotateLogsScoped({
      'receivedMessages.length': result[0].receivedMessages?.length ?? 0,
    })
    yield* Effect.logTrace('Messages pulled')

    return result
  }).pipe(Effect.scoped)
}

/** gRPC status code for a call that ran out of time. */
const DEADLINE_EXCEEDED = 4

/**
 * Whether a {@link PubsubSubscriberClientIOError} was caused by the call's
 * deadline passing (gRPC `DEADLINE_EXCEEDED`). For {@link pull}, that means
 * no message arrived in time, i.e. the subscription had nothing to deliver.
 */
export function isDeadlineExceeded(
  error: PubsubSubscriberClientIOError
): boolean {
  const { cause } = error
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === DEADLINE_EXCEEDED
  )
}

/**
 * Acknowledges the given ack IDs on a subscription, so Pub/Sub does not
 * redeliver them. Requires `PubsubSubscriberClient` in context.
 *
 * Any rejection is caught and wrapped as a
 * {@link PubsubSubscriberClientIOError}.
 *
 * @example
 * const [{ receivedMessages }] = yield* pull(subscriptionId)
 * yield* acknowledge(
 *   subscriptionId,
 *   (receivedMessages ?? []).map((m) => m.ackId)
 * )
 */
export function acknowledge(subscriptionId: string, ackIds: string[]) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      subscriptionId,
      'ackIds.length': ackIds.length,
    })
    const { client } = yield* PubsubSubscriberClient
    yield* Effect.tryPromise({
      try: () =>
        client.acknowledge({
          subscription: subscriptionId,
          ackIds,
        }),
      catch: (cause) =>
        new PubsubSubscriberClientIOError({
          cause,
          message: 'Failed to acknowledge messages',
        }),
    }).pipe(logSdkFailure('Acknowledge failed'))

    yield* Effect.logTrace('Messages acknowledged')
  }).pipe(Effect.scoped)
}

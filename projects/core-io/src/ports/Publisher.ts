import { Context, Data, Effect, flow } from 'effect'

/** Error raised when a {@link Publisher} adapter fails to publish a message. */
export class PublisherError extends Data.TaggedError('PublisherError')<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * Port for a single outbound publish capability.
 *
 * Use this for anything emitting an event or record downstream, independent
 * of the underlying transport (Pub/Sub topic, filesystem, etc.).
 */
export class Publisher extends Context.Tag('Publisher')<
  Publisher,
  {
    readonly publish: (
      data: Buffer,
      attributes?: Record<string, string>
    ) => Effect.Effect<void, PublisherError>
  }
>() {}

const publisher = Effect.serviceFunctions(Publisher)

/** Publishes `data` via the current {@link Publisher}, wrapped in a `publish` tracing span. */
export const publish = flow(publisher.publish, Effect.withSpan('publish'))

import { Context, Data, Effect, flow } from 'effect'

export class PublisherError extends Data.TaggedError('PublisherError')<{
  readonly cause: unknown
}> {}

export class Publisher extends Context.Tag('Publisher')<
  Publisher,
  {
    readonly publish: (data: Buffer) => Effect.Effect<void, PublisherError>
  }
>() {}

const publisher = Effect.serviceFunctions(Publisher)

export const publish = flow(publisher.publish, Effect.withSpan('publish'))

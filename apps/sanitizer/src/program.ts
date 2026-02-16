import { Effect, Queue } from 'effect'

import { MessageQueue, Message } from './ports/MessageQueue'

function handleMessage(message: Message) {
  return Effect.gen(function* () {
    const event = yield* message.read
    yield* Effect.logInfo(
      `Processing event ${event.observationId} from source ${event.source.name}...`
    )
    yield* message.ack
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.catchTag('ParseError', () => message.ack),
    Effect.catchAll(() => message.nack)
  )
}

export const Program = Effect.gen(function* () {
  yield* Effect.logInfo('Starting sanitizer...')
  const { messages, errors } = yield* MessageQueue

  yield* Effect.all(
    [
      Queue.take(messages).pipe(Effect.andThen(handleMessage), Effect.forever),
      Queue.take(errors).pipe(Effect.andThen(Effect.fail)),
    ],
    { concurrency: 'unbounded' }
  )
})

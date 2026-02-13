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
    Effect.catchAll(() => message.nack)
  )
}

export const Program = Effect.gen(function* () {
  yield* Effect.logInfo('Starting sanitizer...')
  const { queue } = yield* MessageQueue

  yield* Queue.take(queue).pipe(Effect.andThen(handleMessage), Effect.forever)
})

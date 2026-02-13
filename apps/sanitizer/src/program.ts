import { Effect, Queue } from 'effect'

import { MessageQueue } from './ports/MessageQueue'

export const Program = Effect.gen(function* () {
  yield* Effect.logInfo('Starting sanitizer...')
  const { queue } = yield* MessageQueue

  yield* Queue.take(queue).pipe(
    Effect.andThen((message) =>
      Effect.gen(function* () {
        const event = yield* message.read
        yield* Effect.logInfo(
          `Processing event ${event.observationId} from source ${event.source.name}...`
        )
        yield* message.ack
      }).pipe(Effect.catchAll(Effect.logError))
    ),
    Effect.forever
  )
})

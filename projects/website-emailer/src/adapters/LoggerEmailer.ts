import { Effect, Layer } from 'effect'

import { Emailer } from '../ports/Emailer'

export const layer = Layer.sync(Emailer, () =>
  Emailer.of({
    sendConfirmation: Effect.logInfo,
    sendNotification: Effect.logInfo,
  })
)

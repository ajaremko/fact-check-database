import { Effect, Layer } from 'effect'

import { Emailer } from './Emailer'

export const layer = Layer.sync(Emailer, () =>
  Emailer.of({
    sendConfirmation: Effect.logInfo,
    sendNotification: Effect.logInfo,
  })
)

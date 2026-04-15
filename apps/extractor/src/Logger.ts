import { Config, Effect, Layer, Logger } from 'effect'

export const layer = Layer.unwrapEffect(
  Config.logLevel('LOG_LEVEL').pipe(
    Effect.andThen((logLevel) => Logger.minimumLogLevel(logLevel))
  )
)

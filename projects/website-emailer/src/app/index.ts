import { HttpRouter, HttpServer, HttpMiddleware } from '@effect/platform'
import { Config, Effect, Layer } from 'effect'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import { sendConfirmationEmail, sendNotificationEmail } from '../ports/Emailer'
import { accessFormSubmission } from './accessFormSubmission'
import { created, serverError, parseError } from './responses'

const confirmationEmail = HttpRouter.post(
  '/confirmation-email',
  accessFormSubmission.pipe(
    Effect.andThen(sendConfirmationEmail),
    Effect.andThen(created),
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      EmailerError: () => serverError,
      ParseError: () => parseError,
    })
  )
)

const notificationEmail = HttpRouter.post(
  '/notification-email',
  accessFormSubmission.pipe(
    Effect.andThen(sendNotificationEmail),
    Effect.andThen(created),
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      EmailerError: () => serverError,
      ParseError: () => parseError,
    })
  )
)

const router = HttpRouter.empty.pipe(confirmationEmail, notificationEmail)

const app = router.pipe(
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress
)

const server = Layer.unwrapEffect(
  Effect.gen(function* () {
    const port = yield* Config.number('PORT')
    return NodeHttpServer.layer(() => createServer(), { port })
  })
)

export const App = Layer.launch(Layer.provide(app, server))

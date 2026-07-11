import { HttpRouter, HttpServer, HttpMiddleware } from '@effect/platform'
import { Config, Effect, Layer } from 'effect'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import { sendConfirmationEmail, sendNotificationEmail } from '../ports/Emailer'
import { accessFormSubmission } from './accessFormSubmission'
import { created, serverError } from './responses'

const submissions = HttpRouter.post(
  '/submissions',
  accessFormSubmission.pipe(
    Effect.andThen(sendConfirmationEmail),
    Effect.andThen(created),
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTag('EmailerError', () => serverError)
  )
)

const confirmations = HttpRouter.post(
  '/confirmations',
  accessFormSubmission.pipe(
    Effect.andThen(sendNotificationEmail),
    Effect.andThen(created),
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTag('EmailerError', () => serverError)
  )
)

const router = HttpRouter.empty.pipe(submissions, confirmations)

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

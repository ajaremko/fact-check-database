import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpMiddleware,
} from '@effect/platform'
import { Config, Effect, Layer, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import * as Node from '@news-research/ingestion-data/Node'
import { FormSubmissionSchema } from '@news-research/website-contracts'

import { sendConfirmationEmail, sendNotificationEmail } from './Emailer'

const decodeMessage = Schema.decodeUnknown(
  Schema.Struct({
    message: Schema.Struct({
      messageId: Schema.String,
      data: Schema.String.pipe(
        Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' })
      ),
    }),
  })
)

const decodeFormSubmission = FormSubmissionSchema.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const accessFormSubmission = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const body = yield* req.json
  const { message } = yield* decodeMessage(body)
  const data = Buffer.from(message.data, 'utf-8')
  return yield* decodeFormSubmission(data)
})

const created = HttpServerResponse.json(
  {
    message: 'Email sent',
  },
  { status: StatusCodes.CREATED }
)

const serverError = HttpServerResponse.json(
  {
    message: 'Something went wrong sending the email',
  },
  { status: StatusCodes.INTERNAL_SERVER_ERROR }
)

const submissions = HttpRouter.post(
  '/submissions',
  accessFormSubmission.pipe(
    Effect.andThen((submission) =>
      sendConfirmationEmail(submission, new Date())
    ),
    Effect.andThen(created),
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTag('EmailerError', () => serverError)
  )
)

const confirmations = HttpRouter.post(
  '/confirmations',
  accessFormSubmission.pipe(
    Effect.andThen((submission) =>
      sendNotificationEmail(submission, new Date())
    ),
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

export const Program = Layer.launch(Layer.provide(app, server))

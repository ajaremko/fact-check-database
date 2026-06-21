import { Effect, Schema } from 'effect'
import {
  takeMessage,
  takeError,
  type QueueMessage,
} from '@news-research/ingestion-messaging'
import { FormSubmissionSchema } from '@news-research/website-contracts'

const decodeSubmission = Schema.decode(Schema.parseJson(FormSubmissionSchema))

function processMessage(message: QueueMessage) {
  let effect = Effect.gen(function* () {
    const submission = yield* decodeSubmission(message.data.toString('utf-8'))

    switch (submission.kind) {
      case 'contact_submission':
        yield* Effect.logInfo('Would send confirmation email to submitter').pipe(
          Effect.annotateLogs({
            to: submission.email,
            subject: 'Your message has been received',
            kind: submission.kind,
          })
        )
        yield* Effect.logInfo('Would send team notification').pipe(
          Effect.annotateLogs({
            subject: `New contact form submission: ${submission.topic}`,
            from: submission.email,
            name: submission.name,
            kind: submission.kind,
          })
        )
        break

      case 'access_request':
        yield* Effect.logInfo('Would send confirmation email to submitter').pipe(
          Effect.annotateLogs({
            to: submission.email,
            subject: 'Your dataset access request has been received',
            kind: submission.kind,
          })
        )
        yield* Effect.logInfo('Would send team notification').pipe(
          Effect.annotateLogs({
            subject: `New access request from ${submission.affiliation}`,
            from: submission.email,
            name: submission.name,
            kind: submission.kind,
          })
        )
        break

      case 'tip_submission':
        if (submission.contact_email) {
          yield* Effect.logInfo(
            'Would send confirmation email to submitter'
          ).pipe(
            Effect.annotateLogs({
              to: submission.contact_email,
              subject: 'Your tip submission has been received',
              kind: submission.kind,
            })
          )
        }
        yield* Effect.logInfo('Would send team notification').pipe(
          Effect.annotateLogs({
            subject: `New tip submission from ${submission.organization}`,
            claim: submission.claim,
            url: submission.url,
            kind: submission.kind,
          })
        )
        break
    }

    yield* message.ack
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      ParseError: () => message.ack,
    })
  )

  if (message.annotations) {
    effect = Effect.annotateLogs(effect, message.annotations)
  }
  if (message.span) {
    effect = Effect.withParentSpan(effect, message.span)
  }

  return effect
}

export const Program = Effect.gen(function* () {
  yield* Effect.logInfo('Listening for form submission messages')

  const handleMessages = takeMessage.pipe(
    Effect.andThen(processMessage),
    Effect.forever
  )

  const handleErrors = takeError.pipe(
    Effect.andThen(Effect.fail),
    Effect.tapErrorCause(Effect.logError)
  )

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})

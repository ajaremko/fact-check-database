import { Context, Data, Effect, flow } from 'effect'

import { FormSubmission } from '@news-research/website-contracts/form-submissions/v1'

export class EmailerError extends Data.TaggedError('EmailerError')<{
  readonly cause: unknown
  readonly message: string
}> {}

export class Emailer extends Context.Tag('Emailer')<
  Emailer,
  {
    readonly sendConfirmation: (
      source: FormSubmission
    ) => Effect.Effect<void, EmailerError>
    readonly sendNotification: (
      source: FormSubmission
    ) => Effect.Effect<void, EmailerError>
  }
>() {}

const emailer = Effect.serviceFunctions(Emailer)

export const sendConfirmationEmail = flow(
  emailer.sendConfirmation,
  Effect.withSpan('sendConfirmation')
)

export const sendNotificationEmail = flow(
  emailer.sendNotification,
  Effect.withSpan('sendNotification')
)

import { Resend } from 'resend'
import { Effect, Config, Layer } from 'effect'

import { FormSubmission } from '@news-research/website-contracts'

import { Emailer, EmailerError } from './Emailer'

export const make = Effect.gen(function* () {
  const apiKey = yield* Config.string('RESEND_API_KEY')
  const client = new Resend(apiKey)

  const adminEmail = yield* Config.string('ADMIN_EMAIL')
  const confirmationTemplateId = yield* Config.string(
    'RESEND_CONFIRMATION_TEMPLATE_ID'
  )

  function sendConfirmation(source: FormSubmission) {
    const to = source.email
    if (!to) {
      return Effect.void
    }
    return Effect.tryPromise({
      try: () =>
        client.emails.send({
          to,
          template: {
            id: confirmationTemplateId,
            variables: {
              PRODUCT: 'Vintage Macintosh',
              PRICE: '499',
            },
          },
        }),
      catch: (cause) =>
        new EmailerError({
          cause,
          message: 'Failed to send confirmation email',
        }),
    })
  }

  function sendNotification(source: FormSubmission) {
    return Effect.tryPromise({
      try: () =>
        client.emails.send({
          to: [adminEmail],
          from: 'emailer@factcheckdatabase.com',
          subject: `New form submission from factcheckdatabase.com`,
          html: `
          <p>You have a new form submission:</p>
            <ul>
            ${Object.entries(source)
              .map(([key, value]) => `<li>${key}: ${value}</li>`)
              .join('')}
            </ul>`,
        }),
      catch: (cause) =>
        new EmailerError({
          cause,
          message: 'Failed to send confirmation email',
        }),
    })
  }

  return Emailer.of({
    sendConfirmation,
    sendNotification,
  })
})

export const layer = Layer.effect(Emailer, make)

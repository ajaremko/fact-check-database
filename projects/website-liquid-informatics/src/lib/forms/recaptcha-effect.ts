import { Data, Effect } from 'effect'

import { verifyRecaptchaToken } from './recaptcha-verify'

export class RecaptchaError extends Data.TaggedError('RecaptchaError')<{
  readonly message: string
}> {}

export const verifyRecaptcha = (token: string, action: string) =>
  Effect.tryPromise({
    try: () => verifyRecaptchaToken(token, action),
    catch: (cause) => new RecaptchaError({ message: String(cause) }),
  }).pipe(
    Effect.flatMap((result) =>
      result.success
        ? Effect.void
        : Effect.fail(
            new RecaptchaError({ message: 'reCAPTCHA score below threshold' })
          )
    )
  )

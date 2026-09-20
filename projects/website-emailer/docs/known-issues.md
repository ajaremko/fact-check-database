# Known Issues

## `/submissions` and `/confirmations` are misleadingly named

**Error:** No error — a naming inconsistency, not a functional bug.
**Where:** `src/app/index.ts`. `POST /submissions` sends the *confirmation* email to the form
submitter; `POST /confirmations` sends the *notification* email to the admin — backwards from
what the names suggest. Both are fed by independent Pub/Sub push subscriptions
(`submissionSubscription`, `confirmationSubscription` in `website-infra/src/emailer/
subscription.ts`) on the *same* topic, so a single form submission fires both routes.
**Root cause:** Unknown — the route names likely predate one of the two email actions being
added, and were never revisited.
**Decision:** Leave as-is. Nothing is broken: `website-infra`'s subscriptions and this service's
routes agree on the paths. Fixing the naming means renaming both the Pulumi push-endpoint URLs
(already-deployed subscription resources) and the app's routes together — a coordinated
cross-project change, not a documentation-pass fix.
**If this ever needs to be fixed:** Rename the routes to something like `/confirmation-email` and
`/notification-email`, update both subscriptions' `pushEndpoint` in `website-infra` to match, and
deploy both projects together.

## Hardcoded Resend template variables in the confirmation email

**Error:** No error — the email likely renders with wrong content, not a crash.
**Where:** `src/adapters/ResendEmailer.ts`'s `sendConfirmation`. The Resend template call passes
`{ PRODUCT: 'Vintage Macintosh', PRICE: '499' }` — placeholder content with no relationship to
this platform's domain (a fact-check database has no products or prices).
**Root cause:** Unknown — reads like leftover content from an unrelated e-commerce example this
project's structure may have started from.
**Decision:** Leave as-is rather than guess. The correct variables depend on the real Resend
template's variable schema, which lives outside this repo (in the Resend dashboard) and isn't
visible from the code — changing this without seeing the actual template risks silently breaking
the rendered email.
**If this ever needs to be fixed:** Check the template referenced by
`RESEND_CONFIRMATION_TEMPLATE_ID` in the Resend dashboard for its real variable names, and pass
whatever `FormSubmission` fields are relevant to those slots.

## `confirmationSubscription` has no dead-letter policy

**Error:** No error — an asymmetry between the two subscriptions backing this service.
**Where:** `website-infra/src/emailer/subscription.ts`. `submissionSubscription` (confirmation
email) has a `deadLetterPolicy` that redirects to `emailerDeadletterTopic` after 5 delivery
attempts. `confirmationSubscription` (notification email) only has a `retryPolicy` — a
persistently failing notification email retries indefinitely instead of ever dead-lettering.
**Root cause:** Unknown — likely an oversight when the second subscription was added, copying the
`retryPolicy` but not the `deadLetterPolicy`.
**Decision:** Leave as-is. This is an infra config change to an already-deployed subscription —
noting it here rather than changing `website-infra` in a documentation pass on this project.
**If this ever needs to be fixed:** Add the same `deadLetterPolicy` block (pointed at
`emailerDeadletterTopic`) to `confirmationSubscription` in `website-infra/src/emailer/
subscription.ts`.

## Only `EmailerError` is caught explicitly

**Error:** No error — an inconsistency in error handling, not a functional bug.
**Where:** `src/app/index.ts`'s route handlers catch `EmailerError` with a tailored `500`
response. A `ParseError` (a malformed push envelope, or a submission object that no longer
matches `FormSubmission`) is only logged via `Effect.tapErrorCause(Effect.logError)`, not caught —
it falls through to the HTTP framework's default error response instead.
**Root cause:** Likely only the most commonly-hit failure mode (an email actually failing to
send) was handled explicitly.
**Decision:** Leave as-is. Both failure modes already nack correctly (any non-2xx response
triggers Pub/Sub redelivery) — the gap is in response consistency and log-based diagnosis, not
correctness.
**If this ever needs to be fixed:** Add `Effect.catchTag('ParseError', ...)` alongside the
existing `EmailerError` handling, with its own clear response message.

## No automated test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** The whole project. Zero `.spec.ts` files exist anywhere in `src/`.
**Root cause:** Unknown.
**Decision:** Leave as-is for now. Closing this means writing real coverage, not a small fix.
**If this ever needs to be fixed:** Add specs for `accessFormSubmission` (mock `StorageReader`)
and each `Emailer` adapter (mock the Resend client) at minimum.

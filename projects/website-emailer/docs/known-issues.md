# Known Issues

## `notificationEmailSubscription` has no dead-letter policy

**Error:** No error — an asymmetry between the two subscriptions backing this service.
**Where:** `website-infra/src/emailer/subscription.ts`. `confirmationEmailSubscription` has a
`deadLetterPolicy` that redirects to `emailerDeadletterTopic` after 5 delivery attempts.
`notificationEmailSubscription` only has a `retryPolicy` — a persistently failing notification
email retries indefinitely instead of ever dead-lettering.
**Root cause:** Unknown — likely an oversight when the second subscription was added, copying the
`retryPolicy` but not the `deadLetterPolicy`.
**Decision:** Leave as-is. This is an infra config change to an already-deployed subscription —
noting it here rather than changing `website-infra` in a documentation pass on this project.
**If this ever needs to be fixed:** Add the same `deadLetterPolicy` block (pointed at
`emailerDeadletterTopic`) to `notificationEmailSubscription` in
`website-infra/src/emailer/subscription.ts`.

## No automated test coverage

**Error:** No error — an accepted test-coverage gap.
**Where:** The whole project. Zero `.spec.ts` files exist anywhere in `src/`.
**Root cause:** Unknown.
**Decision:** Leave as-is for now. Closing this means writing real coverage, not a small fix.
**If this ever needs to be fixed:** Add specs for `accessFormSubmission` (mock `StorageReader`)
and each `Emailer` adapter (mock the Resend client) at minimum.

# website-emailer

Sends the two emails triggered by a website form submission: a confirmation to whoever submitted
the form, and a notification to the site admin. An HTTP service, not a batch job — one Pub/Sub
push message in, one email out.

## How it works

A form submission ([contact, access request, or tip](../website-contracts/README.md)) is written
by `website-server` as a YAML object under `submissions/` in the backend bucket. That write fires
a single GCS `OBJECT_FINALIZE` notification into one Pub/Sub topic
(`form-submissions-topic`, provisioned by `website-infra`). **Two independent push subscriptions**
subscribe to that same topic and deliver the same event twice, to two different routes on this
service:

| Route | Sends | To |
| --- | --- | --- |
| `POST /submissions` | a confirmation email | the form submitter |
| `POST /confirmations` | a notification email | the site admin |

The route names are swapped relative to what they actually do — see
[docs/known-issues.md](./docs/known-issues.md). Both routes share the same handler shape: decode
the Pub/Sub push envelope, pull `bucketId`/`objectId` out of its attributes, read that object from
storage, and decode it as YAML into the `FormSubmission` union — then run whichever `Emailer`
capability that route wires up.

## Ports and adapters

| Port | Production adapter | Development adapter |
| --- | --- | --- |
| `Emailer` | `ResendEmailer` — sends via the [Resend](https://resend.com) API | `LoggerEmailer` — logs instead of sending |
| `StorageReader` (from [`core-io`](../core-io/README.md)) | GCS | local filesystem |

Selected via `EMAILER_MODE` and `STORAGE_MODE` — see [docs/runbook.md](./docs/runbook.md).

## What this service does not do

- No storage **writer** — it only ever reads the submission object it's told about.
- No polling loop and no batching — each push request handles exactly one submission.
- No template authoring — the confirmation email's content lives in a Resend-hosted template
  (`RESEND_CONFIRMATION_TEMPLATE_ID`), not in this codebase.

## Development

```bash
nx build website-emailer
nx serve website-emailer
nx typecheck website-emailer
nx lint website-emailer
```

There is no `test` target for this project — no test infrastructure exists here today (see
[docs/known-issues.md](./docs/known-issues.md)).

## Error handling

This service defines one custom error, `EmailerError` (`{ cause, message }`), raised by both
`Emailer` capabilities. Route handlers catch `EmailerError` explicitly and return a `500`; any
other error (for example a `ParseError` from a malformed push envelope or a submission object that
no longer matches `FormSubmission`) falls through to the HTTP framework's default response — see
[docs/known-issues.md](./docs/known-issues.md) for why this is accepted as-is.

## Logging

This service's own code logs at `debug` (startup mode selection) and `error` (the full cause of a
failed request, via `Effect.tapErrorCause`). The `LoggerEmailer` dev adapter additionally logs at
`info` in place of actually sending. `core-io`, used for every storage read, logs its own
`trace`/`warning` lines separately — see that package's README.

## Related documentation

| Document | Purpose |
| --- | --- |
| [docs/runbook.md](./docs/runbook.md) | Configuration reference, Resend setup, and diagnosing failures |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted gaps and inconsistencies |

# Emailer Runbook

Configuration reference, Resend setup, and diagnosing failures for `website-emailer`. See the
[README](../README.md) for what this service does and how it works.

## Configuration

| Variable                              | Type                  | Required                         | Default                   | Purpose                                                                                                                                                                                            |
| ------------------------------------- | --------------------- | -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EMAILER_MODE`                        | `resend` \| `logger`  | No                               | `resend`                  | Selects the `Emailer` adapter                                                                                                                                                                      |
| `RESEND_API_KEY`                      | string                | Only if `EMAILER_MODE=resend`    | —                         | Resend API key                                                                                                                                                                                     |
| `ADMIN_EMAIL`                         | string                | Only if `EMAILER_MODE=resend`    | —                         | Recipient of the notification email                                                                                                                                                                |
| `RESEND_CONFIRMATION_TEMPLATE_ID`     | string                | Only if `EMAILER_MODE=resend`    | —                         | Resend template ID for the confirmation email                                                                                                                                                      |
| `STORAGE_MODE`                        | `gcp` \| `filesystem` | No                               | `gcp`                     | Selects the `core-io` `StorageReader` adapter                                                                                                                                                      |
| `LOGGING_MODE`                        | `gcp` \| `console`    | No                               | `gcp`                     | Pretty console logger vs. Pino/Cloud Logging JSON                                                                                                                                                  |
| `LOGGING_LEVEL`                       | Effect `LogLevel`     | No                               | `info`                    | Minimum log level                                                                                                                                                                                  |
| `OTEL_MODE`                           | `gcp` \| `local`      | No                               | `gcp`                     | Cloud Trace/Monitoring exporters vs. local OTLP                                                                                                                                                    |
| `OTEL_SERVICE_NAME` or `SERVICE_NAME` | string                | Yes (one of the two)             | —                         | Service name attached to traces/metrics. In production this comes from the `SERVICE_NAME` build `ARG` baked into the image by the Nx-generated `Dockerfile`, not from a Pulumi-provisioned env var |
| `OTEL_METRIC_EXPORT_INTERVAL`         | integer (ms)          | No                               | `60000`                   | How often metrics are exported                                                                                                                                                                     |
| `OTEL_CLOUD_MONITORING_PREFIX`        | string                | No, only used if `OTEL_MODE=gcp` | `workload.googleapis.com` | Metric name prefix in Cloud Monitoring                                                                                                                                                             |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | string                | Only if `OTEL_MODE=local`        | —                         | Read directly by the OpenTelemetry OTLP exporter, not by this app's own `Config` calls                                                                                                             |
| `PORT`                                | number                | Yes                              | —                         | In production, Cloud Run injects this automatically; set it explicitly for local development                                                                                                       |

## Mode matrix

| Variable       | `filesystem` / `logger`                                                                 | `gcp` / `resend` (default)                 |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `STORAGE_MODE` | `core-io`'s `FileSystemStorageReader` (reads the object's path directly off local disk) | `core-io`'s `CloudStorageStorageReader`    |
| `EMAILER_MODE` | `LoggerEmailer` — logs both emails instead of sending                                   | `ResendEmailer` — sends via the Resend API |

For local development, `EMAILER_MODE=logger` avoids sending real email, but `STORAGE_MODE`
defaults to `gcp` — set it to `filesystem` explicitly (as `.env.template` does) unless you
specifically want to exercise the real GCS read path.

## Setting up Resend

`website-infra` provisions a Secret Manager secret to hold the Resend API key
(`website-resend-api-key`, in `src/emailer/resend.ts`), but the Resend account, sending domain,
and email template are all external to this repo — there is no infra resource for them.

1. Create a Resend account and verify a sending domain.
2. Create an email template in Resend for the confirmation email, and note its template ID.
3. Generate an API key in Resend.
4. Add that key as a new version of the `website-resend-api-key` Secret Manager secret.
5. Point the stack at it: set the `website:resendApiKeySecretVersion` Pulumi config key to that
   version number. `website-infra`'s `src/config.ts` warns at synth time if this is left unset —
   the emailer service will fail to start without it.
6. Set `website:resendConfirmationTemplateId` (the template ID from step 2) and
   `website:adminEmail` (the notification recipient) — both are required stack config.

## Diagnosing failures

### A submission never gets an email

**Steps:**

1. Check whether the GCS write actually happened — the object should exist at
   `submissions/{kind}-{id}.yml` in the backend bucket.
2. Check the Pub/Sub subscription's undelivered message count. `confirmationEmailSubscription`
   (backing `/confirmation-email`) dead-letters to `emailerDeadletterTopic` after 5 delivery
   attempts, archived to the deadletter bucket under `emailer-deadletter/`.
   `notificationEmailSubscription` (backing `/notification-email`) has no dead-letter policy — see
   [docs/known-issues.md](./known-issues.md).
3. Look for the request's logged cause. An `EmailerError` means the send itself failed (check
   Resend's own dashboard/API status); a `ParseError` means the envelope or the submission object
   didn't decode — check for a schema change in `website-contracts` or a malformed object. Both
   now produce their own tailored `500` response.

### The service won't start

**Steps:**

1. Missing `PORT`, or a missing `RESEND_API_KEY`/`ADMIN_EMAIL`/`RESEND_CONFIRMATION_TEMPLATE_ID`
   while `EMAILER_MODE=resend` (the default), are the most likely causes — all four are required
   with no default.
2. Missing both `OTEL_SERVICE_NAME` and `SERVICE_NAME` also prevents startup — in production this
   should already be set via the Docker image's `SERVICE_NAME` build arg; check the deployed
   image if it's genuinely missing.

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.

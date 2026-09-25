# Infrastructure Runbook

Operational procedures for deploying and troubleshooting `website-infra`. See the
[README](../README.md) for what this project provisions.

## Configuration

Reference for the `website` Pulumi config namespace, read by `src/config.ts`. Set with
`pulumi config set website:<key> <value> --stack=<dev|prod>` (or directly in
`Pulumi.<stack>.yml`).

| Key                                         | Description                                                                                                                                  | Required                                                | dev                                     | prod                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| `website:project`                           | GCP project ID this stack deploys into                                                                                                       | Yes                                                     | `fact-check-database-dev`               | `fact-check-database-website`                       |
| `website:region`                            | GCP region for regional resources                                                                                                            | Yes                                                     | `us-central1`                           | `us-central1`                                       |
| `website:coreStackName`                     | The core-infra stack this project reads a `StackReference` from                                                                              | Yes                                                     | `alfredsyoung/fact-check-database-core` | same                                                |
| `website:tag`                               | Docker image tag for all four services                                                                                                       | No                                                      | set per-deploy                          | set per-deploy                                      |
| `website:logLevel`                          | Log level passed to services that read it                                                                                                    | Yes                                                     | `debug`                                 | `debug`                                             |
| `website:verifiedDomains`                   | Domains verified for Cloud Run domain mapping and the reCAPTCHA key's allowed domains                                                        | Yes                                                     | `dev.factcheckdatabase.com`             | `factcheckdatabase.com`, `thefactcheckdatabase.com` |
| `website:algoliaAppId` / `algoliaSearchKey` | The Algolia application this stack's index lives in                                                                                          | Yes                                                     | same app as prod today                  | —                                                   |
| `website:gaMeasurementId`                   | Google Analytics measurement ID, passed to the backend service. Unset in dev on purpose — dev/test traffic should never reach real analytics | No                                                      | unset                                   | set                                                 |
| `website:resendApiKeySecretVersion`         | Which version of the `website-resend-api-key` secret to mount into the emailer                                                               | No, but the emailer fails to start without a real value | set                                     | set                                                 |
| `website:resendConfirmationTemplateId`      | The Resend template used for confirmation emails                                                                                             | Yes                                                     | same template as prod today             | —                                                   |
| `website:adminEmail`                        | Notification-email recipient                                                                                                                 | Yes                                                     | —                                       | —                                                   |
| `website:htpasswdSecretVersion`             | Which version of the dev basic-auth credentials to mount. Deployment throws if this is set in **prod**                                       | No; required in practice for dev to be reachable        | set                                     | must stay unset                                     |
| `website:forceDestroyStorage`               | Whether `pulumi destroy` may delete non-empty buckets (`backendBucket`, `deadletterBucket`)                                                  | No, default `false`                                     | unset (defaults to `false`)             | unset (defaults to `false`)                         |
| `website:retainStorageOnDelete`             | Whether those buckets survive `pulumi destroy` instead of being deleted with the stack                                                       | No, default `true`                                      | unset (defaults to `true`)              | unset (defaults to `true`)                          |
| `website:deadletterRetentionDays`           | Age-based deletion window for `deadletterBucket`. Unset disables the rule                                                                    | No                                                      | unset                                   | unset                                               |
| `website:deadletterSoftDeleteDays`          | Soft-delete window on `deadletterBucket`                                                                                                     | No                                                      | unset                                   | unset                                               |

## Commands

```bash
nx preview website-infra --stack=<dev|prod>   # review changes
nx deploy website-infra --stack=<dev|prod>    # apply them
nx refresh website-infra --stack=<dev|prod>   # reconcile state with reality
nx destroy website-infra --stack=<dev|prod>   # tear down — see the storage-config caveat below first
nx output website-infra --stack=<dev|prod>    # print stack outputs
```

**Before running `nx destroy`**: `backendBucket` and `deadletterBucket` both respect
`website:forceDestroyStorage`/`retainStorageOnDelete`. Neither `Pulumi.dev.yml` nor
`Pulumi.prod.yml` currently overrides these, so both stacks currently fall back to the code's own
safe defaults (`forceDestroyStorage: false`, `retainStorageOnDelete: true`) — a destroy will fail
on a non-empty bucket rather than force-deleting it, unless someone deliberately sets
`forceDestroyStorage: true` for a stack first.

## Deployment ordering

`core-infra` must be deployed first — this project's `StackReference` to it fails to resolve
otherwise. Nothing else in this repo currently depends on `website-infra` deploying first.

## Rotating credentials

- **Resend API key**: create a new version of the `website-resend-api-key` Secret Manager secret
  (see [website-emailer's runbook](../website-emailer/docs/runbook.md) for the account-side
  steps), then set `website:resendApiKeySecretVersion` to the new version and redeploy.
- **Algolia search key**: rotate in the Algolia dashboard, then update `website:algoliaSearchKey`
  and redeploy. This key is deliberately search-only and safe to expose client-side (see
  `website-server`'s README) — rotating it doesn't require revoking anything server-side.
- **htpasswd credentials (dev only)**: regenerate the file (see
  [docs/bootstrap.md](./bootstrap.md)), upload it as a new Secret Manager version, and set
  `website:htpasswdSecretVersion` to that version.

## Revoking access

No service account in this project holds a downloaded key — every one is attached directly to its
Cloud Run service, so there's nothing to rotate the way `core-infra`'s root credentials need to
be. To revoke a service's access, remove its IAM binding (see
[docs/iam-model.md](./iam-model.md)) or delete the service account if decommissioning the service
entirely. To revoke the dev basic-auth gate for a specific person, regenerate the htpasswd file
without their entry and deploy a new secret version.

## Diagnosing failures

### The dev site returns 401/403

**Symptom:** the dev deployment prompts for or rejects basic-auth credentials.
**Cause:** this is the intended behavior of the Envoy + `oauth2-proxy` sidecar gating dev access
(see the README) — not a bug. It's driven by `website:htpasswdSecretVersion`.
**Steps:** confirm you have valid credentials for the current htpasswd file (see
[docs/bootstrap.md](./bootstrap.md) to generate new ones), and that
`website:htpasswdSecretVersion` points at the secret version containing them.

### The emailer or search loader won't start

**Symptom:** the Cloud Run revision fails to become ready.
**Steps:**

1. For the emailer: confirm `website:resendApiKeySecretVersion`,
   `website:resendConfirmationTemplateId`, and `website:adminEmail` are all set — see
   [website-emailer's runbook](../website-emailer/docs/runbook.md) for what each does.
2. For the search loader: confirm `website:algoliaAppId`/`algoliaSearchKey` are set and the
   loader's service account has `roles/secretmanager.secretAccessor` on the Algolia key secret
   (see [docs/iam-model.md](./iam-model.md)).
3. For either: confirm the Cloud Run service agent has `roles/artifactregistry.reader` on
   core-infra's registry — a cross-project grant, the one permissions issue here that isn't local
   to this project.

### Messages are being redelivered repeatedly

**Symptom:** the emailer or search loader keeps reprocessing the same message.
**Cause:** any non-2xx response nacks the Pub/Sub message. The emailer's
`confirmationEmailSubscription` and the search loader's staging-storage subscription both
dead-letter after 5 attempts into the shared `deadletterBucket`; `notificationEmailSubscription`
does not — see [website-emailer's known-issues.md](../website-emailer/docs/known-issues.md).
**Steps:** fix the underlying cause (see the relevant app's own runbook), or inspect the
dead-lettered message directly in `deadletterBucket`.

## Checking output locally

```bash
nx output website-infra --stack=<dev|prod>
```

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.

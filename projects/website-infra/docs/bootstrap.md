# Bootstrap and First Deployment

Generic Pulumi Cloud/account/tooling setup is documented once, centrally, in
[core-infra/docs/bootstrap.md](../../core-infra/docs/bootstrap.md) — this doc only covers what's
specific to `website-infra`. Follow that doc first if you haven't already.

## Initial GCP project setup

Ensure `core-infra` is deployed to the same stack before deploying this stack.

Per the dev-shared / prod-per-domain convention (see core-infra's bootstrap doc), this project
needs its own dedicated GCP project only for **prod** — dev deploys into the shared dev project
already set up for core-infra.

Create a new GCP project to host the production website stack, for example
`fact-check-database-website`. Link it to an existing billing account.

Enable the cloud resource manager API via
`https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-website`

Add the root Pulumi CLI service account as a principal with the `Owner` role in the new project.

## Domain verification and mapping (manual)

Cloud Run custom domain mapping requires the deploying identity to be a verified owner of the
domain in Google Search Console — this isn't something Pulumi can automate, and there's no
`DomainMapping` resource anywhere in this project's source (the `domains`/`dns`/
`siteverification` APIs are enabled for this reason, but nothing here creates a mapping).

1. Verify ownership of the root domain (or the specific subdomain) in
   [Google Search Console](https://search.google.com/search-console), using your personal Google
   account.
2. Find the exact service account Pulumi authenticates as (e.g.
   `pulumi-cli@fact-check-database-website.iam.gserviceaccount.com`).
3. In Search Console → the verified property → **Settings → Users and permissions → Add user**,
   add that service account email with **Owner** permission (neither "Full" nor "Restricted" is
   sufficient here).
4. Manually create the Cloud Run domain mapping for each verified domain (`gcloud beta run
   domain-mappings create --service=<backend-service> --domain=<domain> --region=<region>`), or
   via the Cloud Console.

reCAPTCHA's allowed domains (`website:verifiedDomains`) are managed by this project's own Pulumi
code (`src/recaptcha.ts`) — no separate manual step is needed there.

## Resend setup

Covered in [website-emailer's runbook](../website-emailer/docs/runbook.md#setting-up-resend) —
the account, template, and Secret Manager version are the same regardless of which project's
Pulumi config ultimately points at them.

## Dev basic-auth (htpasswd)

The dev stack's Envoy/oauth2-proxy sidecar (see the [README](../README.md)) gates access behind
an htpasswd file, mounted from a Secret Manager secret version referenced by
`website:htpasswdSecretVersion`.

```bash
# Create a new htpasswd file
htpasswd -c -s ./htpasswd developer
# Add additional users to the same file
htpasswd -s ./htpasswd anotherdeveloper
```

Upload the resulting file as a new version of the `website-htpasswd-config` Secret Manager
secret, then set `website:htpasswdSecretVersion` to that version and redeploy. This value must
stay unset in prod — `src/config.ts` throws at synth time if it's ever set there.

## Algolia BigQuery connector

A one-time, per-stack manual integration between the Algolia index this project provisions and
the curated BigQuery data it's populated from. `website-algolia-integration-sa` and its custom
IAM role (see [docs/iam-model.md](./iam-model.md)) are provisioned by Pulumi; the connector
itself is configured directly in Algolia's dashboard.

1. Pulumi provisions `website-algolia-integration-sa` with exactly the BigQuery/Storage read
   permissions the connector needs.
2. Manually create a key for that service account (GCP Console → IAM → Service Accounts → Keys)
   and upload it to Algolia. Handle this key carefully: a downloaded service account key is a
   long-lived credential, and this is the one place in this project's trust model where one
   exists (see [docs/iam-model.md](./iam-model.md)).
3. Authenticate the Algolia Pulumi SDK (`sdks/algolia`) with an Algolia **admin** API key, injected
   into the dev environment via `.devcontainer` config. All stacks share one Algolia application;
   the app ID is set via `website:algoliaAppId`.
4. Indexes this project creates are prefixed with the stack name, and are what the BigQuery
   connector below writes into.
5. In the Algolia dashboard, navigate to **Connectors** → create a new **BigQuery connector**.
   Upload the service account key from step 2 (or select it if already uploaded), enter the
   project ID, dataset ID, and table ID for the curated data source, optionally specify custom
   SQL, and save.

## First deployment

Review the configuration in `projects/website-infra/Pulumi.prod.yml`. A real example:

```yml
config:
  website:project: fact-check-database-website
  website:region: us-central1
  website:coreStackName: alfredsyoung/fact-check-database-core
  website:logLevel: debug
  website:verifiedDomains:
    - factcheckdatabase.com
    - thefactcheckdatabase.com
  website:algoliaAppId: 3R16A1FPTN
  website:algoliaSearchKey: bbbba8ff55a28c1d6d013282837a1bde
  website:gaMeasurementId: G-3M9TMFJZZD
  website:resendConfirmationTemplateId: ae8e79a2-8a86-455d-a4a1-13f6597fb8b6
  website:resendApiKeySecretVersion: 1
  website:adminEmail: alfredsyoung@gmail.com
```

Run the production deployment command:

```bash
nx deploy website-infra --stack=prod
```

Ensure `website:project` in `projects/website-infra/Pulumi.dev.yml` points to the shared
development project, then run:

```bash
nx deploy website-infra --stack=dev
```

Once the initial deployment succeeds, see [docs/runbook.md](./runbook.md) for subsequent
deployments and troubleshooting.

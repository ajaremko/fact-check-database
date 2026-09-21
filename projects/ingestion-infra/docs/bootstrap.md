# Bootstrap and First Deployment

Generic Pulumi Cloud/account/tooling setup is documented once, centrally, in
[core-infra/docs/bootstrap.md](../../core-infra/docs/bootstrap.md) — this doc only covers what's
specific to `ingestion-infra`. Follow that doc first if you haven't already.

## Initial GCP project setup

Ensure that the core pulumi stack is deployed before deploying this stack.

### Create a GCP Project and Authorize Root Access

Per the dev-shared / prod-per-domain convention (see core-infra's bootstrap doc), this project
needs its own dedicated GCP project only for **prod** — dev deploys into the shared dev project
already set up for core-infra.

Create a new gcp project to host the pulumi stack, for example: `fact-check-database-ingestion`. This project will host the production ingestion stack. Link this project to an existing billing account.

Enable the cloud resource manager api via `https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-ingestion`

Add the root pulumi cli service account as a principal with the `Owner` role in the new project.

### First deployment

Review the configuration in `projects/ingestion-infra/Pulumi.prod.yml`. A sample configuration is as follows:

```yml
config:
  ingestion:project: fact-check-database-ingestion
  ingestion:region: us-central1
  ingestion:coreStackName: alfredsyoung/fact-check-database-core
  ingestion:ingestorSchedule: '0 */4 * * *'
  ingestion:extractorSchedule: '0 */12 * * *'
  ingestion:tag: dev-347
  ingestion:logLevel: info
  ingestion:logRetentionDays: 1
  ingestion:eventLogRetentionDays: 3
  ingestion:deadletterRetentionDays: 3
  ingestion:forceDestroyStorage: true
  ingestion:retainStorageOnDelete: false
```

Ensure that the `ingestion:project` points to the new gcp project and that `ingestion:coreStackName` points to the core pulumi stack.

Run the production deployment command:

```bash
nx deploy ingestion-infra --stack=prod
```

If deployment fails on the first attempt due to disabled apis, give the api changes a chance to propagate and try again. This could probably be corrected by verifying the `dependsOn` property of all pulumi resources are correct.

Ensure that the `ingestion:project` in `projects/ingestion-infra/Pulumi.dev.yml` points to the development project.

Run the development deployment command:

```bash
nx deploy ingestion-infra --stack=dev
```

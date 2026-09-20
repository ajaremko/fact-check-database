# Bootstrap and First Deployment

Generic Pulumi Cloud/account/tooling setup is documented once, centrally, in
[core-infra/docs/bootstrap.md](../../core-infra/docs/bootstrap.md) — this doc only covers what's
specific to `research-infra`. Follow that doc first if you haven't already.

## Initial GCP project setup

Ensure `analysis-infra` is deployed to the same stack before deploying this stack.

Per the dev-shared / prod-per-domain convention (see core-infra's bootstrap doc), this project
needs its own dedicated GCP project only for **prod** — dev deploys into the shared dev project
already set up for core-infra.

Create a new GCP project to host the production research stack, for example
`fact-check-database-research`. Link it to an existing billing account.

Enable the cloud resource manager API via
`https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-research`

Add the root Pulumi CLI service account as a principal with the `Owner` role in the new project.

## First deployment

Review the configuration in `projects/research-infra/Pulumi.prod.yml`. A real example:

```yml
config:
  research:project: fact-check-database-research
  research:region: us-central1
  research:analysisStackName: alfredsyoung/fact-check-database-analysis
  research:tableDeletionProtection: false
  research:retainTablesOnDelete: false
```

Run the production deployment command:

```bash
nx deploy research-infra --stack=prod
```

Ensure `research:project` in `projects/research-infra/Pulumi.dev.yml` points to the shared
development project, then run:

```bash
nx deploy research-infra --stack=dev
```

Once the initial deployment succeeds, see [docs/runbook.md](./runbook.md) for subsequent
deployments and troubleshooting.

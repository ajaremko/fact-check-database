# Bootstrap and First Deployment

Generic Pulumi Cloud/account/tooling setup is documented once, centrally, in
[core-infra/docs/bootstrap.md](../../core-infra/docs/bootstrap.md) — this doc only covers what's
specific to `analysis-infra`. Follow that doc first if you haven't already.

## Initial GCP project setup

Ensure that the core Pulumi stack is deployed before deploying this stack.

Per the dev-shared / prod-per-domain convention (see core-infra's bootstrap doc), this project
needs its own dedicated GCP project only for **prod** — dev deploys into the shared dev project
already set up for core-infra.

### Create a GCP Project and Authorize Root Access

Create a new GCP project to host the production analysis stack, for example
`fact-check-database-analysis`. Link it to an existing billing account.

Enable the cloud resource manager API via
`https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-analysis`

Add the root Pulumi CLI service account as a principal with the `Owner` role in the new project.

### First deployment

Review the configuration in `projects/analysis-infra/Pulumi.prod.yml`. A real example:

```yml
config:
  analysis:project: fact-check-database-analysis
  analysis:region: us-central1
  analysis:coreStackName: alfredsyoung/fact-check-database-core
  analysis:tableDeletionProtection: false
  analysis:retainTablesOnDelete: false
  analysis:tag: <docker-tag>
  analysis:logLevel: debug
```

Note `tableDeletionProtection: false` / `retainTablesOnDelete: false` here — see
[docs/known-issues.md](./known-issues.md) for what that means for a `pulumi destroy` against this
stack.

Run the production deployment command:

```bash
nx deploy analysis-infra --stack=prod
```

Ensure `analysis:project` in `projects/analysis-infra/Pulumi.dev.yml` points to the shared
development project, then run:

```bash
nx deploy analysis-infra --stack=dev
```

Once the initial deployment succeeds, see [docs/runbook.md](./runbook.md) for how subsequent
deployments and troubleshooting work.

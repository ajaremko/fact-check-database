# Bootstrap and First Deployment

This is the one place generic Pulumi Cloud, account, and tooling setup is documented for the
whole repository. Other infra projects' own bootstrap docs, when they need one at all, should
link back here rather than repeat these steps — see
[docs/documentation-guidelines.md](../../../docs/documentation-guidelines.md).

## Pulumi Cloud account and access token

This project's Pulumi state is stored in Pulumi Cloud (the default backend — no self-managed
backend is configured here), so a Pulumi Cloud account and access token are required before any
`pulumi`, `nx deploy`, or `nx preview` command will work.

1. Create an account at [app.pulumi.com](https://app.pulumi.com) and note the organization it
   assigns you (or create one).
2. Generate a personal access token from **Settings → Access Tokens** in the Pulumi Cloud
   console.
3. Supply the token as `PULUMI_ACCESS_TOKEN`:
   - **Locally**, set it in `.devcontainer/.env` (see
     [docs/devcontainer.md](../../../docs/devcontainer.md)) — the Pulumi CLI reads it
     automatically on every command run inside the devcontainer.
   - **In CI**, it's stored as the `PULUMI_ACCESS_TOKEN` GitHub Actions secret, read by every
     workflow that runs `pulumi stack output` or the `deploy`/`preview` Nx targets (see
     [docs/runbook.md](./runbook.md)).

Run `pulumi login` once inside the devcontainer to confirm the token is valid; the CLI caches it
in `~/.pulumi/credentials.json` for subsequent commands.

## Initial GCP project setup

### Create Core GCP Project and Root Service Account

In the GCP web console, create a new GCP project that will serve as the master project, for example: `fact-check-database-core`. This project will host the core production stack. Link this project to an existing billing account.

Enable the cloud resource manager api via `https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-core`

Enable the compute api via `https://console.cloud.google.com/apis/api/compute.googleapis.com/overview?project=fact-check-database-core`

In the core project, create a new service account for the pulumi cli to use, for example `pulumi-cli@fact-check-database-core.iam.gserviceaccount.com`. Give this service account the `Owner` IAM role to grant broad permission to modify cloud resources.

Next, generate a new JSON key for Pulumi authentication and download it to the `/.gcp` on your development machine. The configuration in `.devcontainer/docker-compose.yml` will mount this specific directory into the devcontainer environment and use it to authenticate with the `gcloud` cli on devcontainer creation.

Ensure that the JSON key is located in the correct directory. In `.devcontainer/.env`, set the `GOOGLE_APPLICATION_CREDENTIALS` value to the name of the key file. For example:

```bash
GOOGLE_APPLICATION_CREDENTIALS=fact-check-database-core-1234567890ab.json
```

### Create a Dev GCP Project and Authorize Root Access

This repository follows one rule for every domain: dev deployments all share a single GCP
project, and each domain's prod deployment gets its own dedicated GCP project. Core-infra's dev
project is that one shared project.

Next, create a dev project, for example: `fact-check-database-dev`. This project will host the core development stack as well as all other development stacks. Link this project to an existing billing account.

Enable the cloud resource manager api via `https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-dev`

Enable the compute api via `https://console.cloud.google.com/apis/api/compute.googleapis.com/overview?project=fact-check-database-dev`

Add the pulumi cli service account as a principal with the `Owner` role in the new dev project.

In `.devcontainer/.env`, ensure that the `PROJECT_ID` value is set to the name of the dev project. For example:

```bash
PROJECT_ID=fact-check-database-dev
```

The next time the dev container is created, the `gcloud` cli will be authenticated using the new root service account.

Because this platform is operated by a single person today, there is no scoped-access model for
`core-infra` — Pulumi and GCP infrastructure access is root-operator-only, using the credentials
set up above. Contributors working on non-infra projects (`ingestion-infra`'s application code,
`analysis-infra`'s pipelines, `website-infra`'s frontend, etc.) never run `nx deploy`/`nx preview`
against this project and don't need any GCP or Pulumi credentials at all. If this platform ever
needs more than one deploying identity, see [docs/known-issues.md](./known-issues.md) for the
scoping that would require.

### First deployment

Review the configuration in `projects/core-infra/Pulumi.prod.yml`. A sample configuration is as follows:

```yml
config:
  core:project: fact-check-database-core
  core:region: us-central1
  core:kmsLocation: us-central1
  core:githubOrg: ajaremko
  core:githubRepo: fact-check-database
  core:workloadIdentityPoolId: shared-identity-pool-01
  core:batchRetentionDays: 1
  core:forceDestroyStorage: true
  core:retainStorageOnDelete: false
```

Ensure that the `core:project` points to the root project.

Run the production deployment command:

```bash
nx deploy core-infra --stack=prod
```

If deployment fails on the first attempt due to disabled APIs, see
[docs/known-issues.md](./known-issues.md) for why, and why the fix is to retry rather than to
change the code.

Ensure that the `core:project` in `projects/core-infra/Pulumi.dev.yml` points to the development project.

Run the development deployment command:

```bash
nx deploy core-infra --stack=dev
```

Once the initial deployment succeeds, see [docs/runbook.md](./runbook.md) for how subsequent
deployments and troubleshooting work.

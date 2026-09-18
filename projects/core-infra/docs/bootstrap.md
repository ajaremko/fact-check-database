# Bootstrap and First Deployment

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

Next, create a dev project, for example: `fact-check-database-dev`. This project will host the core development stack as well as all other development stacks. Link this project to an existing billing account.

Enable the cloud resource manager api via `https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com?project=fact-check-database-dev`

Enable the compute api via `https://console.cloud.google.com/apis/api/compute.googleapis.com/overview?project=fact-check-database-dev`

Add the pulumi cli service account as a principal with the `Owner` role in the new dev project.

In `.devcontainer/.env`, ensure that the `GOOGLE_APPLICATION_CREDENTIALS` value is set to the name of the dev project. For example:

```bash
PROJECT_ID=fact-check-database-dev
```

The next time the dev container is created, the `gcloud` cli will be authenticated using the new root service account.

Developers who do not need root access to gcp can be given JSON keys for different service accounts with permissions to access specific cloud resources.

### First deployment

Review the configuration in `projects/core-infra/Pulumi.prod.yml`. A sample configuration is as follows:

```yml
config:
  core:project: fact-check-database-core
  core:region: us-central1
  core:kmsLocation: us-central1
  core:githubOrg: ajaremko
  core:githubRepo: news-research
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

If deployment fails on the first attempt due to disabled apis, give the api changes a chance to propagate and try again. This could probably be corrected by verifying the `dependsOn` property of all pulumi resources are correct.

Ensure that the `core:project` in `projects/core-infra/Pulumi.dev.yml` points to the development project.

Run the development deployment command:

```bash
nx deploy core-infra --stack=dev
```

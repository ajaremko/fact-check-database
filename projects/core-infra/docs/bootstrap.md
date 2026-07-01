# Bootstrap and First Deployment

## Initial GCP project setup

First create a core project that will serve as the master project, for example: `fact-check-database-core`. This project will host the core production stack.

In this project, create a new service account for the pulumi cli to use, for example `pulumi-cli@fact-check-database-core.iam.gserviceaccount.com`. Give this service account the `Owner` IAM role to grant broad permission to modify cloud resources.

Next, create a JSON key for this service account and download it.

Next, create a dev project, for example: `fact-check-database-dev`. This project will host the core development stack as.

## First deployment

Core infrastructure is deployed via `nx deploy core-infra --stack=dev|prod`.

## Shared Infrastructure

Setup:
Create a new gcp project
Link project to billing
Create a service account with json key for Pulumi CLI to use
Enable initial apis

> gcloud services enable resourcemanager.googleapis.com --project=$PROJECT_ID
> gcloud services enable compute.googleapis.com --project=$PROJECT_ID

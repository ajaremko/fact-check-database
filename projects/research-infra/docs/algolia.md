## Creating the BigQuery Algolia connector

### Algolia Intergration Service Account

- created by pulumi
- assign custom role granting exact privileges needed for integration
- manually create a key for service account and upload it to algolia
- warn about proper handling of service account key and inherent risk in creating such a key

### Authenticating Algolia Pulumi SDK

- use admin api key
- defined and injected into dev environment via .devcontainer config
- all pulumi stacks use one algolia "app"
- algolia app id configured through pulumi.yml

### Algolia fact check index

- indexes created in the algolia app are prefixed with stack name
- used as source for bigquery integration
- pulumi code creates index with required paramaters

### Create algolia bigquery connector manually

- navigate to connectors and create a new algolia bigquery connector
- upload service account key or select existing service account key for auth
- enter project id, dataset id and table id
- specify custom SQL if desired
- save connection

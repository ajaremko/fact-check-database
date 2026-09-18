# Stack Configuration

Reference for the `core` Pulumi config namespace, read by `src/config.ts`. Every key is required
unless noted, and must be set with `pulumi config set core:<key> <value> --stack=<dev|prod>` (or
directly in `Pulumi.<stack>.yml`) before the stack will deploy.

| Key                           | Description                                                                                                   | dev                       | prod                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------- |
| `core:project`                | GCP project ID this stack deploys into                                                                        | `fact-check-database-dev` | `fact-check-database-core` |
| `core:region`                 | GCP region for regional resources (the Artifact Registry, the staging bucket)                                 | `us-central1`             | `us-central1`              |
| `core:kmsLocation`            | Location of the CMEK key ring                                                                                 | `us-central1`             | `us-central1`              |
| `core:githubOrg`              | GitHub organization allowed to assume the CI/CD identity                                                      | `ajaremko`                | `ajaremko`                 |
| `core:githubRepo`             | GitHub repository allowed to assume the CI/CD identity                                                        | `news-research`           | `news-research`            |
| `core:workloadIdentityPoolId` | ID of the workload identity pool                                                                              | `shared-identity-pool-01` | `shared-identity-pool-01`  |
| `core:batchRetentionDays`     | Days before an object in the staging bucket is deleted by its lifecycle rule                                  | `1`                       | `1`                        |
| `core:forceDestroyStorage`    | Whether `pulumi destroy` may delete a non-empty staging bucket. Default `false`.                              | `true`                    | `true`                     |
| `core:retainStorageOnDelete`  | Whether the staging bucket survives `pulumi destroy` instead of being deleted with the stack. Default `true`. | `false`                   | `false`                    |

**Both stacks currently set `forceDestroyStorage: true` and `retainStorageOnDelete: false` in
production.** `src/config.ts`'s own code comments recommend the opposite for production (`false`
/ `true`) to prevent accidental data loss. As configured today, a `pulumi destroy` against the
`prod` stack would delete the staging bucket and everything in it. Worth revisiting before this
stack is ever destroyed.

Every domain project points back at this stack through its own `<domain>:coreStackName` config
key (for example `ingestion:coreStackName`) and a Pulumi `StackReference` — see the
[README](../README.md#consuming-these-outputs) for what each one reads from here.

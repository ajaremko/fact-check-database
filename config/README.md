# Ingestion configuration

The two documents that steer the ingestion pipeline, one copy for each environment.

| File                         | What it is                                | Environment |
| ---------------------------- | ----------------------------------------- | ----------- |
| `sources.local.yml`          | The feeds the ingestor fetches            | Local runs  |
| `sources.dev.yml`            | The same                                  | Dev stack   |
| `sources.prod.yml`           | The same                                  | Prod stack  |
| `sanitizer-policy.local.yml` | What the sanitizer strips from each fetch | Local runs  |
| `sanitizer-policy.dev.yml`   | The same                                  | Dev stack   |
| `sanitizer-policy.prod.yml`  | The same                                  | Prod stack  |

They are kept in one directory so the copies are easy to find and compare. The three policy files
are kept identical, and a policy's `version` must be the same in all three.

## How each file reaches its service

- **Local.** The ingestor reads the file named by `TARGET_LIST_PATH`, and the sanitizer the file
  named by `SANITIZER_POLICY_PATH`. Each service's `.env.template` points at the `local` file
  here.
- **Dev and prod.** `ingestion-infra` reads the file for its stack when it is deployed and stores
  it as a Secret Manager secret version. The ingestor job and the sanitizer service mount that
  version as a file. Editing a file here changes nothing until `ingestion-infra` is deployed.

## What this directory does not hold

- Stack settings such as schedules, image tags and alert thresholds. Those are in each infra
  project's `Pulumi.<stack>.yml`.
- Service settings such as concurrency and log level. Those are environment variables, listed in
  each service's runbook.

## Related documentation

| Document                                                                                                            | Purpose                                         |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [Ingestor runbook](../projects/ingestion-ingestor/docs/runbook.md#target-list-format)                               | The source list's format                        |
| [Policy rationale](../projects/ingestion-sanitizer/docs/policy-rationale.md)                                        | Why each policy value is what it is             |
| [Sanitizer runbook](../projects/ingestion-sanitizer/docs/runbook.md)                                                | What to check before changing the policy        |
| [ingestion-infra runbook](../projects/ingestion-infra/docs/runbook.md#updating-the-source-list-or-sanitizer-policy) | Deploying a change to dev or prod               |
| [ingestion-infra known issues](../projects/ingestion-infra/docs/known-issues.md)                                    | Nx does not treat these files as project inputs |

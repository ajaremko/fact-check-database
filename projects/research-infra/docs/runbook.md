# Infrastructure Runbook

Operational procedures for deploying `research-infra`. See the [README](../README.md) for what
this project provisions.

## Configuration

Reference for the `research` Pulumi config namespace, read by `src/config.ts`.

| Key | Description | Required | Default |
| --- | --- | --- | --- |
| `research:project` | GCP project ID this stack deploys into | Yes | — |
| `research:region` | GCP region for the BigQuery dataset | Yes | — |
| `research:analysisStackName` | The analysis-infra stack this project reads a `StackReference` from | Yes | — |
| `research:tableDeletionProtection` | Whether the marts view has Pulumi/GCP deletion protection | No | `true` — both stacks currently override to `false` |
| `research:retainTablesOnDelete` | Whether the marts view survives `pulumi destroy` | No | `true` — both stacks currently override to `false`, though see the README: this is a view, not data, so the practical risk is low |

## Commands

```bash
nx preview research-infra --stack=<dev|prod>   # review changes
nx deploy research-infra --stack=<dev|prod>    # apply them
nx refresh research-infra --stack=<dev|prod>   # reconcile state with reality
nx destroy research-infra --stack=<dev|prod>   # tear down
nx output research-infra --stack=<dev|prod>    # print stack outputs
```

## Deployment ordering

`analysis-infra` must be deployed first — this project's `StackReference` to it fails to resolve
otherwise. Nothing depends on `research-infra` deploying first; nothing else in this repo
consumes any output of this stack.

## Diagnosing failures

### The view fails to deploy or query

**Symptom:** `pulumi up` fails, or querying `research_marts.fact_checks` errors.
**Cause:** the view's `SELECT` references specific columns on `analysis-infra`'s curated
fact-checks table by name. If that table's schema changes incompatibly (a referenced column
renamed or removed), the view definition breaks.
**Resolution:** update the column list in `src/marts/bigquery.ts` to match the current curated
schema, then redeploy — `pulumi up` recreates the view definition; there's no data migration
involved.

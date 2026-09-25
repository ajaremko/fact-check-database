# research-infra

Infrastructure for research access to the platform's fact-check data: a single BigQuery view over [analysis-infra](../analysis-infra/README.md)'s curated fact-checks table. Provisioned via Pulumi.

## Deployment

```bash
nx preview research-infra --stack=<dev|prod>   # Preview changes
nx deploy research-infra --stack=<dev|prod>    # Apply changes
```

`analysis-infra` must already be deployed to the same stack before this project can deploy. See [docs/bootstrap.md](./docs/bootstrap.md) for initial setup and [docs/runbook.md](./docs/runbook.md) for subsequent deployments.

## What this project provisions

### GCP service enablement

| Service                | API                                   | Purpose                             |
| ---------------------- | ------------------------------------- | ----------------------------------- |
| Compute Engine         | `compute.googleapis.com`              | Required before enabling other APIs |
| Cloud Resource Manager | `cloudresourcemanager.googleapis.com` | Project-level IAM and metadata      |

Nothing else is enabled — there's no storage, messaging, or compute here beyond a BigQuery
dataset and view.

### Marts dataset

BigQuery dataset `research_marts`, holding one object: `fact_checks` — a **view**, not a table.
Its query selects a fixed subset of columns (`fact_check_id`, `source_name`, `collection`,
`raw_published_at`, `published_at`, `title`, `summary`, `language`, `canonical_url`) from
`analysis-infra`'s curated fact-checks table, filtered to rows with a non-null `title`.

Because it's a view rather than a table, `pulumi destroy` followed by `pulumi up` simply
recreates the query definition — there's no data of its own to lose.

| Output                                      | Purpose                       |
| ------------------------------------------- | ----------------------------- |
| `martsDatasetId` / `martsFactChecksTableId` | Identify the dataset and view |

### Access

This project defines no service accounts or IAM bindings of its own. BigQuery view access to the
underlying curated table isn't managed here: a principal querying this view also needs its own
read access to `analysis-infra`'s curated dataset — ordinary BigQuery behavior in the absence of
an authorized-view configuration, which this project doesn't set up.

## Related documentation

| Document                                 | Purpose                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [docs/bootstrap.md](./docs/bootstrap.md) | Project-specific setup delta beyond core-infra's central bootstrap doc |
| [docs/runbook.md](./docs/runbook.md)     | Stack configuration, deployment, and troubleshooting                   |

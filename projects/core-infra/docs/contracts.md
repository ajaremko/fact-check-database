# Stack Output Contract

`core-infra` is depended on by every other infrastructure project in this repository through a
Pulumi `StackReference`, not a compile-time import — no project's `package.json` lists
`@news-research/core-infra` as a dependency. The stack outputs defined in `src/index.ts` are the
entire interface between this project and everything downstream. Treat them as a stable
contract: renaming an output, changing what it means, or replacing the resource it identifies
with a new one is a breaking change for every consumer listed below.

## How outputs are consumed

Every downstream Pulumi project opens a `StackReference` in its own `config.ts`:

```ts
const coreStackRef = new pulumi.StackReference(`${coreStackName}/${stackName}`)
export const stagingStorageBucketName = coreStackRef.getOutput(
  'stagingStorageBucketName'
)
```

GitHub Actions workflows read outputs directly through the Pulumi CLI instead of a
`StackReference`:

```bash
cd projects/core-infra
pulumi stack output --json --stack=<dev|prod>
```

## Outputs

| Output                                                                               | Type     | Consumed by                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gcpProject`                                                                         | `string` | `ingestion-infra`, `analysis-infra`, `website-infra` (as `coreProject`) — used to build a second provider scoped to this project, for IAM bindings each grants against core's own resources                   |
| `gcpRegion`                                                                          | `string` | `ingestion-infra`, `analysis-infra`, `website-infra` (as `coreRegion`)                                                                                                                                        |
| `stagingStorageBucketName`                                                           | `string` | `ingestion-infra` (grants its extractor write access), `analysis-infra` and `website-infra` (their loaders read the objects written here)                                                                     |
| `stagingStorageTopicName`                                                            | `string` | `analysis-infra` and `website-infra` — each creates its own Pub/Sub subscription directly on this topic, from its own project                                                                                 |
| `artifactRegistryLocation` / `artifactRegistryName` / `artifactRegistryRepositoryId` | `string` | `ingestion-infra`, `analysis-infra`, `website-infra` — each also grants its own Cloud Run service agent `roles/artifactregistry.reader` on this registry, applied from its own project against core's         |
| `artifactRegistryUri` / `artifactRegistryBaseUri`                                    | `string` | None outside this project currently                                                                                                                                                                           |
| `gcsArchiveKeyId` / `gcsArchiveKeyName`                                              | `string` | `ingestion-infra` only — `gcsArchiveKeyId` encrypts its raw archive bucket                                                                                                                                    |
| `bigQueryKeyId` / `bigQueryKeyName`                                                  | `string` | None currently — see [docs/encryption.md](./encryption.md)                                                                                                                                                    |
| `factChecksTableDBSchemaObjectUri`                                                   | `string` | None currently. The schema object it points to _is_ read at run time by `analysis-infra`'s loader, but via the `schemaObjectId` Pub/Sub message attribute set in `staging-storage/topic.ts`, not this output. |
| `stagingStorageUploadNoficationId`                                                   | `string` | None currently — informational only                                                                                                                                                                           |
| `githubActionServiceAccountEmail`                                                    | `string` | `.github/workflows/ci.yml`, `deploy.yml`, `release.yml`                                                                                                                                                       |
| `githubActionIdentityPoolProviderName`                                               | `string` | `.github/workflows/ci.yml`, `deploy.yml`, `release.yml`                                                                                                                                                       |

`research-infra` has no dependency on core-infra at all: it opens a `StackReference` to
`analysis-infra` only, and reads a single output (`curatedTableRef`) from there.

## Stability expectations

- **Breaking:** renaming an output, changing its meaning, or pointing it at a different resource.
- **Non-breaking:** adding a new output, or documenting an existing one more precisely.

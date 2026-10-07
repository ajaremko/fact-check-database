# Known Issues

## No replay path for dead-lettered or expired records

**Error:** No error. Recovery is manual.

**Where:** The dead-letter buckets written by `src/shared/createDeadletteredSubscription.ts`, and the extractor's pull subscription (`src/extractor/subscription.ts`), which is the only buffer between the sanitizer and the extractor.

**Root cause:** A replay job existed and was removed. Since then nothing reads the dead-letter buckets. A sanitizer record that the extractor does not take within the subscription's 7-day retention is dropped by Pub/Sub. The record is still in the archive, but nothing re-drives it.

**Decision:** Won't fix for now. Recovering a record means re-publishing its notification by hand.

**If this ever needs to be fixed:** Add a job that lists archive records under a `source`/`date` prefix and publishes a notification for each to the sanitizer or extractor topic. It needs the decode direction of `ArchivePath` (see [ingestion-contracts' known issues](../../ingestion-contracts/docs/known-issues.md)).

## Nx does not count the config files as part of this project

**Error:** No error. A change to a file in `config/` does not mark this project, or any other, as affected.

**Where:** `config/`, read by `src/assets/secrets.ts`.

**Root cause:** Nx assigns a file to the project whose directory holds it. The source lists and sanitizer policies sit at the repository root, outside every project, and nothing declares them as an input of this one. So `nx affected` skips this project when only a config file changed.

**Decision:** Accept it. Nothing in the current flow depends on it. This project has no tests. Stacks are deployed by hand. The daily preview runs every stack whatever changed. Image publishing has never depended on these files.

**If this ever needs to be fixed:** It starts to matter once a step runs only for affected projects and has to react to a config change: an affected-only preview or deploy, or a spec that validates the config files. Declare the directory as an input of this project (a named input in `nx.json` covering `{workspaceRoot}/config/**`, added to this project's targets), or run that step for this project unconditionally.

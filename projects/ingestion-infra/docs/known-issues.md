# Known Issues

## No replay path for dead-lettered or expired records

**Error:** No error. Recovery is manual.

**Where:** The dead-letter buckets written by `src/shared/createDeadletteredSubscription.ts`, and the extractor's pull subscription (`src/extractor/subscription.ts`), which is the only buffer between the sanitizer and the extractor.

**Root cause:** A replay job existed and was removed. Since then nothing reads the dead-letter buckets. A sanitizer record that the extractor does not take within the subscription's 7-day retention is dropped by Pub/Sub. The record is still in the archive, but nothing re-drives it.

**Decision:** Won't fix for now. Recovering a record means re-publishing its notification by hand.

**If this ever needs to be fixed:** Add a job that lists archive records under a `source`/`date` prefix and publishes a notification for each to the sanitizer or extractor topic. It needs the decode direction of `ArchivePath` (see [ingestion-contracts' known issues](../../ingestion-contracts/docs/known-issues.md)).

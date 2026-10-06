# Known Issues

## No replay path for dead-lettered or expired records

**Error:** No error. Recovery is manual.

**Where:** The dead-letter buckets written by `src/shared/createDeadletteredSubscription.ts`, and the extractor's pull subscription (`src/extractor/subscription.ts`), which is the only buffer between the sanitizer and the extractor.

**Root cause:** A replay job existed and was removed. Since then nothing reads the dead-letter buckets. A sanitizer record that the extractor does not take within the subscription's 7-day retention is dropped by Pub/Sub. The record is still in the archive, but nothing re-drives it.

**Decision:** Won't fix for now. Recovering a record means re-publishing its notification by hand.

**If this ever needs to be fixed:** Add a job that lists archive records under a `source`/`date` prefix and publishes a notification for each to the sanitizer or extractor topic. It needs the decode direction of `ArchivePath` (see [ingestion-contracts' known issues](../../ingestion-contracts/docs/known-issues.md)).

## Dead-letter archive subscriptions expire after 31 idle days

**Error:** No error. Dead-lettered messages are dropped once the subscription is gone.

**Where:** The archive subscription that `src/shared/createDeadletteredSubscription.ts` creates for the sanitizer's and the extractor's dead-letter topics.

**Root cause:** A dead-letter topic keeps nothing itself. Its archive subscription copies each message into the dead-letter bucket. That subscription sets no `expirationPolicy`, so it gets Pub/Sub's default: a subscription with no activity for 31 days is deleted. A healthy pipeline dead-letters nothing, so the subscription expires exactly when things are going well, and the next dead-lettered message is forwarded to a topic with no subscriber. Seen in dev on 2026-10-06: four of five dead-letter topics had no archive subscription, and 867 messages dead-lettered by the analysis loader on 2026-10-01 were not archived. Prod's subscriptions exist and carry the same 31-day setting. Pulumi's state still lists a deleted subscription until the next `pulumi refresh`.

**Decision:** Not yet addressed. The alert on dead-lettered messages still fires, but it may be the only record of the message.

**If this ever needs to be fixed:** Set `expirationPolicy: { ttl: '' }` on the archive subscription in `createDeadletteredSubscription`, so it never expires. Then run `pulumi refresh` and deploy, so any subscription that has already expired is recreated.

# Known Issues

## No alerting on pipeline failures

**Error:** No error. Failures are silent.

**Where:** The whole stack. It provisions a dashboard (`src/dashboard/`) and no `gcp.monitoring.AlertPolicy`.

**Root cause:** Monitoring was built as a dashboard to look at, not as alerts that reach someone. A failed job, a growing extractor backlog or a message arriving in a dead-letter bucket is visible only to someone who opens the dashboard, and prod logs are kept for one day.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Add alert policies for: the age of the oldest unacknowledged message on the extractor subscription, any message published to a dead-letter topic, and a failed ingestor or extractor job execution. Route them to a notification channel set in stack config.

## No replay path for dead-lettered or expired records

**Error:** No error. Recovery is manual.

**Where:** The dead-letter buckets written by `src/shared/createDeadletteredSubscription.ts`, and the extractor's pull subscription (`src/extractor/subscription.ts`), which is the only buffer between the sanitizer and the extractor.

**Root cause:** A replay job existed and was removed. Since then nothing reads the dead-letter buckets. A sanitizer record that the extractor does not take within the subscription's 7-day retention is dropped by Pub/Sub. The record is still in the archive, but nothing re-drives it.

**Decision:** Won't fix for now. Recovering a record means re-publishing its notification by hand.

**If this ever needs to be fixed:** Add a job that lists archive records under a `source`/`date` prefix and publishes a notification for each to the sanitizer or extractor topic. It needs the decode direction of `ArchivePath` (see [ingestion-contracts' known issues](../../ingestion-contracts/docs/known-issues.md)).

## The sanitizer service has no instance limits

**Error:** No error at current volume.

**Where:** The Cloud Run service in `src/sanitizer/service.ts`, which sets no scaling block.

**Root cause:** The sanitizer handles one message at a time per instance and its push subscription has a 60-second ack deadline. A burst of notifications, one per source after each ingestor run, relies on Cloud Run's default autoscaling to add instances. No minimum or maximum is set either way.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Set a maximum instance count to cap cost, and check that the count times the per-message time clears a full ingestor run's notifications within the ack deadline.

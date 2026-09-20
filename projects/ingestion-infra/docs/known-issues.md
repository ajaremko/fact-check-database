# Known Issues

## The raw archive bucket ignores the storage-safety config flags

**Error:** No error yet. As configured, `pulumi destroy` against this stack would delete the
permanent raw/sanitized record archive, with no config-level way to prevent it.
**Where:** `src/archive/raw/storage.ts` hardcodes `forceDestroy: true` and `retainOnDelete: true`
on `ingestion-archive-bucket`, regardless of the `ingestion:forceDestroyStorage`/
`retainStorageOnDelete` config values that correctly govern every other bucket in this project.
**Root cause:** Unknown — this looks like an oversight rather than a deliberate choice, since the
other three buckets (event log, deadletter, assets) all read these two config values correctly.
**Decision:** Leave as-is for now. Documented here so the risk is visible before anyone runs
`pulumi destroy` against a stack holding real archived data, rather than discovered by doing it.
**If this ever needs to be fixed:** Change `archive/raw/storage.ts` to read
`forceDestroyStorage`/`retainStorageOnDelete` from config, the same way the other three buckets
do.

## Two required config keys do nothing

**Error:** No error — `ingestion:archiveLocation` and `ingestion:batchRetentionDays` are both
`require()`d in `src/config.ts` (a deploy fails without them being set), but neither is read
anywhere else in `src/`.
**Where:** `src/config.ts`. The raw archive bucket's actual location comes from `gcpRegion`, not
`archiveLocation`; nothing implements a batch-retention policy that would use
`batchRetentionDays`.
**Root cause:** Likely leftover from an earlier design where these were wired up, or written
ahead of the code that was meant to consume them.
**Decision:** Leave as-is. Removing a required config key changes this stack's deployment
contract and isn't a change to make as part of a documentation pass.
**If this ever needs to be fixed:** Either wire `archiveLocation` into the raw archive bucket's
`location` (if regional independence from `gcpRegion` is actually wanted) and implement whatever
`batchRetentionDays` was meant to govern, or remove both keys from `config.ts` and the two
`Pulumi.<stack>.yml` files together.

## The event log bucket's retention rule silently excludes ingestor events

**Error:** No error — ingestor event logs accumulate indefinitely regardless of
`eventLogRetentionDays`, while sanitizer and extractor event logs are correctly pruned.
**Where:** `src/archive/events/storage.ts`'s lifecycle delete rule matches
`matchesPrefixes: ['sanitizer-events/', 'extractor-events/']` — `ingestor-events/` (written by
`createArchivedTopic` for the ingestor topic) isn't included.
**Root cause:** Likely an oversight when the extractor and sanitizer's archived topics were added
after the ingestor's.
**Decision:** Leave as-is. Adding a prefix to a lifecycle rule changes real bucket behavior on the
next deploy and deserves its own review, not a bundled docs fix.
**If this ever needs to be fixed:** Add `'ingestor-events/'` to the rule's `matchesPrefixes` in
`src/archive/events/storage.ts`.

## Production configuration contradicts the config's own documented intent

**Error:** No error — a state-of-configuration fact worth someone's deliberate attention.
**Where:** `Pulumi.prod.yml`: `ingestorSchedule`/`extractorSchedule` are both commented out
(the pipeline currently requires manual triggering in prod), and `deadletterSoftDeleteDays` is
unset even though a code comment in `config.ts` recommends setting it in production.
**Root cause:** Unknown — may be intentional during initial rollout, or simply not yet revisited.
**Decision:** Documenting the current state rather than changing production stack configuration
as part of a documentation pass.
**If this ever needs to be fixed:** Set real cron schedules and a `deadletterSoftDeleteDays` value
in `Pulumi.prod.yml` once the production pipeline is meant to run unattended.

## The System Logs dashboard panel is broken in both stacks

**Error:** The panel renders empty or against the wrong project's logs.
**Where:** `src/dashboard/system-logs.ts` hardcodes
`resourceNames: ['projects/news-research-dev/locations/global/logScopes/_Default']` instead of
interpolating the actual `gcpProject` — which matches neither `fact-check-database-dev` nor
`fact-check-database-ingestion`.
**Root cause:** Likely copied from an example or an earlier project-naming scheme and never
parameterized.
**Decision:** Leave as-is for now — low severity (one dashboard panel), but a real, easy fix.
**If this ever needs to be fixed:** Interpolate `gcpProject` into the `resourceNames` array
instead of the hardcoded project id.

## Two GCS objects are provisioned and exported but never read

**Error:** No error — dead infrastructure.
**Where:** `src/assets/storage.ts` uploads `ingestion-sources.csv` and `sanitizer-policy.yml` to
the assets bucket and exports their object names (`ingestionSourcesObjectName`,
`sanitizerPolicyObjectName`), but no service reads either object. The ingestor and sanitizer
actually read their config from the per-stack Secret Manager secrets in `src/assets/secrets.ts`
instead (see the README's "Updating the source list or sanitizer policy").
**Root cause:** Likely an earlier design (config served from the assets bucket directly) that was
superseded by the Secret Manager approach without removing the original objects.
**Decision:** Leave as-is. Removing provisioned resources is an infra change, not a docs fix.
**If this ever needs to be fixed:** Confirm nothing external depends on these two objects, then
remove `ingestionSourcesObject`/`sanitizerPolicyObject` and their outputs from
`src/assets/storage.ts`.

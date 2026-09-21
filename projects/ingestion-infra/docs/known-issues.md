# Known Issues

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

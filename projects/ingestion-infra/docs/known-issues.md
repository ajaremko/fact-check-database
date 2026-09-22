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

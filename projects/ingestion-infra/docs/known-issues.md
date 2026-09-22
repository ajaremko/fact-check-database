# Known Issues

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

# TODO

The working backlog for remaining development on this project: the repository's own open roadmap
items, plus one actionable line per open entry in every project's `docs/known-issues.md`. Each
`known-issues.md` stays in place as the permanent record of _why_ something wasn't fixed — this
list is a curated, prunable checklist distilled from those entries' fixes, meant to guide what
gets done next. Check an item off (`[x]`) once it's done; delete an item outright if it turns out
to be a won't-fix.

## Repository-wide

- [x] De-duplicate `ingestion-infra`, `analysis-infra`, `research-infra`, `website-infra` READMEs
      — currently identical boilerplate, none document the stack's actual resources
- [x] Rewrite `website-infra/docs/algolia.md` and `docs-to-write.md` into finished docs
- [ ] Sort the website's fact-checks feed via Algolia queries instead of local sort
- [ ] Verify fact checks are deduped correctly across ingestion and analysis
- [ ] Implement the bot-transparency policy in
      [docs/roadmap-bot-transparency.md](./roadmap-bot-transparency.md) (`robots.txt` honoring,
      per-host crawl delay, a real publisher opt-out channel)

## Core

### core-infra

See [known-issues.md](../projects/core-infra/docs/known-issues.md).

- [ ] Set `core:forceDestroyStorage: false` and `core:retainStorageOnDelete: true` in
      `Pulumi.prod.yml` before any planned prod destroy
- [ ] Audit `dependsOn` edges in `src/` against the API-enablement resources in `src/services.ts`,
      to stop first-deploy failures on freshly enabled APIs
- [ ] Scope down the CI/CD identity's IAM roles (replace `roles/editor`; scope
      `roles/cloudkms.admin` to the `core-key-ring` key ring) once more than one team deploys
      through it

### core-io

See [known-issues.md](../projects/core-io/docs/known-issues.md).

- [ ] Add `.spec.ts` coverage for the 12 untested adapters under `src/adapters/` (only
      `HttpServerMessageQueueFeeder` has coverage today)

## Ingestion

### ingestion-infra

See [known-issues.md](../projects/ingestion-infra/docs/known-issues.md).

- [x] Change `archive/raw/storage.ts` to read `forceDestroyStorage`/`retainStorageOnDelete` from
      config, like the other three buckets, instead of hardcoding `forceDestroy`/`retainOnDelete`
- [x] Remove the unused required config keys `ingestion:archiveLocation` and
      `ingestion:batchRetentionDays`, or wire them up
- [ ] Add `'ingestor-events/'` to the event log bucket's lifecycle-delete `matchesPrefixes` (only
      sanitizer/extractor events are currently pruned)
- [ ] Set real cron schedules (`ingestorSchedule`/`extractorSchedule`) and a
      `deadletterSoftDeleteDays` value in `Pulumi.prod.yml` once the pipeline should run unattended
- [ ] Interpolate `gcpProject` into the System Logs dashboard panel's `resourceNames` instead of
      the hardcoded dev project id
- [ ] Remove the unused `ingestion-sources.csv`/`sanitizer-policy.yml` GCS objects and their
      outputs from `src/assets/storage.ts` (config is actually served from Secret Manager)

### ingestion-ingestor

See [known-issues.md](../projects/ingestion-ingestor/docs/known-issues.md).

- [x] Change `decodeContext` in `ingestFromSource.ts` to decode via `Schema.decodeUnknown` inside
      the `Effect.gen` body instead of `Schema.decodeUnknownSync` outside it, so a bad target
      fails like every other typed error
- [x] Change `logIngestionFailed` to log at `Effect.logWarning`/`logError` instead of `info`, so
      failures are distinguishable from successes by level

### ingestion-sanitizer

See [known-issues.md](../projects/ingestion-sanitizer/docs/known-issues.md).

- [ ] Implement `stripQueryParams`/`dropHeaders`/`rewriteBody` policy handling in
      `evaluatePolicy.ts`/`sanitizeObservation.ts` — the policy schema declares them but nothing
      reads them yet

### ingestion-extractor

See [known-issues.md](../projects/ingestion-extractor/docs/known-issues.md).

- [x] Resolve the commented-out publish path in `main.ts`/`app/index.ts` — finish it or remove the
      dead code

## Analysis

### analysis-infra

See [known-issues.md](../projects/analysis-infra/docs/known-issues.md).

- [ ] Set `analysis:tableDeletionProtection: true` and `analysis:retainTablesOnDelete: true` in
      `Pulumi.prod.yml` (or remove the overrides) before any planned prod destroy
- [x] Remove the unused required config key `analysis:deployingServiceAccountEmail`, or finish the
      commented-out feature in `subscription.ts` that was meant to use it
- [x] Wire the translation models bucket into the translator service, or remove the bucket and its
      IAM grant — resolved by removing the whole translation capability (moved to a separate
      project); see [analysis-infra's README](../projects/analysis-infra/README.md)
- [x] Remove the unnecessary `cloudRunArtifactRegistryReader` dependency from the translation
      service (it uses a public Docker Hub image, not the shared registry) — moot, the service is
      gone
- [ ] Consider defining the curated fact-check table's schema as a shared `core-contracts` schema
      instead of hand-duplicating it, if the shape stabilizes

### analysis-loader

See [known-issues.md](../projects/analysis-loader/docs/known-issues.md).

- [x] Add `Effect.catchTags` for `StorageReadError`/`ParseError` in the route handler, alongside
      the existing `BigQueryClientIOError` handling
- [x] Remove `STAGING_BUCKET_NAME` from `analysis-infra`'s loader service env list — it's never
      read

## Website

### website-emailer

See [known-issues.md](../projects/website-emailer/docs/known-issues.md).

- [x] Rename the `/submissions`/`/confirmations` routes (and their Pulumi subscription push
      endpoints in `website-infra`) to match what each actually sends
- [x] Fix the hardcoded Resend template variables (`PRODUCT`/`PRICE`) in the confirmation email
      once the real template's variable names are known
- [x] Add `Effect.catchTag('ParseError', ...)` alongside the existing `EmailerError` handling in
      the route handlers

### website-infra

See [known-issues.md](../projects/website-infra/docs/known-issues.md).

- [x] Wire `forceDestroyStorage`/`retainStorageOnDelete`/`deadletterRetentionDays`/
      `deadletterSoftDeleteDays` into `backendBucket`/`deadletterBucket` — both currently
      hardcode `forceDestroy: true` with no `retainOnDelete`, regardless of stack
- [x] Either implement domain-verification automation using `verifiedOwnerEmail`/
      `secondaryDomains`, or remove those two plus the unused `siteVerificationService`
      enablement

### website-loader

See [known-issues.md](../projects/website-loader/docs/known-issues.md).

- [x] Add `Effect.catchTags` for `StorageReadError`/`ParseError` in the route handler, alongside
      the existing `AlgoliaSearchClientIOError` handling
- [x] Remove `STAGING_BUCKET_NAME` from `website-infra`'s search loader service env list — it's
      never read
- [x] Add `.spec.ts` coverage for `transcodeBatch`

### website-server

See [known-issues.md](../projects/website-server/docs/known-issues.md).

- [x] Fully remove rate limiting for the three form actions (`ioredis`/`rate-limiter-flexible`
      dependencies and `REDIS_HOST`/`REDIS_PORT`/`MAX_REQUESTS_PER_SEC` env vars are already
      provisioned)
- [x] Wire `NEXT_PUBLIC_GA_MEASUREMENT_ID` into `src/lib/analytics/index.tsx` instead of the
      hardcoded measurement ID
- [x] Convert `recaptcha-verify.ts` to Effect logging instead of `console.log`/`console.debug`
- [x] Add `NEXT_PUBLIC_BUILD_NUMBER` to `release.yml`'s "Build and release Docker images" step,
      matching `ci.yml` — the prod footer almost certainly renders "Build #undefined" today
      (found while resolving the GA measurement ID item; see
      [known-issues.md](../projects/website-server/docs/known-issues.md))

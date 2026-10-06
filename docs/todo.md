# TODO

The working backlog for remaining development on this project: the repository's own open roadmap
items, plus one actionable line per open entry in every project's `docs/known-issues.md`. Each
`known-issues.md` stays in place as the permanent record of _why_ something wasn't fixed — this
list is a curated, prunable checklist distilled from those entries' fixes, meant to guide what
gets done next. Check an item off (`[x]`) once it's done; delete an item outright if it turns out
to be a won't-fix.

## Repository-wide

1. [x] De-duplicate `ingestion-infra`, `analysis-infra`, `research-infra`, `website-infra` READMEs
       — currently identical boilerplate, none document the stack's actual resources
2. [x] Rewrite `website-infra/docs/algolia.md` and `docs-to-write.md` into finished docs
3. [ ] Sort the website's fact-checks feed via Algolia queries instead of local sort
4. [x] Verify fact checks are deduped correctly across ingestion and analysis
5. [x] Decide the staging dedup strategy — one row per fact check per fetch attempt (current), per
       distinct feed body, or per content version; see [fact-check-lifecycle.md](./fact-check-lifecycle.md). Only
       `stagingDedupKey` in `ingestion-extractor` changes
6. [x] Fix the extractor's throughput backlog — each run pulls a single 100-message batch twice a
       day against ~360 sanitized records/day, so the backlog grows ~160/day and messages older
       than the subscription's 7-day retention expire unextracted (silent data loss). Loop pulls
       until the subscription is drained and/or run more often
7. [ ] Implement the bot-transparency policy in
       [docs/roadmap-bot-transparency.md](./roadmap-bot-transparency.md) (`robots.txt` honoring,
       per-host crawl delay, a real publisher opt-out channel)
8. [ ] Run lint, test and typecheck on pull requests — CI runs only on pushes to `main`
9. [ ] Install a Vitest coverage provider and report coverage
10. [ ] Add an end-to-end test that runs the three ingestion stages together, based on
        `scripts/run-pipeline.sh`
11. [ ] Add tests for the five Pulumi programs
12. [ ] Add tests that run against GCP emulators or a scratch project
13. [ ] Drop the `patches/abort-controller` patch, or re-validate it on each GCS SDK or Node upgrade
14. [ ] Add a deletion and takedown path: remove a fact check from the curated table and the search
        index, and purge a source from the archive
15. [ ] Match the same claim across sources — two organizations' checks of one claim are two rows
16. [ ] Restore a verdict or rating field on fact checks

## Core

### core-infra

See [known-issues.md](../projects/core-infra/docs/known-issues.md).

17. [x] Set `core:forceDestroyStorage: false` and `core:retainStorageOnDelete: true` in
        `Pulumi.prod.yml` before any planned prod destroy
18. [x] Audit `dependsOn` edges in `src/` against the API-enablement resources in `src/services.ts`,
        to stop first-deploy failures on freshly enabled APIs
19. [ ] Scope down the CI/CD identity's IAM roles (replace `roles/editor`; scope
        `roles/cloudkms.admin` to the `core-key-ring` key ring) once more than one team deploys
        through it
20. [ ] Narrow the workload identity provider's condition to the deploy workflows and the `main`
        branch — it admits any workflow in the repository
21. [ ] Raise `core:batchRetentionDays` above 1 in `Pulumi.prod.yml`, so a loader outage doesn't
        outlive the batch file it needs
22. [ ] Stop every staging load depending on one mutable schema object in the staging bucket (build
        the schema into the loader, or version the object and alert on a failed read)
23. [ ] Write a recovery procedure for the archive encryption key in the runbook

### core-contracts

See [known-issues.md](../projects/core-contracts/docs/known-issues.md).

24. [ ] Add a spec that fails when the staging table's BigQuery column list and its row schema
        disagree, or generate one from the other

### core-io

See [known-issues.md](../projects/core-io/docs/known-issues.md).

25. [ ] Add `.spec.ts` coverage for the 13 untested adapters under `src/adapters/` (only
        `HttpServerMessageQueueFeeder` and `CloudPubsubMessageBatch` have coverage today)

## Ingestion

### ingestion-contracts

See [known-issues.md](../projects/ingestion-contracts/docs/known-issues.md).

26. [ ] Implement the decode direction of `ArchivePathSchema`, so a replay or audit tool can parse
        an archive path back into its source, date and `ingestor_run_id`

### ingestion-infra

See [known-issues.md](../projects/ingestion-infra/docs/known-issues.md).

27. [x] Give AFP its own source id in `sources.prod.csv` — it shares `factcheck` with factcheck.org,
        so the two feeds write the same fetch record and salt `fact_check_id` with the same id
28. [x] Promote the prod source list to the full list and remove the `baddata` test row
29. [x] Raise `ingestion:logLevel`, `logRetentionDays` and `eventLogRetentionDays` in
        `Pulumi.prod.yml` — prod runs at `trace` with 1-day log retention
30. [x] Set `ingestion:forceDestroyStorage: false` and `ingestion:retainStorageOnDelete: true` in
        `Pulumi.prod.yml`
31. [ ] Add alert policies for extractor backlog age, dead-letter arrivals and failed job executions
32. [ ] Add a lifecycle rule that moves raw archive objects to a colder storage class
33. [ ] Set instance limits on the sanitizer service
34. [x] Change `archive/raw/storage.ts` to read `forceDestroyStorage`/`retainStorageOnDelete` from
        config, like the other three buckets, instead of hardcoding `forceDestroy`/`retainOnDelete`
35. [x] Remove the unused required config keys `ingestion:archiveLocation` and
        `ingestion:batchRetentionDays`, or wire them up
36. [x] Add `'ingestor-events/'` to the event log bucket's lifecycle-delete `matchesPrefixes` (only
        sanitizer/extractor events are currently pruned)
37. [x] Set real cron schedules (`ingestorSchedule`/`extractorSchedule`) and a
        `deadletterSoftDeleteDays` value in `Pulumi.prod.yml` once the pipeline should run unattended
38. [x] Interpolate `gcpProject` into the System Logs dashboard panel's `resourceNames` instead of
        the hardcoded dev project id
39. [x] Remove the unused `ingestion-sources.csv`/`sanitizer-policy.yml` GCS objects and their
        outputs from `src/assets/storage.ts` (config is actually served from Secret Manager)

### ingestion-ingestor

See [known-issues.md](../projects/ingestion-ingestor/docs/known-issues.md).

40. [ ] Send conditional requests (`If-None-Match`/`If-Modified-Since` from the last observation's
        `etag`/`lastModified`) so unchanged feeds aren't re-fetched and re-archived every run
41. [ ] Ask Africa Check and AFP to allow the crawler's User-Agent: both return `403` on every run
42. [ ] Reject a source list that contains duplicate ids
43. [ ] Add a per-request fetch timeout, read from config
44. [ ] Remove `source_name` from metric labels — the time-series count multiplies with the source
        list
45. [ ] Remove the unused `CloudStorageSourceList` adapter, or use it — every stack sets
        `SOURCE_LIST_MODE=filesystem`

46. [x] Change `decodeContext` in `ingestFromSource.ts` to decode via `Schema.decodeUnknown` inside
        the `Effect.gen` body instead of `Schema.decodeUnknownSync` outside it, so a bad target
        fails like every other typed error
47. [x] Change `logIngestionFailed` to log at `Effect.logWarning`/`logError` instead of `info`, so
        failures are distinguishable from successes by level

### ingestion-sanitizer

See [known-issues.md](../projects/ingestion-sanitizer/docs/known-issues.md).

48. [x] Implement `stripQueryParams`/`dropHeaders`/`rewriteBody` policy handling in
        `evaluatePolicy.ts`/`sanitizeObservation.ts` — the policy schema declares them but nothing
        reads them yet
49. [ ] Strip scripts and tracking markup from the HTML inside feed items (`rewriteBody` only
        strips query parameters from URLs today)
50. [x] Record the policy `version` on sanitizer records and staging rows — a policy change can
        change `fact_check_id`, and nothing says which policy produced a record
51. [ ] Remove or implement the four `SanitizationAction` values that are never emitted and the
        `api`/`html` policy rules, and declare the action literal once
52. [ ] Remove the unused `CloudStorageSanitizerPolicyDocument` adapter — every stack sets
        `SANITIZER_POLICY_MODE=filesystem`

### ingestion-extractor

See [known-issues.md](../projects/ingestion-extractor/docs/known-issues.md).

53. [ ] Decode numeric XML entities in extracted URLs — a link written as
        `?p=4720&#038;post_type=fact-check` in a feed is stored with the literal `&#038;` instead of
        `&`

54. [x] Resolve the commented-out publish path in `main.ts`/`app/index.ts` — finish it or remove the
        dead code

## Analysis

### analysis-infra

See [known-issues.md](../projects/analysis-infra/docs/known-issues.md).

55. [ ] Deduplicate curated rows written before the 2026-09 fact-check identity change (in-place
        rewrite; staging no longer holds their source rows)
56. [ ] Test the curated MERGE — move the SQL out of the Pulumi program into a module a test can run
57. [ ] Define the curated columns once and build the table schema and the MERGE's column lists
        from that definition
58. [ ] Cluster the curated table on `fact_check_id`, so a MERGE run stops scanning the whole table
59. [ ] Encrypt the staging and curated datasets with `bigQueryKey`, or remove the unused key
60. [ ] Add alert policies for failed transfer runs and loader dead-letters

61. [x] Set `analysis:tableDeletionProtection: true` and `analysis:retainTablesOnDelete: true` in
        `Pulumi.prod.yml` (or remove the overrides) before any planned prod destroy
62. [x] Remove the unused required config key `analysis:deployingServiceAccountEmail`, or finish the
        commented-out feature in `subscription.ts` that was meant to use it
63. [x] Wire the translation models bucket into the translator service, or remove the bucket and its
        IAM grant — resolved by removing the whole translation capability (moved to a separate
        project); see [analysis-infra's README](../projects/analysis-infra/README.md)
64. [x] Remove the unnecessary `cloudRunArtifactRegistryReader` dependency from the translation
        service (it uses a public Docker Hub image, not the shared registry) — moot, the service is
        gone

### analysis-loader

See [known-issues.md](../projects/analysis-loader/docs/known-issues.md).

65. [x] Remove `autodetect: true` from load jobs, or record why it sits beside an explicit schema
66. [x] Add `Effect.catchTags` for `StorageReadError`/`ParseError` in the route handler, alongside
        the existing `BigQueryClientIOError` handling
67. [x] Remove `STAGING_BUCKET_NAME` from `analysis-infra`'s loader service env list — it's never
        read

## Research

### research-infra

See [known-issues.md](../projects/research-infra/docs/known-issues.md).

68. [ ] Connect approved access requests to IAM grants on the marts dataset (a list of grants with
        approver and expiry in stack config)

## Website

### website-contracts

See [known-issues.md](../projects/website-contracts/docs/known-issues.md).

69. [ ] Fix the swapped types of `published_at_raw` and `published_at_normalized` in
        `SearchResultSchema`, rank the search index on the normalized date, and reindex
70. [ ] Add spec coverage for the search and form-submission schemas

### website-emailer

See [known-issues.md](../projects/website-emailer/docs/known-issues.md).

71. [ ] Add spec coverage for `accessFormSubmission` and each `Emailer` adapter
72. [x] Rename the `/submissions`/`/confirmations` routes (and their Pulumi subscription push
        endpoints in `website-infra`) to match what each actually sends
73. [x] Fix the hardcoded Resend template variables (`PRODUCT`/`PRICE`) in the confirmation email
        once the real template's variable names are known
74. [x] Add `Effect.catchTag('ParseError', ...)` alongside the existing `EmailerError` handling in
        the route handlers

### website-infra

See [known-issues.md](../projects/website-infra/docs/known-issues.md).

75. [ ] Pin third-party images by digest and replace the `bitnamilegacy/oauth2-proxy` image
76. [ ] Delete the commented-out resources at the end of `src/emailer/subscription.ts`
77. [x] Wire `forceDestroyStorage`/`retainStorageOnDelete`/`deadletterRetentionDays`/
        `deadletterSoftDeleteDays` into `backendBucket`/`deadletterBucket` — both currently
        hardcode `forceDestroy: true` with no `retainOnDelete`, regardless of stack
78. [x] Either implement domain-verification automation using `verifiedOwnerEmail`/
        `secondaryDomains`, or remove those two plus the unused `siteVerificationService`
        enablement

### website-loader

See [known-issues.md](../projects/website-loader/docs/known-issues.md).

79. [ ] Rebuild the Algolia index from the curated table to remove records keyed by the pre-2026-09
        content-hash `objectID`
80. [ ] Remove search records for fact checks that are withdrawn or no longer seen — nothing prunes
        the index
81. [x] Add `Effect.catchTags` for `StorageReadError`/`ParseError` in the route handler, alongside
        the existing `AlgoliaSearchClientIOError` handling
82. [x] Remove `STAGING_BUCKET_NAME` from `website-infra`'s search loader service env list — it's
        never read
83. [x] Add `.spec.ts` coverage for `transcodeBatch`

### website-server

See [known-issues.md](../projects/website-server/docs/known-issues.md).

84. [ ] Add tests, starting with the three form actions
85. [x] Fully remove rate limiting for the three form actions (`ioredis`/`rate-limiter-flexible`
        dependencies and `REDIS_HOST`/`REDIS_PORT`/`MAX_REQUESTS_PER_SEC` env vars are already
        provisioned)
86. [x] Wire `NEXT_PUBLIC_GA_MEASUREMENT_ID` into `src/lib/analytics/index.tsx` instead of the
        hardcoded measurement ID
87. [x] Convert `recaptcha-verify.ts` to Effect logging instead of `console.log`/`console.debug`
88. [x] Add `NEXT_PUBLIC_BUILD_NUMBER` to `release.yml`'s "Build and release Docker images" step,
        matching `ci.yml` — the prod footer almost certainly renders "Build #undefined" today
        (found while resolving the GA measurement ID item; see
        [known-issues.md](../projects/website-server/docs/known-issues.md))

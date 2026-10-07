# TODO

The working backlog for remaining development on this project: the repository's own open roadmap
items, plus one actionable line per open entry in every project's `docs/known-issues.md`. Each
`known-issues.md` stays in place as the permanent record of _why_ something wasn't fixed — this
list is a curated, prunable checklist distilled from those entries' fixes, meant to guide what
gets done next. Check an item off (`[x]`) once it's done; delete an item outright if it turns out
to be a won't-fix.

## Repository-wide

1. [ ] Sort the website's fact-checks feed via Algolia queries instead of local sort
2. [ ] Implement the bot-transparency policy in
       [docs/roadmap-bot-transparency.md](./roadmap-bot-transparency.md) (`robots.txt` honoring,
       per-host crawl delay, a real publisher opt-out channel)
3. [x] Run lint, test and typecheck on pull requests — CI runs only on pushes to `main`
4. [ ] Install a Vitest coverage provider and report coverage
5. [ ] Add an end-to-end test that runs the three ingestion stages together, based on
       `scripts/run-pipeline.sh`
6. [ ] Add a deletion and takedown path: remove a fact check from the curated table and the search
       index, and purge a source from the archive
7. [ ] Match the same claim across sources — two organizations' checks of one claim are two rows
8. [x] Centralize the ingestor and sanitizer config within `config`. Each config file can have a `.local.yml`, `.dev.yml` or `.prod.yml` extension to differentiate. Paths to the old config files need to be updated
9. [x] `assets/targets.csv` and the `@nxlv/python` Nx plugin remain after the code that used them left. Remove these as well
10. [x] Mixed Node versions exist across devcontainer, workflows and dockerfiles. Set everything to Node 22.
11. [x] Protect `main` and `prod`: require a pull request and the `pr.yml` checks, and block
        direct pushes. Until then [docs/git-strategy.md](./git-strategy.md) is a convention
12. [ ] Make `Pull Request Into prod Comes From main or hotfix` a required status check in the
        `prod` ruleset. GitHub offers a check only after it has run, so this follows the first
        promotion pull request

## Core

### core-infra

See [known-issues.md](../projects/core-infra/docs/known-issues.md).

13. [x] Scope down the CI/CD identity's IAM roles (replace `roles/editor`; scope
        `roles/cloudkms.admin` to the `core-key-ring` key ring) once more than one team deploys
        through it
14. [x] Narrow the workload identity provider's condition to the deploy workflows and the `main`
        branch — it admits any workflow in the repository
15. [ ] Stop every staging load depending on one mutable schema object in the staging bucket (build
        the schema into the loader, or version the object and alert on a failed read)
16. [ ] Write a recovery procedure for the archive encryption key in the runbook

### core-contracts

See [known-issues.md](../projects/core-contracts/docs/known-issues.md).

17. [ ] Add a spec that fails when the staging table's BigQuery column list and its row schema
        disagree, or generate one from the other

## Ingestion

### ingestion-contracts

See [known-issues.md](../projects/ingestion-contracts/docs/known-issues.md).

18. [ ] Implement the decode direction of `ArchivePathSchema`, so a replay or audit tool can parse
        an archive path back into its source, date and `ingestor_run_id`

### ingestion-infra

See [known-issues.md](../projects/ingestion-infra/docs/known-issues.md).

19. [x] Add alert policies for extractor backlog age, dead-letter arrivals and failed job executions
20. [x] Set instance limits on the sanitizer service

### ingestion-ingestor

See [known-issues.md](../projects/ingestion-ingestor/docs/known-issues.md).

21. [ ] Send conditional requests (`If-None-Match`/`If-Modified-Since` from the last observation's
        `etag`/`lastModified`) so unchanged feeds aren't re-fetched and re-archived every run
22. [x] Reject a source list that contains duplicate ids
23. [x] Add a per-request fetch timeout, read from config
24. [x] Remove `source_name` from the ingestor's and the sanitizer's metric labels — the time-series
        count multiplies with the source list. Kept on the extractor's metric, which the dashboard's
        "Fact Checks Extracted by Source" panel groups by
25. [ ] The ingestor builds a Pub/Sub publisher layer that nothing uses. Remove it

### ingestion-sanitizer

See [known-issues.md](../projects/ingestion-sanitizer/docs/known-issues.md).

26. [ ] Strip scripts and tracking markup from the HTML inside feed items (`rewriteBody` only
        strips query parameters from URLs today)
27. [ ] Remove or implement the four `SanitizationAction` values that are never emitted and the
        `api`/`html` policy rules, and declare the action literal once

### ingestion-extractor

See [known-issues.md](../projects/ingestion-extractor/docs/known-issues.md).

28. [ ] Decode numeric XML entities in extracted URLs — a link written as
        `?p=4720&#038;post_type=fact-check` in a feed is stored with the literal `&#038;` instead of
        `&`

## Analysis

### analysis-infra

See [known-issues.md](../projects/analysis-infra/docs/known-issues.md).

29. [ ] Test the curated MERGE — move the SQL out of the Pulumi program into a module a test can run
30. [ ] Define the curated columns once and build the table schema and the MERGE's column lists
        from that definition
31. [x] Encrypt the staging and curated datasets with `bigQueryKey`, or remove the unused key
32. [x] Add alert policies for failed transfer runs and loader dead-letters

## Research

### research-infra

See [known-issues.md](../projects/research-infra/docs/known-issues.md).

33. [ ] Connect approved access requests to IAM grants on the marts dataset (a list of grants with
        approver and expiry in stack config)

## Website

### website-infra

See [known-issues.md](../projects/website-infra/docs/known-issues.md).

34. [x] Remove rate-limiting from the production website. It does little to protect the site and can cause a bad UX.
35. [x] Grant the search loader's service account `roles/monitoring.metricWriter` — its metric
        exports are denied, so none of its metrics are recorded

### website-contracts

See [known-issues.md](../projects/website-contracts/docs/known-issues.md).

36. [x] Fix the swapped types of `published_at_raw` and `published_at_normalized` in
        `SearchResultSchema`, rank the search index on the normalized date, and reindex
37. [ ] Add spec coverage for the search and form-submission schemas

### website-emailer

See [known-issues.md](../projects/website-emailer/docs/known-issues.md).

38. [ ] Add spec coverage for `accessFormSubmission` and each `Emailer` adapter

### website-loader

See [known-issues.md](../projects/website-loader/docs/known-issues.md).

39. [ ] Remove search records for fact checks that are withdrawn or no longer seen — nothing prunes
        the index
40. [ ] Keep one oversized record from failing a whole search batch: bound the size of a record
        in `transcodeBatch`, or skip and log a record the search provider would reject

### website-server

See [known-issues.md](../projects/website-server/docs/known-issues.md).

41. [ ] Add tests, starting with the three form actions

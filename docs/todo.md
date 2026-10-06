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
3. [ ] Run lint, test and typecheck on pull requests — CI runs only on pushes to `main`
4. [ ] Install a Vitest coverage provider and report coverage
5. [ ] Add an end-to-end test that runs the three ingestion stages together, based on
       `scripts/run-pipeline.sh`
6. [ ] Add a deletion and takedown path: remove a fact check from the curated table and the search
       index, and purge a source from the archive
7. [ ] Match the same claim across sources — two organizations' checks of one claim are two rows

## Core

### core-infra

See [known-issues.md](../projects/core-infra/docs/known-issues.md).

8. [ ] Scope down the CI/CD identity's IAM roles (replace `roles/editor`; scope
       `roles/cloudkms.admin` to the `core-key-ring` key ring) once more than one team deploys
       through it
9. [ ] Narrow the workload identity provider's condition to the deploy workflows and the `main`
       branch — it admits any workflow in the repository
10. [ ] Stop every staging load depending on one mutable schema object in the staging bucket (build
        the schema into the loader, or version the object and alert on a failed read)
11. [ ] Write a recovery procedure for the archive encryption key in the runbook

### core-contracts

See [known-issues.md](../projects/core-contracts/docs/known-issues.md).

12. [ ] Add a spec that fails when the staging table's BigQuery column list and its row schema
        disagree, or generate one from the other

## Ingestion

### ingestion-contracts

See [known-issues.md](../projects/ingestion-contracts/docs/known-issues.md).

13. [ ] Implement the decode direction of `ArchivePathSchema`, so a replay or audit tool can parse
        an archive path back into its source, date and `ingestor_run_id`

### ingestion-infra

See [known-issues.md](../projects/ingestion-infra/docs/known-issues.md).

14. [ ] Add alert policies for extractor backlog age, dead-letter arrivals and failed job executions
15. [ ] Set instance limits on the sanitizer service

### ingestion-ingestor

See [known-issues.md](../projects/ingestion-ingestor/docs/known-issues.md).

16. [ ] Send conditional requests (`If-None-Match`/`If-Modified-Since` from the last observation's
        `etag`/`lastModified`) so unchanged feeds aren't re-fetched and re-archived every run
17. [ ] Reject a source list that contains duplicate ids
18. [ ] Add a per-request fetch timeout, read from config
19. [ ] Remove `source_name` from metric labels — the time-series count multiplies with the source
        list

### ingestion-sanitizer

See [known-issues.md](../projects/ingestion-sanitizer/docs/known-issues.md).

20. [ ] Strip scripts and tracking markup from the HTML inside feed items (`rewriteBody` only
        strips query parameters from URLs today)
21. [ ] Remove or implement the four `SanitizationAction` values that are never emitted and the
        `api`/`html` policy rules, and declare the action literal once

### ingestion-extractor

See [known-issues.md](../projects/ingestion-extractor/docs/known-issues.md).

22. [ ] Decode numeric XML entities in extracted URLs — a link written as
        `?p=4720&#038;post_type=fact-check` in a feed is stored with the literal `&#038;` instead of
        `&`

## Analysis

### analysis-infra

See [known-issues.md](../projects/analysis-infra/docs/known-issues.md).

23. [ ] Test the curated MERGE — move the SQL out of the Pulumi program into a module a test can run
24. [ ] Define the curated columns once and build the table schema and the MERGE's column lists
        from that definition
25. [ ] Cluster the curated table on `fact_check_id`, so a MERGE run stops scanning the whole table
26. [ ] Encrypt the staging and curated datasets with `bigQueryKey`, or remove the unused key
27. [ ] Add alert policies for failed transfer runs and loader dead-letters

## Research

### research-infra

See [known-issues.md](../projects/research-infra/docs/known-issues.md).

28. [ ] Connect approved access requests to IAM grants on the marts dataset (a list of grants with
        approver and expiry in stack config)

## Website

### website-contracts

See [known-issues.md](../projects/website-contracts/docs/known-issues.md).

29. [ ] Fix the swapped types of `published_at_raw` and `published_at_normalized` in
        `SearchResultSchema`, rank the search index on the normalized date, and reindex
30. [ ] Add spec coverage for the search and form-submission schemas

### website-emailer

See [known-issues.md](../projects/website-emailer/docs/known-issues.md).

31. [ ] Add spec coverage for `accessFormSubmission` and each `Emailer` adapter

### website-loader

See [known-issues.md](../projects/website-loader/docs/known-issues.md).

32. [ ] Remove search records for fact checks that are withdrawn or no longer seen — nothing prunes
        the index

### website-server

See [known-issues.md](../projects/website-server/docs/known-issues.md).

33. [ ] Add tests, starting with the three form actions

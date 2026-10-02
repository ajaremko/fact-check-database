# Fact-check lifecycle

This document follows a fact check from the moment a publisher's feed is fetched to the moment it
becomes a row in the curated research dataset. It covers three things: what each stage does, how
the fact check is identified at every step, and how duplicates are removed.

It is the single reference for these topics. Project READMEs, runbooks and contracts link here
instead of redefining them.

**In scope:** the path from HTTP fetch to staging, the curated table, the search index and the
research marts view, plus every identifier and deduplication rule along the way.

**Out of scope:**

- What the sanitizer's content policy allows. See the
  [sanitizer runbook](../projects/ingestion-sanitizer/docs/runbook.md).
- Who can read each dataset. See each infra project's `docs/iam-model.md`.
- Judging, ranking or moderating fact checks. The platform only collects and organizes them.

## Lifecycle at a glance

```
 Publisher RSS/Atom feed
        │  HTTP GET, every 4h (Cloud Scheduler)
        ▼
 ┌──────────────┐   raw body + fetch record      ┌──────────────────────┐
 │   Ingestor   │ ─────────────────────────────► │  Ingestion archive   │
 │ (Cloud Run   │                                │  (GCS, CMEK)         │
 │  job)        │                                └──────────┬───────────┘
 └──────────────┘                                           │ object notification → Pub/Sub push
                                                            ▼
                                                 ┌──────────────────────┐
                                                 │      Sanitizer       │  policy label,
                                                 │  (Cloud Run service) │  sanitizer record
                                                 └──────────┬───────────┘
                                                            │ object notification → Pub/Sub pull
                                                            ▼
                               every 12h, up to  ┌──────────────────────┐
                               100 records/run   │      Extractor       │  parses feed items,
                                                 │   (Cloud Run job)    │  assigns fact_check_id
                                                 └──────────┬───────────┘
                                                            │ NDJSON batch → staging bucket
                                        ┌───────────────────┴───────────────────┐
                                        │ object notification → Pub/Sub push    │
                                        ▼                                       ▼
                              ┌──────────────────┐                   ┌──────────────────┐
                              │ Analysis loader  │                   │  Website loader  │
                              └────────┬─────────┘                   └────────┬─────────┘
                                       ▼                                      ▼
                              BigQuery staging.fact_checks            Algolia search index
                              (append-only, 7-day retention)          (one record per fact check)
                                       │ scheduled MERGE, every 6h
                                       ▼
                              BigQuery curated.fact_checks
                              (one row per fact check)
                                       │
                                       ▼
                              research marts view
```

## Stages

Every hand-off between stages goes through Pub/Sub, which delivers each message **at least
once**. A stage can therefore see the same input twice. Each stage below states how it copes.
Unless noted, a message that fails 5 times goes to a dead-letter topic and is archived for
inspection.

### 1. Fetch (ingestor)

- **Trigger:** Cloud Scheduler, `0 */4 * * *` in dev and prod.
- **Does:** fetches every source in the source list once. It archives the response body and a
  record of the attempt. A failed fetch writes only the record.
- **Writes:**
  - `v1/raw/source={source.id}/date={day}/ingestor_run_id={id}/{content_sha256}.bin`
  - `v1/records/ingestion/source={source.id}/date={day}/ingestor_run_id={id}/fetch_attempt.yml`
- **Mints:** `ingestor_run_id` (one per run) and `content_sha256` (one per response body).
- **Duplicates:** the ingestor keeps no state. It fetches and archives an unchanged feed again on
  every run. This is deliberate: each fetch is evidence of what the feed said at that time. The
  cost is storage, tracked as an
  [ingestor known issue](../projects/ingestion-ingestor/docs/known-issues.md).

### 2. Sanitize (sanitizer)

- **Trigger:** a Pub/Sub push for each new fetch record.
- **Does:** applies the content policy and labels the record `SAFE_PUBLIC`, `RESTRICTED` or
  `QUARANTINED`.
- **Writes:**
  `v1/records/sanitizer/source={source.id}/date={day}/ingestor_run_id={id}/fetch_attempt.yml`
- **Mints:** nothing. It copies the fetch record's identifiers.
- **Duplicates:** the push subscription's ack deadline is 60 seconds, well above the sanitizer's
  slowest requests during an ingestor burst, so a message isn't redelivered while it is still
  being processed. When one is redelivered anyway, the output path is fixed for each fetch
  attempt, so it overwrites the same object instead of creating a second one. The overwrite still sends a new
  notification to the extractor. If that lands in a later extractor run, staging gets a repeat
  row, which the curated MERGE absorbs.

### 3. Extract (extractor)

- **Trigger:** Cloud Scheduler, `0 */12 * * *`. Each run pulls up to 1,000 sanitizer records, the
  most one Pub/Sub pull returns. A run must take in more records than arrive between runs, or the
  backlog grows until records reach the subscription's 7-day retention and are deleted unread.
- **Does:** parses each `SAFE_PUBLIC` feed into fact checks, assigns each a `fact_check_id`, and
  writes one batch file per run.
- **Writes:** `v1/type=fact_checks/date={day}/{extractor_run_id}.batch.ndjson` in the core staging
  bucket. Full article bodies are deliberately not stored or republished: a row keeps the feed's
  own `summary` and a 500-character plain-text preview of the article for research queries.
- **Mints:** `extractor_run_id`, `fact_check_id` and `fact_check.sha256`.
- **Duplicates:**
  - The subscription's ack deadline is 600 seconds. The extractor only acknowledges after its
    batch is written, so the deadline must cover the whole run. A shorter one would make Pub/Sub
    redeliver records still in progress to the next run.
  - Before writing, the extractor drops rows that repeat the staging dedup key (see
    [Dedup rules by layer](#dedup-rules-by-layer)).

### 4. Load (analysis loader and website loader)

Both loaders react to the same batch-file notification, independently of each other.

- **Analysis loader** starts a BigQuery load job that appends the batch to `staging.fact_checks`.
  - The job id is derived from the batch object's name and generation. If a redelivered
    notification tries to load the same batch again, BigQuery rejects the duplicate job id and
    the loader waits for the existing job instead.
  - The push ack deadline is 300 seconds, long enough for a normal load to finish first.
- **Website loader** transcodes each row into a search record with `objectID = fact_check_id` and
  upserts it into Algolia.
  - An upsert overwrites any record with the same `objectID`. Redelivery is therefore harmless,
    and this push subscription keeps the default ack deadline.

### 5. Curate (scheduled MERGE)

- **Trigger:** a BigQuery Data Transfer Service scheduled query, every 6 hours.
- **Does:** merges the last 7 days of staging into `curated.fact_checks`. The result is one row
  per `fact_check_id`, holding its most recently fetched version.
- **Duplicates:** see [Dedup rules by layer](#dedup-rules-by-layer). The MERGE is idempotent. Its
  7-day window matches staging's retention, so a skipped run is caught up by the next one.

### 6. Research access

`research-infra`'s marts view exposes a fixed subset of curated columns, including
`fact_check_id`, for rows with a title. It adds no rows or identifiers of its own.

## Identity

### Identity concepts

Each concept has one name, used alike in code, archived records, storage paths and BigQuery
columns.

| Concept            | Key                                                          | Defined as                                                                                                                                                                                      | Stable?                                                        |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Source             | `source.id`                                                  | The `id` column of the ingestion source list. One source is one feed                                                                                                                            | Yes (config)                                                   |
| Ingestor run       | `ingestor_run_id`                                            | A UUID generated when an ingestor job run starts                                                                                                                                                | No, new per run                                                |
| Fetch attempt      | `(source.id, ingestor_run_id)`                               | A run fetches each source once, so the pair identifies one fetch. There is no separate id                                                                                                       | n/a                                                            |
| Fetched content    | `content_sha256`                                             | SHA-256 of the response body bytes                                                                                                                                                              | Yes, identical bytes give an identical hash                    |
| Extractor run      | `extractor_run_id`                                           | A UUID generated when an extractor job run starts. It names the batch file the run writes                                                                                                       | No, new per run                                                |
| Fact check         | `fact_check_id`                                              | SHA-256 of `source.id` + `\|` + the article URL. The article URL is the first non-null of `canonical_url`, `link`, `guid`. An item with none of those falls back to the feed URL + `\|` + title | Yes, across fetches and across edits to title, summary or body |
| Fact check version | `fact_check.sha256` (staging), `fact_check_sha256` (curated) | SHA-256 of the item's raw feed fields                                                                                                                                                           | No, changes whenever any field is edited                       |

### Why these definitions

- **No fetch or observation id.** A run fetches each source once, so `source.id` and
  `ingestor_run_id` already identify a fetch. `content_sha256` already identifies the fetched
  bytes. A third hash would only duplicate them.
- **The title is not part of `fact_check_id`.** Publishers edit headlines. If the title were
  part of the id, every edit would create a new fact check. The article URL stays the same
  through edits.
- **`fact_check_id` is computed once.** The extractor's `factCheckId` function
  ([factCheckId.ts](../projects/ingestion-extractor/src/integration/factCheckId.ts)) is the only
  place that computes it. Staging stores it, and the curated MERGE and the search index read the
  stored value. They can't disagree, because neither recomputes it.
- **Identity and version are kept apart.** `fact_check_id` says which fact check a row is about.
  `fact_check.sha256` says which version of its content the row holds. Deduplication uses the
  first. Change detection uses the second.

### Where each identifier appears

| Stage           | Output                                                                                      | Identifiers                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Ingestor        | `v1/raw/source={source.id}/date={day}/ingestor_run_id={id}/{content_sha256}.bin`            | `source.id`, `ingestor_run_id`, `content_sha256`                                                                      |
| Ingestor        | `v1/records/ingestion/source={source.id}/date={day}/ingestor_run_id={id}/fetch_attempt.yml` | `ingestor_run_id` and `content.sha256` inside the record                                                              |
| Sanitizer       | `v1/records/sanitizer/source={source.id}/date={day}/ingestor_run_id={id}/fetch_attempt.yml` | The fetch record's identifiers, unchanged                                                                             |
| Extractor       | `v1/type=fact_checks/date={day}/{extractor_run_id}.batch.ndjson`                            | Every row: `fact_check_id`, `fact_check.sha256`, `content_sha256`, `source.id`, `ingestor_run_id`, `extractor_run_id` |
| Analysis loader | `staging.fact_checks`                                                                       | The row's identifiers. The load job id is derived from the batch object's name and generation                         |
| Curated MERGE   | `curated.fact_checks`                                                                       | `fact_check_id`, `fact_check_sha256`, `content_sha256`                                                                |
| Website loader  | Algolia search index                                                                        | `objectID` = `fact_check_id`                                                                                          |

## Deduplication

### Where duplicates come from

| Source of duplication                                          | Example                                          | Absorbed by                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| A feed lists the same article in many fetches                  | An article stays in a feed for a week            | Curated MERGE (one row per `fact_check_id`)                                                                            |
| An unchanged feed is fetched again                             | No new articles between two runs                 | Curated MERGE. The re-fetch is kept in staging as an observation                                                       |
| A publisher edits an article                                   | A corrected headline                             | Curated MERGE updates the row in place                                                                                 |
| Pub/Sub redelivers a sanitizer record to the extractor         | A run outlasts the ack deadline                  | 600s ack deadline makes this rare. Within one run, the staging dedup key drops it. Across runs, the curated MERGE does |
| The sanitizer retries and rewrites its record                  | A transient storage error                        | The same as a redelivery to the extractor                                                                              |
| A feed lists the same article twice in one fetch               | A duplicated `<item>`                            | The extractor's staging dedup key                                                                                      |
| Pub/Sub redelivers a batch notification to the analysis loader | The push response arrives after the ack deadline | Deterministic load job id                                                                                              |
| Pub/Sub redelivers a batch notification to the website loader  | As above                                         | Algolia upsert by `objectID`                                                                                           |

### Dedup rules by layer

| Layer         | Rule                                                                                                                       | Enforced by                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Staging batch | One row per `(source.id, ingestor_run_id, fact_check_id)`: one row per fact check per fetch attempt                        | `stagingDedupKey` in the extractor                      |
| Staging load  | Each batch object version is loaded at most once                                                                           | Deterministic BigQuery load job id in `analysis-loader` |
| Curated       | One row per `fact_check_id`. A newer fetch (by `fetched_at`) with a different `fact_check_sha256` updates the row in place | Scheduled `MERGE` in `analysis-infra`                   |
| Search index  | One record per `fact_check_id`, holding the most recently _loaded_ version                                                 | Algolia upsert by `objectID`                            |

Staging is an **observation log**. A fact check seen by five fetches has five staging rows. They
record when and where it was seen, and the curated table collapses them into one. The extractor
drops rows that repeat within the same fetch attempt, because those are delivery artifacts, not
observations. It can only see its own batch. A repeat that arrives in a later extractor run stays
in staging, and the curated MERGE removes it like any other repeat.

In the curated table, the newest fetch wins. The MERGE first keeps the latest staging row per
`fact_check_id`, ordered by `fetched_at`. It inserts that row if the fact check is new. If the
fact check already exists, it updates the row only when the version differs and the fetch is
newer. An older fetch processed late, for example from an extractor backlog, never overwrites a
newer version. As a result, a curated row's `extracted_at` is when its current version was
extracted, not when the fact check was first seen.

## Timing

A fact check published just after an ingestor run can take up to:

| Step                         | Worst case                                     |
| ---------------------------- | ---------------------------------------------- |
| Until the next fetch         | 4 hours                                        |
| Until the next extractor run | 12 hours, longer if the extractor is behind    |
| Until the next curated MERGE | 6 hours                                        |
| **Fetch to curated row**     | **about 22 hours**, plus any extractor backlog |

The search index updates as soon as a batch is written, so it skips the MERGE step.

The extractor currently processes fewer records per day than the ingestor produces. Its backlog
grows, and records older than the subscription's 7-day retention expire unextracted. This is
tracked in [todo.md](./todo.md).

## Guarantees and limits

**Guaranteed:**

- The curated table and the search index hold at most one entry per `fact_check_id`, for entries
  written under the current scheme.
- Editing a fact check's title, summary or body never creates a second curated row or search
  record.
- No batch file is loaded into staging twice.
- Within one extractor batch, no two rows share a staging dedup key.

**Not guaranteed:**

- The search index holds the most recently loaded version of a fact check, which is not always
  the most recently fetched one. A backlogged batch of older fetches overwrites newer records
  until a later batch arrives. The curated table has no such gap, because its MERGE compares
  `fetched_at`.
- Staging can hold a repeat row for the same fetch attempt when a record is redelivered across
  extractor runs. The curated table and search index are unaffected.

- The same article from two sources, or under two different URLs, is two fact checks.
- A fact check removed from its feed stays in the curated table and the search index. Nothing
  deletes it.
- Records archived, curated or indexed before this scheme was introduced (2026-09) keep their
  earlier identifiers and are not rewritten. See the known issues for
  [ingestion-contracts](../projects/ingestion-contracts/docs/known-issues.md),
  [analysis-infra](../projects/analysis-infra/docs/known-issues.md) and
  [website-loader](../projects/website-loader/docs/known-issues.md).

## Changing the rules

- **Staging dedup strategy.** Staging could instead keep one row per fact check per distinct feed
  body (`content_sha256` in place of `ingestor_run_id`), or one row per content version
  (`fact_check.sha256`). Either change touches only `stagingDedupKey`
  ([dedupeFactCheckRows.ts](../projects/ingestion-extractor/src/integration/dedupeFactCheckRows.ts)),
  with no schema change. The choice is tracked in [todo.md](./todo.md).
- **`fact_check_id` definition.** Changing it gives every existing fact check a new id. The
  curated table and search index would then hold each fact check twice until they were migrated.
  The `factCheckId` spec pins an id computed by BigQuery, so an accidental change fails the tests.

## Related documentation

| Document                                                               | Covers                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| [ingestion-ingestor](../projects/ingestion-ingestor/README.md)         | Fetching and archiving                            |
| [ingestion-sanitizer](../projects/ingestion-sanitizer/README.md)       | Content policy and labels                         |
| [ingestion-extractor](../projects/ingestion-extractor/README.md)       | Feed parsing and the staging batch format         |
| [ingestion-contracts](../projects/ingestion-contracts/README.md)       | Archive record schemas and paths                  |
| [core-contracts](../projects/core-contracts/README.md)                 | The staging row schema                            |
| [analysis-loader](../projects/analysis-loader/README.md)               | Loading batches into BigQuery staging             |
| [analysis-infra](../projects/analysis-infra/README.md#curated-dataset) | The staging and curated tables and the MERGE      |
| [website-loader](../projects/website-loader/README.md)                 | Loading batches into the search index             |
| [ingestion-infra](../projects/ingestion-infra/README.md)               | Schedules, topics and subscriptions for ingestion |

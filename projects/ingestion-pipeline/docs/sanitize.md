# Sanitize Stage

[One paragraph: purpose of this document. Covers the sanitize stage in detail — how policy documents are structured, how the sanitizer evaluates each observation, what access labels and audit actions mean, and what the resulting `SanitizerRecord` contains.]

---

## Purpose

[Explain why the sanitize stage exists in the pipeline. Even though the platform handles primarily public data:]

- [incidental PII may appear in response bodies]
- [unexpected content types or oversized payloads may indicate misconfiguration or upstream issues]
- [access classification decisions need to be auditable and reproducible]

[The sanitize stage applies a versioned policy document to each ingested observation and records the outcome — including which rules fired, what label was assigned, and any errors — without modifying or discarding the original archived content.]

---

## Policy Document

[Describe `SanitizerPolicy` (`src/sanitize/SanitizerPolicy.ts`) — the versioned configuration document consumed by `sanitizeObservation`:]

### Top-level fields

| Field              | Type                            | Description                                                                                                                        |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `version`          | `number`                        | Policy document version. Increment when making breaking changes to collection rules or override semantics.                         |
| `stripQueryParams` | `string[]`                      | Query parameter names to remove from URLs before recording. Applied to `source.url` in the sanitized record.                       |
| `dropHeaders`      | `string[]`                      | Response header names to omit from the sanitized record. Use to prevent storing tokens, cookies, or other sensitive header values. |
| `collections`      | `CollectionRule[]`              | Per-collection rules. At minimum one rule per collection type expected in the source configuration.                                |
| `overrides`        | `SourceOverride[]` _(optional)_ | Per-source exceptions that override collection-level rules by `sourceName`.                                                        |

### Collection rules (`CollectionRule`)

[A `CollectionRule` defines the policy applied to all sources whose `collection` matches:]

| Field                          | Type                                                 | Description                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `collection`                   | `string`                                             | Collection type this rule applies to (e.g. `'rss'`, `'atom'`, `'default'`)                                                                      |
| `maxBytes`                     | `number`                                             | Maximum permitted raw body size in bytes. Bodies exceeding this are quarantined.                                                                |
| `defaultLabel`                 | `PolicyLabel`                                        | Access label assigned when the observation passes all gates: `'SAFE_PUBLIC'` or `'RESTRICTED'`                                                  |
| `allowedContentTypeSubstrings` | `string[]` _(optional)_                              | If non-empty, the response `Content-Type` must contain at least one of these substrings (case-insensitive). Empty list allows any content type. |
| `onMissingContentType`         | `'ALLOW' \| 'RESTRICT' \| 'QUARANTINE'` _(optional)_ | Behaviour when `Content-Type` header is absent. Defaults to `'RESTRICT'`.                                                                       |
| `rewriteBody`                  | `boolean` _(optional)_                               | If `true`, the sanitizer should rewrite body bytes before archiving (reserved for future use).                                                  |

### Source overrides (`SourceOverride`)

[A `SourceOverride` allows exceptions for a specific named source, merged over the matching collection rule:]

| Field                          | Type                       | Description                                  |
| ------------------------------ | -------------------------- | -------------------------------------------- |
| `sourceName`                   | `string`                   | Exact `source.name` value to match           |
| `maxBytes`                     | `number` _(optional)_      | Override `maxBytes` from the collection rule |
| `defaultLabel`                 | `PolicyLabel` _(optional)_ | Override `defaultLabel`                      |
| `allowedContentTypeSubstrings` | `string[]` _(optional)_    | Override the content-type allowlist          |
| `rewriteBody`                  | `boolean` _(optional)_     | Override `rewriteBody`                       |

### Rule resolution

[Describe `pickRule` (`src/sanitize/evaluatePolicy.ts`) — how the policy document is resolved to a single effective rule for a given observation:]

1. Match a `CollectionRule` by `source.collection`
2. If no match, fall back to a rule with `collection: 'default'` if present
3. If still no match, use a conservative built-in default (`RESTRICTED`, 1 MB limit)
4. If a `SourceOverride` exists for `source.name`, merge its fields over the resolved collection rule

---

## Policy Evaluation

[Describe `evaluatePolicy(policy, observation)` (`src/sanitize/evaluatePolicy.ts`) — a pure function with no effects:]

Gates are evaluated in order. The first gate that fails terminates evaluation and assigns a `QUARANTINED` label.

### Gate 1: Fetch failure

- Condition: observation has no raw content (ingest recorded `outcome: 'no_response'`)
- Action: `QUARANTINED_FETCH_FAILED`
- Result: `label: 'QUARANTINED'`

### Gate 2: Size

- Condition: `raw.content.bytes > rule.maxBytes`
- Action: `QUARANTINED_TOO_LARGE`
- Result: `label: 'QUARANTINED'`, error message with actual and limit byte counts

### Gate 3: Content-type

- Condition: content-type is absent and `onMissingContentType === 'QUARANTINE'`, or content-type is present but not matched by `allowedContentTypeSubstrings`
- Action: `QUARANTINED_UNEXPECTED_CONTENT_TYPE`
- Result: `label: 'QUARANTINED'`, error message with the actual content-type

### Pass

- All gates passed
- Result: `label: rule.defaultLabel`, `actions: []`, `rewriteBody: rule.rewriteBody`

---

## Access Labels

[Describe the three `PolicyLabel` values and their downstream implications:]

| Label         | Meaning                                           | Downstream access                                              |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `SAFE_PUBLIC` | Content passed all gates; no PII risk flags       | [Suitable for unrestricted research access]                    |
| `RESTRICTED`  | Content passed gates but warrants access controls | [Requires IAM-gated access; not available for public queries]  |
| `QUARANTINED` | Content failed a gate                             | [Withheld from downstream use; retained in archive for review] |

---

## Audit Actions

[Describe `SanitizationAction` (`src/sanitize/PolicyDecision.ts`) — the ordered list of actions recorded in every sanitized record. Multiple actions may be recorded per record:]

| Action                                | Trigger                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| `NONE`                                | [No modifications applied]                                          |
| `URL_NORMALIZED`                      | [URL normalization was applied]                                     |
| `QUERY_STRIPPED`                      | [`stripQueryParams` matched one or more query parameters]           |
| `FRAGMENT_STRIPPED`                   | [URL fragment was removed]                                          |
| `DROPPED_HEADERS`                     | [`dropHeaders` matched one or more response headers]                |
| `BODY_STRIPPED`                       | [Response body was removed]                                         |
| `BODY_REWRITTEN`                      | [Body bytes were rewritten (`rewriteBody: true`)]                   |
| `QUARANTINED_TOO_LARGE`               | [Body exceeded `maxBytes`]                                          |
| `QUARANTINED_UNEXPECTED_CONTENT_TYPE` | [Content-type not in allowlist or absent and quarantine on missing] |
| `QUARANTINED_FETCH_FAILED`            | [Ingestor recorded no response]                                     |

[The full ordered action list is appended to the `SanitizerRecord` and `ObservationSanitized` event. It forms an append-only audit trail of what the sanitizer did to the observation.]

---

## Sanitizer Record

[Describe the YAML record written for each sanitization attempt. Reference `src/shared/contracts/v1/SanitizerRecord.ts`:]

[Archive path: `v1/records/source={sourceName}/date={date}/ingestion_id={ingestionId}/{observationId}.sanitizer.yml`]

| Field                          | Present when    | Description                                                                                                              |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `version`                      | always          | `1`                                                                                                                      |
| `kind`                         | always          | `'sanitized_record'`                                                                                                     |
| `content_lineage_id`           | always          | [SHA-256 identity hash, propagated from the ingestor record]                                                             |
| `ingestion_batch_id`           | always          | [ID of the originating ingestion run]                                                                                    |
| `sanitizer_batch_id`           | always          | [ID of the sanitizer run]                                                                                                |
| `fetched_at`                   | always          | [Original fetch timestamp]                                                                                               |
| `sanitized_at`                 | always          | [Timestamp when sanitization was applied]                                                                                |
| `source`                       | always          | [`{ id, name, url, collection }`]                                                                                        |
| `label`                        | always          | [`'SAFE_PUBLIC'`, `'RESTRICTED'`, or `'QUARANTINED'`]                                                                    |
| `actions`                      | always          | [Ordered list of `SanitizationAction` values]                                                                            |
| `input.record`                 | always          | [`FilePointer` to the `IngestionRecord` YAML]                                                                            |
| `input.raw`                    | success only    | [`FilePointer` to the raw body bytes, if the ingestor archived one]                                                      |
| `error` _(optional)_           | quarantine only | [Human-readable reason for quarantine]                                                                                   |
| `bytes_rewritten` _(optional)_ | rewrite only    | [`true` if body bytes were rewritten]                                                                                    |
| `http` _(optional)_            | success only    | [HTTP metadata from the ingestor record: `status_code`, `final_url`, `content_type`, `etag`, `last_modified`, `headers`] |
| `content` _(optional)_         | success only    | [`{ sha256, bytes, sanitized: FilePointer }` pointing to sanitized bytes if rewritten]                                   |

[GCS object metadata fields (`SanitizerRecordMetadata`): `observationId`, `ingestionId`, `sourceName`, `sourceCollection`, `fetchedAt`, `sanitizedAt`, `url`.]

---

## ObservationSanitized Event

[Describe the event returned by `sanitizeObservation` (`src/sanitize/contracts/v1/ObservationSanitized.ts`):]

| Field                             | Description                                   |
| --------------------------------- | --------------------------------------------- |
| `version`                         | `1`                                           |
| `content_lineage_id`              | [deterministic identity hash]                 |
| `ingestion_batch_id`              | [ID of the originating ingestion run]         |
| `sanitizer_batch_id` _(optional)_ | [ID of the sanitizer run]                     |
| `fetched_at`                      | [Original fetch timestamp]                    |
| `sanitized_at`                    | [Sanitization timestamp]                      |
| `source`                          | [`{ id, name, url, collection }`]             |
| `label`                           | [Access classification]                       |
| `actions`                         | [Audit action list]                           |
| `pointer`                         | [`FilePointer` to the `SanitizerRecord` YAML] |
| `error` _(optional)_              | [Quarantine reason]                           |
| `content_sha256` _(optional)_     | [SHA-256 of body bytes]                       |
| `content_bytes` _(optional)_      | [Byte count]                                  |
| `bytes_rewritten` _(optional)_    | [`true` if body was rewritten]                |
| `rewritten_sha256` _(optional)_   | [SHA-256 of rewritten bytes]                  |
| `rewritten_bytes` _(optional)_    | [Byte count of rewritten bytes]               |

## Related

- [README.md — Sanitize module overview](../README.md#sanitize)
- [docs/ingest.md — Ingest stage, which produces the records consumed here](./ingest.md)
- [docs/extract.md — Extract stage, which consumes `ObservationSanitized` events](./extract.md)

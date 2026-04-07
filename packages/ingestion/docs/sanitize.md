# Sanitize Stage

The sanitize stage is responsible for processing a single ingestor record: reading it from the archive, evaluating it against a configurable content policy, and producing a `SanitizerRecord`. The core function is `sanitizeRawObservation`, exported from `@news-research/ingestion/sanitize`.

This function is called once per ingestor record. It currently handles only `data_fetched` records. Records with `outcome: no_response` are passed through without producing output.

## Required Ports

`sanitizeRawObservation` depends on one port that must be provided by the consuming application:

| Port      | Responsibility                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `Archiver` | Reads ingestor records from durable storage; writes sanitizer records and accompanying metadata        |

The active `SanitizerPolicy` is passed directly as a value, not resolved through a port. The consuming application is responsible for loading the policy document at startup.

## Policy Evaluation

For each `data_fetched` ingestor record, the sanitizer evaluates the record against the active policy in the following order:

1. **Normalize URL** — strip configured query parameters, remove the URL fragment, and lowercase the hostname. Each modification is recorded as a `SanitizationAction`.
2. **Drop headers** — remove response headers listed in the policy's `dropHeaders` field from the sanitized record.
3. **Resolve rule** — look up the collection rule matching the record's `source.collection`. Apply any source-specific override for the record's `source.name` if one exists.
4. **Check content type** — compare the response content-type against the rule's `allowedContentTypeSubstrings`. Records with non-matching or absent content types are quarantined according to the rule's `onMissingContentType` setting.
5. **Check body size** — records exceeding the rule's `maxBytes` limit are quarantined.
6. **Assign label** — records that pass all checks receive the rule's `defaultLabel` (`SAFE_PUBLIC` or `RESTRICTED`). Records that fail any check receive `QUARANTINED`.

The result is a `PolicyDecision` containing a `label`, an ordered list of `SanitizationAction` entries, and a `rewriteBody` flag.

## Policy Document Format

The sanitization policy is a YAML document whose schema is defined in `SanitizerPolicy.ts`. Its location is the responsibility of the consuming application.

### Top-level fields

| Field              | Type       | Description                                                                       |
| ------------------ | ---------- | --------------------------------------------------------------------------------- |
| `version`          | `number`   | Policy schema version                                                             |
| `stripQueryParams` | `string[]` | Query parameter names to strip from all URLs before archiving                     |
| `dropHeaders`      | `string[]` | Response header names to remove from sanitized records (case-insensitive match)   |
| `collections`      | array      | Per-collection classification rules (see below)                                   |
| `overrides`        | array      | Per-source overrides that extend or replace collection rules (optional)           |

### Collection rules

Each entry in `collections` defines the policy applied to a named collection:

| Field                          | Type          | Required | Description                                                                                          |
| ------------------------------ | ------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `collection`                   | `string`      | Yes      | Collection label to match (e.g. `rss`, `gdelt`)                                                      |
| `maxBytes`                     | `number`      | Yes      | Maximum response body size in bytes; records exceeding this are quarantined                          |
| `defaultLabel`                 | `PolicyLabel` | Yes      | Label assigned when no rule quarantines the record (`SAFE_PUBLIC` or `RESTRICTED`)                   |
| `allowedContentTypeSubstrings` | `string[]`    | No       | Substrings that must appear in the content-type; non-matching types are quarantined                  |
| `onMissingContentType`         | `string`      | No       | Behaviour when content-type is absent: `ALLOW`, `RESTRICT`, or `QUARANTINE` (default: `QUARANTINE`)  |
| `rewriteBody`                  | `boolean`     | No       | Reserved for future body rewriting; has no effect in the current implementation                      |

### Source overrides

Each entry in `overrides` applies to a specific named source and extends the matching collection rule:

| Field                          | Type           | Description                                               |
| ------------------------------ | -------------- | --------------------------------------------------------- |
| `sourceName`                   | `string`       | Source name to match (must match ingestor target `name`)  |
| `maxBytes`                     | `number?`      | Overrides the collection's `maxBytes`                     |
| `defaultLabel`                 | `PolicyLabel?` | Overrides the collection's `defaultLabel`                 |
| `allowedContentTypeSubstrings` | `string[]?`    | Overrides the collection's content-type allowlist         |
| `rewriteBody`                  | `boolean?`     | Overrides the collection's `rewriteBody` flag             |

### Example

```yaml
version: 1
stripQueryParams:
  - utm_
  - fbclid
  - gclid
  - mc_cid
  - mc_eid
dropHeaders:
  - set-cookie
  - cookie
  - authorization
collections:
  - collection: rss
    allowedContentTypeSubstrings:
      - xml
      - rss
      - atom
    onMissingContentType: ALLOW
    maxBytes: 8000000
    defaultLabel: SAFE_PUBLIC
    rewriteBody: false
  - collection: api
    allowedContentTypeSubstrings:
      - json
    onMissingContentType: RESTRICT
    maxBytes: 16000000
    defaultLabel: SAFE_PUBLIC
    rewriteBody: false
  - collection: html
    allowedContentTypeSubstrings:
      - html
    onMissingContentType: RESTRICT
    maxBytes: 20000000
    defaultLabel: RESTRICTED
    rewriteBody: false
  - collection: default
    maxBytes: 1000000
    defaultLabel: RESTRICTED
    onMissingContentType: RESTRICT
    rewriteBody: false
overrides:
  - sourceName: dangerous
    defaultLabel: QUARANTINED
```

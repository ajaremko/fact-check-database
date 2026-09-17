# core-contracts

Cross-domain data contracts: the Effect `Schema` definitions for records that cross a boundary between two systems in the platform, and the Google Cloud event shapes those systems receive.

A contract lives here when more than one domain depends on it. The ingestion domain produces staged fact-check batches and the analysis and website domains consume them, so the row shape and the object-path layout of those batches are defined once in this package rather than duplicated on each side. The same applies to the Pub/Sub and Cloud Storage event payloads: every service that receives work over a push subscription decodes the same envelope. Contracts specific to a single domain live in that domain's own package (`ingestion-contracts`, `website-contracts`).

The package is `@news-research/core-contracts`. Contracts are grouped by concern and version, and each group is a subpath export:

| Subpath                                    | Namespace   | Contents                                                                                  |
| ------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------- |
| `@news-research/core-contracts/gcp/v1`     | `gcpV1`     | Pub/Sub push envelope, Cloud Storage object-finalized notification body and attributes    |
| `@news-research/core-contracts/staging/v1` | `stagingV1` | Fact-checks table definition and row schema, staging object-path layout, date-path helper |

The package root re-exports both groups as the namespaces above. Prefer the subpath imports: they make the contract group and its version visible at the import site.

## Development

```bash
nx test core-contracts       # run the vitest suite
nx typecheck core-contracts
nx lint core-contracts
nx build core-contracts
```

## Versioning

The `v1` segment in each subpath is the contract version. A breaking change to a record shape or path layout is made by adding a `v2` module alongside `v1`, not by editing `v1` in place, so that producers and consumers can migrate independently. Additive, backward-compatible changes (a new optional field) stay within the current version.

Every record schema carries `identifier`, `title` and `description` annotations that include the version (for example `v1FactChecksTableRow`), so the version appears in parse errors and generated documentation.

## gcp/v1

Schemas for the two Google Cloud event payloads the platform's services receive. These describe formats Google defines; the package only expresses them as Effect schemas so that inbound requests are validated before use.

### PubsubMessageEnvelope

The JSON body that Pub/Sub POSTs to a push-subscription endpoint. `message` is a `PubsubMessagePayload` with the base64 `data`, optional `attributes`, `messageId`, and `publishTime` (decoded to a `Date`). `subscription` is the fully qualified subscription resource name, useful for logging and for rejecting deliveries from an unexpected subscription.

```ts
import { Effect, Schema } from 'effect'
import { PubsubMessageEnvelope } from '@news-research/core-contracts/gcp/v1'

const decodeEnvelope = Schema.decodeUnknown(PubsubMessageEnvelope)

Effect.gen(function* () {
  const { message } = yield* decodeEnvelope(requestBody)
  // message.messageId   → "123456789012345"
  // message.publishTime → Date
  // message.data        → "SGVsbG8gV29ybGQh" (still base64)
})
```

The schema leaves `data` encoded because the body format depends on the topic. `parsePubsubMessagePayloadData` is a combinator that decodes it to a UTF-8 string, and composes with a body schema when the body is JSON:

```ts
import * as Node from '@news-research/core-data/Node'
import { parsePubsubMessagePayloadData } from '@news-research/core-contracts/gcp/v1'

const decodeBody = Schema.String.pipe(
  parsePubsubMessagePayloadData,
  Schema.decodeUnknown
)
// decodeBody('SGVsbG8gV29ybGQh') → Effect<"Hello World!", ParseError>

// Or decode straight into a typed record
const decodeRecord = MyRecordSchema.pipe(
  Node.parseJson(),
  parsePubsubMessagePayloadData,
  Schema.decodeUnknown
)
```

### StorageObjectAttributesSchema

The message attributes Cloud Storage attaches to every bucket notification, regardless of payload format. `bucketId` and `objectId` together identify the finalized object, which is all that is needed to fetch it. `eventType` is `OBJECT_FINALIZE` for the notifications this platform subscribes to.

```ts
import { Effect, Schema } from 'effect'
import { StorageObjectAttributesSchema } from '@news-research/core-contracts/gcp/v1'

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
)

Effect.gen(function* () {
  const { bucketId, objectId } = yield* decodeAttributes(message.attributes)
  // enough to build a pointer to the finalized object
})
```

A notification configuration can attach custom attributes of its own. Extend the schema to read them:

```ts
const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.extend(Schema.Struct({ customAttribute: Schema.String })),
  Schema.decodeUnknown
)
```

### StorageObjectDataSchema

The Cloud Storage object resource carried as the message body when a notification uses `payloadFormat: JSON_API_V1`. The field set mirrors `StorageObjectData` from `@google/events` and is checked against it at compile time. Numeric and timestamp fields arrive as strings and decode to `number` and `Date`.

Only `kind` and `id` are required. Every other field is optional because Cloud Storage omits fields that do not apply to a given object, and because development adapters fabricate minimal notifications with only `kind`, `id`, `name`, and `bucket`. The attributes above already carry the bucket and object name, so the full body only needs decoding when metadata such as `size`, `md5Hash`, or `contentType` is wanted.

Encoding a minimal body, as a development environment might to simulate a notification:

```ts
const encodeBody = StorageObjectDataSchema.pipe(Node.parseJson(), Schema.encode)

Effect.gen(function* () {
  const body = yield* encodeBody({
    kind: 'storage#object',
    id: path,
    name: path,
    bucket,
  })
})
```

## staging/v1

Contracts for the staging area: the bucket and BigQuery table through which extracted fact checks pass from the ingestion domain to the analysis and website domains.

### FactChecksTableRowSchema

One row of the staging `fact_checks` table, as an Effect schema. This is the record contract for the staging area: a producer encodes rows with it when writing an NDJSON batch, and a consumer decodes the same batches on the way out.

| Group                  | Fields                                                                                                                                                                                    | Notes                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Lineage and provenance | `content_lineage_id`, `content_sha256`, `ingestion_id`, `extraction_id`, `extractor_id`, `extractor_version`, `fetched_at`, `extracted_at`                                                | All required. `extractor_version` is a number in code and a string when encoded. The table is partitioned by `extracted_at`. |
| `source`               | `id`, `collection`, `name`, `url`                                                                                                                                                         | The feed the item came from.                                                                                                 |
| `fact_check`           | `sha256`, `guid`, `canonical_url`, `language`, `title`, `author`, `categories`, `summary`, `content`, `enclosure_url`, `image_url`, `link`, `published_at_raw`, `published_at_normalized` | Everything but `sha256` is optional, because feeds vary in what they publish. `summary` and `content` are Markdown.          |
| `http`                 | `final_url`, `status_code`, `etag`, `content_type`, `last_modified`, `headers`                                                                                                            | Response metadata of the fetch that produced the content.                                                                    |

`published_at_raw` preserves the publisher's original date string and `published_at_normalized` is the parsed form. Optional fields are absent rather than `null`; producers drop nulls with `omitNullKeys` from `core-data` before encoding.

```ts
import { Effect, pipe, Schema } from 'effect'
import * as Ndjson from '@news-research/core-data/Ndjson'
import * as Node from '@news-research/core-data/Node'
import { FactChecksTableRowSchema } from '@news-research/core-contracts/staging/v1'

const decodeBatch = pipe(
  FactChecksTableRowSchema,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

Effect.gen(function* () {
  const rows = yield* decodeBatch(bytes) // readonly FactChecksTableRow[]
})
```

### FactChecksTableDBSchema

The same table as a BigQuery JSON schema, the format BigQuery accepts for table creation and load jobs. It is the single source of truth for the table's columns, and it is consumed in two places that must agree with each other and with the row schema:

- `analysis-infra` passes its `fields` to Pulumi to create the table.
- `core-infra` serializes the object to `schemas/fact_checks_table_schema_v1.json` in the staging bucket. The analysis loader reads that file at run time to supply the schema for each batch load job, which keeps the loader free of a build-time dependency on the infrastructure that owns the table.

Those consumers are named here, against the rule followed elsewhere in this package, because a mismatch between them fails at deploy or load time rather than at compile time.

The column definition mirrors `FactChecksTableRowSchema`: a field that is required in the row schema is `REQUIRED` here and an optional field is `NULLABLE`, and column types follow the row schema's encoded form, so `extractor_version` is a `STRING` column. The two are kept in step by hand, so a change to one must be applied to the other.

Type names use BigQuery's canonical spellings (`RECORD`, `INTEGER`) because the aliases (`STRUCT`, `INT64`) make Pulumi see a diff on every deploy and try to replace the table.

### StagingPathSchema and stagingPathPrefix

The object-path layout for staged batches:

```
v{version}/type={type}/date={yyyy-MM-dd}/{extractionId}.{ext}
```

Paths sort by contract version, then record type, then day, so a bucket listing or a notification filter can select any level by prefix. The `date` part is a Unix-millisecond number in code and is formatted by `NumberFromFormattedDate`.

`StagingPathSchema` is encode-only: encoding a `StagingPath` value produces the path string, and decoding fails with a `Forbidden` parse error because recovering the fields from a path is not currently required.

```ts
import { Schema } from 'effect'
import {
  StagingPathSchema,
  stagingPathPrefix,
} from '@news-research/core-contracts/staging/v1'

Schema.encodeSync(StagingPathSchema)({
  version: 1,
  type: 'fact_checks',
  date: 1704067200000,
  extractionId: 'extraction-1',
  ext: 'ndjson',
})
// → "v1/type=fact_checks/date=2024-01-01/extraction-1.ndjson"

stagingPathPrefix('fact_checks', 1) // → "v1/type=fact_checks"
```

`stagingPathPrefix` is exported on its own for the cases that need the prefix without a full path: filtering a bucket notification configuration to one record type, listing or organizing staged objects, and deriving sibling layouts under a different `type=` segment.

### NumberFromFormattedDate

A schema between a date string in a fixed `date-fns` format and Unix time in milliseconds. It exists so that date components of paths are human-readable in storage and numeric in code, with one schema converting in both directions. Decoding interprets the string in the process's local time zone.

```ts
import { Schema } from 'effect'
import { NumberFromFormattedDate } from '@news-research/core-contracts/staging/v1'

Schema.decodeSync(NumberFromFormattedDate('yyyy-MM-dd'))('2024-01-01') // → 1704067200000
Schema.encodeSync(NumberFromFormattedDate('yyyy-MM-dd'))(1704067200000) // → "2024-01-01"
```

`ingestion-contracts` carries an identical copy under `archive/v1`, kept separate on purpose so that the ingestion domain's path contracts do not depend on the staging contracts.

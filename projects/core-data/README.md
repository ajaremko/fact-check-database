# core-data

Effect `Schema` combinators for the serialization formats the platform reads and writes, plus a few small Node.js and object helpers.

Every application in the platform validates data at its boundaries with Effect `Schema`. Those boundaries are rarely plain JSON: source lists arrive as CSV, sanitizer policies as YAML, feeds as XML, archive batches as NDJSON, Pub/Sub payloads as base64, and article bodies as HTML. This library provides one combinator per format so that an application can describe the shape of a record once and get a typed, bidirectional `decode` / `encode` for the raw form for free, instead of hand-rolling a parser in each service.

The package is `@news-research/core-data`. Each format is a separate subpath export of `@news-research/core-data` (for example `@news-research/core-data/Yaml`) so a consumer only pulls in the parser dependency it actually uses. The package root exports only the object helpers `omitNullKeys` and `omitNullableKeys`.

This library only handles format-level decode and encode: turning raw bytes or strings into a typed shape, and back. It does not validate content against business rules or policy — the sanitizer's policy evaluation, for example, runs after a record has already been decoded by this library.

## Development

```bash
nx test core-data       # run the vitest suite
nx typecheck core-data
nx lint core-data
nx build core-data
```

## The combinator pattern

Every format combinator is a curried function: it takes an options object and returns a function from schema to schema.

```ts
Format.parseX(options) // → (schema: Schema<A, I, R>) => Schema<A, string | Uint8Array, R>
```

Because the result is itself a schema, combinators stack with `pipe()`. Read a pipeline from the inside out: the first argument is the target type, and each subsequent combinator wraps one more layer of encoding on the way toward raw bytes. The final `Schema.decode` (or `Schema.encode`) turns the composed schema into a function.

This is the sanitizer's policy loader, unchanged from `projects/ingestion-sanitizer/src/adapters/FileSystemSanitizerPolicyDocument.ts`:

```ts
import { pipe, Schema } from 'effect'
import * as Node from '@news-research/core-data/Node'
import * as Yaml from '@news-research/core-data/Yaml'

const decodePolicy = pipe(
  SanitizerPolicy, // target: the typed policy record
  Yaml.parseYaml(), // ← from a YAML string
  Node.parseUint8Array({ encoding: 'utf-8' }), // ← from the bytes FileSystem.readFile returns
  Schema.decode
)

const policy = yield * decodePolicy(bytes) // Effect<SanitizerPolicy, ParseError>
```

Swap `Schema.decode` for `Schema.encode` and the same pipeline serializes a policy record back to bytes.

## Modules

| Module     | Exports                                                                                          | Decodes                                                                      | Encode direction                        | Backed by                    |
| ---------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------- | ---------------------------- |
| `Node`     | `parseJson`, `parseBuffer`, `parseUint8Array`, `parseBufferEncoded`, `sha256Hex`, `generateUUID` | JSON string, `Buffer`, `Uint8Array`, or base64 string → string / typed value | Full inverse                            | `node:crypto`, Effect        |
| `Csv`      | `parseCsv`                                                                                       | CSV string → `A[]`                                                           | Full inverse                            | `csv-parse`, `csv-stringify` |
| `Xml`      | `parseXml`                                                                                       | XML string → typed object                                                    | Full inverse                            | `fast-xml-parser`            |
| `Yaml`     | `parseYaml`                                                                                      | YAML (or JSON) string → typed object                                         | Full inverse                            | `yaml`                       |
| `Ndjson`   | `parseNdjson`                                                                                    | Newline-delimited JSON string → `A[]`                                        | Full inverse                            | `Node.parseJson`             |
| `Html`     | `htmlToMarkdown`, `decodeHtmlEntities`                                                           | HTML string → Markdown; entity references → literal characters               | Pass-through (see below)                | `turndown`, `he`             |
| `Unicode`  | `parseUnicode`                                                                                   | UTF-8 string → US-ASCII transliteration                                      | Same lossy transform in both directions | `unidecode`                  |
| `Markdown` | `stripMarkdown`                                                                                  | Markdown → plain text                                                        | Plain function, not a combinator        | `remove-markdown`            |
| root       | `omitNullKeys`, `omitNullableKeys`                                                               | Object → object without `null` (or `null`/`undefined`) keys                  | Plain functions                         | none                         |

### Node

Bridges between raw bytes, encoded strings, and the string that a text-format combinator expects. `parseUint8Array` is the usual outermost layer, because `FileSystem.readFile` from `@effect/platform` and the `core-io` storage readers both return `Uint8Array`.

```ts
import { pipe, Schema } from 'effect'
import * as Node from '@news-research/core-data/Node'

// base64 ⇄ utf-8 (how Pub/Sub message `data` fields are decoded)
const decode = pipe(
  Schema.String,
  Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' }),
  Schema.decodeSync
)
decode('Zm9v') // → "foo"

const encode = pipe(
  Schema.String,
  Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' }),
  Schema.encodeSync
)
encode('foo') // → "Zm9v"

// Uint8Array ⇄ string
const fromBytes = pipe(
  Schema.String,
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decodeSync
)
fromBytes(new TextEncoder().encode('example')) // → "example"
```

`parseJson` wraps `Schema.parseJson` in the same curried shape so it composes like the other combinators. `parseBuffer` is `parseUint8Array` for a Node `Buffer`.

Two effectful helpers live here as well. Both return an `Effect` and are used to fingerprint archived content and to mint run and message identifiers:

```ts
const hash = yield * Node.sha256Hex(responseBody) // Uint8Array
const hash = yield * Node.sha256Hex(JSON.stringify(v), 'utf-8')
// → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"

const runId = yield * Node.generateUUID()
// → "a3bb189e-8bf9-3888-9912-ace4e6543002"
```

Used by `core-contracts` (`parsePubsubMessagePayloadData`), the ingestor's HTTP fetcher, and the extractor's `buildFactCheck`.

### Csv

Transforms between a CSV string and an array of the wrapped schema's type. The `parse.columns` option is required by the type signature: set it to `true` to read the first row as column names.

```ts
import { pipe, Schema } from 'effect'
import * as Csv from '@news-research/core-data/Csv'

const Row = Schema.Struct({
  name: Schema.String,
  count: Schema.NumberFromString,
})

const decode = pipe(
  Row,
  Csv.parseCsv({
    parse: { columns: true, skip_empty_lines: true },
    stringify: {},
  }),
  Schema.decodeSync
)
decode('name,count\nexample,42\n') // → [{ name: 'example', count: 42 }]

const encode = pipe(
  Row,
  Csv.parseCsv({ parse: { columns: true }, stringify: { header: true } }),
  Schema.encodeSync
)
encode([{ name: 'example', count: 42 }]) // → "name,count\nexample,42\n"
```

Used by the ingestor to load its source list (`projects/ingestion-ingestor/src/adapters/FileSystemSourceList.ts`).

### Xml

Transforms between an XML string and a typed object using `fast-xml-parser`. Attributes are kept by default and prefixed with `@_`; pass `parser` and `builder` options to override.

```ts
import { pipe, Schema } from 'effect'
import * as Xml from '@news-research/core-data/Xml'

const Item = Schema.Struct({ name: Schema.String, count: Schema.Number })

const decode = pipe(Item, Xml.parseXml(), Schema.decodeSync)
decode('<name>example</name><count>42</count>') // → { name: 'example', count: 42 }

const encode = pipe(Item, Xml.parseXml(), Schema.encodeSync)
encode({ name: 'example', count: 42 }) // → "<name>example</name><count>42</count>"
```

The extractor decodes RSS and Atom feeds this way, stacking `Xml.parseXml` with custom parser options over `Node.parseUint8Array` (`projects/ingestion-extractor/src/integration/extraction-strategy/decodeFeedXml.ts`).

### Yaml

Transforms between a YAML string and a typed object. Because YAML is a superset of JSON, the same decoder accepts a JSON document.

```ts
import { pipe, Schema } from 'effect'
import * as Yaml from '@news-research/core-data/Yaml'

const Item = Schema.Struct({ name: Schema.String, count: Schema.Number })

const decode = pipe(Item, Yaml.parseYaml(), Schema.decodeSync)
decode('name: example\ncount: 42\n') // → { name: 'example', count: 42 }
decode('{ "name": "example", "count": 42 }') // → { name: 'example', count: 42 }

const encode = pipe(Item, Yaml.parseYaml(), Schema.encodeSync)
encode({ name: 'example', count: 42 }) // → "name: example\ncount: 42\n"
```

Used for every YAML configuration document in the platform, including the sanitizer policy shown above.

### Ndjson

Transforms between a newline-delimited JSON string and an array of the wrapped schema's type. It is built by composing `Node.parseJson` with a newline split, so every line is validated against the schema.

```ts
import { pipe, Schema } from 'effect'
import * as Ndjson from '@news-research/core-data/Ndjson'
import * as Node from '@news-research/core-data/Node'

const decodeBatch = pipe(
  Row,
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)
```

Used by the website loader to read archived fact-check batches before transcoding them into search records (`projects/website-loader/src/transcodeBatch.ts`).

### Html

Two combinators for text that arrives from feeds with HTML in it.

`htmlToMarkdown` converts an HTML string into Markdown, preserving paragraphs, lists, links, emphasis and headings, and decoding character references as part of the conversion. Plain, tag-free input passes through unchanged.

```ts
import { pipe, Schema } from 'effect'
import * as Html from '@news-research/core-data/Html'

const decode = pipe(Schema.String, Html.htmlToMarkdown(), Schema.decodeSync)
decode('<p>Hello <a href="https://example.com">world</a></p>') // → "Hello [world](https://example.com)"
decode('<ul><li>one</li><li>two</li></ul>') // → "-   one\n-   two"
decode('<p>Frank V&#246;hringer &amp; friends&#8230;</p>') // → "Frank Vöhringer & friends…"
```

`decodeHtmlEntities` decodes character references such as `&#246;` or `&amp;` without interpreting any tags. It is intended for short single-line fields (titles, author names) that may carry a bare entity but never block-level markup.

```ts
const decode = pipe(Schema.String, Html.decodeHtmlEntities(), Schema.decodeSync)
decode('Frank V&#246;hringer') // → "Frank Vöhringer"
decode("Ben &amp; Jerry's <b>bold</b>") // → "Ben & Jerry's <b>bold</b>"
```

Two design decisions are deliberate:

- **Encode is a pass-through, not an inverse.** By the time a value is encoded it is already Markdown. Running HTML-to-Markdown conversion on Markdown corrupts it, because the converter escapes brackets and other characters it does not recognize as its own output.
- **Input is capped at 500,000 characters.** This is a safety valve against pathologically large feed payloads driving up conversion cost, not a content-shaping truncation. Real feed items are in the low tens of kilobytes.

Used by the extractor's text normalization (`projects/ingestion-extractor/src/app/NormalizedText.ts`).

### Unicode

Transliterates a UTF-8 string to US-ASCII with `unidecode`. The transform is lossy and is applied identically on `encode`, so a round trip does not restore the original text.

```ts
import { pipe, Schema } from 'effect'
import * as Unicode from '@news-research/core-data/Unicode'

const decode = pipe(Schema.String, Unicode.parseUnicode(), Schema.decodeSync)
decode('aéà)àçé') // → "aea)ace"
decode('’') // → "'"
```

Prefer `Html.decodeHtmlEntities` when the goal is to preserve original-language text in non-Latin scripts. Use `parseUnicode` only where an ASCII-only representation is required.

### Markdown

`stripMarkdown` reduces Markdown to its plain text content. It is a plain function rather than a schema combinator because there is no inverse: plain text cannot be turned back into the original Markdown, so a `Schema.transform` would be misleading.

```ts
import { stripMarkdown } from '@news-research/core-data/Markdown'

stripMarkdown('A [link](https://example.com) and *bold* text') // → "A link and bold text"
stripMarkdown('## Key results\n\n**1.** Text') // → "Key results\n\n1. Text"
```

### omitNullKeys and omitNullableKeys

Exported from the package root. `omitNullKeys` removes keys whose value is `null`; `omitNullableKeys` removes keys that are `null` or `undefined`. Both narrow the result type accordingly.

```ts
import { omitNullKeys } from '@news-research/core-data'

omitNullKeys({ title: 'Example', author: null, language: 'en' })
// → { title: 'Example', language: 'en' }
```

Used when building outbound records so that optional fields are absent rather than `null` (`projects/ingestion-extractor/src/app/FactCheck.ts`, `projects/ingestion-sanitizer/src/app/SanitizedObservation.ts`).

## Error behaviour

Format combinators are built on `Schema.transformOrFail` and wrap the underlying parser in `ParseResult.try`. Parser failures become schema parse errors rather than thrown exceptions:

- `Csv` and `Yaml` report the parser's own message as a `ParseResult.Type` error.
- `Xml`, `Html` and `Unicode` report a `ParseResult.Unexpected` error carrying the offending input.

With `Schema.decode` the failure is a `ParseError` in the Effect error channel and can be handled with the usual Effect combinators. The `Schema.decodeSync` variants used in the examples above throw instead, which is convenient in tests and scripts but should not be used in service code.

A consumer typically catches the tag rather than inspecting the error by hand:

```ts
import { Effect, pipe } from 'effect'

const program = pipe(
  decodePolicy(bytes),
  Effect.catchTag('ParseError', (error) =>
    Effect.logError('failed to decode policy', { cause: error.message })
  )
)
```

## Logging

This library does no logging of its own — no `Effect.log*` calls and no dependency on a
`LogLevel`. A consumer is free to log around a call to it at whatever level fits its own
strategy; there's no level range reserved here.

## Extension

To add a format:

1. Create one file per format under `src/` exporting a curried combinator `(options) => (schema) => schema`, using `Schema.transformOrFail` and `ParseResult.try` as the existing modules do.
2. Add a subpath entry for it under `exports` in `package.json`.
3. Add a `*.spec.ts` covering decode, encode, and at least one failure case.

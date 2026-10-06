# website-contracts

Cross-app data contracts for the website domain: the search record shape loaded into the site's search index, and the shapes of the site's contact/access/tip forms.

The package is `@fact-check-database/website-contracts`. Each domain is a separate subpath export (for example `@fact-check-database/website-contracts/search/v1`) — prefer these over the root package, which only re-exports each subpath under a namespace (`searchV1`, `formSubmissionsV1`) for the rare case that's more convenient; no consumer in this repo uses that form today.

## Contracts

- **`search/v1`** — `SearchResult`, the record shape `website-loader` writes to Algolia. It's a
  plain projection record with no `version`/`kind` discriminators, the same shape as
  `core-contracts`' `FactChecksTableRowSchema` (which `website-loader` transforms into this shape
  — see `website-loader/src/transcodeBatch.ts` for that mapping; it's that project's logic, not
  this package's).
- **`form-submissions/v1`** — `ContactSubmission`, `AccessRequest`, and `TipSubmission`, each with
  `version: 1` and a `kind` literal discriminator, unioned as `FormSubmission`. Unlike
  `SearchResult`, these are genuinely event-shaped records — a form submission is something that
  happened, not a projection of existing data — which is why they carry discriminators and
  `SearchResult` doesn't. Consumed by `website-server` (one action per form) and `website-emailer`
  (decodes the `FormSubmission` union to route to the right email template).

## Development

```bash
nx build website-contracts
nx typecheck website-contracts
nx lint website-contracts
```

There is no `test` target for this project — no test infrastructure exists here today.

## Error handling

This package defines no custom error types. A decode or encode failure is a
`ParseResult.ParseError` in the Effect error channel, like any Effect `Schema`.

## Logging

This package does no logging of its own.

## Usage examples

```ts
import { Schema } from 'effect'
import { FormSubmissionSchema } from '@fact-check-database/website-contracts/form-submissions/v1'

const decode = Schema.decodeUnknownSync(FormSubmissionSchema)
decode({
  version: 1,
  kind: 'tip_submission',
  claim: 'The claim being reported',
  organization: 'Example Org',
  url: 'https://example.com/article',
  submitted_at: '2024-01-01T00:00:00.000Z',
})
```

```ts
import { Schema } from 'effect'
import { SearchResultSchema } from '@fact-check-database/website-contracts/search/v1'

Schema.encodeSync(SearchResultSchema)({
  objectID: 'content-lineage-id',
  extracted_at: new Date(),
  source_collection: 'rss',
  source_id: 'politifact',
  source_url: 'https://www.politifact.com/rss/all/',
  source_name: 'politifact.com',
})
```

## Related documentation

| Document                                       | Purpose                                      |
| ---------------------------------------------- | -------------------------------------------- |
| [docs/known-issues.md](./docs/known-issues.md) | Accepted, long-lived gaps and deferred fixes |

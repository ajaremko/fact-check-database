# website-server

The public-facing Next.js (app router) frontend for the fact-check database: informational pages,
a live search UI, and three abuse-guarded forms. This service only **writes** — it never reads
data back from the platform's storage or analysis layers.

Every form submission is a YAML object written to the shared backend bucket, which is exactly
what triggers [`website-emailer`](../website-emailer/README.md) (sends the confirmation/
notification emails) — this project has no involvement in that next step. It has no relationship
to [`website-loader`](../website-loader/README.md), which indexes fact-check records from a
completely separate pipeline (the ingestion/analysis staging bucket, not form submissions) into
the same Algolia application this service searches against.

## Responsibilities

- Serve the site's informational pages (mission, team, dataset overview, methodology,
  corrections policy, legal) — all static content, no data fetching
- Serve the search page, passing public Algolia credentials to the client-side search UI
- Run three form flows — contact, dataset access request, and tip submission — each verifying a
  reCAPTCHA token and writing the result as a YAML object
- Expose `GET /health` for Cloud Run's startup probe

## What this service does not do

- **Read any data back.** No BigQuery, no Algolia writes, no reads from `analysis-infra` or
  `research-infra` — every informational/dataset page is static content, confirmed by there being
  no reference to any of those systems anywhere in `src/`.
- **Send email.** That's `website-emailer`, triggered downstream of this service's writes.
- **Consume any message queue.** This service only writes files; it has no subscriber of any
  kind.
- **Enforce user accounts or app-level auth.** Access control on the dev deployment is an
  infra-level concern — see "Access" below.

## How it works

### Form submissions

```
User submits a form (contact / dataset access request / tip)
      │
      ▼
 Verify the reCAPTCHA Enterprise token (score threshold: 0.5, hardcoded)
      │
      ▼
 Encode the submission as YAML, using the matching website-contracts schema
      │
      ▼
 Write submissions/{kind}-{id}.yml to the backend bucket
      │
      ├── Success ──► redirect() to the form's success page
      │
      └── Failure ──► the form re-renders with a generic error message
```

The `/dataset/submissions` route (and its `src/lib/submissions/` folder) handle what the schema
calls a `tip_submission` (written as `tip-{id}.yml`) — a naming mismatch between the route/folder
and the schema's own vocabulary, stated here so it doesn't read as a mistake later.

Each form's client component wraps its submit call in a `try/catch` that re-throws
`isRedirectError` errors and only shows an error message when the server action *returns*
normally. This is intentional, if easy to misread: Next's `redirect()` (called on success) works
by throwing internally, so a normal return only happens on the failure path.

### Search

`page.tsx` (a Server Component) reads `ALGOLIA_APP_ID`/`ALGOLIA_SEARCH_KEY`/`ALGOLIA_INDEX_NAME`/
`ALGOLIA_INDEX_NAME_OLDEST` from the server environment and passes them as props into the
client-side `Search`/`FactCheckSearch` components. None of these use the `NEXT_PUBLIC_` prefix —
that's intentional, not an oversight: both an Algolia *search-only* key and a reCAPTCHA *site* key
are meant to be embedded in client-side code by design, and passing them down as props avoids the
`NEXT_PUBLIC_` build-time-inlining requirement, so the values can be changed without rebuilding
the image.

`AnalyticsScript` (`src/lib/analytics/`) follows the same idea, one step simpler: it reads
`GA_MEASUREMENT_ID` directly, since it's already a Server Component itself — no prop-passing
needed. When the variable is unset (the dev stack leaves it unset on purpose), it renders nothing.

## Access

The dev deployment runs behind an Envoy + oauth2-proxy sidecar gated by `htpasswd` credentials
(`website-infra/src/backend/service.ts`) — it isn't reachable without them. Production has no such
gate (`roles/run.invoker` is granted to `allUsers`), which is appropriate for a site whose content
is meant to be public.

## Development

```bash
nx serve website-server
nx build website-server
nx lint website-server
```

There is no `typecheck` target — `next build` does its own type checking as part of `build`. There
is no `test` target and no automated test coverage exists for this project today.

## Related documentation

| Document | Purpose |
| --- | --- |
| [docs/runbook.md](./docs/runbook.md) | Configuration reference and diagnosing failures |
| [website-contracts](../website-contracts/README.md) | The form submission schemas this service writes against |
| [website-emailer](../website-emailer/README.md) | Sends the confirmation/notification emails triggered by a form submission |
| [website-loader](../website-loader/README.md) | Populates the Algolia index this service searches against — from the ingestion pipeline, unrelated to form submissions |

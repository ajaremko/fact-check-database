# Website Server Runbook

Configuration reference and diagnosing failures for `website-server`. See the
[README](../README.md) for what this service does and how it works.

## Configuration

| Variable | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `STORAGE_MODE` | `gcp` \| `filesystem` | No | `gcp` | Selects the `core-io` `StorageWriter` adapter used by all three form actions |
| `STORAGE_OUTPUT_DIR` | string | Only if `STORAGE_MODE=filesystem` | — | Local directory submissions are written to |
| `LOGGING_MODE` | `gcp` \| `console` | No | `console` | Pretty console logger vs. JSON |
| `LOGGING_LEVEL` | Effect `LogLevel` | No | `info` | Minimum log level |
| `ALGOLIA_APP_ID` | string | Yes | — | Read server-side, passed as a prop to the client search UI |
| `ALGOLIA_SEARCH_KEY` | string | Yes | — | A search-only Algolia key — safe to expose to the client by design |
| `ALGOLIA_INDEX_NAME` | string | Yes | — | The primary search index |
| `ALGOLIA_INDEX_NAME_OLDEST` | string | Yes | — | The oldest-first replica index, used for the "oldest first" sort |
| `RECAPTCHA_SITE_KEY` | string | Yes | — | reCAPTCHA Enterprise site key — used both server-side (assessment requests) and passed to the client widget |
| `RECAPTCHA_PROJECT_ID` | string | Yes | — | GCP project the reCAPTCHA Enterprise key lives in |
| `NEXT_PUBLIC_BUILD_NUMBER` | string | No | — | Displayed in the site footer; inlined at build time (real `NEXT_PUBLIC_` var, unlike the Algolia/reCAPTCHA values above) |
| `PORT` | number | No | `3000` (Next.js default) | `website-infra` and the Dockerfile both set this explicitly to `3000`, matching Next's own default |

None of these are read via a `*_MODE`-style switch for reCAPTCHA or Algolia — both are always
live; there's no logger/mock adapter for either.

Two variables set in the real `.env.local` are dead — not carried into `.env.template`. See
[docs/known-issues.md](./known-issues.md):

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — the analytics script hardcodes the same ID directly instead.
- `REDIS_HOST` / `REDIS_PORT` / `MAX_REQUESTS_PER_SEC` — rate limiting was never implemented
  despite `ioredis` and `rate-limiter-flexible` being real dependencies.

## Diagnosing failures

### A form submission fails silently

**Symptom:** the form re-renders with "Something went wrong. Please try again." instead of
redirecting to the success page.
**Steps:**
1. Check the logged cause (`Effect.tapErrorCause(Effect.logError)` in the relevant `actions.ts`).
2. A `RecaptchaError` means either the token failed Enterprise assessment or the score was below
   the `0.5` threshold — legitimate users occasionally trip this; there's no retry-with-a-fresh-
   token flow today, the user just resubmits.
3. A storage error means the write to the backend bucket failed — check
   `STORAGE_MODE`/`STORAGE_OUTPUT_DIR` in local dev, or the service account's write permission on
   the bucket in production.

### The health check fails

**Symptom:** Cloud Run's startup probe against `GET /health` fails, and the revision never
becomes ready.
**Cause:** `/health` currently always reports healthy — its own code comment notes a real
dependency check was never added — so a probe failure here almost always means the process itself
isn't starting (a missing required env var, or the container crashing on boot), not a downstream
dependency being unavailable.

See [docs/known-issues.md](./known-issues.md) for this project's current accepted gaps.

# Known Issues

## `release.yml` never sets `NEXT_PUBLIC_BUILD_NUMBER`

**Error:** No error observed directly — inferred from reading the pipeline. The production
footer almost certainly renders "Build #undefined".
**Where:** `.github/workflows/release.yml`'s "Build and release Docker images" step sets
`BUILD_NUMBER` but not `NEXT_PUBLIC_BUILD_NUMBER` in its `env:` block. `.github/workflows/ci.yml`
(the dev release path) sets both. `src/lib/layout/SiteFooter.tsx` reads
`process.env.NEXT_PUBLIC_BUILD_NUMBER` directly, with no fallback.
**Root cause:** Likely an oversight when `NEXT_PUBLIC_BUILD_NUMBER` was added to `ci.yml` and
never backported to `release.yml`.
**Decision:** Leave as-is for now — recorded here rather than fixed in the same pass as the
(unrelated) `GA_MEASUREMENT_ID` fix that surfaced it.
**If this ever needs to be fixed:** Add `NEXT_PUBLIC_BUILD_NUMBER:
${{ steps.buildnumber.outputs.build_number }}` to `release.yml`'s "Build and release Docker
images" step, matching `ci.yml`.

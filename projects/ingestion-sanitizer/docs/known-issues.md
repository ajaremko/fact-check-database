# Known Issues

## The policy document configures URL/header/body rewriting that has no effect

**Error:** No error — a live discrepancy between what the policy document appears to configure
and what the code does.
**Where:** `assets/policy.yml`'s `stripQueryParams`, `dropHeaders`, and every collection/override
rule's `rewriteBody` field. The schema (`src/contracts/SanitizerPolicy.ts`) declares all three,
and the real policy document populates them.
**Root cause:** `evaluatePolicy.ts` and `sanitizeObservation.ts` never read any of these three
fields. A `SanitizerRecord`'s `content` is always the original fetched content, unmodified,
regardless of what the policy document says.
**Decision:** Leave as-is for now. This tracks the same gap as the README's Roadmap item "rewrite
or strip response body content" — the policy schema was written ahead of the implementation.
**If this ever needs to be fixed:** Implement query-param stripping and header dropping (likely in
`evaluatePolicy.ts`, alongside the existing content-type/size checks) and body rewriting (likely
in `sanitizeObservation.ts`, where `content` is currently passed through unchanged), then have
each honor its rule's `rewriteBody` flag.

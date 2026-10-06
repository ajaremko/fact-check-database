# Known Issues

## No automated test coverage

**Error:** No error. A test-coverage gap.

**Where:** The whole project. No spec or test file exists under `src/`.

**Root cause:** The site was built and checked by hand. Its three form actions validate input, verify a reCAPTCHA token and write a submission to storage, and none of that is exercised by a test.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Start with the form actions: test each with a valid submission, an invalid one and a failed reCAPTCHA check. Then add a render test for the search page with a stubbed search client.

## Search has no fallback when Algolia is unavailable

**Error:** "Search is currently unavailable. Please try again later."

**Where:** `src/lib/search/FactCheckSearch.tsx`.

**Root cause:** The public search reads only from the Algolia index. If the client cannot be created the page shows the message above, and if Algolia is down a query returns nothing. The curated BigQuery table holds the same fact checks, but the site has no path to it.

**Decision:** Won't fix. A second search path is not worth its cost for this site.

**If this ever needs to be fixed:** Serve a plain recent-fact-checks list from the curated table through a server route, and show it when the search client fails.

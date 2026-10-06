# Known Issues

## No automated test coverage

**Error:** No error. A test-coverage gap.

**Where:** The whole package. No `.spec.ts` file exists under `src/`.

**Root cause:** The schemas were treated as type declarations. They are also runtime codecs: `SearchResultSchema` decides what is written to the search index, and the form schemas decide what a submission may contain.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Add a spec per schema that encodes and decodes a full record and a minimal one, with literal expected values, following [docs/testing-guidelines.md](../../../docs/testing-guidelines.md).

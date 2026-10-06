# Known Issues

## Declared actions and rules that nothing uses

**Error:** No error. Dead declarations.

**Where:** `SanitizationActionSchema`, declared in both `src/app/PolicyDecision.ts` and `ingestion-contracts/src/archive/v1/SanitizerRecord.ts`. Also the `api` and `html` collection rules in the policy files.

**Root cause:** The action list was written ahead of the implementation. Four of its eleven values are never emitted: `NONE`, `URL_NORMALIZED`, `FRAGMENT_STRIPPED` and `BODY_STRIPPED`. The same literal is declared twice, so the two lists can drift. The `api` and `html` rules have no matching source type, because a source's collection can only be `rss` or `atom`.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Import the literal from `ingestion-contracts` instead of redeclaring it. Remove the unused values and rules, or implement them.

## No PII detection

**Error:** No error. A stated limit of the platform.

**Where:** `src/app/evaluatePolicy.ts`. The policy checks fetch outcome, body size and content type. It does not inspect content.

**Root cause:** The platform collects public fact-check feeds and assumes personal data appears only incidentally. Its controls on archived content are encryption at rest with a revocable key and the policy label on each record.

**Decision:** Won't fix for now. Encryption and labels are the controls.

**If this ever needs to be fixed:** Add a detection step to `evaluatePolicy` that labels a record `RESTRICTED` when it finds personal data, so the extractor skips it. Decide first what counts as personal data in a published fact check, which routinely names public figures.

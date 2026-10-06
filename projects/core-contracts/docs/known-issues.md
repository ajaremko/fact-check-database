# Known Issues

## The staging table is defined twice and kept in step by hand

**Error:** No error. A drift risk.

**Where:** `src/staging/v1/FactChecksTable.ts` holds both `FactChecksTableDBSchema` (the BigQuery column list) and `FactChecksTableRowSchema` (the Effect schema for one row).

**Root cause:** BigQuery needs a JSON column list and the services need an Effect schema. Nothing derives one from the other or checks that they agree, so a field added to one and not the other is only found when a load job fails. The file's own comment says the two are kept in step by hand.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Add a spec that walks both definitions and fails when a field's name, nesting or required/nullable mode differs. Generating the column list from the row schema is the fuller fix.

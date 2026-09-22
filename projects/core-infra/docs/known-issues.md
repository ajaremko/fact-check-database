# Known Issues

Accepted, long-lived gaps and deferred fixes for `core-infra` — a decision log, not a bug
tracker. Each entry preserves why something wasn't fixed, so the next person doesn't redo the
investigation.

## CI/CD identity holds broader IAM roles than it strictly needs

**Error:** Not an error — an accepted hardening gap.
**Where:** `github-actions-sa`'s project-level roles, `roles/editor` and `roles/cloudkms.admin`
(see [docs/iam-model.md](./iam-model.md)).
**Root cause:** One identity deploys `core-infra` and every domain project, so its roles were
granted broadly rather than scoped to exactly what each deploy step needs. Scoping them down
would take real auditing effort for a single identity that isn't shared across teams.
**Decision:** Leave as-is while one identity handles every project's deploys.
**If this ever needs to be fixed:** Replace `roles/editor` with the specific resource-level roles
each deploy step needs; scope `roles/cloudkms.admin` to just the `core-key-ring` key ring; add
conditional IAM bindings keyed on resource labels if more than one team ever deploys through this
identity.

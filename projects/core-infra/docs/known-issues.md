# Known Issues

Accepted, long-lived gaps and deferred fixes for `core-infra` — a decision log, not a bug
tracker. Each entry preserves why something wasn't fixed, so the next person doesn't redo the
investigation.

## Prod stack allows a destructive `pulumi destroy`

**Error:** No error yet. As configured, `pulumi destroy --stack=prod` would delete the staging
bucket and everything in it.
**Where:** `core:forceDestroyStorage` and `core:retainStorageOnDelete` in `Pulumi.prod.yml` (see
[docs/runbook.md](./runbook.md#configuration)).
**Root cause:** Both stacks were set up with the same, dev-appropriate values
(`forceDestroyStorage: true`, `retainStorageOnDelete: false`). Prod's config was never updated to
the safer, opposite values `src/config.ts`'s own code comments recommend.
**Decision:** Leave as-is for now. Documented here so the risk is visible before anyone runs
`pulumi destroy` against prod, rather than discovered by doing it.
**If this ever needs to be fixed:** Set `core:forceDestroyStorage: false` and
`core:retainStorageOnDelete: true` in `Pulumi.prod.yml` before any planned `pulumi destroy`
against prod.

## First bootstrap deploy can fail on freshly enabled APIs

**Error:** The first deploy fails because a resource depends on a GCP API
(`compute.googleapis.com`, `cloudresourcemanager.googleapis.com`, etc.) that was just enabled and
hasn't finished propagating.
**Where:** First deployment of a new stack (see [docs/bootstrap.md](./bootstrap.md)).
**Root cause:** GCP API enablement isn't immediately consistent. A resource can be created before
the API it needs is fully active. Some resources may be missing a `dependsOn` edge to the
relevant `gcp.projects.Service` in `src/services.ts`, though this hasn't been audited.
**Decision:** Retry the deploy after a short wait rather than auditing every resource's
`dependsOn` chain.
**If this ever needs to be fixed:** Audit `dependsOn` on every resource in `src/` against the API
service resources in `src/services.ts`, and add any missing edges.

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

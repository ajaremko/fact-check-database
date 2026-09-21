# Known Issues

## Vendored `@pulumi/algolia` SDK's pinned TypeScript version broke `typecheck`

**Error:** `nx run website-infra:typecheck` failed with `TS5094: Compiler option
'--emitDeclarationOnly' may not be used with '--build'`. A direct `tsc -p tsconfig.json` run
separately failed with `TS6306: Referenced project 'sdks/algolia' must have setting "composite":
true`.
**Where:** `sdks/algolia` — a real, git-tracked, hand-vendored copy of the `@pulumi/algolia`
provider SDK (bridged from `k-yomo/terraform-provider-algolia`), linked into this project via
`"@pulumi/algolia": "file:sdks/algolia"` in `package.json`. It's not a published npm package.
**Root cause:** Two independent, compounding issues, both from how `sdks/algolia` is wired in:
1. `sdks/algolia/package.json` declared `"typescript": "^4.3.5"`, conflicting with the workspace
   root's `~5.9.2`. npm installed a private, nested TypeScript 4.9.5 under
   `projects/website-infra/node_modules` to satisfy it, which shadowed the root version for any
   `tsc` invocation starting inside this project — including Nx's `typecheck` target, which ran
   under that older compiler and failed on a flag combination only supported in later TypeScript
   releases.
2. `tsconfig.app.json` listed `sdks/algolia` as a TypeScript project reference
   (`references: [{ path: "sdks/algolia" }]`), but `sdks/algolia/tsconfig.json` never sets
   `"composite": true` — a hard requirement for any reference target. It's a plain tsconfig
   meant for that package's own standalone `tsc` build, never designed to participate in another
   project's reference graph.
**Decision:** Patched rather than left as-is:
- Changed `sdks/algolia/package.json`'s `typescript` dependency to `~5.9.2`, matching the
  workspace root, so npm no longer installs a conflicting nested copy.
- Removed the `references` entry from `tsconfig.app.json` entirely. It was unnecessary:
  `sdks/algolia` is already fully built (`bin/*.js` + `bin/*.d.ts` exist, produced by its own
  `postinstall` script) and resolves as an ordinary `node_modules` package — exactly like every
  other `@pulumi/*` import in this project (`@pulumi/gcp`, `@pulumi/pulumi`), neither of which is
  wired in as a project reference.
- A root `package.json` `overrides` entry for `typescript` was tried first. Confirmed, across
  three separate clean reinstalls (deleting `package-lock.json` and `node_modules` each time),
  that npm's `overrides` does not cascade into a locally `file:`-linked package's own dependency
  resolution — a real npm limitation, not a mistake in applying it. Not part of the final fix;
  recorded here so it isn't tried again from scratch.
**If this patch is ever lost:** If `sdks/algolia` is ever regenerated or re-vendored from its
upstream source, its `package.json`'s `typescript` version will likely revert to whatever that
generation pins, and this exact failure will resurface. Re-apply both changes: pin `typescript`
in `sdks/algolia/package.json` to match the workspace root's version, and don't add it back as a
`references` entry in `tsconfig.app.json`.

## Storage-safety config keys are declared but never wired into any bucket

**Error:** No error yet. As configured, `pulumi destroy` against **any** stack, including prod,
would force-delete both the backend bucket and the dead-letter bucket, with no config-level way
to prevent it.
**Where:** `src/config.ts` declares and validates four config keys —
`forceDestroyStorage`, `retainStorageOnDelete`, `deadletterRetentionDays`,
`deadletterSoftDeleteDays` — each with a detailed doc comment and a `console.warn` safety check.
Grep confirms zero references to any of the four anywhere else in `src/`. `src/backend/storage.ts`
(`backendBucket`) and `src/deadletter/storage.ts` (`deadletterBucket`) both hardcode
`forceDestroy: true` and set no `retainOnDelete` at all, regardless of stack.
**Root cause:** Unknown — this is the same class of gap already documented in
`core-infra`, `analysis-infra`, and `ingestion-infra`: safety config exists and is validated at
synth time, but was apparently never connected to the actual resources it's meant to protect.
**Decision:** Leave as-is for now. Documented here so the risk is visible before anyone runs
`pulumi destroy` against a stack holding real form submissions (`backendBucket`) or undelivered
messages (`deadletterBucket`), rather than discovered by doing it.
**If this ever needs to be fixed:** Change both bucket definitions to read
`forceDestroy: forceDestroyStorage` and pass `{ retainOnDelete: retainStorageOnDelete, ... }` as a
resource option, matching what the config's own doc comments already describe. Wiring
`deadletterRetentionDays`/`deadletterSoftDeleteDays` would mean adding a lifecycle rule and
soft-delete policy to `deadletterBucket`, neither of which exists today.

## Two required config keys do nothing

**Error:** No error — `website:verifiedOwner` is `require()`d in `src/config.ts` (a deploy fails
without it being set), but `verifiedOwnerEmail` is never read anywhere else in `src/`. Relatedly,
`secondaryDomains` (the tail of `[mainDomain, ...secondaryDomains] = verifiedDomains`) is computed
but never used — only `mainDomain` is.
**Where:** `src/config.ts`.
**Root cause:** Likely leftover from an earlier or planned automation around domain
verification/site-verification — `siteVerificationService` (`siteverification.googleapis.com`) is
enabled in `src/services.ts` but no resource anywhere uses it either. Domain verification is a
deliberate manual step today (see [docs/bootstrap.md](./bootstrap.md)), so this reads like
scaffolding for automating that step that was never finished, not an oversight in the manual
process itself.
**Decision:** Leave as-is. Removing a required config key changes this stack's deployment
contract and isn't a change to make as part of a documentation pass.
**If this ever needs to be fixed:** Either implement a `gcp.siteVerification` resource (or
similar) that uses `verifiedOwnerEmail` and `secondaryDomains` to automate what
[docs/bootstrap.md](./bootstrap.md) currently documents as a manual Search Console step, or
remove all three (`verifiedOwner` config key, `verifiedOwnerEmail`, `secondaryDomains`) along with
the unused `siteVerificationService` enablement.

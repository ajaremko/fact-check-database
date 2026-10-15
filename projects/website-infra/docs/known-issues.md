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

## Third-party images are pinned by tag

**Error:** No error. A supply-chain and availability risk.
**Where:** `src/backend/service.ts` (`bitnamilegacy/oauth2-proxy:7.12.0`, `envoyproxy/envoy:v1.30.0`) and `src/redirect/service.ts` (`morbz/docker-web-redirect:v1.0`).
**Root cause:** The images are pulled from Docker Hub by tag at deploy time. A tag can be moved to different content, and the oauth2-proxy image comes from a `legacy` namespace that its publisher no longer maintains.
**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).
**If this ever needs to be fixed:** Pin each image by digest. Replace the `bitnamilegacy` image with the upstream oauth2-proxy image, and mirror all three into the project's Artifact Registry so a deploy does not depend on Docker Hub.

## oauth2-proxy runs with a dummy OAuth provider

**Error:** No error. A workaround.
**Where:** `src/backend/oauth2-proxy.cfg`.
**Root cause:** The site's sign-in is an htpasswd form. oauth2-proxy will not start without an OAuth provider, so the config names Google with a placeholder client id that is never used.
**Decision:** Won't fix. This is acceptable for a demonstration deployment.
**If this ever needs to be fixed:** Configure a real OAuth provider, or replace oauth2-proxy with a proxy that supports basic authentication on its own.

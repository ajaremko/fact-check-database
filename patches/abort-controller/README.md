# Abort Controller Patch (Google Cloud SDK Compatibility)

## Overview

This directory contains a compatibility patch for the `abort-controller` npm package.

It exists to resolve a runtime incompatibility between:

- Node.js native `AbortController` / `AbortSignal` (Node 18+ / 20+)
- `@google-cloud/storage` (and its dependency stack)
- `@effect/platform-node` / `undici`

Without this patch, the application may crash at runtime with errors such as:

```
TypeError: Expected signal to be an instanceof AbortSignal
TypeError: import_abort_controller.default is not a constructor
```

These errors occur due to multiple, incompatible `AbortSignal` implementations being present in the dependency tree.

## Root Cause: Multiple AbortSignal Implementations

This project depends on:

- `@effect/platform-node` → `undici` → native `AbortSignal`
- `@google-cloud/storage` → `abort-controller` (polyfill)

The `abort-controller` polyfill exports its own `AbortController` and `AbortSignal` classes.

When these are passed into libraries that expect Node’s native `AbortSignal`, checks such as:

```js
signal instanceof AbortSignal
```

fail, because the classes originate from different implementations.

This results in runtime errors inside `gaxios` and related HTTP libraries.

## Why This Patch Is Needed

Modern Node.js runtimes (18+) already provide native `AbortController` and `AbortSignal`.

However, `@google-cloud/storage` still depends on the legacy `abort-controller` package, which introduces an unnecessary polyfill.

Until the Google Cloud SDK removes this dependency, this patch ensures that all consumers use the same native implementation.

## What This Patch Does

This patch replaces the `abort-controller` package with a local stub that:

- Re-exports Node’s native `AbortController`
- Re-exports Node’s native `AbortSignal`
- Preserves CommonJS and ESM interop semantics

As a result:

- All HTTP clients share the same AbortSignal class
- `instanceof AbortSignal` checks succeed
- gaxios and undici interoperate correctly

## How It Is Applied

The patch is activated via `npm overrides` in the root `package.json`:

```json
{
  "overrides": {
    "abort-controller": "file:patches/abort-controller"
  }
}
```

This forces all dependencies to resolve `abort-controller` to this local implementation.

After changes, dependencies must be reinstalled cleanly:

```bash
rm -rf node_modules package-lock.json
npm install
npm dedupe
```

## Runtime Requirements

This patch requires:

- Node.js 18+ (tested on Node 20)
- A runtime that provides native AbortController

## Verification

To confirm the patch is active:

```bash
node -p "const AC = require('abort-controller'); typeof AC"
# → "function"

node -p "new (require('abort-controller'))(); 'ok'"
# → "ok"
```

And:

```bash
npm ls abort-controller
```

Should show the overridden package without errors.

## Future Removal

This patch is intended to be temporary.

It should be removed when:

- `@google-cloud/storage` drops the `abort-controller` dependency
- All Google Cloud SDK packages consistently use native AbortSignal

At that point:

1. Remove the override
2. Delete this directory
3. Reinstall dependencies

## References

- Google Cloud Storage Node.js issues on AbortSignal compatibility
- gaxios / undici interoperability discussions
- Node.js AbortController documentation

## Rationale (Research Infrastructure Context)

This project prioritizes:

- Deterministic runtime behavior
- Cross-library interoperability
- Reproducibility of research pipelines

Maintaining a single, native AbortSignal implementation is necessary to ensure reliable ingestion and archiving at scale.

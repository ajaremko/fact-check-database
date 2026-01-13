# Core Stack Output Contract

The **core** system provisions shared platform primitives (KMS keys, Pub/Sub topics, archival buckets, and standard labels). Other systems (ingest, persist, analysis, ops) consume these primitives via **Pulumi StackReferences**.

This document defines the **stable output contract** exported by `systems/core/infra`. Treat these outputs like a public API: changing names or semantics can break downstream deployments.

---

## Contract Goals

Core outputs are designed to be:

- **Stable**: output names should rarely change.
- **Environment-aware**: values differ by stack (dev/prod) via Pulumi config.
- **Project-agnostic for consumers**: feature systems should not hardcode resource names.
- **Minimal**: core exports only shared primitives needed by multiple systems.

---

## Output Namespaces & Stability

All outputs are exported at the root level (no nested objects) to simplify consumption.

Stability expectations:

- **Breaking changes**: renaming an output key, changing meaning, or changing resource identity (e.g. replacing a topic/bucket with a new one).
- **Non-breaking changes**: adding new outputs, adding optional resources with new keys, tightening docs.

---

## Outputs

### `platformEnv`

- **Type**: `string`
- **Examples**: `"dev"`, `"prod"`
- **Meaning**: The logical environment for this stack. Used for labeling, retention, and resource naming policy decisions.

---

### `platformName`

- **Type**: `string`
- **Examples**: `"news-research"`
- **Meaning**: Human-readable platform name / prefix used for naming and tagging.

---

### `platformLabels`

- **Type**: `object` (string → string map)
- **Examples**:
  ```json
  {
    "platform": "news-research",
    "env": "dev",
    "owner": "research-platform"
  }
  ```

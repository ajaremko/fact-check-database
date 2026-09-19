# Documentation Guidelines

How projects in this repository should be documented, by project kind (library, app, infra). This
distills documentation patterns that worked well in a reference monorepo we studied, corrected
against two known weak points in that reference (its infra docs skip bootstrapping, credential
rotation, and access revocation) and against staleness patterns already observed in this repo's
own docs.

This document describes a target structure for new and rewritten project docs. It does not, by
itself, change any existing project's documentation.

## Principles

These apply to every project regardless of kind.

- **Explain why, not just what.** Justify a design decision against a concrete constraint instead
  of just stating what was built. ("Records are stored per-type rather than per-document because
  GCS notification prefix filters match literal strings, not globs" is a why; "records are stored
  in a `records/` folder" is not.)
- **Follow George Orwell's Elements of Style** As much as possible, aim for clear and concise prose. Always draft a second version of major edits or additions to documentation that edits for clarity and brevity.
  - Drop tired figures of speech.
  - Never use a long word where a short one will do.
  - Cut any extra word you can.
  - Use active verbs.
  - Pick everyday English over jargon.
  - Break these rules before writing bad prose.
  - And one addition for LLMS: When produced sentences are broken in half by an em dash: ie thought 1 - thought 2 - thought 1, it indicates that the single sentence may be broken into multiple short sentences. This is usually preferable.
- **State scope boundaries explicitly.** Say what a project does _and_ what it deliberately does
  not do, even without a dedicated heading for it. A reader should never have to infer a project's
  boundaries from what's absent.
- **Use tables for enumerable facts, prose for rationale.** Environment variables, routes, config
  keys, and command references belong in tables. Architecture, trade-offs, and design decisions
  belong in prose. Don't mix the two into one form.
- **Scope cross-cutting concerns explicitly per layer — don't just link instead of duplicating.**
  When a concern (logging, error handling) spans a library and its consumers, each layer should
  document only the portion it actually owns, and say so explicitly, rather than one side linking
  to the other as a substitute for defining the boundary. For example: a library that commits to
  only ever logging at `trace`/`debug` should say so in its own docs, as a complete reference for
  those levels; a consumer that owns everything above that (`info` and up) documents only those
  levels in its own runbook, plus a pointer to the library's doc for the rest. The result is that
  a reader deciding what `LOG_LEVEL` to set can get a complete answer without either doc repeating
  the other. The same split applies to error handling: a library owns its base error taxonomy, a
  consumer owns how it maps those errors to its own outward-facing behavior (e.g. HTTP responses).
  See the matching anti-pattern below for what it means when a concern _can't_ be cleanly split
  this way.
- **Every doc ends with a pointer to the next relevant doc.** README → runbook → known issues →
  back to the README. No dead ends.

## Common documentation types and their purpose

### `README.md`

The readme should generally be a "Getting started" guide for someone wishing to run the app, understand its purpose and how to modify its behavior. Think of it as the big picture. It should link out to other docs.

### `runbook.md`

The runbook should be a comprehensive guide to operating the program. This means detailing the configuration, relevant commands and logging strategy as well as listing known failure modes along with how to diagnose and address them.

### `known-issues.md`

Known issues is for current bugs or architectural issues that are long lived. This could be library incompatibilites, overrides, patches or design flaws that don't have an easy fix.

## Structure by project kind

### Library

A library has a `README.md` and no runbook — nothing about it is directly operated in production.

- **Description**: what it does, and the core pattern its API follows (e.g. "every export is a
  factory that takes an explicit `env` object").
- **Build / test commands.**
- **Lifecycle or data-flow diagram** (ASCII), if the library models a multi-stage process.
- **API surface**: one subsection per exported unit of behavior, each documenting its inputs,
  outputs, and dependencies in a consistent shape (for this repo's Effect-based packages, this
  means each service's `Context.Tag` shape and what it requires from its environment).
- **Error handling**: the base error pattern, plus a short code sample showing how a consumer
  should handle it.
- **Logging**: exactly which levels this library uses, stated as a commitment rather than a
  description — see the layered-scoping principle above.
- **Persistence or data shapes**, if applicable, as commented code blocks rather than prose, with
  any non-obvious layout decision justified against a real constraint.
- **Usage examples**: runnable code snippets covering realistic call sequences.
- **`docs/known-issues.md`**: see below.

### App

An app has a `README.md`, a `docs/runbook.md`, and a `docs/known-issues.md`.

- **`README.md`**: description and scope boundary; build/serve/containerize commands; a routes or
  pages table for anything HTTP-facing (or the equivalent interface table for non-HTTP apps); a
  local-setup environment-variable table; a statement of test coverage (automated vs. manual, and
  where each lives); a pointer to the runbook.
- **`docs/runbook.md`**: an environment-configuration table with **Type** and **Visibility**
  (`private` / `secret` / `public`) columns, so secrets are flagged explicitly rather than left
  implicit; a logging-levels table covering only the levels this app's own code controls (levels
  already owned by a consumed library are out of scope here — point to that library's doc
  instead); a debugging section structured as named failure modes, each as **symptom → root
  cause → what to check**; closing operational caveats; a pointer back to the README.
- **`docs/known-issues.md`**: see below.

### Infra

An infra project has a `README.md`, `docs/runbook.md`, `docs/iam-model.md`, and
`docs/known-issues.md`. It has a `docs/bootstrap.md` only when there is project-specific setup
beyond what's documented centrally (see below).

- **`README.md`**: description; explicit callouts of dependencies on other stacks or projects;
  deploy commands; "what this provisions," broken into subsections by resource group; a
  stack-outputs table for any output another project consumes via a `StackReference`.
- **`docs/bootstrap.md`**: generic account, backend, and tooling setup (e.g. the Pulumi Cloud
  account and access token, initial cloud-project creation) is documented **once, centrally** —
  in this repo, that's `core-infra/docs/bootstrap.md`, since `core-infra` is the first stack
  deployed. An individual project's own `docs/bootstrap.md` should exist only for a
  project-specific delta, and should link to the central doc rather than repeat it. The delta
  worth flagging in most projects: in this system, dev deployments for every domain share one GCP
  project (set up once, centrally), while each domain's prod deployment gets its own dedicated
  GCP project. So a project's bootstrap doc, when it needs one at all, should state whether and
  when a new GCP project must be manually created for it — normally only relevant for its prod
  stack — rather than re-explain the generic setup steps.
- **`docs/runbook.md`**: a stack-configuration reference table; a commands table; debugging
  structured as named failure modes (symptom → cause → fix); a rollback/recovery procedure; a
  credential/key-rotation section; an access-revocation section.
- **`docs/iam-model.md`**: the project's trust model centralized in one place — principals, roles,
  bindings, and the reasoning behind them — rather than scattered per-resource across the README.
- **`docs/known-issues.md`**: see below.

### `docs/known-issues.md` (all project kinds)

A decision log, not a bug tracker. One entry per known quirk or accepted limitation, using a
consistent four-field template:

```
## <short problem title>

**Error:** <exact error text or symptom>
**Where:** <file/location, when it happens>
**Root cause:** <what was investigated, and what it found>
**Decision:** <"leave as-is," or the fix chosen, with rationale>
**If this ever needs to be fixed:** <a concrete alternative approach, deferred, not required now>
```

The point is to preserve _why something wasn't fixed_, including what was already ruled out, so
the next person doesn't redo the investigation.

## Root-level conventions

- **Project index table**, grouped by domain, in the root `README.md` — already established;
  keep it current as projects are added, removed, or documented.
- **Architecture/pipeline diagram**, in prose plus ASCII, for any system with a multi-stage flow.
  This applies at the whole-repository level and can also apply inside an individual library that
  models its own multi-stage process.

## Anti-patterns to avoid

- **Don't hand-write exhaustive file/folder trees in READMEs.** An exhaustive tree goes stale the
  moment the code is refactored, and a reader can't tell a stale tree from a current one just by
  looking at it. Prefer prose describing layers and responsibilities. (Naming the exact source
  file behind a specific resource or feature, in the infra README pattern above, is a narrower and
  lower-risk case than an exhaustive tree — but even that should be used sparingly, since it's
  still a claim that can go stale.)
- **Don't let docs describe a mechanism the code no longer uses.** If a project's environment
  switching, build process, or wiring changes, update the doc that describes it in the same
  change — don't leave the old mechanism documented alongside the new one.
- **Don't leave informal spec or prompt artifacts mixed in with maintained docs.** A leftover
  feature-request or planning document, unlinked from the README and written in a different voice
  from everything else, should not be treated as part of a project's documentation set.
- **Treat duplicated documentation of a shared concern across multiple consumers as a signal, not
  just a style slip.** If the same explanation would need to be written into more than one
  consuming project's docs because the layered-scoping split above doesn't cleanly apply, surface
  that rather than silently writing it twice: note in the docs that the concern is duplicated and
  why, and treat it as a prompt to check whether the concern actually belongs in a shared library
  instead of being reimplemented per consumer.

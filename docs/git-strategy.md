# Git Strategy

How changes move through this repository: which branches exist, what each one stands for, and how
a change gets from a working branch into `main` and then into production.

The strategy is [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
with one addition, a long-lived `prod` branch. GitHub flow alone assumes that whatever is on the
main branch is in production. This platform keeps two environments and deploys infrastructure by
hand, so it needs a second branch to record what production runs.

## The two long-lived branches

| Branch | Represents                                 | Receives changes from                                   |
| ------ | ------------------------------------------ | ------------------------------------------------------- |
| `main` | The dev environment, and the next release  | Short-lived working branches, by pull request           |
| `prod` | The production environment, as it is today | `main`, by a promotion pull request. Rarely, a `hotfix` |

### `main`

- `main` is the source for the dev environment. Dev images are built from it and the dev stacks
  are deployed from it.
- It is always fit to deploy. A change that is not ready stays on its working branch.
- It is the only branch working branches are cut from and merged into. It cannot be pushed to
  directly.
- It runs ahead of `prod` by whatever has been merged and not yet promoted.

### `prod`

- `prod` is the source for the production environment. Production images are built from it and
  the prod stacks are deployed from it.
- It holds only commits that were on `main` first. The one exception is a hotfix, described below.
- It cannot be pushed to directly. It moves when `main` is promoted.
- To see what production runs, read `prod`. To see what is waiting to be released, fetch and
  compare the two: `git log origin/prod..origin/main`. See
  [check what is waiting](#check-what-is-waiting).

## The life of a change

1. Cut a working branch from `main`.
2. Commit to it and push it.
3. Open a pull request into `main`. The checks run.
4. Merge the pull request once the checks pass. The checks run again on `main`, and dev images
   are published if the change touched a service.
5. Deploy the affected dev stacks by hand, if the change needs it.
6. When `main` is ready for production, promote it to `prod`.
7. Deploy the affected prod stacks by hand, from `prod`.

## Merging a branch into `main`

### Name and scope the branch

- Cut it from an up-to-date `main`.
- Name it for the kind of work and the subject: `feat/yaml-source-list`, `fix/dashboard-drift`,
  `docs/git-strategy`. The prefix `hotfix/` is reserved for production hotfixes.
- Name a branch that only sets image tags for the tag it sets: `deploy/dev-454`,
  `deploy/prod-449-10.07.26-bf4bb8b`.
- Keep it to one change. A short-lived branch is easier to review and less likely to conflict.

```bash
git switch main
git pull
git switch -c fix/dashboard-drift
```

### Open the pull request

```bash
git push -u origin fix/dashboard-drift
gh pr create --base main --fill
```

Opening the pull request starts [`pr.yml`](../.github/workflows/pr.yml). It lints, tests,
typechecks and builds the projects the change affects. It holds no cloud credentials.

Pull requests are not previewed against infrastructure. For a change to a Pulumi project, run
`nx preview <project> --stack=dev` locally and read the diff before merging.

### Bring the branch up to date

If `main` has moved and the branch conflicts with it, merge `main` into the branch and push:

```bash
git fetch origin
git merge origin/main
```

### Merge

Merge with a **squash merge**, then delete the branch. Squash is the only merge method GitHub
allows into `main`, and the merge is blocked until the checks pass:

```bash
gh pr merge --squash --delete-branch
```

A squash merge puts one commit on `main` for each pull request. That keeps the history of `main`
readable as a list of changes, and makes a change simple to revert.

### What happens on `main` after the merge

[`ci.yml`](../.github/workflows/ci.yml) runs the checks again on the merged result. It then asks
which containerized services the merge affected:

- **At least one service changed:** it publishes a full set of dev images, tagged `dev-<build>`.
- **No service changed** (documentation, infrastructure, workflows, an image tag in stack
  config): it publishes nothing and the run ends.

Publishing an image does not deploy it. To run a new image, set its tag in the stack's
`Pulumi.dev.yml` on a `deploy/dev-<build>` branch, merge that change the same way, and deploy the
stack.

## Promoting `main` to production

A promotion moves everything on `main` into `prod`. It is a pull request, so the checks run and
the release is recorded.

- **Merge with a merge commit.** It is the only merge method GitHub allows into `prod`. A squash
  would put a new commit on `prod` that `main` does not have, and the two branches would no
  longer share history. Every later promotion would then conflict. A merge commit keeps each
  commit from `main` on `prod` as it was.
- **Promote all of `main`.** There is no picking of single commits. If something on `main` is not
  ready for production, fix or revert it on `main` first.
- **Only `main` or a `hotfix/` branch should be merged into `prod`.** `pr.yml` fails its
  source-branch check on a pull request into `prod` from any other branch. That check does not
  block the merge yet: see [what is not enforced](#not-enforced).

### Check what is waiting

List the commits the promotion will carry, and the infrastructure files they change:

```bash
git fetch origin
git log --oneline origin/prod..origin/main
git diff --stat origin/prod origin/main -- 'projects/*-infra/*'
```

Compare the `origin/` copies, not your local branches. `git fetch` updates every `origin/` copy
at once. A local branch moves only when you check it out and pull, so a local `prod` is often
behind.

Each change should have run in dev before it is promoted. For a service change, that means the
dev stack's tag in `Pulumi.dev.yml` names an image built after the change merged.

### Open the promotion pull request

Open the pull request from `main` itself:

```bash
gh pr create --base prod --head main --title "Promote main to prod"
```

There is no local merge. GitHub makes the merge commit on `prod` when the pull request merges.
Do not check out `prod` and merge `main` into it yourself. GitHub rejects a direct push to
`prod`, and a pull request from any branch other than `main` fails the source-branch check.

### Merge the promotion

Wait for the checks, then merge with a merge commit:

```bash
gh pr checks <number> --watch
gh pr merge <number> --merge
```

Give the pull request's number. Without it, `gh pr merge` acts on the pull request for whichever
branch is checked out. Do not pass `--delete-branch`. This pull request's head is `main`.

### What happens on `prod` after the merge

[`release.yml`](../.github/workflows/release.yml) runs the checks on every project, not only the
affected ones. If the promotion changed a service, it publishes production images. If it did not,
it publishes nothing.

Wait for the run to finish, then read the new tag from its log:

```bash
gh run list --workflow=release.yml --limit 1
gh run watch <run-id>
gh run view <run-id> --log | grep "Successfully pushed"
```

A run that publishes gives every app's image the same tag, whether or not that app changed. The
tag reads `<build>-<MM.DD.YY>-<commit>`, where `<commit>` is the short hash of the promotion's
merge commit on `prod`. For example: `449-10.07.26-bf4bb8b`.

### Releasing new images to production

A production image's tag is not known until the image is published, so a service change reaches
production in two promotions:

1. Promote `main`, and read the new tag from the `release.yml` run.
2. On a `deploy/prod-<tag>` branch, set the tag in each stack's `Pulumi.prod.yml`, and merge it
   into `main`:

   ```bash
   git switch main
   git pull
   git switch -c deploy/prod-<tag>
   # set <tag> in projects/{analysis,ingestion,website}-infra/Pulumi.prod.yml
   git commit -am "Bump prod image tags to <tag>"
   git push -u origin deploy/prod-<tag>
   gh pr create --base main --fill
   gh pr checks --watch
   gh pr merge --squash --delete-branch
   ```

3. Promote again. This promotion changes no service, so `release.yml` runs the checks and
   publishes nothing.
4. [Deploy from `prod`](#deploy-from-prod).

Set the same tag in all three stacks, so production runs a single build. Then deploy every stack
whose tag changed. Until you do, that stack keeps running the old image, and the daily preview
reports it as drifted. `website-infra` is the exception. The daily preview does not cover it, so
nothing flags it.

### Deploy from `prod`

Deploy each prod stack from a clean, current checkout of `prod`:

```bash
git switch prod
git pull
git status
nx preview <project> --stack=prod
nx deploy <project> --stack=prod
```

Pulumi Cloud records the commit each deployment ran from. Pulling first makes that commit the one
GitHub holds. `git status` should report a clean working tree. A deployment runs the files on
disk, and an uncommitted change is code that no branch holds.

- **Which stacks:** each infrastructure project whose code or `Pulumi.prod.yml` appeared in the
  `git diff --stat` before the first promotion, and each stack whose tag you set.
- **In what order:** `core-infra` first when it changed, and `research-infra` after
  `analysis-infra`. See
  [deployment ordering](../projects/core-infra/docs/runbook.md#deployment-ordering).
- **Read each preview before you deploy.** For the `website-infra` prod stack, it is the only
  preview there is.

### After a promotion

Switch back to `main`, so the next working branch is cut from it:

```bash
git switch main
```

`git log origin/main..origin/prod` now lists the promotion merge commits. That is expected. A
merge commit carries no change of its own, so `main` does not need it, and the next promotion
still merges cleanly.

## Hotfixes

A hotfix is for a production fault that cannot wait for what is already on `main`. It is the one
case where a change reaches `prod` before `main`.

1. Cut `hotfix/<subject>` from `prod`.
2. Open a pull request into `prod`, and merge it with a merge commit. Keep the branch.
3. Open a second pull request from the same branch into `main`, and squash it. Delete the branch
   once both pull requests are merged.

The fix then sits on both branches as two commits with the same content. The next promotion
merges cleanly, because Git sees the same change on each side.

If the fault can wait for a normal promotion, fix it on `main` and promote. That is the usual
path.

## What each workflow does

| Event                    | Workflow                                          | What it does                                                                                           |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Pull request, any base   | [`pr.yml`](../.github/workflows/pr.yml)           | Lints, tests, typechecks and builds what the change affects                                            |
| Pull request into `prod` | [`pr.yml`](../.github/workflows/pr.yml)           | Also checks that the source branch is `main` or `hotfix/*`                                             |
| Merge to `main`          | [`ci.yml`](../.github/workflows/ci.yml)           | Runs the checks. Publishes dev images if a service changed                                             |
| Merge to `prod`          | [`release.yml`](../.github/workflows/release.yml) | Runs the checks on every project. Publishes production images if a service changed                     |
| Daily, 06:00 UTC         | [`preview.yml`](../.github/workflows/preview.yml) | Compares each stack's code with what was last deployed: dev stacks against `main`, prod against `prod` |
| Started by hand          | `ci.yml`, `release.yml`, `preview.yml`            | Runs the same steps. `ci.yml` and `release.yml` publish images whether or not a service changed        |

A failed prod job in the daily preview means `prod` holds an infrastructure change that has not
been deployed. A change that is on `main` and not yet promoted does not fail it. See
[the drift preview](../projects/core-infra/docs/runbook.md#the-daily-drift-preview).

## What enforces this, and what does not

### Enforced

GitHub rejects anything that breaks these rules. Nobody is on either ruleset's bypass list, so
they bind the maintainer too.

- **Every change to `main` or `prod` arrives by pull request.** A direct push is rejected.
- **The checks must pass before a pull request can merge.**
- **The merge method is fixed for each branch:** squash into `main`, merge commit into `prod`.
- **Neither branch can be force-pushed or deleted.**
- **Images can only be published from the right branch.** The identity that pushes dev images
  accepts `ci.yml` running on `main` and nothing else. The one that pushes production images
  accepts `release.yml` running on `prod`. A workflow on any other branch is refused by Google
  Cloud, whatever the workflow file says. See
  [the IAM model](../projects/core-infra/docs/iam-model.md).

### Branch rulesets

The first four rules come from two branch rulesets, one for each branch. They are configured in
the repository's GitHub settings (Settings → Rules → Rulesets) and are not defined in code. This
table is the record to rebuild them from.

| Rule                      | `main`                            | `prod`                            |
| ------------------------- | --------------------------------- | --------------------------------- |
| Enforcement               | Active                            | Active                            |
| Bypass list               | Empty                             | Empty                             |
| Deletion                  | Blocked                           | Blocked                           |
| Force push                | Blocked                           | Blocked                           |
| Linear history            | Required                          | Not required                      |
| Pull request              | Required                          | Required                          |
| Required approvals        | 0                                 | 0                                 |
| Allowed merge methods     | Squash                            | Merge commit                      |
| Required status checks    | `Lint, Test, Typecheck and Build` | `Lint, Test, Typecheck and Build` |
| Branch must be up to date | No                                | No                                |

`prod` does not require linear history because each promotion adds a merge commit.

### Not enforced

- **The source of a pull request into `prod`.** `pr.yml` checks that it comes from `main` or a
  `hotfix/` branch and reports the result on the pull request. The check is not yet a required
  one, so a failing result does not block the merge. Making it required is tracked in
  [todo.md](./todo.md).
- **Review by a second person.** No approval is required, because the project has one maintainer.
  The rules guarantee that the checks passed and that each change has a pull request on record.
  They do not guarantee that anyone else read it.
- **The rulesets themselves.** A repository admin can edit or disable a ruleset. GitHub records
  such a change in the ruleset's history.
- **Deploying from the right branch.** Pulumi Cloud records the commit each deployment ran from,
  which makes a deployment from the wrong branch visible afterwards. It does not prevent one.

## What this strategy does not cover

- **How each stack is deployed.** No workflow deploys. Every stack is deployed by hand. This
  document says which branch to deploy from. Each infra project's runbook covers the stack
  itself.
- **Release versions.** There are no version numbers or release branches. An image is identified
  by its build number, and production by the commit `prod` points at.
- **The website stack's preview.** `website-infra` is not part of the daily preview.

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
- It is the only branch working branches are cut from and merged into.
- It runs ahead of `prod` by whatever has been merged and not yet promoted.

### `prod`

- `prod` is the source for the production environment. Production images are built from it and
  the prod stacks are deployed from it.
- It holds only commits that were on `main` first. The one exception is a hotfix, described below.
- Nobody commits to it directly. It moves when `main` is promoted.
- To see what production runs, read `prod`. To see what is waiting to be released, compare the
  two: `git log prod..main`.

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

Merge with a **squash merge**, then delete the branch:

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
`Pulumi.dev.yml`, merge that change the same way, and deploy the stack.

## Promoting `main` to production

A promotion moves everything on `main` into `prod`. It is a pull request, so the checks run and
the release is recorded.

```bash
gh pr create --base prod --head main --title "Promote main to prod"
gh pr merge --merge
```

- **Merge with a merge commit, never a squash.** A squash would put a new commit on `prod` that
  `main` does not have, and the two branches would no longer share history. Every later promotion
  would then conflict. A merge commit keeps each commit from `main` on `prod` as it was.
- **Promote all of `main`.** There is no picking of single commits. If something on `main` is not
  ready for production, fix or revert it on `main` first.
- **Only `main` or a `hotfix/` branch may be merged into `prod`.** `pr.yml` fails a pull request
  into `prod` from any other branch.

After the merge, [`release.yml`](../.github/workflows/release.yml) runs the checks on every
project, not only the affected ones. If the promotion changed a service, it publishes production
images tagged `<build>-<date>-<commit>`. If it did not, it publishes nothing.

### Releasing new images to production

A production image's tag is not known until the image is published, so a service change reaches
production in two promotions:

1. Promote `main`. `release.yml` publishes the production images.
2. On a working branch, set the new tag in the affected `Pulumi.prod.yml` files. Merge it into
   `main`, then promote again. This promotion changes no service, so nothing is published.
3. Deploy the prod stacks from `prod`.

## Hotfixes

A hotfix is for a production fault that cannot wait for what is already on `main`. It is the one
case where a change reaches `prod` before `main`.

1. Cut `hotfix/<subject>` from `prod`.
2. Open a pull request into `prod`, and merge it with a merge commit.
3. Merge `prod` back into `main` by pull request, also with a merge commit, so `main` has the fix
   and the next promotion is clean.

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

Enforced by the platform:

- **Images can only be published from the right branch.** The identity that pushes dev images
  accepts `ci.yml` running on `main` and nothing else. The one that pushes production images
  accepts `release.yml` running on `prod`. A workflow on any other branch is refused by Google
  Cloud, whatever the workflow file says. See
  [the IAM model](../projects/core-infra/docs/iam-model.md).
- **A pull request into `prod` from the wrong branch fails its check.**

Convention only:

- **Branch protection is not configured.** Nothing stops a direct push to `main` or `prod`, or a
  merge with failing checks. Requiring pull requests and the `pr.yml` checks on both branches is
  tracked in [todo.md](./todo.md).
- **The merge method is not enforced.** Squash into `main` and merge-commit into `prod` are rules
  for the person merging.
- **Deploying from the right branch is not enforced.** Pulumi Cloud records the commit each
  deployment ran from, which makes a deployment from the wrong branch visible afterwards. It does
  not prevent one.

## What this strategy does not cover

- **Deploying infrastructure.** No workflow deploys. Every stack is deployed by hand, as each
  infra project's runbook describes.
- **Release versions.** There are no version numbers or release branches. An image is identified
  by its build number, and production by the commit `prod` points at.
- **The website stack's preview.** `website-infra` is not part of the daily preview.

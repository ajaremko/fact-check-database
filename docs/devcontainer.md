# Dev Container

This repository provides a containerized development environment defined in `.devcontainer/`. It ensures that all contributors work with consistent tooling and runtime versions, regardless of their host machine configuration.

## What It Provides

The dev container is built on `mcr.microsoft.com/devcontainers/typescript-node:20` and includes:

| Tool                        | Purpose                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| Node.js 20                  | Runtime for all TypeScript applications and build tooling                                       |
| Nx CLI                      | Task orchestration, code generation, and monorepo management                                    |
| Pulumi CLI                  | Infrastructure provisioning via `projects/core-infra` and the other `projects/*-infra` projects |
| Google Cloud SDK (`gcloud`) | Authenticating with GCP and managing cloud resources                                            |
| Docker-in-Docker            | Building and running container images from within the dev container                             |
| GitHub CLI (`gh`)           | Interacting with GitHub from the terminal                                                       |
| Zsh                         | Default shell                                                                                   |
| Claude Code                 | AI-assisted development via the Anthropic CLI                                                   |

VS Code extensions are pre-configured for ESLint, Prettier, Nx Console, GitHub Actions, and Docker.

## Prerequisites

Before opening the dev container, create a `.env` file in `.devcontainer/node/` from the provided template:

```bash
cp .devcontainer/node/.env.template .devcontainer/node/.env
```

Then fill in the following values:

| Variable                         | Description                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `PULUMI_ACCESS_TOKEN`            | Pulumi access token for managing infrastructure state                                |
| `GOOGLE_APPLICATION_CREDENTIALS` | Filename of a GCP service account key file (must be placed in `~/.gcp/` on the host) |
| `PROJECT_ID`                     | GCP project ID for the target environment (e.g. `fact-check-database-dev`)           |
| `GITHUB_TOKEN`                   | GitHub personal access token for the GitHub CLI                                      |

## GCP Credentials

The dev container expects a GCP service account key file to be present at `~/.gcp/{GOOGLE_APPLICATION_CREDENTIALS}` on the host machine. This directory is mounted into the container at `/var/secrets/`.

On container start, the setup script authenticates the `gcloud` CLI using this key:

```bash
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
gcloud config set project $PROJECT_ID
```

This means all `gcloud` and GCP SDK calls within the container run under the configured service account identity.

## SSH Agent Forwarding

The dev container forwards the host SSH agent socket, making host SSH keys available inside the container without copying key files. This supports operations that require SSH authentication, such as interacting with private Git remotes.

The `SSH_AUTH_SOCK` environment variable is set to `/ssh-agent.sock` inside the container, which is bound to `${SSH_AUTH_SOCK}` on the host.

## Post-Create Setup

After the container is created, `.devcontainer/node/setup.sh` runs automatically. It:

1. Authenticates the `gcloud` CLI using the provided service account credentials
2. Installs npm dependencies (`npm install`) if `node_modules` does not already exist

## Volume Mounts

| Host path           | Container path    | Purpose                             |
| ------------------- | ----------------- | ----------------------------------- |
| `../..` (repo root) | `/workspaces/`    | Source code                         |
| `~/.ssh`            | `/home/node/.ssh` | SSH config and known hosts          |
| `~/.gcp`            | `/var/secrets`    | GCP service account key files       |
| `$SSH_AUTH_SOCK`    | `/ssh-agent.sock` | SSH agent socket for key forwarding |

## Known Issues

### Slow filesystem performance on macOS

Docker on macOS runs containers inside a Linux VM. Bind-mounting host directories into that VM introduces a filesystem translation layer that can significantly slow down disk-intensive operations — particularly `npm install`, build steps, and anything that reads or writes many small files.

The source code mount (`../..:/workspaces`) covers the entire repo root, including `node_modules` once installed. This is the mount most likely to cause noticeable slowness on macOS.

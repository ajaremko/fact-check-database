#!/bin/bash

# This script is used to release the docker images for the specified stack (dev or prod).
# Usage: ./release.prod.sh [dev|prod]

# Parse command line argument

if [ $# -eq 0 ]; then
    echo "Error: No arguments provided. Usage: $0 [dev|prod]"
    exit 1
fi

if [ "$1" != "dev" ] && [ "$1" != "prod" ]; then
    echo "Error: Invalid argument '$1'. Usage: $0 [dev|prod]"
    exit 1
fi

STACK_NAME="$1"

# Access the Pulumi stack and retrieve the GCP project ID and Docker registry information

echo "Preparing to release $STACK_NAME images..."

cd projects/core-infra

OUT="$(pulumi stack output --json --stack=$STACK_NAME)"

RELEASE_PROJECT="$(echo "$OUT" | jq -r '.gcpProject')"
DOCKER_REGISTRY="$(echo "$OUT" | jq -r '.artifactRegistryUri')"
DOCKER_REGISTRY_BASE="$(echo "$OUT" | jq -r '.artifactRegistryBaseUri')"
BUILD_NUMBER=local_$(date +%s)

# Run lint, build, and docker build for all projects in the monorepo to ensure that 
# everything all projects are in a deployable state before attempting to release new images.

echo "Running CI"

nx run-many --target=lint

nx run-many --target=build

nx run-many --target=docker:build

# Set environment variables for the release process to access and configure docker 
# authentication for gcloud

echo "Setting $STACK_NAME env vars..."

export RELEASE_PROJECT=$RELEASE_PROJECT
export DOCKER_REGISTRY=$DOCKER_REGISTRY
export DOCKER_REGISTRY_BASE=$DOCKER_REGISTRY_BASE
export BUILD_NUMBER=$BUILD_NUMBER

echo RELEASE_PROJECT=$RELEASE_PROJECT
echo DOCKER_REGISTRY=$DOCKER_REGISTRY
echo DOCKER_REGISTRY_BASE=$DOCKER_REGISTRY_BASE
echo BUILD_NUMBER=$BUILD_NUMBER

# Configure docker authentication for the artifact registry.

echo "Configuring docker auth for gcloud..."

gcloud auth configure-docker $DOCKER_REGISTRY_BASE --quiet

# Prompt for final confirmation

echo "Ready to release $STACK_NAME images with build number $BUILD_NUMBER to $DOCKER_REGISTRY."
read -p "Are you sure you want to continue? [y/N] " -n 1 -r
echo # Newline

# Check the answer
case "$REPLY" in
  [yY][eE][sS]|[yY]) 
    echo "Proceeding with release..."
    # Add your action here
    ;;
  *)
    echo "Release aborted."
    exit 1
    ;;
esac

echo "Running nx release command..."

VERSION_SCHEME=$STACK_NAME

if [ $VERSION_SCHEME == "prod" ]; then
    VERSION_SCHEME=production
fi

nx release --dockerVersionScheme=$VERSION_SCHEME --yes --verbose

echo "Release completed successfully for build number $BUILD_NUMBER."

exit 0
